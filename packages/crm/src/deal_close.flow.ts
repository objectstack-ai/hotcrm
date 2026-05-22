import type { Flow } from '@objectstack/spec/automation';
import { FlowSchema } from '@objectstack/spec/automation';

/**
 * Deal Close Flow
 * Orchestrates approval, contract generation, invoicing, and support handoff.
 */
export const DealCloseFlow = {
  name: 'deal_close',
  label: 'Deal Close Process',
  description: 'End-to-end deal closure: approval, contract, invoice, and customer success handoff',
  version: 1,
  status: 'active' as const,
  template: false,
  type: 'record_change' as const,
  variables: [
    { name: 'opportunity_id', type: 'string', isInput: true, isOutput: false },
    { name: 'contract_id', type: 'string', isInput: false, isOutput: true },
    { name: 'invoice_id', type: 'string', isInput: false, isOutput: true },
    { name: 'is_approved', type: 'boolean', isInput: false, isOutput: false },
  ],
  nodes: [
    {
      id: 'start',
      type: 'start' as const,
      label: 'Deal Marked Closed-Won',
      config: { object: 'opportunity', trigger: 'after_update', condition: { dialect: 'cel', source: `stage == 'Closed Won'` } },
      position: { x: 0, y: 0 },
    },
    {
      id: 'check_approval',
      type: 'decision' as const,
      label: 'Check Approval Status',
      config: {
        rules: [
          { label: 'Approved', condition: { dialect: 'cel', source: 'is_approved == true' } },
          { label: 'Needs Approval', condition: { dialect: 'cel', source: 'is_approved == false' } },
        ],
      },
      position: { x: 0, y: 100 },
    },
    {
      id: 'request_approval',
      type: 'connector_action' as const,
      label: 'Request Manager Approval',
      connectorConfig: {
        connectorId: 'approval_service',
        actionId: 'request_approval',
        input: {
          record_id: '{{opportunity_id}}',
          approver: '{{opportunity.owner.manager_id}}',
        },
      },
      position: { x: 200, y: 100 },
    },
    {
      id: 'generate_contract',
      type: 'create_record' as const,
      label: 'Generate Contract',
      config: {
        object: 'contract',
        values: {
          opportunity_id: '{{opportunity_id}}',
          account_id: '{{opportunity.account_id}}',
          start_date: '{{TODAY}}',
          status: 'Draft',
        },
      },
      position: { x: 0, y: 200 },
    },
    {
      id: 'create_invoice',
      type: 'create_record' as const,
      label: 'Create Invoice',
      config: {
        object: 'invoice',
        values: {
          contract_id: '{{contract_id}}',
          amount: '{{opportunity.amount}}',
          due_date: '{{DATE_ADD(TODAY, 30)}}',
          status: 'Pending',
        },
      },
      position: { x: 0, y: 300 },
    },
    {
      id: 'handoff_to_support',
      type: 'create_record' as const,
      label: 'Handoff to Customer Success',
      config: {
        object: 'case',
        values: {
          subject: 'New Customer Onboarding: {{opportunity.account.name}}',
          type: 'Onboarding',
          account_id: '{{opportunity.account_id}}',
          priority: 'High',
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
    { id: 'e1', source: 'start', target: 'check_approval', type: 'default' as const },
    { id: 'e2', source: 'check_approval', target: 'generate_contract', type: 'default' as const, condition: { dialect: 'cel', source: 'is_approved == true' }, label: 'Approved' },
    { id: 'e3', source: 'check_approval', target: 'request_approval', type: 'default' as const, condition: { dialect: 'cel', source: 'is_approved == false' }, label: 'Needs Approval' },
    { id: 'e4', source: 'request_approval', target: 'generate_contract', type: 'default' as const },
    { id: 'e5', source: 'generate_contract', target: 'create_invoice', type: 'default' as const },
    { id: 'e6', source: 'create_invoice', target: 'handoff_to_support', type: 'default' as const },
    { id: 'e7', source: 'handoff_to_support', target: 'end', type: 'default' as const },
  ],
  active: true,
  runAs: 'system' as const,
  errorHandling: {
    strategy: 'retry' as const,
    maxRetries: 2,
    retryDelayMs: 10000,
    fallbackNodeId: 'end',
  },
} satisfies Flow;

FlowSchema.parse(DealCloseFlow);

export default DealCloseFlow;
