// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { P, cel } from '@objectstack/spec';
import type * as Automation from '@objectstack/spec/automation';
import { EXPENSE_FINANCE_REVIEW_AMOUNT } from '../objects/_thresholds';
type Flow = Automation.Flow;
type FlowNode = Flow['nodes'][number];
type FlowEdge = Flow['edges'][number];

/**
 * Timesheet and expense approval (#2316 phase 1b).
 *
 * Setting a timesheet or an expense to Submitted opens an approval request
 * for the record's `approver` (the project's Project Manager when the record
 * was created, stamped by its hook), who decides from the approvals Inbox. An
 * expense of EXPENSE_FINANCE_REVIEW_AMOUNT or more then goes to a Finance
 * Controller as well. Shaped as `opportunity_approval` is
 * (`src/sales/flows/opportunity-approval.flow.ts`, which carries the long
 * notes): approval nodes with `lockRecord`, `onEmptyApprovers: 'admin_rescue'`
 * and `first_response`, `runAs: 'system'`, and a recall told apart from a
 * rejection by the decision the resume lands as.
 *
 * ## The status is written here, not mirrored
 *
 * No node sets `approvalStatusField`. The record's own `status` is the
 * lifecycle (Draft → Submitted → Approved / Rejected), and a mirror would
 * write `approved` after the FIRST tier of a two-tier expense, landing its
 * amount in the project's cost before finance decided, while the state
 * machine then refuses the second tier's rejection (`approved: []`). So the
 * nodes after a decision write the status themselves:
 *
 *   - approved by every tier → `approved`, and the project's cost moves;
 *   - rejected by any tier → `rejected`; the person moves it back to Draft,
 *     corrects it and submits again, which opens a new request;
 *   - recalled by the submitter → back to `draft`, so it can be edited.
 *
 * From 18.0.0 the nodes after a decision run as the person who decided
 * (objectstack `24321-resume-as-decider`), so `updated_by` names the
 * approver. They are platform writes, which the record's hook lets through
 * while it refuses a person who sets Approved or Rejected by hand.
 *
 * ## Nobody approves their own
 *
 * `excludeSubmitter`: a project manager who submits their own hours or spend
 * is not asked to approve it. With nobody else on the slate the request goes
 * to an administrator (`admin_rescue`), as an empty position does.
 *
 * ## Born submitted
 *
 * A record-change flow binds one event, so each flow has an insert twin for a
 * record created already Submitted (an expense entered and sent in one save,
 * an import), as `opportunity_approval_on_create` is.
 */

/**
 * Whether the decision a resume landed as at a tier is a recall, per tier.
 * Total: an unreadable decision reads as not a recall, so a real rejection is
 * never lost. Spelled out per node rather than interpolated: the `P` tag
 * quotes an interpolated string as a CEL literal, not a name.
 */
const RECALLED = {
  approver_review: P`has(vars.approver_review) && has(vars.approver_review.decision) && vars.approver_review.decision == "recall"`,
  finance_review: P`has(vars.finance_review) && has(vars.finance_review.decision) && vars.finance_review.decision == "recall"`,
};
const NOT_RECALLED = {
  approver_review: P`!has(vars.approver_review) || !has(vars.approver_review.decision) || vars.approver_review.decision != "recall"`,
  finance_review: P`!has(vars.finance_review) || !has(vars.finance_review.decision) || vars.finance_review.decision != "recall"`,
};

/**
 * Entry: a save that moves the record to Submitted. `previous.status` is the
 * term that keeps a write which does not change the status (a recall's
 * restore, a re-save) from opening a second request; an unreadable prior
 * status reads as a submission, the direction that keeps the control engaged.
 */
const SUBMITTED_NOW = P`has(record.status) && record.status == "submitted"
  && (!has(previous.status) || previous.status != "submitted")`;
const BORN_SUBMITTED = P`has(record.status) && record.status == "submitted"`;

