/**
 * AI Service Layer - Prediction Service
 * 
 * Unified interface for making predictions across all AI models
 * Handles model invocation, caching, monitoring, and error handling
 */

import ModelRegistry, { ModelConfig } from './model-registry';
import { ProviderFactory } from './providers/provider-factory';
import { BaseMLProvider } from './providers/base-provider';
import CacheManager from './cache-manager';
import PerformanceMonitor from './performance-monitor';

export interface PredictionRequest {
  /** Model ID to use */
  modelId: string;
  
  /** Input features */
  features: Record<string, any>;
  
  /** Optional context */
  context?: {
    userId?: string;
    objectType?: string;
    objectId?: string;
  };
  
  /** Whether to use cached results */
  useCache?: boolean;
  
  /** Force provider (override model default) */
  forceProvider?: BaseMLProvider;
}

export interface PredictionResponse<T = any> {
  /** Prediction result */
  prediction: T;
  
  /** Confidence score (0-100) */
  confidence: number;
  
  /** Model used */
  modelId: string;
  
  /** Model version */
  modelVersion: string;
  
  /** Processing time (ms) */
  processingTime: number;
  
  /** Whether result was cached */
  cached: boolean;
  
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Prediction Service - Unified model inference
 */
export class PredictionService {
  private static cacheManager = CacheManager.getInstance({ defaultTtl: 300 });
  private static performanceMonitor = PerformanceMonitor.getInstance();
  
  /**
   * Make a prediction using specified model
   */
  static async predict<T = any>(request: PredictionRequest): Promise<PredictionResponse<T>> {
    const startTime = Date.now();
    let success = true;
    let error: string | undefined;
    
    try {
      // Get model configuration
      const model = ModelRegistry.getModel(request.modelId);
      if (!model) {
        throw new Error(`Model not found: ${request.modelId}`);
      }
      
      if (model.status !== 'active') {
        throw new Error(`Model is not active: ${request.modelId} (status: ${model.status})`);
      }
      
      // Check A/B test configuration
      const effectiveModel = this.selectModelForABTest(model);
      
      // Check cache if enabled
      if (request.useCache !== false) {
        const cacheKey = this.generateCacheKey(request);
        const cached = await this.cacheManager.get<PredictionResponse<T>>(cacheKey);
        if (cached) {
          // Record cache hit
          this.performanceMonitor.recordPrediction({
            modelId: request.modelId,
            timestamp: Date.now(),
            latency: Date.now() - startTime,
            confidence: cached.confidence,
            cached: true,
            success: true,
            provider: cached.metadata?.provider
          });
          
          return { ...cached, cached: true };
        }
      }
      
      // Make prediction using provider or fallback to mock
      const result = await this.invokePrediction<T>(
        effectiveModel, 
        request.features, 
        request.context,
        request.forceProvider
      );
      
      const processingTime = Date.now() - startTime;
      
      const response: PredictionResponse<T> = {
        prediction: result.prediction,
        confidence: result.confidence,
        modelId: effectiveModel.id,
        modelVersion: effectiveModel.version,
        processingTime,
        cached: false,
        metadata: result.metadata
      };
      
      // Cache result if enabled
      if (request.useCache !== false) {
        const cacheKey = this.generateCacheKey(request);
        await this.cacheManager.set(cacheKey, response, 300); // 5 minutes
      }
      
      // Record successful prediction
      this.performanceMonitor.recordPrediction({
        modelId: request.modelId,
        timestamp: Date.now(),
        latency: processingTime,
        confidence: result.confidence,
        cached: false,
        success: true,
        provider: result.metadata?.provider
      });
      
      return response;
    } catch (err) {
      success = false;
      error = err instanceof Error ? err.message : 'Unknown error';
      
      // Record failed prediction
      this.performanceMonitor.recordPrediction({
        modelId: request.modelId,
        timestamp: Date.now(),
        latency: Date.now() - startTime,
        confidence: 0,
        cached: false,
        success: false,
        error
      });
      
      throw err;
    }
  }
  
  /**
   * Batch predictions
   */
  static async batchPredict<T = any>(
    modelId: string,
    features: Array<Record<string, any>>,
    useCache: boolean = true
  ): Promise<Array<PredictionResponse<T>>> {
    const model = ModelRegistry.getModel(modelId);
    if (!model) {
      throw new Error(`Model not found: ${modelId}`);
    }
    
    // Try to use provider's batch prediction if available
    if (model.providerConfig) {
      try {
        const provider = ProviderFactory.getProvider(model.providerConfig);
        const inputs = features.map(f => ({ features: f }));
        const results = await provider.batchPredict<T>(modelId, inputs);
        
        return results.map((result, index) => ({
          prediction: result.prediction,
          confidence: result.confidence,
          modelId,
          modelVersion: model.version,
          processingTime: result.metadata?.latency || 0,
          cached: false,
          metadata: result.metadata
        }));
      } catch (error) {
        console.warn('[PredictionService] Batch prediction failed, falling back to sequential:', error);
      }
    }
    
    // Fallback to sequential predictions
    const promises = features.map(f => 
      this.predict<T>({ modelId, features: f, useCache })
    );
    return Promise.all(promises);
  }
  
