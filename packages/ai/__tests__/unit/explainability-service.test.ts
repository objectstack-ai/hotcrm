import { ExplainabilityService } from '../../src/explainability-service';

describe('ExplainabilityService', () => {
  describe('explainPrediction', () => {
    it('should generate feature attributions for a prediction', async () => {
      // Arrange
      const modelId = 'lead-scoring';
      const features = {
        company_size: 500,
        industry: 'Technology',
        engagement_score: 85,
        job_title: 'CTO',
        budget: 100000
      };
      const prediction = 0.87;
      const confidence = 0.92;

      // Act
      const result = await ExplainabilityService.explainPrediction(modelId, features, prediction, confidence);

      // Assert
      expect(result).toBeDefined();
      expect(result.prediction).toBe(0.87);
      expect(result.confidence).toBe(0.92);
      expect(result.featureContributions).toBeDefined();
      expect(Array.isArray(result.featureContributions)).toBe(true);
      expect(result.topFeatures).toBeDefined();
      expect(result.explanation).toBeDefined();
    });

    it('should include feature contributions', async () => {
      // Arrange
      const modelId = 'test-model';
      const features = {
        feature1: 100,
        feature2: 200,
        feature3: 300
      };
      const prediction = 0.75;

      // Act
      const result = await ExplainabilityService.explainPrediction(modelId, features, prediction, 0.8);

      // Assert
      expect(result.featureContributions.length).toBe(3);
      result.featureContributions.forEach(contrib => {
        expect(contrib.feature).toBeDefined();
        expect(contrib.value).toBeDefined();
        expect(typeof contrib.contribution).toBe('number');
        expect(typeof contrib.importance).toBe('number');
      });
    });

    it('should identify top contributing features', async () => {
      // Arrange
      const modelId = 'test-model';
      const features = {
        high_impact: 1000,
        medium_impact: 500,
        low_impact: 100
      };
      const prediction = 0.85;

      // Act
      const result = await ExplainabilityService.explainPrediction(modelId, features, prediction, 0.9);

      // Assert
      expect(result.topFeatures).toBeDefined();
      expect(result.topFeatures.length).toBeGreaterThan(0);
      expect(result.topFeatures.length).toBeLessThanOrEqual(5);
    });

    it('should handle positive and negative contributions', async () => {
      // Arrange
      const modelId = 'test-model';
      const features = {
        positive_feature: 100,
        negative_feature: 50
      };
      const prediction = 0.65;

      // Act
      const result = await ExplainabilityService.explainPrediction(modelId, features, prediction, 0.7);

      // Assert
      const contributions = result.featureContributions;
      expect(contributions.length).toBeGreaterThan(0);
    });

    it('should include base value', async () => {
      // Arrange
      const modelId = 'lead-scoring';
      const features = { feature1: 100 };

      // Act
      const result = await ExplainabilityService.explainPrediction(modelId, features, 0.8, 0.85);

      // Assert
      expect(typeof result.baseValue).toBe('number');
    });
  });

  describe('comparePredictions', () => {
    it('should compare two predictions', async () => {
      // Arrange
      const modelId = 'test-model';
      const features1 = { feature1: 100, feature2: 200 };
      const features2 = { feature1: 150, feature2: 180 };

      // Act
      const comparison = await ExplainabilityService.comparePredictions(modelId, features1, features2);

      // Assert
      expect(comparison).toBeDefined();
      expect(comparison.differences).toBeDefined();
      expect(Array.isArray(comparison.differences)).toBe(true);
      expect(comparison.explanation).toBeDefined();
    });

    it('should identify feature differences', async () => {
      // Arrange
      const modelId = 'test-model';
      const features1 = { feature1: 100, feature2: 200 };
      const features2 = { feature1: 150, feature2: 200 };

      // Act
      const comparison = await ExplainabilityService.comparePredictions(modelId, features1, features2);

      // Assert
      expect(comparison.differences.length).toBeGreaterThan(0);
      const feature1Diff = comparison.differences.find(
        diff => diff.feature === 'feature1'
      );
      expect(feature1Diff).toBeDefined();
      expect(feature1Diff.value1).toBe(100);
      expect(feature1Diff.value2).toBe(150);
    });

    it('should handle identical features', async () => {
      // Arrange
      const modelId = 'test-model';
      const features = { feature1: 100, feature2: 200 };

      // Act
      const comparison = await ExplainabilityService.comparePredictions(modelId, features, features);

      // Assert
      expect(comparison.differences.length).toBe(0);
    });
  });
});
