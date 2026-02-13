/**
 * Churn Prediction — Account Churn Classification Model
 *
 * Gradient-boosting classifier that predicts whether an account is likely to
 * churn based on activity, support, satisfaction, and financial signals.
 */

import type { PredictiveModel } from '@objectstack/spec/ai';
import { PredictiveModelSchema } from '@objectstack/spec/ai';

export const ChurnPredictionModel = {
  name: 'churn_prediction',
  label: 'Customer Churn Prediction',
  description:
    'Classification model that predicts account churn risk using activity, support, satisfaction, and contractual signals.',
  type: 'classification',
  algorithm: 'gradient_boosting',
  objectName: 'account',
  target: 'is_churned',
  targetType: 'binary',

  features: [
    {
      name: 'days_since_last_activity',
      label: 'Days Since Last Activity',
      field: 'days_since_last_activity',
      dataType: 'numeric',
      transformation: 'normalize',
      required: true,
      importance: 0.22,
      description: 'Number of days since the last recorded account activity.',
    },
    {
      name: 'support_tickets_count',
      label: 'Support Tickets Count',
      field: 'support_tickets_count',
      dataType: 'numeric',
      transformation: 'log_transform',
      required: true,
      importance: 0.16,
      description: 'Total number of support tickets filed in the trailing period.',
    },
    {
      name: 'satisfaction_score',
      label: 'Satisfaction Score',
      field: 'satisfaction_score',
      dataType: 'numeric',
      transformation: 'normalize',
      required: true,
      importance: 0.2,
      description: 'Most recent customer satisfaction (CSAT) score.',
    },
    {
      name: 'contract_end_days',
      label: 'Days Until Contract End',
      field: 'contract_end_days',
      dataType: 'numeric',
      transformation: 'normalize',
      required: true,
      importance: 0.15,
      description: 'Number of days remaining on the current contract.',
    },
    {
      name: 'usage_trend',
      label: 'Usage Trend',
      field: 'usage_trend',
      dataType: 'numeric',
      transformation: 'standardize',
      required: true,
      importance: 0.15,
      description: 'Slope of product usage over the trailing 90 days (positive = growing).',
    },
    {
      name: 'payment_delays',
      label: 'Payment Delays',
      field: 'payment_delays',
      dataType: 'numeric',
      transformation: 'log_transform',
      required: false,
      importance: 0.12,
      description: 'Count of late payments in the trailing 12 months.',
    },
  ],

  hyperparameters: {
    learningRate: 0.03,
    epochs: 300,
    maxDepth: 5,
    numTrees: 200,
    custom: {
      subsample: 0.75,
      colsample_bytree: 0.8,
      scale_pos_weight: 3,
    },
  },

  training: {
    trainingDataRatio: 0.7,
    validationDataRatio: 0.15,
    testDataRatio: 0.15,
    minRecords: 3000,
    strategy: 'full',
    crossValidation: true,
    folds: 5,
    earlyStoppingEnabled: true,
    earlyStoppingPatience: 15,
    gpuEnabled: false,
  },

  deploymentStatus: 'draft',
  version: '1.0.0',
  predictionField: 'churn_probability',
  confidenceField: 'churn_confidence',
  updateTrigger: 'on_update',
  autoRetrain: true,
  enableExplainability: true,
  enableMonitoring: true,
  alertOnDrift: true,
  active: true,
  tags: ['account', 'churn', 'retention', 'classification'],
  category: 'customer_success',
} satisfies PredictiveModel;

PredictiveModelSchema.parse(ChurnPredictionModel);

export default ChurnPredictionModel;
