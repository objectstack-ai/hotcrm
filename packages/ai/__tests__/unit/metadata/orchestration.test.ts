import { describe, it, expect } from 'vitest';
import { AIOrchestrationSchema, PredictiveModelSchema } from '@objectstack/spec/ai';
import { SalesOrchestration } from '../../../src/sales_orchestration.orchestration';
import { SupportOrchestration } from '../../../src/support_orchestration.orchestration';
import { LeadScoringModel } from '../../../src/lead_scoring.predictive';
import { ChurnPredictionModel } from '../../../src/churn_prediction.predictive';
import { DealForecastModel } from '../../../src/deal_forecast.predictive';

// ---------------------------------------------------------------------------
// AI Orchestrations
// ---------------------------------------------------------------------------

describe('AI Orchestration Metadata Compliance', () => {
  const orchestrations = [
    { name: 'SalesOrchestration', orchestration: SalesOrchestration },
    { name: 'SupportOrchestration', orchestration: SupportOrchestration },
  ];

  describe.each(orchestrations)('$name', ({ orchestration }) => {
    it('should be defined', () => {
      expect(orchestration).toBeDefined();
    });

    it('should validate against AIOrchestrationSchema', () => {
      expect(() => AIOrchestrationSchema.parse(orchestration)).not.toThrow();
    });

    it('should have aiTasks array', () => {
      expect(Array.isArray(orchestration.aiTasks)).toBe(true);
      expect(orchestration.aiTasks.length).toBeGreaterThan(0);
    });

    it('should have postActions array', () => {
      expect(Array.isArray(orchestration.postActions)).toBe(true);
      expect(orchestration.postActions.length).toBeGreaterThan(0);
    });

    it('should be active', () => {
      expect(orchestration.active).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// Predictive Models
// ---------------------------------------------------------------------------

describe('Predictive Model Metadata Compliance', () => {
  const models = [
    { name: 'LeadScoringModel', model: LeadScoringModel },
    { name: 'ChurnPredictionModel', model: ChurnPredictionModel },
    { name: 'DealForecastModel', model: DealForecastModel },
  ];

  describe.each(models)('$name', ({ model }) => {
    it('should be defined', () => {
      expect(model).toBeDefined();
    });

    it('should validate against PredictiveModelSchema', () => {
      expect(() => PredictiveModelSchema.parse(model)).not.toThrow();
    });

    it('should have features array', () => {
      expect(Array.isArray(model.features)).toBe(true);
      expect(model.features.length).toBeGreaterThan(0);
    });

    it('should have training config', () => {
      expect(model.training).toBeDefined();
      expect(model.training.trainingDataRatio).toBeGreaterThan(0);
    });

    it('should be active', () => {
      expect(model.active).toBe(true);
    });
  });
});
