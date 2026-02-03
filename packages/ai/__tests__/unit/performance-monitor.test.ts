import { PerformanceMonitor, PredictionMetric } from '../../src/performance-monitor';

describe('PerformanceMonitor', () => {
  let monitor;

  beforeEach(() => {
    monitor = PerformanceMonitor.getInstance();
    monitor.clearAll();
  });

  describe('recordPrediction', () => {
    it('should record a successful prediction', () => {
      // Arrange
      const modelId = 'test-model';
      const metric = {
        modelId,
        timestamp: Date.now(),
        latency: 150,
        confidence: 0.85,
        cached: false,
        success: true
      };

      // Act
      monitor.recordPrediction(metric);
      const stats = monitor.getModelStats(modelId);

      // Assert
      expect(stats).toBeDefined();
      expect(stats.totalPredictions).toBe(1);
      expect(stats.successfulPredictions).toBe(1);
      expect(stats.failedPredictions).toBe(0);
      expect(stats.averageLatency).toBe(150);
      expect(stats.averageConfidence).toBe(0.85);
    });

    it('should record a failed prediction', () => {
      // Arrange
      const modelId = 'test-model';
      const metric = {
        modelId,
        timestamp: Date.now(),
        latency: 200,
        confidence: 0,
        cached: false,
        success: false,
        error: 'Test error'
      };

      // Act
      monitor.recordPrediction(metric);
      const stats = monitor.getModelStats(modelId);

      // Assert
      expect(stats.totalPredictions).toBe(1);
      expect(stats.successfulPredictions).toBe(0);
      expect(stats.failedPredictions).toBe(1);
      expect(stats.errorRate).toBe(100);
    });

    it('should track multiple predictions', () => {
      // Arrange
      const modelId = 'test-model';

      // Act
      monitor.recordPrediction({
        modelId,
        timestamp: Date.now(),
        latency: 100,
        confidence: 0.9,
        cached: false,
        success: true
      });
      monitor.recordPrediction({
        modelId,
        timestamp: Date.now(),
        latency: 200,
        confidence: 0.8,
        cached: false,
        success: true
      });
      monitor.recordPrediction({
        modelId,
        timestamp: Date.now(),
        latency: 150,
        confidence: 0.85,
        cached: false,
        success: true
      });
      
      const stats = monitor.getModelStats(modelId);

      // Assert
      expect(stats.totalPredictions).toBe(3);
      expect(stats.successfulPredictions).toBe(3);
      expect(stats.averageLatency).toBeCloseTo(150, 1);
      expect(stats.averageConfidence).toBeCloseTo(0.85, 2);
    });

    it('should calculate error rate correctly', () => {
      // Arrange
      const modelId = 'test-model';

      // Act
      monitor.recordPrediction({ modelId, timestamp: Date.now(), latency: 100, confidence: 0.9, cached: false, success: true });
      monitor.recordPrediction({ modelId, timestamp: Date.now(), latency: 150, confidence: 0, cached: false, success: false });
      monitor.recordPrediction({ modelId, timestamp: Date.now(), latency: 120, confidence: 0.85, cached: false, success: true });
      monitor.recordPrediction({ modelId, timestamp: Date.now(), latency: 180, confidence: 0, cached: false, success: false });
      
      const stats = monitor.getModelStats(modelId);

      // Assert
      expect(stats.totalPredictions).toBe(4);
      expect(stats.successfulPredictions).toBe(2);
      expect(stats.failedPredictions).toBe(2);
      expect(stats.errorRate).toBe(50);
    });
  });

  describe('cache hit tracking', () => {
    it('should track cache hits via cached flag', () => {
      // Arrange
      const modelId = 'test-model';

      // Act
      monitor.recordPrediction({
        modelId,
        timestamp: Date.now(),
        latency: 10,
        confidence: 0.9,
        cached: true,
        success: true
      });
      monitor.recordPrediction({
        modelId,
        timestamp: Date.now(),
        latency: 5,
        confidence: 0.9,
        cached: true,
        success: true
      });
      
      const stats = monitor.getModelStats(modelId);

      // Assert
      expect(stats.cacheHitRate).toBe(100);
    });

    it('should calculate cache hit rate', () => {
      // Arrange
      const modelId = 'test-model';

      // Act
      monitor.recordPrediction({ modelId, timestamp: Date.now(), latency: 5, confidence: 0.9, cached: true, success: true });
      monitor.recordPrediction({ modelId, timestamp: Date.now(), latency: 5, confidence: 0.9, cached: true, success: true });
      monitor.recordPrediction({ modelId, timestamp: Date.now(), latency: 100, confidence: 0.9, cached: false, success: true });
      monitor.recordPrediction({ modelId, timestamp: Date.now(), latency: 110, confidence: 0.85, cached: false, success: true });
      
      const stats = monitor.getModelStats(modelId);

      // Assert
      expect(stats.totalPredictions).toBe(4);
      expect(stats.cacheHitRate).toBe(50);
    });
  });

  describe('latency percentiles', () => {
    it('should calculate P95 latency', () => {
      // Arrange
      const modelId = 'test-model';
      const latencies = [100, 150, 200, 250, 300, 350, 400, 450, 500, 550];

      // Act
      latencies.forEach(latency => {
        monitor.recordPrediction({
          modelId,
          timestamp: Date.now(),
          latency,
          confidence: 0.9,
          cached: false,
          success: true
        });
      });
      
      const stats = monitor.getModelStats(modelId);

      // Assert
      expect(stats.p95Latency).toBeGreaterThan(0);
      expect(stats.p95Latency).toBeLessThanOrEqual(550);
    });

    it('should calculate P99 latency', () => {
      // Arrange
      const modelId = 'test-model';
      const latencies = Array.from({ length: 100 }, (_, i) => (i + 1) * 10);

      // Act
      latencies.forEach(latency => {
        monitor.recordPrediction({
          modelId,
          timestamp: Date.now(),
          latency,
          confidence: 0.9,
          cached: false,
          success: true
        });
      });
      
      const stats = monitor.getModelStats(modelId);

      // Assert
      expect(stats.p99Latency).toBeGreaterThan(0);
      expect(stats.p99Latency).toBeLessThanOrEqual(1000);
    });

    it('should calculate median latency', () => {
      // Arrange
      const modelId = 'test-model';
      const latencies = [100, 200, 300, 400, 500];

      // Act
      latencies.forEach(latency => {
        monitor.recordPrediction({
          modelId,
          timestamp: Date.now(),
          latency,
          confidence: 0.9,
          cached: false,
          success: true
        });
      });
      
      const stats = monitor.getModelStats(modelId);

      // Assert
      expect(stats.medianLatency).toBe(300);
    });
  });

  describe('health status', () => {
    it('should return healthy status with low error rate and latency', () => {
      // Arrange
      const modelId = 'test-model';

      // Act
      for (let i = 0; i < 10; i++) {
        monitor.recordPrediction({
          modelId,
          timestamp: Date.now(),
          latency: 100,
          confidence: 0.9,
          cached: false,
          success: true
        });
      }
      
      const health = monitor.getHealthStatus(modelId);

      // Assert
      expect(health.status).toBe('healthy');
    });

    it('should return degraded status with moderate issues', () => {
      // Arrange
      const modelId = 'test-model';

      // Act
      // High latency but low error rate
      for (let i = 0; i < 10; i++) {
        monitor.recordPrediction({
          modelId,
          timestamp: Date.now(),
          latency: 600,
          confidence: 0.8,
          cached: false,
          success: true
        });
      }
      
      const health = monitor.getHealthStatus(modelId);

      // Assert
      expect(health.status).toBe('degraded');
    });

    it('should return unhealthy status with high error rate', () => {
      // Arrange
      const modelId = 'test-model';

      // Act
      // High error rate
      for (let i = 0; i < 5; i++) {
        monitor.recordPrediction({
          modelId,
          timestamp: Date.now(),
          latency: 100,
          confidence: 0,
          cached: false,
          success: false
        });
      }
      for (let i = 0; i < 2; i++) {
        monitor.recordPrediction({
          modelId,
          timestamp: Date.now(),
          latency: 100,
          confidence: 0.9,
          cached: false,
          success: true
        });
      }
      
      const health = monitor.getHealthStatus(modelId);

      // Assert
      expect(health.status).toBe('unhealthy');
    });
  });

  describe('getAllStats', () => {
    it('should return stats for all models', () => {
      // Arrange
      monitor.recordPrediction({ modelId: 'model-1', timestamp: Date.now(), latency: 100, confidence: 0.9, cached: false, success: true });
      monitor.recordPrediction({ modelId: 'model-2', timestamp: Date.now(), latency: 200, confidence: 0.9, cached: false, success: true });
      monitor.recordPrediction({ modelId: 'model-3', timestamp: Date.now(), latency: 150, confidence: 0.9, cached: false, success: true });

      // Act
      const allStats = monitor.getAllStats();

      // Assert
      expect(allStats.size).toBe(3);
      expect(allStats.get('model-1')).toBeDefined();
      expect(allStats.get('model-2')).toBeDefined();
      expect(allStats.get('model-3')).toBeDefined();
    });

    it('should return empty Map when no stats', () => {
      // Act
      const allStats = monitor.getAllStats();

      // Assert
      expect(allStats.size).toBe(0);
    });
  });

  describe('clearAll', () => {
    it('should clear all statistics', () => {
      // Arrange
      monitor.recordPrediction({ modelId: 'model-1', timestamp: Date.now(), latency: 100, confidence: 0.9, cached: false, success: true });
      monitor.recordPrediction({ modelId: 'model-2', timestamp: Date.now(), latency: 200, confidence: 0.9, cached: false, success: true });

      // Act
      monitor.clearAll();
      const allStats = monitor.getAllStats();

      // Assert
      expect(allStats.size).toBe(0);
    });
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      // Act
      const instance1 = PerformanceMonitor.getInstance();
      const instance2 = PerformanceMonitor.getInstance();

      // Assert
      expect(instance1).toBe(instance2);
    });

    it('should share state between instances', () => {
      // Arrange
      const instance1 = PerformanceMonitor.getInstance();
      const instance2 = PerformanceMonitor.getInstance();

      // Act
      instance1.recordPrediction({
        modelId: 'shared-model',
        timestamp: Date.now(),
        latency: 100,
        confidence: 0.9,
        cached: false,
        success: true
      });
      const stats = instance2.getModelStats('shared-model');

      // Assert
      expect(stats.totalPredictions).toBe(1);
    });
  });
});