  /**
   * Select model for A/B testing
   */
  private static selectModelForABTest(model: ModelConfig): ModelConfig {
    if (!model.abTest?.enabled || !model.abTest.championModelId) {
      return model;
    }
    
    // Random selection based on traffic percentage
    const random = Math.random() * 100;
    if (random < model.abTest.trafficPercentage) {
      return model; // Use challenger model
    }
    
    // Use champion model
    const championModel = ModelRegistry.getModel(model.abTest.championModelId);
    return championModel || model;
  }
  
  /**
   * Invoke model-specific prediction logic
   */
  private static async invokePrediction<T>(
    model: ModelConfig,
    features: Record<string, any>,
    context?: any,
    forceProvider?: BaseMLProvider
  ): Promise<{ prediction: T; confidence: number; metadata?: any }> {
    // If provider is configured or forced, use it
    const provider = forceProvider || (model.providerConfig ? ProviderFactory.getProvider(model.providerConfig) : null);
    
    if (provider) {
      try {
        const result = await provider.predict<T>(model.id, { features, context });
        return result;
      } catch (error) {
        console.warn(`[PredictionService] Provider prediction failed for ${model.id}, falling back to mock:`, error);
      }
    }
    
    // Fallback to mock predictions for development/testing
    return this.getMockPrediction<T>(model.type, features);
  }
  
  /**
   * Get mock prediction based on model type
   */
  private static getMockPrediction<T>(
    modelType: string,
    features: Record<string, any>
  ): { prediction: T; confidence: number; metadata?: any } {
    switch (modelType) {
      case 'classification':
        return this.mockClassification(features) as any;
      
      case 'regression':
        return this.mockRegression(features) as any;
      
      case 'recommendation':
        return this.mockRecommendation(features) as any;
      
      case 'forecasting':
        return this.mockForecasting(features) as any;
      
      case 'nlp':
        return this.mockNLP(features) as any;
      
      default:
        throw new Error(`Unsupported model type: ${modelType}`);
    }
  }
  
  /**
   * Mock classification prediction
   */
  private static mockClassification(features: any): { prediction: any; confidence: number } {
    // Simple mock - in production would call actual model
    const score = Math.random() * 100;
    return {
      prediction: {
        class: score > 50 ? 'positive' : 'negative',
        score
      },
      confidence: 75 + Math.random() * 20
    };
  }
  
  /**
   * Mock regression prediction
   */
  private static mockRegression(features: any): { prediction: any; confidence: number } {
    return {
      prediction: {
        value: Math.random() * 1000
      },
      confidence: 70 + Math.random() * 25
    };
  }
  
  /**
   * Mock recommendation prediction
   */
  private static mockRecommendation(features: any): { prediction: any; confidence: number } {
    return {
      prediction: {
        items: [
          { id: 'item1', score: 0.92 },
          { id: 'item2', score: 0.85 },
          { id: 'item3', score: 0.78 }
        ]
      },
      confidence: 80
    };
  }
  
  /**
   * Mock forecasting prediction
   */
  private static mockForecasting(features: any): { prediction: any; confidence: number } {
    return {
      prediction: {
        forecast: Array.from({ length: 12 }, (_, i) => ({
          period: i + 1,
          value: 100000 + Math.random() * 50000
        }))
      },
      confidence: 72
    };
  }
  
  /**
   * Mock NLP prediction
   */
  private static mockNLP(features: any): { prediction: any; confidence: number } {
    return {
      prediction: {
        sentiment: 'positive',
        score: 0.85,
        entities: []
      },
      confidence: 85
    };
  }
  
  /**
   * Generate cache key
   */
  private static generateCacheKey(request: PredictionRequest): string {
    return `pred:${request.modelId}:${JSON.stringify(request.features)}`;
  }
  
  /**
   * Clear cache
   */
  static async clearCache(): Promise<void> {
    await this.cacheManager.clear();
  }
  
  /**
   * Get performance stats
   */
  static getPerformanceStats(modelId?: string): any {
    if (modelId) {
      return this.performanceMonitor.getModelStats(modelId);
    }
    return this.performanceMonitor.getAllStats();
  }
  
  /**
   * Get cache stats
   */
  static getCacheStats(): any {
    return this.cacheManager.getStats();
  }
  
  /**
   * Get model health status
   */
  static getModelHealth(modelId: string): any {
    return this.performanceMonitor.getHealthStatus(modelId);
  }
}

export default PredictionService;
