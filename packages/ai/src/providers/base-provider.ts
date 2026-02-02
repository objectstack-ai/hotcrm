/**
 * Base ML Provider Interface
 * 
 * Abstract interface that all ML providers must implement
 */

export interface MLProviderConfig {
  /** Provider name */
  provider: 'aws-sagemaker' | 'azure-ml' | 'openai' | 'anthropic' | 'custom';
  
  /** API endpoint */
  endpoint?: string;
  
  /** Authentication credentials */
  credentials: {
    apiKey?: string;
    secretKey?: string;
    region?: string;
    [key: string]: any;
  };
  
  /** Additional configuration */
  config?: Record<string, any>;
}

export interface PredictionInput {
  features: Record<string, any>;
  context?: Record<string, any>;
}

export interface PredictionOutput<T = any> {
  prediction: T;
  confidence: number;
  metadata?: Record<string, any>;
}

/**
 * Base ML Provider
 * All provider implementations must extend this class
 */
export abstract class BaseMLProvider {
  protected config: MLProviderConfig;
  
  constructor(config: MLProviderConfig) {
    this.config = config;
  }
  
  /**
   * Validate provider configuration
   */
  abstract validate(): Promise<boolean>;
  
  /**
   * Make a prediction using the provider
   */
  abstract predict<T = any>(
    modelId: string,
    input: PredictionInput
  ): Promise<PredictionOutput<T>>;
  
  /**
   * Batch predictions
   */
  abstract batchPredict<T = any>(
    modelId: string,
    inputs: PredictionInput[]
  ): Promise<PredictionOutput<T>[]>;
  
  /**
   * Health check for the provider
   */
  abstract healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }>;
}

export default BaseMLProvider;
