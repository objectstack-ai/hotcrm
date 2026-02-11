# Agent Architecture

> Sources: `packages/ai/src/index.ts`, `prediction-service.ts`, `cache-manager.ts`, `performance-monitor.ts`, `explainability-service.ts`, `mcp_server.config.ts`

## Architecture Layers

The AI package is organized in a layered pipeline. Each request flows top-to-bottom; responses bubble back up through caching and monitoring.

```
 External Callers (CRM, Support, HR, Finance, Marketing, Products)
         │
         ▼
 ┌───────────────────┐
 │   MCP Server      │  Exposes tools/resources/prompts to AI agents
 └────────┬──────────┘
          ▼
 ┌───────────────────┐
 │ Prediction Service│  Unified predict() + batchPredict()
 │  • A/B testing    │  Routes to champion or challenger model
 │  • Error handling │  Falls back to mock predictions in dev
 └──┬──────┬──────┬──┘
    │      │      │
    ▼      ▼      ▼
 ┌──────┐┌──────┐┌────────────────┐
 │Cache ││Perf  ││Explainability  │
 │Mgr   ││Mon.  ││Service         │
 └──┬───┘└──┬───┘└────────────────┘
    │       │
    ▼       ▼
 ┌───────────────────┐
 │  Model Registry   │  Static catalog of ModelConfig entries
 └────────┬──────────┘
          ▼
 ┌───────────────────┐
 │ Provider Factory   │  Creates & caches BaseMLProvider instances
 │ ┌───────┬────────┐ │
 │ │OpenAI │SageMkr │ │
 │ ├───────┼────────┤ │
 │ │AzureML│ Custom │ │
 │ └───────┴────────┘ │
 └───────────────────┘
```

## Prediction Service

`PredictionService` is the main entry point for all model inference. It is a static class.

### Request / Response Types

```typescript
interface PredictionRequest {
  modelId: string;
  features: Record<string, any>;
  context?: { userId?: string; objectType?: string; objectId?: string };
  useCache?: boolean;            // default: true
  forceProvider?: BaseMLProvider; // override model's default provider
}

interface PredictionResponse<T = any> {
  prediction: T;
  confidence: number;            // 0-100
  modelId: string;
  modelVersion: string;
  processingTime: number;        // ms
  cached: boolean;
  metadata?: Record<string, any>;
}
```

### Prediction Flow

1. **Resolve model** — Look up `ModelConfig` from `ModelRegistry`. Reject if not found or not `active`.
2. **A/B test selection** — If `abTest.enabled`, randomly route to challenger (`trafficPercentage` %) or champion.
3. **Cache check** — Generate a deterministic cache key (`pred:{modelId}:{features}`). Return cached response on hit.
4. **Invoke provider** — If `providerConfig` is set, `ProviderFactory.getProvider()` creates the right provider and calls `predict()`. Falls back to built-in mock predictions when no provider is configured (dev/testing).
5. **Cache write** — Store the result with a 5-minute TTL.
6. **Record metrics** — `PerformanceMonitor.recordPrediction()` logs latency, confidence, cache status, and errors.

### Usage

```typescript
import { PredictionService } from '@hotcrm/ai';

const result = await PredictionService.predict<{ class: string; score: number }>({
  modelId: 'lead-scoring-v1',
  features: { company_size: 500, engagement_score: 78 },
  context: { objectType: 'lead', objectId: 'lead-123' },
});

console.log(result.prediction.score);  // e.g. 82
console.log(result.confidence);        // e.g. 87.5
console.log(result.cached);            // false (first call)
```

### Batch Predictions

```typescript
const results = await PredictionService.batchPredict('lead-scoring-v1', [
  { company_size: 500, engagement_score: 78 },
  { company_size: 50,  engagement_score: 30 },
]);
```

If the underlying provider supports native batch (e.g. Azure ML sends all features in a single HTTP call), it is used automatically. Otherwise, predictions run in parallel.

## Cache Manager

`CacheManager` is a singleton that supports Redis with an in-memory fallback.

### Configuration

```typescript
interface CacheConfig {
  redisUrl?: string;          // If omitted, in-memory only
  defaultTtl?: number;        // Seconds, default 300 (5 min)
  enabled?: boolean;          // default true
  useMemoryFallback?: boolean; // default true
}
```

### Behavior

