import { PredictionService } from '../../src/prediction-service';
import { ModelRegistry, ModelConfig } from '../../src/model-registry';
import { CacheManager } from '../../src/cache-manager';
import { PerformanceMonitor } from '../../src/performance-monitor';

describe('PredictionService Integration Tests', () => {
  beforeEach(async () => {
    // Clear all state
    ModelRegistry.clear();
    await CacheManager.getInstance().clear();
    PerformanceMonitor.getInstance().clearAll();
  });

  afterEach(async () => {
    await CacheManager.getInstance().clear();
  });

  describe('predict with mock provider', () => {
    it('should make a prediction without provider config', async () => {
      // Arrange
      ModelRegistry.register({
        id: 'test-model',
        name: 'Test Model',
        version: '1.0.0',
        type: 'classification',
        provider: 'custom',
        description: 'Test',
        status: 'active'
      });

      const features = {
        feature1: 100,
        feature2: 200,
        feature3: 300
      };

      // Act
      const result = await PredictionService.predict({
        modelId: 'test-model',
        features
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.prediction).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
    });

    it('should throw error for non-existent model', async () => {
      // Arrange
      const features = { feature1: 100 };

      // Act & Assert
      await expect(
        PredictionService.predict({
          modelId: 'non-existent-model',
          features
        })
      ).rejects.toThrow();
    });

    it('should throw error for inactive model', async () => {
      // Arrange
      ModelRegistry.register({
        id: 'inactive-model',
        name: 'Inactive Model',
        version: '1.0.0',
        type: 'classification',
        provider: 'custom',
        description: 'Inactive',
        status: 'deprecated'
      });

      const features = { feature1: 100 };

      // Act & Assert
      await expect(
        PredictionService.predict({
          modelId: 'inactive-model',
          features
        })
      ).rejects.toThrow();
    });
  });

  describe('caching integration', () => {
    it('should cache predictions by default', async () => {
      // Arrange
      ModelRegistry.register({
        id: 'cache-model',
        name: 'Cache Model',
        version: '1.0.0',
        type: 'classification',
        provider: 'custom',
        description: 'Test caching',
        status: 'active'
      });

      const features = { feature1: 100, feature2: 200 };

      // Act
      const result1 = await PredictionService.predict({
        modelId: 'cache-model',
        features
      });

      const result2 = await PredictionService.predict({
        modelId: 'cache-model',
        features
      });

      // Assert
      expect(result2.cached).toBe(true);
      expect(result2.prediction).toEqual(result1.prediction);
    });

    it('should skip cache when useCache is false', async () => {
      // Arrange
      ModelRegistry.register({
        id: 'no-cache-model',
        name: 'No Cache Model',
        version: '1.0.0',
        type: 'classification',
        provider: 'custom',
        description: 'Test',
        status: 'active'
      });

      const features = { feature1: 100 };

      // Act
      const result1 = await PredictionService.predict({
        modelId: 'no-cache-model',
        features,
        useCache: false
      });

      const result2 = await PredictionService.predict({
        modelId: 'no-cache-model',
        features,
        useCache: false
      });

      // Assert
      expect(result1.cached).toBeFalsy();
      expect(result2.cached).toBeFalsy();
    });
  });

  describe('performance monitoring integration', () => {
    it('should record prediction metrics', async () => {
      // Arrange
      ModelRegistry.register({
        id: 'metrics-model',
        name: 'Metrics Model',
        version: '1.0.0',
        type: 'classification',
        provider: 'custom',
        description: 'Test',
        status: 'active'
      });

      const features = { feature1: 100 };

      // Act
      await PredictionService.predict({
        modelId: 'metrics-model',
        features
      });

      const stats = PerformanceMonitor.getInstance().getModelStats('metrics-model');

      // Assert
      expect(stats).toBeDefined();
      expect(stats.totalPredictions).toBe(1);
      expect(stats.successfulPredictions).toBe(1);
      expect(stats.averageLatency).toBeGreaterThanOrEqual(0);
    });

    it('should record cache hits in metrics', async () => {
      // Arrange
      ModelRegistry.register({
        id: 'cache-metrics-model',
        name: 'Cache Metrics Model',
        version: '1.0.0',
        type: 'classification',
        provider: 'custom',
        description: 'Test',
        status: 'active'
      });

      const features = { feature1: 100 };

      // Act
      await PredictionService.predict({
        modelId: 'cache-metrics-model',
        features
      });

      await PredictionService.predict({
        modelId: 'cache-metrics-model',
        features
      });

      const stats = PerformanceMonitor.getInstance().getModelStats('cache-metrics-model');

      // Assert
      expect(stats.cacheHitRate).toBeGreaterThan(0);
    });
  });

  describe('A/B testing integration', () => {
    it('should route traffic according to A/B test configuration', async () => {
      // Arrange
      ModelRegistry.register({
        id: 'champion',
        name: 'Champion Model',
        version: '1.0.0',
        type: 'classification',
        provider: 'custom',
        description: 'Current champion',
        status: 'active'
      });

      ModelRegistry.register({
        id: 'challenger',
        name: 'Challenger Model',
        version: '2.0.0',
        type: 'classification',
        provider: 'custom',
        description: 'New challenger',
        status: 'active',
        abTest: {
          enabled: true,
          trafficPercentage: 50,
          championModelId: 'champion'
        }
      });

      const features = { feature1: 100 };
      const modelCounts = { champion: 0, challenger: 0 };

      // Act - Make multiple predictions
      for (let i = 0; i < 100; i++) {
        const result = await PredictionService.predict({
          modelId: 'challenger',
          features: { ...features, iteration: i }, // Different cache keys
          useCache: false
        });

        // The result should indicate which model was actually used
        if (result.modelId === 'champion') {
          modelCounts.champion++;
        } else if (result.modelId === 'challenger') {
          modelCounts.challenger++;
        }
      }

      // Assert - Both models should have received some traffic
      // With 50/50 split, we expect roughly equal distribution
      // Allow for some variance in random distribution
      expect(modelCounts.champion).toBeGreaterThan(20);
      expect(modelCounts.challenger).toBeGreaterThan(20);
      expect(modelCounts.champion + modelCounts.challenger).toBe(100);
    });
  });

  describe('batch predictions', () => {
    it('should make batch predictions', async () => {
      // Arrange
      ModelRegistry.register({
        id: 'batch-model',
        name: 'Batch Model',
        version: '1.0.0',
        type: 'classification',
        provider: 'custom',
        description: 'Test',
        status: 'active'
      });

      const inputs = [
        { feature1: 100, feature2: 200 },
        { feature1: 150, feature2: 250 },
        { feature1: 200, feature2: 300 }
      ];

      // Act
      const results = await PredictionService.batchPredict(
        'batch-model',
        inputs
      );

      // Assert
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.prediction).toBeDefined();
        expect(result.confidence).toBeGreaterThan(0);
      });
    });

    it('should process batch predictions with mock implementation', async () => {
      // Arrange
      ModelRegistry.register({
        id: 'batch-error-model',
        name: 'Batch Error Model',
        version: '1.0.0',
        type: 'classification',
        provider: 'custom',
        description: 'Test',
        status: 'active'
      });

      const inputs = [
        { feature1: 100 },
        { feature1: 150 },
        { feature1: 200 }
      ];

      // Act
      const results = await PredictionService.batchPredict(
        'batch-error-model',
        inputs
      );

      // Assert
      // All valid inputs should produce predictions
      expect(results).toHaveLength(3);
      expect(results[0].prediction).toBeDefined();
      expect(results[1].prediction).toBeDefined();
      expect(results[2].prediction).toBeDefined();
    });
  });
});