const setStatus = (object: string, id: string, label: string, status: string): FlowNode => ({
  id,
  type: 'update_record',
  label,
  config: { objectName: object, filter: { id: cel`record.id` }, fields: { status } },
});

/** The approver tier every submission goes through: the record's stamped approver. */
const approverReview = (label: string): FlowNode => ({
  id: 'approver_review',
  type: 'approval',
  label,
  config: {
    approvers: [{ type: 'field', value: 'approver' }],
    excludeSubmitter: true,
    onEmptyApprovers: 'admin_rescue',
    behavior: 'first_response',
    lockRecord: true,
  },
});

/** The three closing writes and the end, shared by both flows. */
const closing = (object: string): FlowNode[] => [
  setStatus(object, 'mark_approved', 'Mark Approved', 'approved'),
  setStatus(object, 'mark_rejected', 'Mark Rejected', 'rejected'),
  setStatus(object, 'back_to_draft', 'Back to Draft (recalled)', 'draft'),
  { id: 'end', type: 'end', label: 'End' },
];

/**
 * A tier's two `reject` out-edges, partitioned on the decision: an approver's
 * rejection to `mark_rejected`, the submitter's recall to `back_to_draft`.
 * Both carry the label, which is how the resume picks among a node's edges.
 */
const rejectEdges = (node: keyof typeof RECALLED, prefix: string): FlowEdge[] => [
  { id: `${prefix}_reject`, source: node, target: 'mark_rejected', type: 'conditional', label: 'reject', condition: NOT_RECALLED[node] },
  { id: `${prefix}_recall`, source: node, target: 'back_to_draft', type: 'conditional', label: 'reject', condition: RECALLED[node] },
];

const closingEdges: FlowEdge[] = [
  { id: 'e_approved_end', source: 'mark_approved', target: 'end', type: 'default' },
  { id: 'e_rejected_end', source: 'mark_rejected', target: 'end', type: 'default' },
  { id: 'e_draft_end', source: 'back_to_draft', target: 'end', type: 'default' },
];

export const TimesheetApprovalFlow: Flow = {
  name: 'timesheet_approval',
  label: 'Timesheet Approval',
  description: 'When a timesheet is submitted: the project manager stamped as its approver approves or rejects it from their Inbox.',
  type: 'record_change',
  status: 'active',
  // Elevated for the reasons `opportunity_approval` gives: the gate must
  // engage for a submission written by any writer, a user-less one included,
  // and the closing writes land on a record the approval node holds locked,
  // which only a platform write may. The decider is still attributed.
  runAs: 'system',
  variables: [],
  nodes: [
    {
      id: 'start',
      type: 'start',
      label: 'Start (timesheet submitted)',
      config: { objectName: 'crm_timesheet', triggerType: 'record-after-update', condition: SUBMITTED_NOW },
    },
    approverReview('Project Manager Review'),
    ...closing('crm_timesheet'),
  ],
  edges: [
    { id: 'e_start', source: 'start', target: 'approver_review', type: 'default' },
    { id: 'e_approve', source: 'approver_review', target: 'mark_approved', type: 'default', label: 'approve' },
    ...rejectEdges('approver_review', 'e_approver'),
    ...closingEdges,
  ],
};

/** Insert twin of {@link TimesheetApprovalFlow}: a timesheet created already Submitted. */
export const TimesheetApprovalOnCreateFlow: Flow = {
  ...TimesheetApprovalFlow,
  name: 'timesheet_approval_on_create',
  label: 'Timesheet Approval (on create)',
  description: 'Approval intake for a timesheet created already submitted (insert-time twin of timesheet_approval).',
  nodes: TimesheetApprovalFlow.nodes.map((n) =>
    n.id === 'start'
      ? { ...n, config: { ...n.config, triggerType: 'record-after-create', condition: BORN_SUBMITTED } }
      : n,
  ),
};

