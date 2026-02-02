# @hotcrm/ai - Unified AI Service Layer

Central AI/ML infrastructure for HotCRM providing model registry, prediction services, ML provider integration, caching, monitoring, and explainability.

## 🚀 New Enhanced Capabilities

### Real ML Provider Integration

Connect to production ML services:
- **AWS SageMaker** - Enterprise ML model hosting
- **Azure ML** - Microsoft Azure ML services
- **OpenAI** - GPT models for NLP tasks
- **Custom** - Extensible for any ML infrastructure

### Advanced Features

- ✅ **Multi-Provider Support** - Switch between providers seamlessly
- ✅ **Smart Caching** - Redis with in-memory fallback (5-min TTL)
- ✅ **Performance Monitoring** - Real-time latency and error tracking
- ✅ **A/B Testing** - Gradual model rollout with traffic splitting
- ✅ **Explainability** - SHAP-like feature attributions
- ✅ **Batch Processing** - Efficient bulk predictions
- ✅ **Health Monitoring** - Automatic status checks

## Features

### 🤖 Model Registry
- Centralized model configuration and versioning
- Model lifecycle management (active, deprecated, training, testing)
- Performance metrics tracking
- Multi-provider support (OpenAI, Anthropic, Custom, TensorFlow, PyTorch, etc.)
- **NEW**: A/B testing configuration
- **NEW**: Provider integration settings

### 🔮 Prediction Service
- Unified interface for all ML predictions
- Built-in caching (5-minute TTL by default)
- Batch prediction support
- Performance monitoring and logging
- Error handling and fallbacks
- **NEW**: Real ML provider integration
- **NEW**: Performance tracking and health checks
- **NEW**: Explainability features

### 🛠️ AI Utilities
- Statistical functions (mean, std dev, correlation)
- Feature engineering (normalization, scaling)
- Time series analysis (moving average, exponential smoothing, trend detection)
- Outlier detection (IQR method)
- Clustering (K-means)
- Similarity metrics (cosine similarity, Pearson correlation)

### 📊 Performance Monitoring (NEW)
- Real-time latency tracking (avg, median, P95, P99)
- Success/failure rate monitoring
- Cache hit rate analytics
- Model health status assessment
- Automatic degradation detection

### 💾 Caching (NEW)
- Redis integration with in-memory fallback
- Configurable TTL (default 5 minutes)
- Automatic cleanup of expired entries
- Cache statistics and monitoring

### 🔍 Explainability (NEW)
- SHAP-like feature attributions
- Top contributing features
- Human-readable explanations
- Prediction comparison

## Installation

```bash
pnpm install @hotcrm/ai
```

## Quick Start

### Basic Prediction

```typescript
import { PredictionService } from '@hotcrm/ai';

// Make a prediction
const result = await PredictionService.predict({
  modelId: 'lead-scoring-v1',
  features: {
    company_size: 500,
    industry: 'Technology',
    engagement_score: 75
  },
  useCache: true
});

console.log(result.prediction); // Model output
console.log(result.confidence); // Confidence score (0-100)
console.log(result.processingTime); // Processing time in ms
console.log(result.cached); // Whether from cache
```

### Using Real ML Providers

```typescript
import { ModelRegistry, ProviderFactory } from '@hotcrm/ai';

// Register a model with AWS SageMaker
ModelRegistry.register({
  id: 'lead-scoring-v2',
  name: 'Lead Scoring Model V2',
  version: '2.0.0',
  type: 'classification',
  provider: 'aws-sagemaker',
  description: 'Production lead scoring model',
  status: 'active',
  
  providerConfig: {
    provider: 'aws-sagemaker',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      region: 'us-east-1'
    }
  },
  
  metrics: {
    accuracy: 92.5,
    precision: 90.2,
    recall: 94.1,
    f1Score: 92.1
  }
});

// Use the model
const result = await PredictionService.predict({
  modelId: 'lead-scoring-v2',
  features: { ... }
});
```

### A/B Testing

```typescript
// Register challenger model with A/B testing
ModelRegistry.register({
  id: 'lead-scoring-v3',
  name: 'Lead Scoring Model V3',
  version: '3.0.0',
  type: 'classification',
  provider: 'azure-ml',
  status: 'active',
  
  // A/B test: 20% traffic to V3, 80% to V2
  abTest: {
    enabled: true,
    trafficPercentage: 20,
    championModelId: 'lead-scoring-v2'
  }
});
```

### Performance Monitoring

```typescript
import { PredictionService } from '@hotcrm/ai';

// Get performance stats
const stats = PredictionService.getPerformanceStats('lead-scoring-v2');
console.log(stats);
// {
//   totalPredictions: 10000,
//   averageLatency: 85,  // ms
//   p95Latency: 120,
//   cacheHitRate: 65,  // %
//   errorRate: 0.5,    // %
// }

// Check health
const health = PredictionService.getModelHealth('lead-scoring-v2');
// { status: 'healthy' }
```

### Explainability

```typescript
import { ExplainabilityService } from '@hotcrm/ai';

// Explain prediction
const explanation = await ExplainabilityService.explainPrediction(
  'lead-scoring-v2',
  features,
  prediction,
  confidence
);

console.log(explanation.explanation);
// "The prediction was influenced by:
//
// Positive factors:
// • Engagement Score: 85 (impact: +35%)
// • Company Size: 500 (impact: +25%)
// ..."
```

