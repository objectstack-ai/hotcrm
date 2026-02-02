/**
 * AI Service Layer - Model Registry
 * 
 * Central registry for all AI/ML models used across HotCRM
 * Provides model versioning, configuration, and lifecycle management
 */

import { MLProviderConfig } from './providers/base-provider';

export type ModelType = 
  | 'classification'
  | 'regression'
  | 'clustering'
  | 'nlp'
  | 'recommendation'
  | 'forecasting';

export type ModelProvider = 
  | 'aws-sagemaker'
  | 'azure-ml'
  | 'openai'
  | 'anthropic'
  | 'custom'
  | 'scikit-learn'
  | 'tensorflow'
  | 'pytorch';

export interface ModelConfig {
  /** Unique model identifier */
  id: string;
  
  /** Model name */
  name: string;
  
  /** Model version */
  version: string;
  
  /** Model type */
  type: ModelType;
  
  /** Provider/framework */
  provider: ModelProvider;
  
  /** Model description */
  description: string;
  
  /** Model endpoint (if remote) */
  endpoint?: string;
  
  /** API key/credentials (if needed) */
  credentials?: {
    apiKey?: string;
    secretKey?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    region?: string;
  };
  
  /** Provider configuration for ML providers */
  providerConfig?: MLProviderConfig;
  
  /** Model hyperparameters */
  parameters?: Record<string, any>;
  
  /** Performance metrics */
  metrics?: {
    accuracy?: number;
    precision?: number;
    recall?: number;
    f1Score?: number;
    mse?: number;
    mae?: number;
  };
  
  /** Last trained date */
  lastTrained?: string;
  
  /** Model status */
  status: 'active' | 'deprecated' | 'training' | 'testing';
  
  /** A/B testing configuration */
  abTest?: {
    enabled: boolean;
    trafficPercentage: number; // 0-100
    championModelId?: string;
  };
}

/**
 * Model Registry - Centralized model configuration
 */
export class ModelRegistry {
  private static models: Map<string, ModelConfig> = new Map();
  
  /**
   * Register a new model
   */
  static register(config: ModelConfig): void {
    this.models.set(config.id, config);
  }
  
  /**
   * Get model configuration
   */
  static getModel(modelId: string): ModelConfig | undefined {
    return this.models.get(modelId);
  }
  
  /**
   * List all models
   */
  static listModels(filter?: { type?: ModelType; status?: string }): ModelConfig[] {
    let models = Array.from(this.models.values());
    
    if (filter?.type) {
      models = models.filter(m => m.type === filter.type);
    }
    
    if (filter?.status) {
      models = models.filter(m => m.status === filter.status);
    }
    
    return models;
  }
  
  /**
   * Update model status
   */
  static updateStatus(modelId: string, status: ModelConfig['status']): void {
    const model = this.models.get(modelId);
    if (model) {
      model.status = status;
      this.models.set(modelId, model);
    }
  }
  
  /**
   * Remove model from registry
   */
  static unregister(modelId: string): void {
    this.models.delete(modelId);
  }
}

// Register default models
ModelRegistry.register({
  id: 'lead-scoring-v1',
  name: 'Lead Scoring Model',
  version: '1.0.0',
  type: 'classification',
  provider: 'custom',
  description: 'ML-based lead quality prediction',
  status: 'active',
  metrics: {
    accuracy: 87.5,
    precision: 85.2,
    recall: 89.1,
    f1Score: 87.1
  }
});

ModelRegistry.register({
  id: 'churn-prediction-v1',
  name: 'Churn Prediction Model',
  version: '1.0.0',
  type: 'classification',
  provider: 'custom',
  description: 'Customer churn risk prediction',
  status: 'active',
  metrics: {
    accuracy: 82.3,
    precision: 80.5,
    recall: 84.2,
    f1Score: 82.3
  }
});

ModelRegistry.register({
  id: 'sentiment-analysis-v1',
  name: 'Sentiment Analysis',
  version: '1.0.0',
  type: 'nlp',
  provider: 'custom',
  description: 'Email and text sentiment analysis',
  status: 'active',
  metrics: {
    accuracy: 88.7,
    precision: 87.3,
    recall: 89.9,
    f1Score: 88.6
  }
});

ModelRegistry.register({
  id: 'revenue-forecast-v1',
  name: 'Revenue Forecasting',
  version: '1.0.0',
  type: 'forecasting',
  provider: 'custom',
  description: 'Revenue and pipeline forecasting',
  status: 'active',
  metrics: {
    mse: 12500,
    mae: 8200
  }
});

ModelRegistry.register({
  id: 'product-recommendation-v1',
  name: 'Product Recommendation',
  version: '1.0.0',
  type: 'recommendation',
  provider: 'custom',
  description: 'Product and cross-sell recommendations',
  status: 'active',
  metrics: {
    precision: 75.8,
    recall: 78.3
  }
});

export default ModelRegistry;
