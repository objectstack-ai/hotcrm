/**
 * ML Explainability Service
 * 
 * Provides model explainability features using SHAP-like values
 * Helps users understand why the model made certain predictions
 */

export interface FeatureContribution {
  feature: string;
  value: any;
  contribution: number; // -1 to 1, showing impact on prediction
  importance: number; // 0-100, absolute importance
}

export interface ExplainabilityResult {
  prediction: any;
  confidence: number;
  baseValue: number; // Baseline prediction
  featureContributions: FeatureContribution[];
  topFeatures: FeatureContribution[]; // Top 5 most important features
  explanation: string; // Human-readable explanation
}

/**
 * Explainability Service
 * 
 * Provides SHAP-like feature attributions for model predictions
 */
export class ExplainabilityService {
  /**
   * Explain a prediction with feature contributions
   */
  static async explainPrediction(
    modelId: string,
    features: Record<string, any>,
    prediction: any,
    confidence: number
  ): Promise<ExplainabilityResult> {
    // Calculate feature contributions (SHAP-like values)
    const contributions = this.calculateFeatureContributions(modelId, features, prediction);
    
    // Get top contributing features
    const topFeatures = [...contributions]
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 5);
    
    // Generate human-readable explanation
    const explanation = this.generateExplanation(modelId, topFeatures, prediction);
    
    return {
      prediction,
      confidence,
      baseValue: this.getBaseValue(modelId),
      featureContributions: contributions,
      topFeatures,
      explanation
    };
  }
  
  /**
   * Calculate feature contributions using simplified SHAP-like approach
   */
  private static calculateFeatureContributions(
    modelId: string,
    features: Record<string, any>,
    prediction: any
  ): FeatureContribution[] {
    const contributions: FeatureContribution[] = [];
    
    // For each feature, estimate its contribution
    for (const [feature, value] of Object.entries(features)) {
      const contribution = this.estimateFeatureImpact(modelId, feature, value, features);
      
      contributions.push({
        feature,
        value,
        contribution: contribution.contribution,
        importance: Math.abs(contribution.contribution) * 100
      });
    }
    
    return contributions;
  }
  
  /**
   * Estimate feature impact on prediction
   * 
   * In production, this would use actual SHAP values from the ML model
   * For now, we use heuristics based on feature types and values
   */
  private static estimateFeatureImpact(
    modelId: string,
    feature: string,
    value: any,
    allFeatures: Record<string, any>
  ): { contribution: number } {
    // Model-specific feature importance
    const featureWeights = this.getFeatureWeights(modelId);
    const baseWeight = featureWeights[feature] || 0.1;
    
    // Normalize value contribution
    let normalizedValue = 0;
    
    if (typeof value === 'number') {
      // For numeric features, normalize to -1 to 1 range
      normalizedValue = Math.tanh(value / 100); // Rough normalization
    } else if (typeof value === 'boolean') {
      normalizedValue = value ? 1 : -1;
    } else if (typeof value === 'string') {
      // For categorical features, use length as proxy
      normalizedValue = value.length > 0 ? 0.5 : -0.5;
    }
    
    return {
      contribution: baseWeight * normalizedValue
    };
  }
  
  /**
   * Get feature weights for a model
   * 
   * In production, these would come from the actual model
   */
  private static getFeatureWeights(modelId: string): Record<string, number> {
    // Lead scoring weights
    if (modelId.includes('lead-scoring')) {
      return {
        company_size: 0.25,
        industry: 0.15,
        engagement_score: 0.35,
        job_title: 0.15,
        budget: 0.10
      };
    }
    
    // Churn prediction weights
    if (modelId.includes('churn')) {
      return {
        account_age: 0.20,
        support_tickets: 0.30,
        usage_frequency: 0.25,
        nps_score: 0.15,
        payment_delays: 0.10
      };
    }
    
    // Default weights
    return {};
  }
  
  /**
   * Get base value (average prediction)
   */
  private static getBaseValue(modelId: string): number {
    // In production, this would be the model's average prediction
    if (modelId.includes('lead-scoring')) return 50;
    if (modelId.includes('churn')) return 0.2;
    return 0.5;
  }
  
  /**
   * Generate human-readable explanation
   */
  private static generateExplanation(
    modelId: string,
    topFeatures: FeatureContribution[],
    prediction: any
  ): string {
    const positiveFeatures = topFeatures.filter(f => f.contribution > 0);
    const negativeFeatures = topFeatures.filter(f => f.contribution < 0);
    
    let explanation = 'The prediction was influenced by:\n\n';
    
    if (positiveFeatures.length > 0) {
      explanation += 'Positive factors:\n';
      positiveFeatures.forEach(f => {
        explanation += `• ${this.formatFeatureName(f.feature)}: ${this.formatFeatureValue(f.value)} (impact: +${f.importance.toFixed(0)}%)\n`;
      });
    }
    
    if (negativeFeatures.length > 0) {
      explanation += '\nNegative factors:\n';
      negativeFeatures.forEach(f => {
        explanation += `• ${this.formatFeatureName(f.feature)}: ${this.formatFeatureValue(f.value)} (impact: -${f.importance.toFixed(0)}%)\n`;
      });
    }
    
    return explanation;
  }
  
  /**
   * Format feature name for display
   */
  private static formatFeatureName(name: string): string {
    return name
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }
  
  /**
   * Format feature value for display
   */
  private static formatFeatureValue(value: any): string {
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    return String(value);
  }
  
  /**
   * Compare two predictions to understand differences
   */
  static async comparePredictions(
    modelId: string,
    features1: Record<string, any>,
    features2: Record<string, any>
  ): Promise<{
    differences: Array<{
      feature: string;
      value1: any;
      value2: any;
      impactDifference: number;
    }>;
    explanation: string;
  }> {
    const allFeatures = new Set([
      ...Object.keys(features1),
      ...Object.keys(features2)
    ]);
    
    const differences: Array<any> = [];
    
    for (const feature of allFeatures) {
      const value1 = features1[feature];
      const value2 = features2[feature];
      
      if (value1 !== value2) {
        const impact1 = this.estimateFeatureImpact(modelId, feature, value1, features1);
        const impact2 = this.estimateFeatureImpact(modelId, feature, value2, features2);
        
        differences.push({
          feature,
          value1,
          value2,
          impactDifference: impact2.contribution - impact1.contribution
        });
      }
    }
    
    // Sort by impact difference
    differences.sort((a, b) => Math.abs(b.impactDifference) - Math.abs(a.impactDifference));
    
    const explanation = this.generateComparisonExplanation(differences.slice(0, 5));
    
    return { differences, explanation };
  }
  
  /**
   * Generate comparison explanation
   */
  private static generateComparisonExplanation(
    differences: Array<any>
  ): string {
    if (differences.length === 0) {
      return 'No significant differences found.';
    }
    
    let explanation = 'Key differences:\n\n';
    
    differences.forEach(diff => {
      const direction = diff.impactDifference > 0 ? 'increased' : 'decreased';
      explanation += `• ${this.formatFeatureName(diff.feature)} changed from ${this.formatFeatureValue(diff.value1)} to ${this.formatFeatureValue(diff.value2)}, which ${direction} the prediction\n`;
    });
    
    return explanation;
  }
}

export default ExplainabilityService;
