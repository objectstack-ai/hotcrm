/**
 * @hotcrm/ai - Unified AI Service Layer
 * 
 * Central AI/ML infrastructure for HotCRM
 * Provides model registry, prediction services, and shared utilities
 */

export { ModelRegistry, ModelConfig, ModelType, ModelProvider } from './model-registry';
export { PredictionService, PredictionRequest, PredictionResponse } from './prediction-service';
export { default as AIUtils } from './utils';

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
