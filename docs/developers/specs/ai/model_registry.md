# Model Registry

> Source: `packages/ai/src/model-registry.ts`, `packages/ai/src/providers/`

## Overview

`ModelRegistry` is a static, singleton-style class that acts as the central catalog for all AI/ML models used across HotCRM. It stores `ModelConfig` entries in an in-memory `Map` and provides methods to register, query, update, and remove models.

## ModelConfig Type

```typescript
interface ModelConfig {
  id: string;                          // Unique identifier (e.g. "lead-scoring-v1")
  name: string;                        // Human-readable name
  version: string;                     // Semver (e.g. "1.0.0")
  type: ModelType;                     // See ModelType below
  provider: ModelProvider;             // See ModelProvider below
  description: string;
  endpoint?: string;                   // Remote endpoint URL
  credentials?: {                      // Provider auth
    apiKey?: string;
    secretKey?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    region?: string;
  };
  providerConfig?: MLProviderConfig;   // Full provider configuration
  parameters?: Record<string, any>;    // Hyperparameters
  metrics?: {                          // Performance metrics
    accuracy?: number;
    precision?: number;
    recall?: number;
    f1Score?: number;
    mse?: number;
    mae?: number;
  };
  lastTrained?: string;               // ISO date
  status: 'active' | 'deprecated' | 'training' | 'testing';
  abTest?: {                           // A/B testing config
    enabled: boolean;
    trafficPercentage: number;         // 0-100
    championModelId?: string;
  };
}
```

### ModelType

```typescript
type ModelType =
  | 'classification'
  | 'regression'
  | 'clustering'
  | 'nlp'
  | 'recommendation'
  | 'forecasting';
```

### ModelProvider

```typescript
type ModelProvider =
  | 'aws-sagemaker'
  | 'azure-ml'
  | 'openai'
  | 'anthropic'
  | 'custom'
  | 'scikit-learn'
  | 'tensorflow'
  | 'pytorch';
```

## Registry API

| Method | Signature | Description |
|--------|-----------|-------------|
| `register` | `(config: ModelConfig) => void` | Add or overwrite a model |
| `getModel` | `(modelId: string) => ModelConfig \| undefined` | Retrieve by ID |
| `listModels` | `(filter?: { type?: ModelType; status?: string }) => ModelConfig[]` | List with optional filter |
| `updateStatus` | `(modelId: string, status: ModelConfig['status']) => void` | Change lifecycle status |
| `unregister` | `(modelId: string) => void` | Remove a model |
| `clear` | `() => void` | Remove all models (testing) |

## Pre-registered Models

The package ships with five default models that are registered at import time:

| ID | Type | Provider | Key Metrics |
|----|------|----------|-------------|
| `lead-scoring-v1` | classification | custom | accuracy 87.5%, precision 85.2%, recall 89.1% |
| `churn-prediction-v1` | classification | custom | accuracy 82.3%, precision 80.5%, recall 84.2% |
| `sentiment-analysis-v1` | nlp | custom | accuracy 88.7%, precision 87.3%, recall 89.9% |
| `revenue-forecast-v1` | forecasting | custom | MSE 12500, MAE 8200 |
| `product-recommendation-v1` | recommendation | custom | precision 75.8%, recall 78.3% |

## Registering a Model

### Basic Registration (custom model)

```typescript
import { ModelRegistry } from '@hotcrm/ai';

ModelRegistry.register({
  id: 'deal-size-predictor-v1',
  name: 'Deal Size Predictor',
  version: '1.0.0',
  type: 'regression',
  provider: 'custom',
  description: 'Predicts expected deal size from opportunity attributes',
  status: 'active',
  metrics: { mse: 5000, mae: 3200 },
});
```

### Registration with OpenAI Provider

```typescript
import { ModelRegistry } from '@hotcrm/ai';

ModelRegistry.register({
  id: 'email-sentiment-v2',
  name: 'Email Sentiment v2',
  version: '2.0.0',
  type: 'nlp',
  provider: 'openai',
  description: 'Sentiment analysis powered by GPT-4',
  status: 'active',
  providerConfig: {
    provider: 'openai',
    credentials: { apiKey: process.env.OPENAI_API_KEY! },
    config: {
      model: 'gpt-4',
      temperature: 0.3,
      maxTokens: 500,
    },
  },
});
```

### Registration with AWS SageMaker

```typescript
import { ModelRegistry } from '@hotcrm/ai';

ModelRegistry.register({
  id: 'churn-prediction-v2',
  name: 'Churn Prediction v2',
  version: '2.0.0',
  type: 'classification',
  provider: 'aws-sagemaker',
  description: 'XGBoost churn model on SageMaker',
  status: 'active',
  providerConfig: {
    provider: 'aws-sagemaker',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      region: 'us-east-1',
    },
  },
  endpoint: 'churn-prediction-endpoint',
});
```

### Registration with Azure ML

```typescript
import { ModelRegistry } from '@hotcrm/ai';

ModelRegistry.register({
  id: 'revenue-forecast-v2',
  name: 'Revenue Forecast v2',
  version: '2.0.0',
  type: 'forecasting',
  provider: 'azure-ml',
  description: 'ARIMA forecasting on Azure ML',
  status: 'active',
  providerConfig: {
    provider: 'azure-ml',
    credentials: {
      apiKey: process.env.AZURE_ML_API_KEY!,
      endpoint: 'https://my-workspace.azureml.net/score',
      deploymentName: 'revenue-forecast-deployment',
    },
  },
});
```

## A/B Testing

Models support built-in A/B testing via the `abTest` field. The `PredictionService` uses `trafficPercentage` to route a portion of requests to the challenger model while the rest go to the champion.

```typescript
ModelRegistry.register({
  id: 'lead-scoring-v2',
  name: 'Lead Scoring v2 (challenger)',
  version: '2.0.0',
  type: 'classification',
  provider: 'custom',
  description: 'New lead scoring model under A/B test',
  status: 'active',
  abTest: {
    enabled: true,
    trafficPercentage: 20,       // 20% traffic to this challenger
    championModelId: 'lead-scoring-v1',
  },
});
```

## Provider Factory

The `ProviderFactory` creates and caches provider instances based on `MLProviderConfig`. Providers are keyed by `provider:endpoint` and reused across requests.

```typescript
import { ProviderFactory } from '@hotcrm/ai';

// Automatically creates and caches the right provider
const provider = ProviderFactory.getProvider({
  provider: 'openai',
  credentials: { apiKey: '...' },
});

// Register a custom provider
ProviderFactory.registerProvider('my-custom', myProviderInstance);
```

### Provider Interface

All providers extend `BaseMLProvider` and must implement:

```typescript
abstract class BaseMLProvider {
  abstract validate(): Promise<boolean>;
  abstract predict<T>(modelId: string, input: PredictionInput): Promise<PredictionOutput<T>>;
  abstract batchPredict<T>(modelId: string, inputs: PredictionInput[]): Promise<PredictionOutput<T>[]>;
  abstract healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }>;
}
```

### Provider-Specific Configuration

| Provider | Config Type | Required Credentials |
|----------|-------------|---------------------|
| OpenAI | `OpenAIConfig` | `apiKey` |
| AWS SageMaker | `SageMakerConfig` | `accessKeyId`, `secretAccessKey`, `region` |
| Azure ML | `AzureMLConfig` | `apiKey`, `endpoint` |

OpenAI additionally accepts `config.model` (default `gpt-4`), `config.temperature`, and `config.maxTokens`.
