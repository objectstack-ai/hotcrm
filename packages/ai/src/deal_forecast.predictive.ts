/**
 * Deal Forecast — Opportunity Win-Probability Model
 *
 * Gradient-boosting classifier that predicts whether an opportunity will be
 * won, using deal-specific and behavioural features.
 */

import type { PredictiveModel } from '@objectstack/spec/ai';
import { PredictiveModelSchema } from '@objectstack/spec/ai';

export const DealForecastModel = {
  name: 'deal_forecast',
  label: 'Deal Win Probability Forecast',
  description:
    'Classification model that predicts opportunity win probability using deal characteristics and sales activity signals.',
  type: 'classification',
  algorithm: 'gradient_boosting',
  objectName: 'opportunity',
  target: 'is_won',
  targetType: 'binary',

  features: [
    {
      name: 'stage',
      label: 'Opportunity Stage',
      field: 'stage',
      dataType: 'categorical',
      transformation: 'label_encode',
      required: true,
      importance: 0.25,
      description: 'Current sales-process stage of the opportunity.',
    },
    {
      name: 'amount',
      label: 'Deal Amount',
      field: 'amount',
      dataType: 'numeric',
      transformation: 'log_transform',
      required: true,
      importance: 0.15,
      description: 'Total deal value in the base currency.',
    },
    {
      name: 'days_in_stage',
      label: 'Days in Current Stage',
      field: 'days_in_stage',
      dataType: 'numeric',
      transformation: 'normalize',
      required: true,
      importance: 0.18,
      description: 'Number of days the opportunity has spent in its current stage.',
    },
    {
      name: 'activity_count',
      label: 'Activity Count',
      field: 'activity_count',
      dataType: 'numeric',
      transformation: 'log_transform',
      required: true,
      importance: 0.17,
      description: 'Total logged activities (calls, emails, meetings) on the deal.',
    },
    {
      name: 'competitor_count',
      label: 'Competitor Count',
      field: 'competitor_count',
      dataType: 'numeric',
      transformation: 'none',
      required: false,
      importance: 0.12,
      description: 'Number of known competitors on the deal.',
    },
    {
      name: 'discount_percentage',
      label: 'Discount Percentage',
      field: 'discount_percentage',
      dataType: 'numeric',
      transformation: 'normalize',
      required: false,
      importance: 0.13,
      description: 'Total discount applied to the deal as a percentage of list price.',
    },
  ],

  hyperparameters: {
    learningRate: 0.04,
    epochs: 250,
    maxDepth: 6,
    numTrees: 180,
    custom: {
      subsample: 0.8,
      colsample_bytree: 0.85,
      min_child_weight: 5,
    },
  },

  training: {
    trainingDataRatio: 0.7,
    validationDataRatio: 0.15,
    testDataRatio: 0.15,
    minRecords: 2000,
    strategy: 'full',
    crossValidation: true,
    folds: 5,
    earlyStoppingEnabled: true,
    earlyStoppingPatience: 12,
    gpuEnabled: false,
  },

  deploymentStatus: 'draft',
  version: '1.0.0',
  predictionField: 'win_probability',
  confidenceField: 'win_confidence',
  updateTrigger: 'on_update',
  autoRetrain: true,
  enableExplainability: true,
  enableMonitoring: true,
  alertOnDrift: true,
  active: true,
  tags: ['opportunity', 'forecast', 'win_probability', 'classification'],
  category: 'sales',
} satisfies PredictiveModel;

PredictiveModelSchema.parse(DealForecastModel);

export default DealForecastModel;
