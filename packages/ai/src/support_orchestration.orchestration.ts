/**
 * Support Orchestration — Multi-step AI Support Pipeline
 *
 * Triggered when a new support case is created. Classifies category, analyses
 * customer sentiment, recommends a resolution path, and drafts an initial
 * response — then updates the case category and priority fields.
 */

import type { AIOrchestration } from '@objectstack/spec/ai';
import { AIOrchestrationSchema } from '@objectstack/spec/ai';

export const SupportOrchestration = {
  name: 'support_orchestration',
  label: 'Support Case Orchestration',
  description:
    'Multi-step AI pipeline triggered on new case creation to auto-classify, gauge sentiment, suggest resolution, and draft a response.',
  objectName: 'case',
  trigger: 'record_created',
  entryCriteria: 'status == "New"',

  aiTasks: [
    {
      name: 'classify_category',
      type: 'classify',
      model: 'gpt-4o',
      promptTemplate:
        'Classify the following support case into exactly one category (billing, technical, feature_request, account, security, integration, general). Subject: {{subject}}. Description: {{description}}.',
      inputFields: ['subject', 'description'],
      outputField: 'category',
      outputFormat: 'text',
      temperature: 0.1,
      fallbackValue: 'general',
      multiClass: false,
      retryAttempts: 2,
      description: 'Auto-classify the case into a support category.',
      active: true,
    },
    {
      name: 'analyse_sentiment',
      type: 'sentiment',
      model: 'gpt-4o',
      promptTemplate:
        'Analyse the customer sentiment in this support case. Subject: {{subject}}. Description: {{description}}. Return one of: very_negative, negative, neutral, positive, very_positive.',
      inputFields: ['subject', 'description'],
      outputField: 'customer_sentiment',
      outputFormat: 'text',
      temperature: 0.1,
      fallbackValue: 'neutral',
      multiClass: false,
      retryAttempts: 2,
      description: 'Determine customer sentiment to help prioritise the case.',
      active: true,
    },
    {
      name: 'suggest_resolution',
      type: 'recommendation',
      model: 'gpt-4o',
      promptTemplate:
        'Given a {{category}} support case with {{customer_sentiment}} sentiment — Subject: {{subject}}, Description: {{description}} — recommend the best resolution approach including relevant KB articles or escalation path.',
      inputFields: ['category', 'customer_sentiment', 'subject', 'description'],
      outputField: 'suggested_resolution',
      outputFormat: 'text',
      temperature: 0.4,
      retryAttempts: 2,
      multiClass: false,
      condition: 'category != null',
      description: 'Recommend a resolution strategy based on classification and sentiment.',
      active: true,
    },
    {
      name: 'draft_response',
      type: 'generate',
      model: 'gpt-4o',
      promptTemplate:
        'Draft a professional, empathetic support response for the following case. Category: {{category}}. Sentiment: {{customer_sentiment}}. Subject: {{subject}}. Suggested resolution: {{suggested_resolution}}. Address the customer by name if available: {{contact_name}}.',
      inputFields: ['category', 'customer_sentiment', 'subject', 'suggested_resolution', 'contact_name'],
      outputField: 'draft_response',
      outputFormat: 'text',
      temperature: 0.5,
      multiClass: false,
      retryAttempts: 2,
      description: 'Generate an initial response draft for agent review.',
      active: true,
    },
  ],

  postActions: [
    {
      type: 'field_update',
      name: 'update_category',
      config: { field: 'category', value: '{{category}}' },
    },
    {
      type: 'field_update',
      name: 'update_priority',
      config: {
        field: 'priority',
        value: '{{computed_priority}}',
        mapping: {
          very_negative: 'urgent',
          negative: 'high',
          neutral: 'medium',
          positive: 'low',
          very_positive: 'low',
        },
        source: 'customer_sentiment',
      },
    },
  ],

  executionMode: 'sequential',
  stopOnError: false,
  timeout: 90,
  priority: 'high',
  enableLogging: true,
  enableMetrics: true,
  active: true,
  version: '1.0.0',
  tags: ['support', 'case', 'triage', 'orchestration'],
  category: 'support',
} satisfies AIOrchestration;

AIOrchestrationSchema.parse(SupportOrchestration);

export default SupportOrchestration;
