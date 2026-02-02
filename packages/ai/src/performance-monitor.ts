/**
 * ML Model Performance Monitor
 * 
 * Tracks prediction performance, accuracy, and latency metrics
 */

export interface PredictionMetric {
  modelId: string;
  timestamp: number;
  latency: number;
  confidence: number;
  cached: boolean;
  success: boolean;
  error?: string;
  provider?: string;
}

export interface ModelPerformanceStats {
  modelId: string;
  totalPredictions: number;
  successfulPredictions: number;
  failedPredictions: number;
  averageLatency: number;
  medianLatency: number;
  p95Latency: number;
  p99Latency: number;
  averageConfidence: number;
  cacheHitRate: number;
  errorRate: number;
  lastUpdated: number;
}

/**
 * Performance Monitor for ML Models
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, PredictionMetric[]> = new Map();
  private maxMetricsPerModel: number = 10000;
  
  private constructor() {}
  
  /**
   * Get singleton instance
   */
  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }
  
  /**
   * Record a prediction metric
   */
  recordPrediction(metric: PredictionMetric): void {
    const modelMetrics = this.metrics.get(metric.modelId) || [];
    modelMetrics.push(metric);
    
    // Keep only recent metrics
    if (modelMetrics.length > this.maxMetricsPerModel) {
      modelMetrics.shift();
    }
    
    this.metrics.set(metric.modelId, modelMetrics);
  }
  
  /**
   * Get performance statistics for a model
   */
  getModelStats(modelId: string, timeWindowMs?: number): ModelPerformanceStats | null {
    const allMetrics = this.metrics.get(modelId);
    if (!allMetrics || allMetrics.length === 0) {
      return null;
    }
    
    // Filter by time window if provided
    const now = Date.now();
    const metrics = timeWindowMs
      ? allMetrics.filter(m => now - m.timestamp < timeWindowMs)
      : allMetrics;
    
    if (metrics.length === 0) {
      return null;
    }
    
    const successful = metrics.filter(m => m.success);
    const failed = metrics.filter(m => !m.success);
    const cached = metrics.filter(m => m.cached);
    
    // Calculate latency percentiles
    const sortedLatencies = metrics.map(m => m.latency).sort((a, b) => a - b);
    const p95Index = Math.floor(sortedLatencies.length * 0.95);
    const p99Index = Math.floor(sortedLatencies.length * 0.99);
    const medianIndex = Math.floor(sortedLatencies.length * 0.5);
    
    return {
      modelId,
      totalPredictions: metrics.length,
      successfulPredictions: successful.length,
      failedPredictions: failed.length,
      averageLatency: metrics.reduce((sum, m) => sum + m.latency, 0) / metrics.length,
      medianLatency: sortedLatencies[medianIndex] || 0,
      p95Latency: sortedLatencies[p95Index] || 0,
      p99Latency: sortedLatencies[p99Index] || 0,
      averageConfidence: successful.reduce((sum, m) => sum + m.confidence, 0) / successful.length || 0,
      cacheHitRate: (cached.length / metrics.length) * 100,
      errorRate: (failed.length / metrics.length) * 100,
      lastUpdated: now
    };
  }
  
  /**
   * Get stats for all models
   */
  getAllStats(timeWindowMs?: number): Map<string, ModelPerformanceStats> {
    const stats = new Map<string, ModelPerformanceStats>();
    
    for (const modelId of this.metrics.keys()) {
      const modelStats = this.getModelStats(modelId, timeWindowMs);
      if (modelStats) {
        stats.set(modelId, modelStats);
      }
    }
    
    return stats;
  }
  
  /**
   * Get recent errors for a model
   */
  getRecentErrors(modelId: string, limit: number = 10): PredictionMetric[] {
    const metrics = this.metrics.get(modelId) || [];
    return metrics
      .filter(m => !m.success)
      .slice(-limit)
      .reverse();
  }
  
  /**
   * Clear metrics for a model
   */
  clearModel(modelId: string): void {
    this.metrics.delete(modelId);
  }
  
  /**
   * Clear all metrics
   */
  clearAll(): void {
    this.metrics.clear();
  }
  
  /**
   * Get health status based on recent performance
   */
  getHealthStatus(modelId: string): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    reason?: string;
  } {
    const stats = this.getModelStats(modelId, 5 * 60 * 1000); // Last 5 minutes
    
    if (!stats) {
      return { status: 'healthy', reason: 'No recent predictions' };
    }
    
    // Check error rate
    if (stats.errorRate > 10) {
      return { status: 'unhealthy', reason: `High error rate: ${stats.errorRate.toFixed(1)}%` };
    }
    
    if (stats.errorRate > 5) {
      return { status: 'degraded', reason: `Elevated error rate: ${stats.errorRate.toFixed(1)}%` };
    }
    
    // Check latency (threshold: 500ms for fresh predictions)
    if (stats.p95Latency > 500) {
      return { status: 'degraded', reason: `High latency: P95 = ${stats.p95Latency.toFixed(0)}ms` };
    }
    
    return { status: 'healthy' };
  }
}

export default PerformanceMonitor;
