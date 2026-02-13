import type { Flow } from '@objectstack/spec/automation';
import { FlowSchema } from '@objectstack/spec/automation';

/**
 * Lead Nurture Flow
 * Scheduled flow that checks engagement, sends drip emails, updates scores,
 * and hands off marketing-qualified leads to sales.
 */
export const LeadNurtureFlow = {
  name: 'lead_nurture',
  label: 'Lead Nurture Campaign',
  description: 'Automated lead nurturing: engagement checks, drip emails, scoring, and MQL handoff',
  version: 1,
  status: 'active' as const,
  template: false,
  type: 'schedule' as const,
  variables: [
    { name: 'lead_id', type: 'string', isInput: true, isOutput: false },
    { name: 'engagement_score', type: 'number', isInput: false, isOutput: true },
    { name: 'is_mql', type: 'boolean', isInput: false, isOutput: true },
    { name: 'drip_stage', type: 'number', isInput: false, isOutput: false },
  ],
  nodes: [
    {
      id: 'start',
      type: 'start' as const,
      label: 'Nurture Schedule Triggered',
      config: { schedule: '0 9 * * 1,3,5' },
      position: { x: 0, y: 0 },
    },
    {
      id: 'check_engagement',
      type: 'get_record' as const,
      label: 'Check Lead Engagement',
      config: {
        object: 'lead',
        filters: [['nurture_status', '=', 'Active'], ['is_converted', '=', false]],
        fields: ['id', 'email', 'engagement_score', 'drip_stage', 'last_activity_date'],
      },
      position: { x: 0, y: 100 },
    },
    {
      id: 'send_drip_email',
      type: 'connector_action' as const,
      label: 'Send Drip Email',
      connectorConfig: {
        connectorId: 'email_service',
        actionId: 'send_email',
        input: {
          to: '{{lead.email}}',
          template: 'drip_stage_{{drip_stage}}',
          subject: 'We thought you might find this helpful',
          merge_fields: { first_name: '{{lead.first_name}}', company: '{{lead.company}}' },
        },
      },
      position: { x: 0, y: 200 },
    },
    {
      id: 'update_score',
      type: 'update_record' as const,
      label: 'Update Engagement Score',
      config: {
        object: 'lead',
        filters: [['id', '=', '{{lead_id}}']],
        values: {
          engagement_score: '{{engagement_score + 10}}',
          drip_stage: '{{drip_stage + 1}}',
          last_nurture_date: '{{TODAY}}',
        },
      },
      position: { x: 0, y: 300 },
    },
    {
      id: 'mql_decision',
      type: 'decision' as const,
      label: 'Marketing Qualified?',
      config: {
        rules: [
          { label: 'MQL — Handoff', condition: 'engagement_score >= 75' },
          { label: 'Continue Nurturing', condition: 'engagement_score < 75' },
        ],
      },
      position: { x: 0, y: 400 },
    },
    {
      id: 'handoff_to_sales',
      type: 'update_record' as const,
      label: 'Handoff to Sales',
      config: {
        object: 'lead',
        filters: [['id', '=', '{{lead_id}}']],
        values: {
          status: 'MQL',
          is_converted: true,
          converted_date: '{{TODAY}}',
          owner_id: '{{sales_rep_queue}}',
        },
      },
      position: { x: -150, y: 500 },
    },
    {
      id: 'end',
      type: 'end' as const,
      label: 'End',
      position: { x: 0, y: 600 },
    },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'check_engagement', type: 'default' as const },
    { id: 'e2', source: 'check_engagement', target: 'send_drip_email', type: 'default' as const },
    { id: 'e3', source: 'send_drip_email', target: 'update_score', type: 'default' as const },
    { id: 'e4', source: 'update_score', target: 'mql_decision', type: 'default' as const },
    { id: 'e5', source: 'mql_decision', target: 'handoff_to_sales', type: 'default' as const, condition: 'engagement_score >= 75', label: 'MQL' },
    { id: 'e6', source: 'mql_decision', target: 'end', type: 'default' as const, condition: 'engagement_score < 75', label: 'Continue Nurturing' },
    { id: 'e7', source: 'handoff_to_sales', target: 'end', type: 'default' as const },
  ],
  active: true,
  runAs: 'system' as const,
  errorHandling: {
    strategy: 'continue' as const,
    maxRetries: 3,
    retryDelayMs: 10000,
  },
} satisfies Flow;

FlowSchema.parse(LeadNurtureFlow);

export default LeadNurtureFlow;
