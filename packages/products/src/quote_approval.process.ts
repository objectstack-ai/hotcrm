// Approval process configuration for quote approvals
import { ApprovalProcessSchema, type ApprovalProcess } from '@objectstack/spec/automation';

/**
 * Quote Approval Process
 * Multi-step approval workflow for quotes based on discount level and deal size
 */
export const QuoteApprovalProcess = {
  name: 'quote_approval',
  label: 'Quote Approval Process',
  object: 'quote',
  description: 'Routes quote approvals through the appropriate chain based on discount percentage and total deal value',
  active: true,

  entryCriteria: 'discount_percent > 0 OR total_amount > 100000',
  lockRecord: true,

  steps: [
    {
      name: 'manager_approval',
      label: 'Sales Manager Approval',
      description: 'First-level approval by the direct sales manager',
      order: 1,
      approvers: [
        { type: 'manager', value: 'owner_id' },
      ],
      entryCriteria: 'discount_percent > 0',
      behavior: 'first_response',
      rejectionBehavior: 'reject_process',
      onApprove: [
        { type: 'fieldUpdate', field: 'manager_approved', value: true },
        { type: 'fieldUpdate', field: 'manager_approved_date', value: 'NOW()' },
      ],
      onReject: [
        { type: 'fieldUpdate', field: 'status', value: 'rejected' },
        {
          type: 'emailAlert',
          template: 'quote_rejected_notification',
          recipients: ['${owner.email}'],
        },
      ],
    },
    {
      name: 'director_approval',
      label: 'Sales Director Approval',
      description: 'Second-level approval for significant discounts or large deals',
      order: 2,
      approvers: [
        { type: 'role', value: 'sales_director' },
      ],
      entryCriteria: 'discount_percent > 15 OR total_amount > 250000',
      behavior: 'first_response',
      rejectionBehavior: 'back_to_previous',
      onApprove: [
        { type: 'fieldUpdate', field: 'director_approved', value: true },
        { type: 'fieldUpdate', field: 'director_approved_date', value: 'NOW()' },
      ],
      onReject: [
        {
          type: 'emailAlert',
          template: 'quote_director_rejection',
          recipients: ['${owner.email}', '${owner.manager.email}'],
        },
      ],
    },
    {
      name: 'vp_approval',
      label: 'VP of Sales Approval',
      description: 'Executive approval for deep discounts or enterprise deals',
      order: 3,
      approvers: [
        { type: 'role', value: 'vp_sales' },
      ],
      entryCriteria: 'discount_percent > 30 OR total_amount > 500000',
      behavior: 'first_response',
      rejectionBehavior: 'reject_process',
      onApprove: [
        { type: 'fieldUpdate', field: 'vp_approved', value: true },
        { type: 'fieldUpdate', field: 'vp_approved_date', value: 'NOW()' },
      ],
      onReject: [
        {
          type: 'emailAlert',
          template: 'quote_vp_rejection',
          recipients: ['${owner.email}', '${owner.manager.email}'],
        },
      ],
    },
  ],

  onSubmit: [
    { type: 'fieldUpdate', field: 'status', value: 'pending_approval' },
    { type: 'fieldUpdate', field: 'submitted_date', value: 'NOW()' },
    {
      type: 'emailAlert',
      template: 'quote_submitted_for_approval',
      recipients: ['${owner.email}'],
    },
  ],

  onFinalApprove: [
    { type: 'fieldUpdate', field: 'status', value: 'approved' },
    { type: 'fieldUpdate', field: 'approved_date', value: 'NOW()' },
    {
      type: 'emailAlert',
      template: 'quote_fully_approved',
      recipients: ['${owner.email}', '${account.owner.email}'],
    },
  ],

  onFinalReject: [
    { type: 'fieldUpdate', field: 'status', value: 'rejected' },
    {
      type: 'emailAlert',
      template: 'quote_final_rejection',
      recipients: ['${owner.email}'],
    },
  ],

  onRecall: [
    { type: 'fieldUpdate', field: 'status', value: 'draft' },
  ],
};

// Spec-validated approval process definition
export const ValidatedQuoteApprovalProcess = ApprovalProcessSchema.parse({
  name: 'quote_approval',
  label: 'Quote Approval Process',
  object: 'quote',
  active: true,
  steps: [
    {
      name: 'manager_approval',
      label: 'Sales Manager Approval',
      approvers: [{ type: 'manager', value: 'owner_id' }],
      behavior: 'first_response',
      rejectionBehavior: 'reject_process',
    },
    {
      name: 'director_approval',
      label: 'Sales Director Approval',
      approvers: [{ type: 'role', value: 'sales_director' }],
      behavior: 'first_response',
      rejectionBehavior: 'back_to_previous',
    },
    {
      name: 'vp_approval',
      label: 'VP of Sales Approval',
      approvers: [{ type: 'role', value: 'vp_sales' }],
      behavior: 'first_response',
      rejectionBehavior: 'reject_process',
    },
  ],
} satisfies ApprovalProcess);

export default QuoteApprovalProcess;
