# AI Package (`@hotcrm/ai`)

Technical specification for the HotCRM AI service layer.

## Overview

The `@hotcrm/ai` package provides unified AI/ML infrastructure for the entire HotCRM platform. It handles model management, prediction routing, caching, performance monitoring, explainability, and MCP server integration.

## Architecture

```
┌──────────────────────────────────────────────────┐
│                  MCP Server                      │
│         (Tools · Resources · Prompts)            │
├──────────────────────────────────────────────────┤
│              Prediction Service                  │
│        (A/B Testing · Error Handling)            │
├─────────────┬──────────────┬─────────────────────┤
│ Cache Mgr   │ Perf Monitor │ Explainability Svc  │
├─────────────┴──────────────┴─────────────────────┤
│              Model Registry                      │
├──────────────────────────────────────────────────┤
│            Provider Factory                      │
│   ┌──────────┬───────────┬──────────────┐        │
│   │  OpenAI  │ SageMaker │   Azure ML   │        │
│   └──────────┴───────────┴──────────────┘        │
└──────────────────────────────────────────────────┘
```

## Specification Documents

| Document | Description |
|----------|-------------|
| [Model Registry](./model_registry.md) | Model registration, configuration, providers, and lifecycle |
| [Agent Architecture](./agent_architecture.md) | Service layers, prediction pipeline, caching, and monitoring |
| [MCP Integration](./mcp_integration.md) | Model Context Protocol tools, resources, and prompts |

## Key Exports

```typescript
// Core
export { ModelRegistry, ModelConfig, ModelType, ModelProvider } from './model-registry';
export { PredictionService, PredictionRequest, PredictionResponse } from './prediction-service';

// Providers
export { ProviderFactory, BaseMLProvider } from './providers';
export { OpenAIProvider } from './providers/openai-provider';
export { AWSSageMakerProvider } from './providers/aws-sagemaker-provider';
export { AzureMLProvider } from './providers/azure-ml-provider';

// Infrastructure
export { CacheManager } from './cache-manager';
export { PerformanceMonitor } from './performance-monitor';
export { ExplainabilityService } from './explainability-service';

// MCP
export { hotcrmMCPServerConfig } from './mcp_server.config';

// GenAI Reporting
export { processNaturalLanguageQuery, parseNaturalLanguageQuery,
         recommendVisualization, generateNarrative, suggestFollowUps
       } from './genai_reporting.action';

// Math Utilities
export { calculateConfidence, normalizeScore, sigmoid, cosineSimilarity,
         pearsonCorrelation, kMeansClustering, /* ... */
       } from './utils';
```

## Source Layout

```
packages/ai/src/
├── index.ts                      # Public API
├── model-registry.ts             # Model registration & config
├── prediction-service.ts         # Unified prediction interface
├── cache-manager.ts              # Redis / in-memory cache
├── performance-monitor.ts        # Latency & error tracking
├── explainability-service.ts     # SHAP-like feature attributions
├── mcp_server.config.ts          # MCP server definition
├── genai_reporting.action.ts     # Natural language → report queries
├── utils/                        # Math & ML helper functions
└── providers/
    ├── base-provider.ts          # Abstract base class
    ├── openai-provider.ts        # OpenAI integration
    ├── aws-sagemaker-provider.ts # AWS SageMaker integration
    ├── azure-ml-provider.ts      # Azure ML integration
    ├── provider-factory.ts       # Factory + caching
    └── index.ts                  # Provider barrel exports
```
