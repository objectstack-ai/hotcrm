/**
 * @hotcrm/ai - Unified AI Service Layer
 * 
 * Central AI/ML infrastructure for HotCRM
 * Provides model registry, prediction services, and shared utilities
 */

export { ModelRegistry, ModelConfig, ModelType, ModelProvider } from './model-registry';
export { PredictionService, PredictionRequest, PredictionResponse } from './prediction-service';
export { default as AIUtils } from './utils';

// Provider exports
export * from './providers';

// Cache and monitoring exports
export { CacheManager } from './cache-manager';
export { PerformanceMonitor } from './performance-monitor';
export { ExplainabilityService } from './explainability-service';

// Object exports (disabled until dependencies are resolved)
// export { default as ai_prediction } from './ai_prediction.object';
// export { default as ai_model_performance } from './ai_model_performance.object';

// Re-export all utilities
export {
  calculateConfidence,
  normalizeScore,
  weightedAverage,
  sigmoid,
  cosineSimilarity,
  standardDeviation,
  detectOutliers,
  movingAverage,
  exponentialSmoothing,
  calculateTrend,
  minMaxScale,
  zScoreNormalize,
  pearsonCorrelation,
  kMeansClustering
} from './utils';