- **TTL-based expiration** — Each entry carries its own TTL. Reads check expiration and evict stale entries.
- **Probabilistic cleanup** — On every `set()`, there is a 10% chance of scanning for and deleting all expired entries (in-memory backend).
- **Hit tracking** — Each `get()` hit increments a counter per entry.

### Stats

```typescript
const stats = CacheManager.getInstance().getStats();
// { size: 42, hits: 128, backend: 'memory' }
```

## Performance Monitor

`PerformanceMonitor` is a singleton that collects `PredictionMetric` records per model and computes aggregate statistics.

### Recorded Metrics

Each prediction records:

```typescript
interface PredictionMetric {
  modelId: string;
  timestamp: number;
  latency: number;
  confidence: number;
  cached: boolean;
  success: boolean;
  error?: string;
  provider?: string;
}
```

### Computed Statistics

`getModelStats(modelId, timeWindowMs?)` returns:

| Metric | Description |
|--------|-------------|
| `totalPredictions` | Total count |
| `successfulPredictions` | Success count |
| `failedPredictions` | Failure count |
| `averageLatency` | Mean latency (ms) |
| `medianLatency` | P50 latency |
| `p95Latency` | P95 latency |
| `p99Latency` | P99 latency |
| `averageConfidence` | Mean confidence of successful predictions |
| `cacheHitRate` | Percentage of cache hits |
| `errorRate` | Percentage of failures |

### Health Status

`getHealthStatus(modelId)` evaluates the last 5 minutes and returns:

| Status | Condition |
|--------|-----------|
| `healthy` | Error rate ≤ 5% and P95 latency ≤ 500ms |
| `degraded` | Error rate 5–10% **or** P95 latency > 500ms |
| `unhealthy` | Error rate > 10% |

## Explainability Service

`ExplainabilityService` provides SHAP-like feature attributions for predictions.

### explainPrediction

```typescript
import { ExplainabilityService } from '@hotcrm/ai';

const explanation = await ExplainabilityService.explainPrediction(
  'lead-scoring-v1',
  { company_size: 500, engagement_score: 78, industry: 'tech' },
  { class: 'positive', score: 82 },
  87.5
);

console.log(explanation.topFeatures);
// Top 5 features by absolute importance
console.log(explanation.explanation);
// Human-readable text with positive/negative factors
```

### comparePredictions

Compare two feature sets to understand what drives different outcomes:

```typescript
const diff = await ExplainabilityService.comparePredictions(
  'churn-prediction-v1',
  { account_age: 24, support_tickets: 2, usage_frequency: 80 },
  { account_age: 24, support_tickets: 15, usage_frequency: 30 },
);
// diff.differences → sorted by impact
// diff.explanation → "Support Tickets changed from 2 to 15, which increased the prediction"
```

### Feature Weights

The service uses model-specific feature weights internally:

| Model | Features & Weights |
|-------|-------------------|
| `lead-scoring-*` | engagement_score (0.35), company_size (0.25), industry (0.15), job_title (0.15), budget (0.10) |
| `churn-*` | support_tickets (0.30), usage_frequency (0.25), account_age (0.20), nps_score (0.15), payment_delays (0.10) |

## MCP Server Integration

The MCP server config (`mcp_server.config.ts`) wires AI capabilities as tools, resources, and prompts that external AI agents can invoke. Each MCP tool's `handler` string maps to actions defined in business packages (e.g. `crm.lead_scoring.execute`).

This allows AI agents to autonomously:
- Score leads and forecast opportunities (CRM)
- Classify and resolve support cases (Support)
- Screen candidates (HR)
- Forecast revenue (Finance)
- Optimize campaigns (Marketing)
- Recommend pricing (Products)

See [MCP Integration](./mcp_integration.md) for full details.

## Cross-Package AI Integration

Business packages integrate with the AI layer by:

1. **Registering models** in their own setup code via `ModelRegistry.register()`.
2. **Calling `PredictionService.predict()`** from `*.action.ts` or `*.hook.ts` files.
3. **Exposing MCP tools** by adding entries to `mcp_server.config.ts` with a `handler` pointing to the package's action.

```
packages/crm/src/lead_scoring.action.ts
  → calls PredictionService.predict('lead-scoring-v1', ...)
  → exposed as MCP tool "lead_scoring"

packages/support/src/case_classification.action.ts
  → calls PredictionService.predict('sentiment-analysis-v1', ...)
  → exposed as MCP tool "case_classification"
```
