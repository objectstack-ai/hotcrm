// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { P, cel } from '@objectstack/spec';
import type * as Automation from '@objectstack/spec/automation';
type Flow = Automation.Flow;

/**
 * Travel request approval (REQ-0011, hotcrm#2578, F3a).
 *
 * Setting a travel request to Submitted opens an approval request for the
 * traveler's manager (`sys_user.manager_id` of the request's owner), who
 * decides from the approvals Inbox. Shaped as the expense's manager path
 * (`./expense-approval.flow.ts`) is, which carries the notes: the manager
 * stamped into `approver` first, the approval node with `lockRecord` and
 * `first_response`, `runAs: 'system'`, a recall told apart from a rejection
 * by the decision the resume lands as, and the closing writes setting the
 * status themselves.
 *
 * ## One tier
 *
 * ⛔ No finance tier: the money check stays on the expense report, where an
 * amount above the line goes to finance. A request is a yes or no on a plan.
 *
 * ## No manager
 *
 * A traveler with no manager on their user record (or whose manager is
 * themselves, since nobody approves their own) is approved by the Finance
 * Controllers instead (`onEmptyApprovers: 'fallback'`), as an expense is.
 *
 * ## Projects
 *
 * This step knows no project. A request on a project, approved by its
 * Project Manager, is F3d (hotcrm#2581); it will split this entry as the
 * expense's two paths are split.
 *
 * ## Born submitted
 *
 * A record-change flow binds one event, so the flow has an insert twin for a
 * request created already Submitted (an agent filing and sending in one save).
 */

/**
 * Entry: a save that moves the request to Submitted. `previous.status` keeps
 * a write that does not change the status (a recall's restore, a re-save)
 * from opening a second request.
 */
export const EXPENSE_REQUEST_SUBMITTED_NOW = P`has(record.status) && record.status == "submitted"
  && (!has(previous.status) || previous.status != "submitted")`;
export const EXPENSE_REQUEST_BORN_SUBMITTED = P`has(record.status) && record.status == "submitted"`;

const RECALLED = P`has(vars.approver_review) && has(vars.approver_review.decision) && vars.approver_review.decision == "recall"`;
const NOT_RECALLED = P`!has(vars.approver_review) || !has(vars.approver_review.decision) || vars.approver_review.decision != "recall"`;

/** Whether the traveler has a manager on their user record. */
const HAS_MANAGER = P`has(vars.ownerRecord) && vars.ownerRecord != null
  && has(vars.ownerRecord.manager_id) && vars.ownerRecord.manager_id != null && vars.ownerRecord.manager_id != ""`;
const NO_MANAGER = P`!has(vars.ownerRecord) || vars.ownerRecord == null
  || !has(vars.ownerRecord.manager_id) || vars.ownerRecord.manager_id == null || vars.ownerRecord.manager_id == ""`;

export const ExpenseRequestApprovalFlow: Flow = {
  name: 'expense_request_approval',
  label: 'Travel Request Approval',
  description: 'When a travel request is submitted: the traveler\'s manager approves or rejects it (the Finance Controllers when there is none). One tier only.',
  type: 'record_change',
  status: 'active',
  // Elevated for the reasons `expense_approval` gives: the gate must engage
  // for a submission written by any writer, a user-less one included, and the
  // closing writes land on a record the approval node holds locked, which
  // only a platform write may. The decider is still attributed.
  runAs: 'system',
  variables: [],
  nodes: [
    {
      id: 'start',
      type: 'start',
      label: 'Start (travel request submitted)',
      config: { objectName: 'crm_expense_request', triggerType: 'record-after-update', condition: EXPENSE_REQUEST_SUBMITTED_NOW },
    },
    {
      id: 'get_owner',
      type: 'get_record',
      label: 'Get Traveler',
      config: { objectName: 'sys_user', filter: { id: cel`record.owner_id` }, outputVariable: 'ownerRecord' },
    },
    // The branch is on the edges, where the engine reads it.
    { id: 'check_manager', type: 'decision', label: 'Has a Manager?' },
    {
      id: 'stamp_approver',
      type: 'update_record',
      label: 'Stamp the Manager as Approver',
      config: { objectName: 'crm_expense_request', filter: { id: cel`record.id` }, fields: { approver: cel`vars.ownerRecord.manager_id` } },
    },
    {
      id: 'approver_review',
      type: 'approval',
      label: 'Manager Review',
      config: {
        approvers: [{ type: 'manager', value: 'owner_id' }],
        excludeSubmitter: true,
        onEmptyApprovers: 'fallback',
        fallbackApprovers: [{ type: 'position', value: 'crm_finance_controller' }],
        behavior: 'first_response',
        lockRecord: true,
      },
    },
    {
      id: 'mark_approved', type: 'update_record', label: 'Mark Approved',
      config: { objectName: 'crm_expense_request', filter: { id: cel`record.id` }, fields: { status: 'approved' } },
    },
    {
      id: 'mark_rejected', type: 'update_record', label: 'Mark Rejected',
      config: { objectName: 'crm_expense_request', filter: { id: cel`record.id` }, fields: { status: 'rejected' } },
    },
    {
      id: 'back_to_draft', type: 'update_record', label: 'Back to Draft (recalled)',
      config: { objectName: 'crm_expense_request', filter: { id: cel`record.id` }, fields: { status: 'draft' } },
    },
    { id: 'end', type: 'end', label: 'End' },
  ],
  edges: [
    { id: 'e_start', source: 'start', target: 'get_owner', type: 'default' },
    { id: 'e_owner', source: 'get_owner', target: 'check_manager', type: 'default' },
    { id: 'e_has_manager', source: 'check_manager', target: 'stamp_approver', type: 'conditional', label: 'Has a manager', condition: HAS_MANAGER },
    { id: 'e_no_manager', source: 'check_manager', target: 'approver_review', type: 'conditional', label: 'No manager', condition: NO_MANAGER },
    { id: 'e_stamped', source: 'stamp_approver', target: 'approver_review', type: 'default' },
    { id: 'e_approve', source: 'approver_review', target: 'mark_approved', type: 'default', label: 'approve' },
    { id: 'e_approver_reject', source: 'approver_review', target: 'mark_rejected', type: 'conditional', label: 'reject', condition: NOT_RECALLED },
    { id: 'e_approver_recall', source: 'approver_review', target: 'back_to_draft', type: 'conditional', label: 'reject', condition: RECALLED },
    { id: 'e_approved_end', source: 'mark_approved', target: 'end', type: 'default' },
    { id: 'e_rejected_end', source: 'mark_rejected', target: 'end', type: 'default' },
    { id: 'e_draft_end', source: 'back_to_draft', target: 'end', type: 'default' },
  ],
};

/** Insert twin of {@link ExpenseRequestApprovalFlow}: a travel request created already Submitted. */
export const ExpenseRequestApprovalOnCreateFlow: Flow = {
  ...ExpenseRequestApprovalFlow,
  name: 'expense_request_approval_on_create',
  label: 'Travel Request Approval (on create)',
  description: 'Approval intake for a travel request created already submitted (insert-time twin of expense_request_approval).',
  nodes: ExpenseRequestApprovalFlow.nodes.map((n) =>
    n.id === 'start'
      ? { ...n, config: { ...n.config, triggerType: 'record-after-create', condition: EXPENSE_REQUEST_BORN_SUBMITTED } }
      : n,
  ),
};
