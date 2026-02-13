import type { Flow } from '@objectstack/spec/automation';
import { FlowSchema } from '@objectstack/spec/automation';

/**
 * Employee Onboarding Flow
 * Orchestrates offer letter, document collection, IT provisioning, training, and 30-day check-in.
 */
export const OnboardingFlow = {
  name: 'onboarding',
  label: 'Employee Onboarding',
  description: 'Automated onboarding: offer, documents, IT setup, training, and 30-day check-in',
  version: 1,
  status: 'active' as const,
  template: false,
  type: 'record_change' as const,
  variables: [
    { name: 'employee_id', type: 'string', isInput: true, isOutput: false },
    { name: 'department', type: 'string', isInput: false, isOutput: false },
    { name: 'start_date', type: 'string', isInput: false, isOutput: false },
    { name: 'manager_id', type: 'string', isInput: false, isOutput: false },
  ],
  nodes: [
    {
      id: 'start',
      type: 'start' as const,
      label: 'New Hire Record Created',
      config: { object: 'employee', trigger: 'after_create' },
      position: { x: 0, y: 0 },
    },
    {
      id: 'send_offer',
      type: 'connector_action' as const,
      label: 'Send Offer Letter',
      connectorConfig: {
        connectorId: 'email_service',
        actionId: 'send_email',
        input: {
          to: '{{employee.personal_email}}',
          subject: 'Welcome to the team! Your offer letter',
          body: 'Please review and sign your offer letter.',
          template: 'offer_letter',
        },
      },
      position: { x: 0, y: 100 },
    },
    {
      id: 'collect_docs',
      type: 'create_record' as const,
      label: 'Create Document Checklist',
      config: {
        object: 'task',
        values: {
          subject: 'Collect onboarding documents for {{employee.name}}',
          assigned_to: '{{employee_id}}',
          due_date: '{{DATE_ADD(start_date, -7)}}',
          type: 'Document Collection',
          status: 'Open',
        },
      },
      position: { x: 0, y: 200 },
    },
    {
      id: 'it_setup',
      type: 'create_record' as const,
      label: 'IT Equipment & Access Setup',
      config: {
        object: 'task',
        values: {
          subject: 'Provision IT access for {{employee.name}}',
          assigned_to: '{{it_team_queue}}',
          due_date: '{{DATE_ADD(start_date, -3)}}',
          type: 'IT Provisioning',
          status: 'Open',
          description: 'Laptop, email, VPN, and system access for department: {{department}}',
        },
      },
      position: { x: 0, y: 300 },
    },
    {
      id: 'schedule_training',
      type: 'create_record' as const,
      label: 'Schedule Orientation & Training',
      config: {
        object: 'task',
        values: {
          subject: 'Orientation and training for {{employee.name}}',
          assigned_to: '{{manager_id}}',
          due_date: '{{DATE_ADD(start_date, 5)}}',
          type: 'Training',
          status: 'Open',
        },
      },
      position: { x: 0, y: 400 },
    },
    {
      id: 'thirty_day_checkin',
      type: 'create_record' as const,
      label: '30-Day Check-in Task',
      config: {
        object: 'task',
        values: {
          subject: '30-day check-in with {{employee.name}}',
          assigned_to: '{{manager_id}}',
          due_date: '{{DATE_ADD(start_date, 30)}}',
          type: 'Check-in',
          status: 'Open',
        },
      },
      position: { x: 0, y: 500 },
    },
    {
      id: 'end',
      type: 'end' as const,
      label: 'End',
      position: { x: 0, y: 600 },
    },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'send_offer', type: 'default' as const },
    { id: 'e2', source: 'send_offer', target: 'collect_docs', type: 'default' as const },
    { id: 'e3', source: 'collect_docs', target: 'it_setup', type: 'default' as const },
    { id: 'e4', source: 'it_setup', target: 'schedule_training', type: 'default' as const },
    { id: 'e5', source: 'schedule_training', target: 'thirty_day_checkin', type: 'default' as const },
    { id: 'e6', source: 'thirty_day_checkin', target: 'end', type: 'default' as const },
  ],
  active: true,
  runAs: 'system' as const,
  errorHandling: {
    strategy: 'continue' as const,
    maxRetries: 2,
    retryDelayMs: 5000,
  },
} satisfies Flow;

FlowSchema.parse(OnboardingFlow);

export default OnboardingFlow;
