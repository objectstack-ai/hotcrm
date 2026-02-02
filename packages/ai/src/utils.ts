/**
 * AI Service Layer - AI Utilities
 * 
 * Shared utility functions for AI/ML operations across HotCRM
 */

/**
 * Calculate confidence score based on data quality
 */
export function calculateConfidence(params: {
  sampleSize: number;
  dataQuality: number; // 0-100
  modelAccuracy?: number; // 0-100
}): number {
  const { sampleSize, dataQuality, modelAccuracy = 80 } = params;
  
  // Base confidence from model accuracy
  let confidence = modelAccuracy;
  
  // Adjust based on sample size (diminishing returns)
  const sampleFactor = Math.min(1, Math.log10(sampleSize + 1) / 2);
  confidence *= (0.7 + (sampleFactor * 0.3));
  
  // Adjust based on data quality
  confidence *= (dataQuality / 100);
  
  return Math.min(100, Math.max(0, confidence));
}

/**
 * Normalize score to 0-100 range
 */
export function normalizeScore(value: number, min: number, max: number): number {
  if (max === min) return 50; // Default to middle if no variance
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}

/**
 * Calculate weighted average
 */
export function weightedAverage(values: Array<{ value: number; weight: number }>): number {
  const totalWeight = values.reduce((sum, v) => sum + v.weight, 0);
  if (totalWeight === 0) return 0;
  
  const weightedSum = values.reduce((sum, v) => sum + (v.value * v.weight), 0);
  return weightedSum / totalWeight;
}

/**
 * Sigmoid function for probability conversion
 */
export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same length');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Calculate standard deviation
 */
export function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
  
  return Math.sqrt(variance);
}

/**
 * Detect outliers using IQR method
 */
export function detectOutliers(values: number[]): { outliers: number[]; threshold: { lower: number; upper: number } } {
  if (values.length < 4) {
    return { outliers: [], threshold: { lower: 0, upper: 0 } };
  }
  
  const sorted = [...values].sort((a, b) => a - b);
  const q1Index = Math.floor(sorted.length * 0.25);
  const q3Index = Math.floor(sorted.length * 0.75);
  
  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  const iqr = q3 - q1;
  
  const lowerBound = q1 - (1.5 * iqr);
  const upperBound = q3 + (1.5 * iqr);
  
  const outliers = values.filter(v => v < lowerBound || v > upperBound);
  
  return {
    outliers,
    threshold: { lower: lowerBound, upper: upperBound }
  };
}

/**
 * Calculate moving average
 */
export function movingAverage(values: number[], windowSize: number): number[] {
  const result: number[] = [];
  
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const window = values.slice(start, i + 1);
    const avg = window.reduce((sum, v) => sum + v, 0) / window.length;
    result.push(avg);
  }
  
  return result;
}

/**
 * Exponential smoothing for time series
 */
export function exponentialSmoothing(values: number[], alpha: number = 0.3): number[] {
  if (values.length === 0) return [];
  
  const result: number[] = [values[0]];
  
  for (let i = 1; i < values.length; i++) {
    const smoothed = alpha * values[i] + (1 - alpha) * result[i - 1];
    result.push(smoothed);
  }
  
  return result;
}

/**
 * Calculate trend direction
 */
export function calculateTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
  if (values.length < 2) return 'stable';
  
  // Simple linear regression slope
  const n = values.length;
  const xSum = (n * (n - 1)) / 2; // Sum of indices 0 to n-1
  const ySum = values.reduce((sum, v) => sum + v, 0);
  const xySum = values.reduce((sum, v, i) => sum + (i * v), 0);
  const xSquareSum = values.reduce((sum, _, i) => sum + (i * i), 0);
  
  const slope = (n * xySum - xSum * ySum) / (n * xSquareSum - xSum * xSum);
  
  // Determine trend based on slope
  const threshold = 0.01; // Adjust as needed
  if (slope > threshold) return 'increasing';
  if (slope < -threshold) return 'decreasing';
  return 'stable';
}

/**
 * Feature scaling (min-max normalization)
 */
export function minMaxScale(values: number[]): number[] {
  if (values.length === 0) return [];
  
  const min = Math.min(...values);
  const max = Math.max(...values);
  
  if (min === max) return values.map(() => 0.5);
  
  return values.map(v => (v - min) / (max - min));
}

/**
 * Z-score normalization
 */
export function zScoreNormalize(values: number[]): number[] {
  if (values.length === 0) return [];
  
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const stdDev = standardDeviation(values);
  
  if (stdDev === 0) return values.map(() => 0);
  
  return values.map(v => (v - mean) / stdDev);
}

/**
 * Calculate Pearson correlation coefficient
 */
export function pearsonCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) {
    throw new Error('Arrays must have same non-zero length');
  }
  
  const n = x.length;
  const meanX = x.reduce((sum, v) => sum + v, 0) / n;
  const meanY = y.reduce((sum, v) => sum + v, 0) / n;
  
  let numerator = 0;
  let denominatorX = 0;
  let denominatorY = 0;
  
  for (let i = 0; i < n; i++) {
    const diffX = x[i] - meanX;
    const diffY = y[i] - meanY;
    
    numerator += diffX * diffY;
    denominatorX += diffX * diffX;
    denominatorY += diffY * diffY;
  }
  
  if (denominatorX === 0 || denominatorY === 0) return 0;
  
  return numerator / Math.sqrt(denominatorX * denominatorY);
}

/**
 * Simple K-means clustering (1D)
 */
export function kMeansClustering(values: number[], k: number): Array<{ cluster: number; values: number[] }> {
  if (values.length === 0 || k <= 0) return [];
  
  // Initialize centroids
  const sorted = [...values].sort((a, b) => a - b);
  const step = Math.floor(sorted.length / k);
  const centroids = Array.from({ length: k }, (_, i) => sorted[Math.min(i * step, sorted.length - 1)]);
  
  const assignments = new Array(values.length).fill(0);
  let changed = true;
  let iterations = 0;
  const maxIterations = 100;
  
  while (changed && iterations < maxIterations) {
    changed = false;
    
    // Assign points to nearest centroid
    for (let i = 0; i < values.length; i++) {
      let minDist = Infinity;
      let bestCluster = 0;
      
      for (let c = 0; c < k; c++) {
        const dist = Math.abs(values[i] - centroids[c]);
        if (dist < minDist) {
          minDist = dist;
          bestCluster = c;
        }
      }
      
      if (assignments[i] !== bestCluster) {
        assignments[i] = bestCluster;
        changed = true;
      }
    }
    
    // Update centroids
    for (let c = 0; c < k; c++) {
      const clusterPoints = values.filter((_, i) => assignments[i] === c);
      if (clusterPoints.length > 0) {
        centroids[c] = clusterPoints.reduce((sum, v) => sum + v, 0) / clusterPoints.length;
      }
    }
    
    iterations++;
  }
  
  // Group results
  const clusters: Array<{ cluster: number; values: number[] }> = [];
  for (let c = 0; c < k; c++) {
    clusters.push({
      cluster: c,
      values: values.filter((_, i) => assignments[i] === c)
    });
  }
  
  return clusters;
}

export default {
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
};
