import type { Flow } from '@objectstack/spec/automation';
import { FlowSchema } from '@objectstack/spec/automation';

/**
 * Case Escalation Flow
 * Auto-launched flow that monitors SLA breaches and escalates through notification,
 * reassignment, and executive alerting tiers.
 */
export const CaseEscalationFlow = {
  name: 'case_escalation',
  label: 'Case Escalation',
  description: 'Automated SLA-driven case escalation: notify, reassign, and alert executives',
  version: 1,
  status: 'active' as const,
  template: false,
  type: 'autolaunched' as const,
  variables: [
    { name: 'case_id', type: 'string', isInput: true, isOutput: false },
    { name: 'sla_breached', type: 'boolean', isInput: false, isOutput: true },
    { name: 'escalation_level', type: 'number', isInput: false, isOutput: true },
    { name: 'hours_open', type: 'number', isInput: false, isOutput: false },
  ],
  nodes: [
    {
      id: 'start',
      type: 'start' as const,
      label: 'Escalation Check Triggered',
      position: { x: 0, y: 0 },
    },
    {
      id: 'check_sla',
      type: 'decision' as const,
      label: 'SLA Breached?',
      config: {
        rules: [
          { label: 'Level 1 — Warn', condition: { dialect: 'cel', source: 'hours_open > 4 && hours_open <= 8' } },
          { label: 'Level 2 — Escalate', condition: { dialect: 'cel', source: 'hours_open > 8 && hours_open <= 24' } },
          { label: 'Level 3 — Executive', condition: { dialect: 'cel', source: 'hours_open > 24' } },
          { label: 'Within SLA', condition: { dialect: 'cel', source: 'hours_open <= 4' } },
        ],
      },
      position: { x: 0, y: 100 },
    },
    {
      id: 'notify_manager',
      type: 'connector_action' as const,
      label: 'Notify Support Manager',
      connectorConfig: {
        connectorId: 'notification_service',
        actionId: 'send_notification',
        input: {
          recipient: '{{case.owner.manager_id}}',
          message: 'Case #{{case.number}} is approaching SLA breach ({{hours_open}}h open).',
          priority: 'high',
        },
      },
      position: { x: -150, y: 200 },
    },
    {
      id: 'reassign_case',
      type: 'update_record' as const,
      label: 'Reassign to Senior Agent',
      config: {
        object: 'case',
        filters: [['id', '=', '{{case_id}}']],
        values: {
          owner_id: '{{senior_agent_queue}}',
          priority: 'High',
          escalation_level: 2,
        },
      },
      position: { x: 0, y: 300 },
    },
    {
      id: 'exec_alert',
      type: 'connector_action' as const,
      label: 'Executive Alert',
      connectorConfig: {
        connectorId: 'notification_service',
        actionId: 'send_notification',
        input: {
          recipient: '{{vp_support_id}}',
          message: 'CRITICAL: Case #{{case.number}} has breached SLA by {{hours_open}}h. Immediate action required.',
          priority: 'critical',
        },
      },
      position: { x: 150, y: 400 },
    },
    {
      id: 'end',
      type: 'end' as const,
      label: 'End',
      position: { x: 0, y: 500 },
    },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'check_sla', type: 'default' as const },
    { id: 'e2', source: 'check_sla', target: 'end', type: 'default' as const, condition: { dialect: 'cel', source: 'hours_open <= 4' }, label: 'Within SLA' },
    { id: 'e3', source: 'check_sla', target: 'notify_manager', type: 'default' as const, condition: { dialect: 'cel', source: 'hours_open > 4 && hours_open <= 8' }, label: 'Level 1' },
    { id: 'e4', source: 'check_sla', target: 'reassign_case', type: 'default' as const, condition: { dialect: 'cel', source: 'hours_open > 8 && hours_open <= 24' }, label: 'Level 2' },
    { id: 'e5', source: 'check_sla', target: 'exec_alert', type: 'default' as const, condition: { dialect: 'cel', source: 'hours_open > 24' }, label: 'Level 3' },
    { id: 'e6', source: 'notify_manager', target: 'end', type: 'default' as const },
    { id: 'e7', source: 'reassign_case', target: 'exec_alert', type: 'default' as const },
    { id: 'e8', source: 'exec_alert', target: 'end', type: 'default' as const },
  ],
  active: true,
  runAs: 'system' as const,
  errorHandling: {
    strategy: 'retry' as const,
    maxRetries: 3,
    retryDelayMs: 3000,
  },
} satisfies Flow;

FlowSchema.parse(CaseEscalationFlow);

export default CaseEscalationFlow;
