// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { ApprovalProcess } from '@objectstack/spec/automation';

/**
 * Opportunity Discount Approval
 *
 * Multi-step approval for high-value opportunities. Triggered when an
 * opportunity amount exceeds 500,000. Sales manager reviews first, then
 * a sales director signs off. Either rejection rolls back to the previous
 * step so the submitter can re-justify.
 *
 * Phase B autopilot:
 *   - `entryCriteria` causes the engine to auto-submit on insert/update
 *     when amount crosses the threshold.
 *   - `lockRecord: true` blocks edits while a request is pending.
 *   - `approvalStatusField: 'approval_status'` mirrors the request status
 *     onto the opportunity row.
 *   - `onSubmit` notifies the pending approvers via the system inbox.
 *   - `onFinalApprove` advances the opportunity to closed_won.
 *   - `onFinalReject` notifies the submitter.
 */
export const OpportunityDiscountApproval = ApprovalProcess.create({
  name: 'opportunity_discount_approval',
  label: 'Opportunity Discount Approval',
  object: 'opportunity',
  active: true,
  description:
    'High-value opportunities (amount > 500k) require manager + director sign-off.',

  entryCriteria: 'record.amount > 500000',
  lockRecord: true,
  approvalStatusField: 'approval_status',

  onSubmit: [
    {
      type: 'inbox_notify',
      name: 'notify_approvers',
      config: {
        to: 'pending_approvers',
        title: 'Discount approval needed',
        body: 'Opportunity {record_id} (amount over 500k) is awaiting your review.',
        link: '/system/approvals',
      },
    },
  ],

  onFinalApprove: [
    {
      type: 'field_update',
      name: 'mark_won',
      config: { field: 'stage', value: 'closed_won' },
    },
    {
      type: 'inbox_notify',
      name: 'notify_submitter_approved',
      config: {
        to: 'submitter',
        title: 'Discount approved',
        body: 'Your discount request on opportunity {record_id} was approved.',
        link: '/system/approvals',
      },
    },
  ],

  onFinalReject: [
    {
      type: 'inbox_notify',
      name: 'notify_submitter_rejected',
      config: {
        to: 'submitter',
        title: 'Discount rejected',
        body: 'Your discount request on opportunity {record_id} was rejected: {comment}',
        link: '/system/approvals',
      },
    },
  ],

  onRecall: [
    {
      type: 'inbox_notify',
      name: 'notify_recall',
      config: {
        to: 'pending_approvers',
        title: 'Discount request recalled',
        body: 'Submitter recalled the discount request on opportunity {record_id}.',
      },
    },
  ],

  steps: [
    {
      name: 'manager_review',
      label: 'Sales Manager Review',
      description: 'First-line review by the sales manager.',
      approvers: [
        { type: 'role', value: 'sales_manager' },
      ],
      behavior: 'first_response',
      rejectionBehavior: 'back_to_previous',
    },
    {
      name: 'director_signoff',
      label: 'Sales Director Sign-off',
      description: 'Final sign-off for the discounted deal.',
      approvers: [
        { type: 'role', value: 'sales_director' },
      ],
      behavior: 'first_response',
      rejectionBehavior: 'back_to_previous',
    },
  ],
});