export const ExpenseApprovalFlow: Flow = {
  name: 'expense_approval',
  label: 'Expense Approval',
  description: `When an expense is submitted: its approver (the project manager) decides, and an expense of ${EXPENSE_FINANCE_REVIEW_AMOUNT} or more then goes to a Finance Controller.`,
  type: 'record_change',
  status: 'active',
  // Elevated for the reasons `opportunity_approval` gives: the gate must
  // engage for a submission written by any writer, a user-less one included,
  // and the closing writes land on a record the approval node holds locked,
  // which only a platform write may. The decider is still attributed.
  runAs: 'system',
  variables: [],
  nodes: [
    {
      id: 'start',
      type: 'start',
      label: 'Start (expense submitted)',
      config: { objectName: 'crm_expense', triggerType: 'record-after-update', condition: SUBMITTED_NOW },
    },
    approverReview('Project Manager Review'),
    {
      id: 'get_expense',
      type: 'get_record',
      label: 'Get Expense',
      config: { objectName: 'crm_expense', filter: { id: cel`record.id` }, outputVariable: 'expenseRecord' },
    },
    // The branch is on the edges, where the engine reads it.
    { id: 'check_amount', type: 'decision', label: `Amount ${EXPENSE_FINANCE_REVIEW_AMOUNT} or More?` },
    {
      id: 'finance_review',
      type: 'approval',
      label: 'Finance Controller Review',
      config: {
        approvers: [{ type: 'position', value: 'crm_finance_controller' }],
        excludeSubmitter: true,
        onEmptyApprovers: 'admin_rescue',
        behavior: 'first_response',
        lockRecord: true,
      },
    },
    ...closing('crm_expense'),
  ],
  edges: [
    { id: 'e_start', source: 'start', target: 'approver_review', type: 'default' },
    { id: 'e_approve', source: 'approver_review', target: 'get_expense', type: 'default', label: 'approve' },
    ...rejectEdges('approver_review', 'e_approver'),
    { id: 'e_get', source: 'get_expense', target: 'check_amount', type: 'default' },
    // Re-read, not the trigger snapshot: the amount the first approver saw is
    // the one locked since, and the two must partition every value.
    {
      id: 'e_large', source: 'check_amount', target: 'finance_review', type: 'conditional',
      label: `${EXPENSE_FINANCE_REVIEW_AMOUNT} or more`,
      condition: P`has(vars.expenseRecord) && has(vars.expenseRecord.amount) && vars.expenseRecord.amount != null
        && vars.expenseRecord.amount >= ${EXPENSE_FINANCE_REVIEW_AMOUNT}`,
    },
    {
      id: 'e_small', source: 'check_amount', target: 'mark_approved', type: 'conditional',
      label: `Under ${EXPENSE_FINANCE_REVIEW_AMOUNT}`,
      condition: P`!has(vars.expenseRecord) || !has(vars.expenseRecord.amount) || vars.expenseRecord.amount == null
        || vars.expenseRecord.amount < ${EXPENSE_FINANCE_REVIEW_AMOUNT}`,
    },
    { id: 'e_finance_approve', source: 'finance_review', target: 'mark_approved', type: 'default', label: 'approve' },
    ...rejectEdges('finance_review', 'e_finance'),
    ...closingEdges,
  ],
};

/** Insert twin of {@link ExpenseApprovalFlow}: an expense created already Submitted. */
export const ExpenseApprovalOnCreateFlow: Flow = {
  ...ExpenseApprovalFlow,
  name: 'expense_approval_on_create',
  label: 'Expense Approval (on create)',
  description: 'Approval intake for an expense created already submitted (insert-time twin of expense_approval).',
  nodes: ExpenseApprovalFlow.nodes.map((n) =>
    n.id === 'start'
      ? { ...n, config: { ...n.config, triggerType: 'record-after-create', condition: BORN_SUBMITTED } }
      : n,
  ),
};
