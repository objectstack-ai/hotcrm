/**
 * Lead Scoring — Predictive Lead Conversion Model
 *
 * Gradient-boosting classifier that predicts whether a lead will convert,
 * based on firmographic, behavioural, and engagement features.
 */

import type { PredictiveModel } from '@objectstack/spec/ai';
import { PredictiveModelSchema } from '@objectstack/spec/ai';

export const LeadScoringModel = {
  name: 'lead_scoring',
  label: 'Predictive Lead Scoring',
  description:
    'Gradient-boosting classification model that predicts lead conversion probability using firmographic and engagement signals.',
  type: 'classification',
  algorithm: 'gradient_boosting',
  objectName: 'lead',
  target: 'is_converted',
  targetType: 'binary',

  features: [
    {
      name: 'industry',
      label: 'Industry',
      field: 'industry',
      dataType: 'categorical',
      transformation: 'one_hot_encode',
      required: true,
      importance: 0.18,
      description: 'Industry vertical of the lead company.',
    },
    {
      name: 'company_size',
      label: 'Company Size',
      field: 'company_size',
      dataType: 'categorical',
      transformation: 'label_encode',
      required: true,
      importance: 0.14,
      description: 'Employee-count band of the lead company.',
    },
    {
      name: 'title',
      label: 'Job Title',
      field: 'title',
      dataType: 'text',
      transformation: 'embedding',
      required: false,
      importance: 0.12,
      description: 'Job title of the lead contact.',
    },
    {
      name: 'source',
      label: 'Lead Source',
      field: 'source',
      dataType: 'categorical',
      transformation: 'one_hot_encode',
      required: true,
      importance: 0.15,
      description: 'Channel through which the lead was acquired.',
    },
    {
      name: 'engagement_score',
      label: 'Engagement Score',
      field: 'engagement_score',
      dataType: 'numeric',
      transformation: 'normalize',
      required: true,
      importance: 0.2,
      description: 'Composite engagement score based on interactions.',
    },
    {
      name: 'email_opens',
      label: 'Email Opens',
      field: 'email_opens',
      dataType: 'numeric',
      transformation: 'log_transform',
      required: false,
      importance: 0.11,
      description: 'Total number of marketing email opens.',
    },
    {
      name: 'website_visits',
      label: 'Website Visits',
      field: 'website_visits',
      dataType: 'numeric',
      transformation: 'log_transform',
      required: false,
      importance: 0.1,
      description: 'Total website visits attributed to the lead.',
    },
  ],

  hyperparameters: {
    learningRate: 0.05,
    epochs: 200,
    maxDepth: 6,
    numTrees: 150,
    custom: {
      subsample: 0.8,
      colsample_bytree: 0.8,
      min_child_weight: 3,
    },
  },

  training: {
    trainingDataRatio: 0.7,
    validationDataRatio: 0.15,
    testDataRatio: 0.15,
    minRecords: 5000,
    strategy: 'full',
    crossValidation: true,
    folds: 5,
    earlyStoppingEnabled: true,
    earlyStoppingPatience: 10,
    gpuEnabled: false,
  },

  deploymentStatus: 'draft',
  version: '1.0.0',
  predictionField: 'conversion_probability',
  confidenceField: 'conversion_confidence',
  updateTrigger: 'on_update',
  autoRetrain: true,
  enableExplainability: true,
  enableMonitoring: true,
  alertOnDrift: true,
  active: true,
  tags: ['lead', 'scoring', 'conversion', 'classification'],
  category: 'sales',
} satisfies PredictiveModel;

PredictiveModelSchema.parse(LeadScoringModel);

export default LeadScoringModel;
