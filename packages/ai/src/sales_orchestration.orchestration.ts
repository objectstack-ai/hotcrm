/**
 * Sales Orchestration — Multi-step AI Sales Pipeline
 *
 * Triggered when an opportunity's stage changes. Classifies risk, summarises
 * the deal, recommends the next best action, and drafts outreach — then
 * updates the risk-level field and alerts account owners on high-risk deals.
 */

import type { AIOrchestration } from '@objectstack/spec/ai';
import { AIOrchestrationSchema } from '@objectstack/spec/ai';

export const SalesOrchestration = {
  name: 'sales_orchestration',
  label: 'Sales Deal Orchestration',
  description:
    'Multi-step AI pipeline that triggers on opportunity stage changes to assess risk, summarise the deal, recommend next actions, and draft personalised outreach.',
  objectName: 'opportunity',
  trigger: 'field_changed',
  fieldConditions: [
    { field: 'stage', operator: 'changed' },
  ],
  entryCriteria: 'stage != "Closed Won" && stage != "Closed Lost"',

  aiTasks: [
    {
      name: 'classify_risk_level',
      type: 'classify',
      model: 'gpt-4o',
      promptTemplate:
        'Classify the risk level of opportunity "{{name}}" (amount: {{amount}}, stage: {{stage}}, days in stage: {{days_in_stage}}, close date: {{close_date}}). Return one of: low, medium, high, critical.',
      inputFields: ['name', 'amount', 'stage', 'days_in_stage', 'close_date'],
      outputField: 'risk_level',
      outputFormat: 'text',
      temperature: 0.2,
      fallbackValue: 'medium',
      retryAttempts: 2,
      multiClass: false,
      description: 'Classify the overall risk level of the deal based on key signals.',
      active: true,
    },
    {
      name: 'summarise_deal',
      type: 'summarize',
      model: 'gpt-4o',
      promptTemplate:
        'Summarise this opportunity for an executive audience. Name: {{name}}, Account: {{account_name}}, Amount: {{amount}}, Stage: {{stage}}, Risk: {{risk_level}}, Competitors: {{competitors}}, Notes: {{description}}.',
      inputFields: ['name', 'account_name', 'amount', 'stage', 'risk_level', 'competitors', 'description'],
      outputField: 'deal_summary',
      outputFormat: 'text',
      temperature: 0.4,
      retryAttempts: 2,
      multiClass: false,
      condition: 'risk_level != null',
      description: 'Generate a concise executive summary of the deal.',
      active: true,
    },
    {
      name: 'recommend_next_action',
      type: 'recommendation',
      model: 'gpt-4o',
      promptTemplate:
        'Based on opportunity "{{name}}" at stage {{stage}} with risk {{risk_level}} and summary: {{deal_summary}}, recommend the single best next action the sales rep should take. Include rationale and timing.',
      inputFields: ['name', 'stage', 'risk_level', 'deal_summary'],
      outputField: 'next_best_action',
      outputFormat: 'text',
      temperature: 0.5,
      multiClass: false,
      retryAttempts: 2,
      description: 'Recommend the optimal next step to advance the deal.',
      active: true,
    },
    {
      name: 'generate_outreach_draft',
      type: 'generate',
      model: 'gpt-4o',
      promptTemplate:
        'Draft a personalised follow-up email to the primary contact at {{account_name}} regarding opportunity "{{name}}". The recommended action is: {{next_best_action}}. Tone should be professional and consultative.',
      inputFields: ['account_name', 'name', 'next_best_action'],
      outputField: 'outreach_draft',
      outputFormat: 'text',
      temperature: 0.6,
      multiClass: false,
      retryAttempts: 2,
      description: 'Generate a personalised outreach email based on the recommended action.',
      active: true,
    },
  ],

  postActions: [
    {
      type: 'field_update',
      name: 'update_risk_level',
      config: { field: 'risk_level', value: '{{risk_level}}' },
    },
    {
      type: 'send_email',
      name: 'alert_high_risk',
      config: {
        to: '{{owner_email}}',
        subject: 'High-Risk Deal Alert: {{name}}',
        body: '{{deal_summary}}\n\nRecommended Action: {{next_best_action}}',
      },
      condition: 'risk_level == "high" || risk_level == "critical"',
    },
  ],

  executionMode: 'sequential',
  stopOnError: true,
  timeout: 120,
  priority: 'high',
  enableLogging: true,
  enableMetrics: true,
  active: true,
  version: '1.0.0',
  tags: ['sales', 'opportunity', 'risk', 'orchestration'],
  category: 'sales',
} satisfies AIOrchestration;

AIOrchestrationSchema.parse(SalesOrchestration);

export default SalesOrchestration;
