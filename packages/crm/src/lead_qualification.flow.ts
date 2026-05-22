import type { Flow } from '@objectstack/spec/automation';
import { FlowSchema } from '@objectstack/spec/automation';

/**
 * Lead Qualification Flow
 * Scores incoming leads, routes by temperature, assigns to rep, and notifies.
 */
export const LeadQualificationFlow = {
  name: 'lead_qualification',
  label: 'Lead Qualification',
  description: 'Automatically score, route, assign, and notify reps for new leads',
  version: 1,
  status: 'active' as const,
  template: false,
  type: 'record_change' as const,
  variables: [
    { name: 'lead_id', type: 'string', isInput: true, isOutput: false },
    { name: 'lead_score', type: 'number', isInput: false, isOutput: true },
    { name: 'temperature', type: 'string', isInput: false, isOutput: true },
    { name: 'assigned_rep_id', type: 'string', isInput: false, isOutput: true },
  ],
  nodes: [
    {
      id: 'start',
      type: 'start' as const,
      label: 'New Lead Created',
      config: { object: 'lead', trigger: 'after_create' },
      position: { x: 0, y: 0 },
    },
    {
      id: 'score_lead',
      type: 'assignment' as const,
      label: 'Score Lead',
      config: {
        assignments: [
          { variable: 'lead_score', operator: 'equals', value: '{{lead.score}}' },
        ],
      },
      position: { x: 0, y: 100 },
    },
    {
      id: 'route_decision',
      type: 'decision' as const,
      label: 'Lead Temperature',
      config: {
        rules: [
          { label: 'Hot', condition: { dialect: 'cel', source: 'lead_score >= 80' } },
          { label: 'Warm', condition: { dialect: 'cel', source: 'lead_score >= 50 && lead_score < 80' } },
          { label: 'Cold', condition: { dialect: 'cel', source: 'lead_score < 50' } },
        ],
      },
      position: { x: 0, y: 200 },
    },
    {
      id: 'assign_rep',
      type: 'update_record' as const,
      label: 'Assign Sales Rep',
      config: {
        object: 'lead',
        filters: [['id', '=', '{{lead_id}}']],
        values: { owner_id: '{{assigned_rep_id}}', status: 'Working' },
      },
      position: { x: 0, y: 300 },
    },
    {
      id: 'notify_rep',
      type: 'connector_action' as const,
      label: 'Notify Assigned Rep',
      connectorConfig: {
        connectorId: 'email_service',
        actionId: 'send_email',
        input: {
          to: '{{assigned_rep.email}}',
          subject: 'New {{temperature}} lead assigned: {{lead.name}}',
          body: 'A new lead with score {{lead_score}} has been assigned to you.',
        },
      },
      position: { x: 0, y: 400 },
    },
    {
      id: 'end',
      type: 'end' as const,
      label: 'End',
      position: { x: 0, y: 500 },
    },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'score_lead', type: 'default' as const },
    { id: 'e2', source: 'score_lead', target: 'route_decision', type: 'default' as const },
    { id: 'e3', source: 'route_decision', target: 'assign_rep', type: 'default' as const, condition: { dialect: 'cel', source: 'lead_score >= 80' }, label: 'Hot' },
    { id: 'e4', source: 'route_decision', target: 'assign_rep', type: 'default' as const, condition: { dialect: 'cel', source: 'lead_score >= 50 && lead_score < 80' }, label: 'Warm' },
    { id: 'e5', source: 'route_decision', target: 'end', type: 'default' as const, condition: { dialect: 'cel', source: 'lead_score < 50' }, label: 'Cold — No Action' },
    { id: 'e6', source: 'assign_rep', target: 'notify_rep', type: 'default' as const },
    { id: 'e7', source: 'notify_rep', target: 'end', type: 'default' as const },
  ],
  active: true,
  runAs: 'system' as const,
  errorHandling: {
    strategy: 'retry' as const,
    maxRetries: 3,
    retryDelayMs: 5000,
  },
} satisfies Flow;

FlowSchema.parse(LeadQualificationFlow);

export default LeadQualificationFlow;
