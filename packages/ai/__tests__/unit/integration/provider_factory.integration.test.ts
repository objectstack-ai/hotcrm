import { ProviderFactory } from '../../../src/providers/provider-factory';
import { BaseMLProvider, MLProviderConfig, PredictionInput, PredictionOutput } from '../../../src/providers/base-provider';
import { AWSSageMakerProvider } from '../../../src/providers/aws-sagemaker-provider';
import { AzureMLProvider } from '../../../src/providers/azure-ml-provider';
import { OpenAIProvider } from '../../../src/providers/openai-provider';
import { ModelRegistry, ModelConfig } from '../../../src/model-registry';
import { PredictionService } from '../../../src/prediction-service';
import { CacheManager } from '../../../src/cache-manager';
import { PerformanceMonitor } from '../../../src/performance-monitor';

describe('Provider Factory Integration Tests', () => {
  beforeEach(async () => {
    ProviderFactory.clearCache();
    ModelRegistry.clear();
    await CacheManager.getInstance().clear();
    PerformanceMonitor.getInstance().clearAll();
  });

  afterEach(async () => {
    ProviderFactory.clearCache();
    await CacheManager.getInstance().clear();
  });

  // ─── 1. Provider factory creates correct provider instances ──────────────

  describe('provider factory creates correct provider instances', () => {
    it('should create an OpenAI provider with correct configuration', () => {
      const config: MLProviderConfig = {
        provider: 'openai',
        credentials: { apiKey: 'sk-test-key-123' },
        config: { model: 'gpt-4', temperature: 0.3 }
      };

      const provider = ProviderFactory.getProvider(config);

      expect(provider).toBeInstanceOf(OpenAIProvider);
    });

    it('should create an AWS SageMaker provider with correct configuration', () => {
      const config: MLProviderConfig = {
        provider: 'aws-sagemaker',
        credentials: {
          accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
          secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
          region: 'us-east-1'
        }
      };

      const provider = ProviderFactory.getProvider(config);

      expect(provider).toBeInstanceOf(AWSSageMakerProvider);
    });

    it('should create an Azure ML provider with correct configuration', () => {
      const config: MLProviderConfig = {
        provider: 'azure-ml',
        endpoint: 'https://my-workspace.azureml.net/score',
        credentials: {
          apiKey: 'azure-test-key-456',
          endpoint: 'https://my-workspace.azureml.net/score'
        }
      };

      const provider = ProviderFactory.getProvider(config);

      expect(provider).toBeInstanceOf(AzureMLProvider);
    });

    it('should cache and return the same provider instance for identical configs', () => {
      const config: MLProviderConfig = {
        provider: 'openai',
        credentials: { apiKey: 'sk-test-key-123' }
      };

      const first = ProviderFactory.getProvider(config);
      const second = ProviderFactory.getProvider(config);

      expect(first).toBe(second);
    });

    it('should create separate instances for different endpoints', () => {
      const configA: MLProviderConfig = {
        provider: 'azure-ml',
        endpoint: 'https://workspace-a.azureml.net/score',
        credentials: { apiKey: 'key-a', endpoint: 'https://workspace-a.azureml.net/score' }
      };
      const configB: MLProviderConfig = {
        provider: 'azure-ml',
        endpoint: 'https://workspace-b.azureml.net/score',
        credentials: { apiKey: 'key-b', endpoint: 'https://workspace-b.azureml.net/score' }
      };

      const providerA = ProviderFactory.getProvider(configA);
      const providerB = ProviderFactory.getProvider(configB);

      expect(providerA).not.toBe(providerB);
      expect(providerA).toBeInstanceOf(AzureMLProvider);
      expect(providerB).toBeInstanceOf(AzureMLProvider);
    });
  });

  // ─── 2. Provider factory throws for unknown provider types ───────────────

  describe('provider factory throws for unknown provider types', () => {
    it('should throw for a completely unsupported provider', () => {
      const config = {
        provider: 'google-vertex-ai',
        credentials: { apiKey: 'test' }
      } as any;

      expect(() => ProviderFactory.getProvider(config)).toThrow('Unsupported provider: google-vertex-ai');
    });

    it('should throw for custom provider type without prior registration', () => {
      const config: MLProviderConfig = {
        provider: 'custom',
        credentials: { apiKey: 'test' }
      };

      expect(() => ProviderFactory.getProvider(config)).toThrow('Custom provider must be registered separately');
    });

    it('should accept a custom provider via registerProvider', () => {
      const mockProvider = {
        validate: vi.fn().mockResolvedValue(true),
        predict: vi.fn().mockResolvedValue({ prediction: 42, confidence: 90 }),
        batchPredict: vi.fn().mockResolvedValue([]),
        healthCheck: vi.fn().mockResolvedValue({ healthy: true })
      } as unknown as BaseMLProvider;

      ProviderFactory.registerProvider('custom:my-engine', mockProvider);

      const allProviders = ProviderFactory.getAllProviders();
      expect(allProviders.get('custom:my-engine')).toBe(mockProvider);
    });
  });

  // ─── 3. Model registry registers and retrieves models ────────────────────

  describe('model registry registers and retrieves models', () => {
    it('should register a model and retrieve it by id', () => {
      const model: ModelConfig = {
        id: 'lead-scoring-v2',
        name: 'Lead Scoring V2',
        version: '2.0.0',
        type: 'classification',
        provider: 'aws-sagemaker',
        description: 'Improved lead scoring using gradient boosting',
        status: 'active',
        metrics: { accuracy: 91.2, precision: 89.5, recall: 92.8, f1Score: 91.1 }
      };

      ModelRegistry.register(model);
      const retrieved = ModelRegistry.getModel('lead-scoring-v2');

      expect(retrieved).toBeDefined();
      expect(retrieved!.name).toBe('Lead Scoring V2');
      expect(retrieved!.metrics?.accuracy).toBe(91.2);
    });

    it('should list models filtered by type', () => {
      ModelRegistry.register({
        id: 'nlp-1', name: 'NLP Model', version: '1.0.0',
        type: 'nlp', provider: 'openai', description: 'Sentiment', status: 'active'
      });
      ModelRegistry.register({
        id: 'forecast-1', name: 'Forecast Model', version: '1.0.0',
        type: 'forecasting', provider: 'custom', description: 'Revenue', status: 'active'
      });

      const nlpModels = ModelRegistry.listModels({ type: 'nlp' });
      const forecastModels = ModelRegistry.listModels({ type: 'forecasting' });

      expect(nlpModels).toHaveLength(1);
      expect(nlpModels[0].id).toBe('nlp-1');
      expect(forecastModels).toHaveLength(1);
      expect(forecastModels[0].id).toBe('forecast-1');
    });

    it('should return undefined for non-existent model', () => {
      expect(ModelRegistry.getModel('does-not-exist')).toBeUndefined();
    });
  });

  // ─── 4. Model registry handles model versioning ──────────────────────────

  describe('model registry handles model versioning', () => {
    it('should overwrite an older version when re-registered with same id', () => {
      ModelRegistry.register({
        id: 'churn-v1', name: 'Churn V1', version: '1.0.0',
        type: 'classification', provider: 'custom', description: 'V1', status: 'active'
      });

      ModelRegistry.register({
        id: 'churn-v1', name: 'Churn V1 Updated', version: '1.1.0',
        type: 'classification', provider: 'custom', description: 'V1 patched', status: 'active'
      });

      const model = ModelRegistry.getModel('churn-v1');
      expect(model!.version).toBe('1.1.0');
      expect(model!.name).toBe('Churn V1 Updated');
    });

    it('should allow multiple model versions with different ids', () => {
      ModelRegistry.register({
        id: 'churn-v1', name: 'Churn V1', version: '1.0.0',
        type: 'classification', provider: 'custom', description: 'V1', status: 'deprecated'
      });
      ModelRegistry.register({
        id: 'churn-v2', name: 'Churn V2', version: '2.0.0',
        type: 'classification', provider: 'aws-sagemaker', description: 'V2', status: 'active'
      });

      const v1 = ModelRegistry.getModel('churn-v1');
      const v2 = ModelRegistry.getModel('churn-v2');

      expect(v1!.status).toBe('deprecated');
      expect(v2!.status).toBe('active');
      expect(v2!.version).toBe('2.0.0');
    });

    it('should update model status independently', () => {
      ModelRegistry.register({
        id: 'scoring-model', name: 'Scoring', version: '1.0.0',
        type: 'classification', provider: 'custom', description: 'Test', status: 'active'
      });

      ModelRegistry.updateStatus('scoring-model', 'deprecated');

      expect(ModelRegistry.getModel('scoring-model')!.status).toBe('deprecated');
    });
  });

  // ─── 5. Prediction service processes requests through the provider factory ─

  describe('prediction service processes requests through the provider factory', () => {
    it('should make a prediction using a mock provider via forceProvider', async () => {
      ModelRegistry.register({
        id: 'integration-model', name: 'Integration Model', version: '1.0.0',
        type: 'classification', provider: 'custom', description: 'Test', status: 'active'
      });

      const mockProvider = {
        predict: vi.fn().mockResolvedValue({
          prediction: { label: 'hot', score: 92 },
          confidence: 92,
          metadata: { provider: 'mock' }
        }),
        batchPredict: vi.fn(),
        validate: vi.fn().mockResolvedValue(true),
        healthCheck: vi.fn().mockResolvedValue({ healthy: true })
      } as unknown as BaseMLProvider;

      const result = await PredictionService.predict({
        modelId: 'integration-model',
        features: { revenue: 500000, employees: 200 },
        forceProvider: mockProvider,
        useCache: false
      });

      expect(result.prediction).toEqual({ label: 'hot', score: 92 });
      expect(result.confidence).toBe(92);
      expect(result.modelId).toBe('integration-model');
      expect(result.cached).toBe(false);
      expect(mockProvider.predict).toHaveBeenCalledOnce();
    });

    it('should fall back to mock prediction when no provider is configured', async () => {
      ModelRegistry.register({
        id: 'fallback-model', name: 'Fallback', version: '1.0.0',
        type: 'classification', provider: 'custom', description: 'Test', status: 'active'
      });

      const result = await PredictionService.predict({
        modelId: 'fallback-model',
        features: { feature1: 100 },
        useCache: false
      });

      expect(result.prediction).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.modelVersion).toBe('1.0.0');
    });

    it('should reject prediction for non-existent model', async () => {
      await expect(
        PredictionService.predict({
          modelId: 'ghost-model',
          features: { x: 1 }
        })
      ).rejects.toThrow('Model not found: ghost-model');
    });

    it('should reject prediction for inactive model', async () => {
      ModelRegistry.register({
        id: 'retired-model', name: 'Retired', version: '1.0.0',
        type: 'regression', provider: 'custom', description: 'Old', status: 'deprecated'
      });

      await expect(
        PredictionService.predict({
          modelId: 'retired-model',
          features: { x: 1 }
        })
      ).rejects.toThrow('Model is not active');
    });
  });

  // ─── 6. Cache manager caches and retrieves predictions ───────────────────

  describe('cache manager caches and retrieves predictions', () => {
    it('should cache a prediction result and return it on second call', async () => {
      ModelRegistry.register({
        id: 'cached-model', name: 'Cached', version: '1.0.0',
        type: 'nlp', provider: 'custom', description: 'Test', status: 'active'
      });

      const features = { text: 'Great product, love it!' };

      const result1 = await PredictionService.predict({
        modelId: 'cached-model',
        features,
        useCache: true
      });

      const result2 = await PredictionService.predict({
        modelId: 'cached-model',
        features,
        useCache: true
      });

      expect(result2.cached).toBe(true);
      expect(result2.prediction).toEqual(result1.prediction);
      expect(result2.confidence).toBe(result1.confidence);
    });

    it('should not return cached result when useCache is false', async () => {
      ModelRegistry.register({
        id: 'no-cache-model', name: 'NoCache', version: '1.0.0',
        type: 'classification', provider: 'custom', description: 'Test', status: 'active'
      });

      const features = { value: 42 };

      await PredictionService.predict({
        modelId: 'no-cache-model',
        features,
        useCache: true
      });

      const result2 = await PredictionService.predict({
        modelId: 'no-cache-model',
        features,
        useCache: false
      });

      expect(result2.cached).toBeFalsy();
    });

    it('should track cache stats after multiple operations', async () => {
      const cacheManager = CacheManager.getInstance();

      await cacheManager.set('pred:test-1', { prediction: 'A', confidence: 88 }, 300);
      await cacheManager.set('pred:test-2', { prediction: 'B', confidence: 76 }, 300);

      await cacheManager.get('pred:test-1');
      await cacheManager.get('pred:test-1');
      await cacheManager.get('pred:test-2');

      const stats = cacheManager.getStats();

      expect(stats.size).toBe(2);
      expect(stats.hits).toBe(3);
      expect(stats.backend).toBe('memory');
    });
  });

  // ─── 7. End-to-end: Register → Create provider → Predict → Cache ────────

  describe('end-to-end: register model → create provider → make prediction → cache result', () => {
    it('should complete the full lifecycle with a mocked provider', async () => {
      // Step 1: Register model with provider config
      const sagemakerConfig: MLProviderConfig = {
        provider: 'aws-sagemaker',
        credentials: {
          accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
          secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
          region: 'us-west-2'
        }
      };

      ModelRegistry.register({
        id: 'e2e-scoring-model',
        name: 'E2E Lead Scoring',
        version: '3.0.0',
        type: 'classification',
        provider: 'aws-sagemaker',
        description: 'End-to-end test model',
        status: 'active',
        providerConfig: sagemakerConfig
      });

      // Step 2: Verify the provider factory creates the right provider
      const provider = ProviderFactory.getProvider(sagemakerConfig);
      expect(provider).toBeInstanceOf(AWSSageMakerProvider);

      // Step 3: Make a prediction (will use SageMaker's built-in mock)
      const features = { annual_revenue: 1000000, employee_count: 500, industry: 'tech' };

      const result = await PredictionService.predict({
        modelId: 'e2e-scoring-model',
        features,
        useCache: true
      });

      expect(result.prediction).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.modelId).toBe('e2e-scoring-model');
      expect(result.modelVersion).toBe('3.0.0');
      expect(result.cached).toBe(false);
      expect(result.processingTime).toBeGreaterThanOrEqual(0);

      // Step 4: Verify caching — same request should hit cache
      const cachedResult = await PredictionService.predict({
        modelId: 'e2e-scoring-model',
        features,
        useCache: true
      });

      expect(cachedResult.cached).toBe(true);
      expect(cachedResult.prediction).toEqual(result.prediction);

      // Step 5: Verify performance monitor recorded the predictions
      const stats = PerformanceMonitor.getInstance().getModelStats('e2e-scoring-model');
      expect(stats.totalPredictions).toBe(2);
      expect(stats.successfulPredictions).toBe(2);
    });

    it('should complete the full lifecycle with an OpenAI provider for NLP', async () => {
      // Step 1: Register an NLP model with OpenAI provider config
      const openaiConfig: MLProviderConfig = {
        provider: 'openai',
        credentials: { apiKey: 'sk-test-integration-key' },
        config: { model: 'gpt-4', temperature: 0.2 }
      };

      ModelRegistry.register({
        id: 'e2e-sentiment-model',
        name: 'E2E Sentiment Analysis',
        version: '2.0.0',
        type: 'nlp',
        provider: 'openai',
        description: 'End-to-end sentiment test',
        status: 'active',
        providerConfig: openaiConfig
      });

      // Step 2: Verify provider creation
      const provider = ProviderFactory.getProvider(openaiConfig);
      expect(provider).toBeInstanceOf(OpenAIProvider);

      // Step 3: Make a prediction
      const result = await PredictionService.predict({
        modelId: 'e2e-sentiment-model',
        features: { text: 'This product is excellent and I love using it every day' },
        useCache: true
      });

      expect(result.prediction).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.modelId).toBe('e2e-sentiment-model');
      expect(result.cached).toBe(false);

      // Step 4: Verify cache hit
      const cached = await PredictionService.predict({
        modelId: 'e2e-sentiment-model',
        features: { text: 'This product is excellent and I love using it every day' },
        useCache: true
      });

      expect(cached.cached).toBe(true);
      expect(cached.prediction).toEqual(result.prediction);
    });

    it('should handle provider errors gracefully and fall back to mock', async () => {
      // Register a model and force a failing provider
      ModelRegistry.register({
        id: 'e2e-error-model',
        name: 'Error Model',
        version: '1.0.0',
        type: 'classification',
        provider: 'custom',
        description: 'Tests error fallback',
        status: 'active'
      });

      const failingProvider = {
        predict: vi.fn().mockRejectedValue(new Error('Network timeout')),
        batchPredict: vi.fn(),
        validate: vi.fn().mockResolvedValue(true),
        healthCheck: vi.fn().mockResolvedValue({ healthy: false })
      } as unknown as BaseMLProvider;

      // The prediction service falls back to mock when provider fails
      const result = await PredictionService.predict({
        modelId: 'e2e-error-model',
        features: { value: 100 },
        forceProvider: failingProvider,
        useCache: false
      });

      expect(result.prediction).toBeDefined();
      expect(failingProvider.predict).toHaveBeenCalledOnce();
    });

    it('should support batch predictions through the full pipeline', async () => {
      ModelRegistry.register({
        id: 'e2e-batch-model',
        name: 'Batch Model',
        version: '1.0.0',
        type: 'classification',
        provider: 'custom',
        description: 'Batch test',
        status: 'active'
      });

      const inputs = [
        { revenue: 100000, employees: 50 },
        { revenue: 500000, employees: 200 },
        { revenue: 2000000, employees: 1000 }
      ];

      const results = await PredictionService.batchPredict(
        'e2e-batch-model',
        inputs,
        false
      );

      expect(results).toHaveLength(3);
      results.forEach(r => {
        expect(r.prediction).toBeDefined();
        expect(r.confidence).toBeGreaterThan(0);
        expect(r.modelId).toBe('e2e-batch-model');
      });
    });
  });
});