### Model Registry

```typescript
import { ModelRegistry } from '@hotcrm/ai';

// Register a new model
ModelRegistry.register({
  id: 'custom-model-v1',
  name: 'Custom Model',
  version: '1.0.0',
  type: 'classification',
  provider: 'custom',
  description: 'My custom ML model',
  status: 'active',
  metrics: {
    accuracy: 85.5,
    precision: 83.2,
    recall: 87.1
  }
});

// Get model configuration
const model = ModelRegistry.getModel('custom-model-v1');

// List all active models
const activeModels = ModelRegistry.listModels({ status: 'active' });
```

### Prediction Service

```typescript
import { PredictionService } from '@hotcrm/ai';

// Make a single prediction
const result = await PredictionService.predict({
  modelId: 'lead-scoring-v1',
  features: {
    company_size: 500,
    industry: 'Technology',
    engagement_score: 75
  },
  useCache: true
});

console.log(result.prediction); // Model output
console.log(result.confidence); // Confidence score (0-100)
console.log(result.processingTime); // Processing time in ms

// Batch predictions
const results = await PredictionService.batchPredict(
  'churn-prediction-v1',
  [
    { account_age: 24, support_cases: 3, nps_score: 8 },
    { account_age: 6, support_cases: 12, nps_score: 4 },
    { account_age: 36, support_cases: 1, nps_score: 9 }
  ]
);
```

### AI Utilities

```typescript
import { 
  calculateConfidence,
  normalizeScore,
  weightedAverage,
  detectOutliers,
  calculateTrend,
  cosineSimilarity
} from '@hotcrm/ai';

// Calculate confidence based on data quality
const confidence = calculateConfidence({
  sampleSize: 100,
  dataQuality: 85,
  modelAccuracy: 90
});

// Normalize a score to 0-100 range
const normalized = normalizeScore(75, 0, 150); // 50

// Weighted average
const avg = weightedAverage([
  { value: 80, weight: 0.3 },
  { value: 90, weight: 0.5 },
  { value: 70, weight: 0.2 }
]);

// Detect outliers in data
const data = [10, 12, 11, 13, 100, 14, 12, 11];
const { outliers, threshold } = detectOutliers(data);
console.log(outliers); // [100]

// Calculate trend direction
const timeSeries = [100, 105, 110, 115, 120];
const trend = calculateTrend(timeSeries); // 'increasing'

// Cosine similarity between vectors
const vecA = [1, 2, 3, 4];
const vecB = [2, 3, 4, 5];
const similarity = cosineSimilarity(vecA, vecB);
```

## Pre-registered Models

The following models are pre-registered and ready to use:

1. **lead-scoring-v1** - Lead quality prediction (87.5% accuracy)
2. **churn-prediction-v1** - Customer churn risk (82.3% accuracy)
3. **sentiment-analysis-v1** - Email/text sentiment (88.7% accuracy)
4. **revenue-forecast-v1** - Revenue forecasting (MAE: 8,200)
5. **product-recommendation-v1** - Product recommendations (75.8% precision)

## Model Types

- `classification` - Binary or multi-class classification
- `regression` - Continuous value prediction
- `clustering` - Unsupervised grouping
- `nlp` - Natural language processing
- `recommendation` - Item recommendations
- `forecasting` - Time series forecasting

## Caching

Predictions are cached by default with a 5-minute TTL. To disable caching:

```typescript
const result = await PredictionService.predict({
  modelId: 'my-model',
  features: { ... },
  useCache: false
});

// Clear all cached predictions
await PredictionService.clearCache();
```

## Performance Monitoring

All predictions are automatically logged for monitoring. In production, integrate with your monitoring system:

```typescript
// Predictions include timing information
console.log(result.processingTime); // ms
console.log(result.cached); // true/false
```

## Environment Variables

```bash
# AWS SageMaker (optional)
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1

# Azure ML (optional)
AZURE_ML_ENDPOINT=https://your-endpoint
AZURE_ML_API_KEY=your_key

# OpenAI (optional)
OPENAI_API_KEY=your_key

# Redis (optional)
REDIS_URL=redis://localhost:6379
```

## Best Practices

1. **Use caching for repeated predictions** - Significant performance improvement
2. **Batch predictions when possible** - More efficient than individual calls
3. **Monitor model metrics** - Track accuracy, precision, recall over time
4. **Update models regularly** - Retrain with new data to maintain performance
5. **Handle errors gracefully** - Always have fallback logic for prediction failures
6. **Use A/B testing** - Gradually roll out model improvements
7. **Monitor health status** - Set up alerts for degraded models
8. **Explain predictions** - Build trust with transparent AI

## Documentation

- [AI Capabilities Guide](../../docs/AI_CAPABILITIES.md) - Comprehensive implementation guide
- [API Reference](./src/) - Full API documentation

## Contributing

When adding new models or utilities:

1. Register models in `model-registry.ts`
2. Add utility functions to `utils.ts` with proper tests
3. Update this README with examples
4. Ensure TypeScript types are exported

## License

MIT
