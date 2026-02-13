import type { Flow } from '@objectstack/spec/automation';
import { FlowSchema } from '@objectstack/spec/automation';

/**
 * Invoice Collection Flow
 * Scheduled flow to chase overdue invoices: remind, escalate, and write-off.
 */
export const InvoiceCollectionFlow = {
  name: 'invoice_collection',
  label: 'Invoice Collection',
  description: 'Automated invoice collection with reminders, escalation, and write-off',
  version: 1,
  status: 'active' as const,
  template: false,
  type: 'schedule' as const,
  variables: [
    { name: 'invoice_id', type: 'string', isInput: true, isOutput: false },
    { name: 'days_overdue', type: 'number', isInput: false, isOutput: true },
    { name: 'reminder_count', type: 'number', isInput: false, isOutput: false },
  ],
  nodes: [
    {
      id: 'start',
      type: 'start' as const,
      label: 'Scheduled Collection Run',
      config: { schedule: '0 8 * * 1-5' },
      position: { x: 0, y: 0 },
    },
    {
      id: 'check_overdue',
      type: 'get_record' as const,
      label: 'Find Overdue Invoices',
      config: {
        object: 'invoice',
        filters: [['status', '=', 'Overdue'], ['due_date', '<', '{{TODAY}}']],
      },
      position: { x: 0, y: 100 },
    },
    {
      id: 'send_reminder',
      type: 'connector_action' as const,
      label: 'Send Payment Reminder',
      connectorConfig: {
        connectorId: 'email_service',
        actionId: 'send_email',
        input: {
          to: '{{invoice.contact.email}}',
          subject: 'Payment Reminder: Invoice #{{invoice.number}}',
          body: 'Your invoice of {{invoice.amount}} is {{days_overdue}} days overdue.',
        },
      },
      position: { x: 0, y: 200 },
    },
    {
      id: 'escalate_decision',
      type: 'decision' as const,
      label: 'Escalation Required?',
      config: {
        rules: [
          { label: 'Escalate', condition: 'days_overdue > 60' },
          { label: 'Write Off', condition: 'days_overdue > 120' },
          { label: 'Wait', condition: 'days_overdue <= 60' },
        ],
      },
      position: { x: 0, y: 300 },
    },
    {
      id: 'escalate_to_manager',
      type: 'connector_action' as const,
      label: 'Escalate to Finance Manager',
      connectorConfig: {
        connectorId: 'notification_service',
        actionId: 'send_notification',
        input: {
          recipient: '{{finance_manager_id}}',
          message: 'Invoice #{{invoice.number}} is {{days_overdue}} days overdue — requires attention.',
        },
      },
      position: { x: -150, y: 400 },
    },
    {
      id: 'write_off',
      type: 'update_record' as const,
      label: 'Write Off Invoice',
      config: {
        object: 'invoice',
        filters: [['id', '=', '{{invoice_id}}']],
        values: { status: 'Written Off', write_off_date: '{{TODAY}}' },
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
    { id: 'e1', source: 'start', target: 'check_overdue', type: 'default' as const },
    { id: 'e2', source: 'check_overdue', target: 'send_reminder', type: 'default' as const },
    { id: 'e3', source: 'send_reminder', target: 'escalate_decision', type: 'default' as const },
    { id: 'e4', source: 'escalate_decision', target: 'escalate_to_manager', type: 'default' as const, condition: 'days_overdue > 60 && days_overdue <= 120', label: 'Escalate' },
    { id: 'e5', source: 'escalate_decision', target: 'write_off', type: 'default' as const, condition: 'days_overdue > 120', label: 'Write Off' },
    { id: 'e6', source: 'escalate_decision', target: 'end', type: 'default' as const, condition: 'days_overdue <= 60', label: 'Wait' },
    { id: 'e7', source: 'escalate_to_manager', target: 'end', type: 'default' as const },
    { id: 'e8', source: 'write_off', target: 'end', type: 'default' as const },
  ],
  active: true,
  runAs: 'system' as const,
  errorHandling: {
    strategy: 'continue' as const,
    maxRetries: 3,
    retryDelayMs: 15000,
  },
} satisfies Flow;

FlowSchema.parse(InvoiceCollectionFlow);

export default InvoiceCollectionFlow;
