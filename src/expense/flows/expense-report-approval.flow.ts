// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { P, cel } from '@objectstack/spec';
import type * as Automation from '@objectstack/spec/automation';
import { EXPENSE_FINANCE_REVIEW_AMOUNT } from '../../sales/objects/_thresholds';
type Flow = Automation.Flow;
type FlowEdge = Flow['edges'][number];

/**
 * Expense report approval for a report with NO project (REQ-0011,
 * hotcrm#2559; it replaces the per-expense approval hotcrm#2556 shipped).
 * Submitting a report opens an approval request for the submitter's manager
 * (`sys_user.manager_id` of the report's owner), who decides from the
 * approvals Inbox. A report totalling EXPENSE_FINANCE_REVIEW_AMOUNT or more
 * then goes to a Finance Controller as well, the line the project path uses
 * too. Each expense on the report follows its status
 * (`../objects/expense_report.hook.ts`).
 *
 * ## Two paths, never both
 *
 * A report on a project goes to the project's Project Manager
 * (`expense_report_project_approval`, `./expense-report-project-approval.flow.ts`).
 * This flow starts only when the report names no project, and that one only
 * when it does; the two entry conditions are exact complements, pinned by
 * `test/expense-module.test.ts`. With Project Delivery disabled the project
 * field leaves the report, so every report comes here.
 *
 * ## No manager
 *
 * A submitter with no manager on their user record (or whose manager is
 * themselves, since nobody approves their own) is approved by the Finance
 * Controllers instead (`onEmptyApprovers: 'fallback'`); with nobody holding
 * that position either, an administrator (`admin_rescue` on the finance
 * tier). A large report still goes to the finance tier after the fallback,
 * so finance may be asked twice; the first to decide at each tier decides.
 *
 * ## Who can open it
 *
 * The report and its expenses are `private` to the submitter. The flow
 * stamps the manager into the report's `approver` before the request opens;
 * `expense_report_approver_edit` shares the report to that field, and the
 * report's hook copies it onto each expense for `expense_approver_edit`.
 * Finance reads every report and expense through its permission sets.
 *
 * ## The status is written here, not mirrored
 *
 * Approval nodes with `lockRecord` and `first_response`, `runAs: 'system'`,
 * a recall told apart from a rejection by the decision the resume lands as,
 * and the closing writes setting the status themselves, so a two-tier report
 * reaches a project's cost only once finance decides.
 *
 * ## Submitted only as a draft with expenses
 *
 * A report is created as a draft by Submit for Reimbursement and then
 * submitted; one created already Submitted is refused by the report's hook
 * (it has no expenses yet), so this flow has no insert twin.
 */

/** No project on the record: the field is absent (Project Delivery off), null, or empty. */
const NO_PROJECT = P`(!has(record.crm_project) || record.crm_project == null || record.crm_project == "")`;

/**
 * Entry: a save that moves the report to Submitted. `previous.status` keeps
 * a write that does not change the status (a recall's restore, a re-save)
 * from opening a second request.
 */
export const EXPENSE_REPORT_SUBMITTED_NOW = P`has(record.status) && record.status == "submitted"
  && (!has(previous.status) || previous.status != "submitted")`;

/** The entry conditions of this flow, exported so the test can hold them against Project Delivery's. */
export const EXPENSE_REPORT_NO_PROJECT_CONDITION = NO_PROJECT;

/**
 * Both predicates at once. Spelled out rather than interpolated: the `P` tag
 * quotes an interpolated value as a CEL literal, not as an expression.
 */
const both = (a: { source: string }, b: { source: string }) => ({ dialect: 'cel' as const, source: `(${a.source}) && (${b.source})` });

const RECALLED = {
  approver_review: P`has(vars.approver_review) && has(vars.approver_review.decision) && vars.approver_review.decision == "recall"`,
  finance_review: P`has(vars.finance_review) && has(vars.finance_review.decision) && vars.finance_review.decision == "recall"`,
};
const NOT_RECALLED = {
  approver_review: P`!has(vars.approver_review) || !has(vars.approver_review.decision) || vars.approver_review.decision != "recall"`,
  finance_review: P`!has(vars.finance_review) || !has(vars.finance_review.decision) || vars.finance_review.decision != "recall"`,
};

const rejectEdges = (node: keyof typeof RECALLED, prefix: string): FlowEdge[] => [
  { id: `${prefix}_reject`, source: node, target: 'mark_rejected', type: 'conditional', label: 'reject', condition: NOT_RECALLED[node] },
  { id: `${prefix}_recall`, source: node, target: 'back_to_draft', type: 'conditional', label: 'reject', condition: RECALLED[node] },
];

/** Whether the submitter has a manager on their user record. */
const HAS_MANAGER = P`has(vars.ownerRecord) && vars.ownerRecord != null
  && has(vars.ownerRecord.manager_id) && vars.ownerRecord.manager_id != null && vars.ownerRecord.manager_id != ""`;
const NO_MANAGER = P`!has(vars.ownerRecord) || vars.ownerRecord == null
  || !has(vars.ownerRecord.manager_id) || vars.ownerRecord.manager_id == null || vars.ownerRecord.manager_id == ""`;

export const ExpenseReportApprovalFlow: Flow = {
  name: 'expense_report_approval',
  label: 'Expense Report Approval',
  description: `When an expense report with no project is submitted: the submitter's manager decides (the Finance Controllers when there is none), and a report totalling ${EXPENSE_FINANCE_REVIEW_AMOUNT} or more then goes to a Finance Controller.`,
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
      label: 'Start (report with no project submitted)',
      config: { objectName: 'crm_expense_report', triggerType: 'record-after-update', condition: both(EXPENSE_REPORT_SUBMITTED_NOW, NO_PROJECT) },
    },
    {
      id: 'get_owner',
      type: 'get_record',
      label: 'Get Submitter',
      config: { objectName: 'sys_user', filter: { id: cel`record.owner_id` }, outputVariable: 'ownerRecord' },
    },
    // The branch is on the edges, where the engine reads it.
    { id: 'check_manager', type: 'decision', label: 'Has a Manager?' },
    {
      id: 'stamp_approver',
      type: 'update_record',
      label: 'Stamp the Manager as Approver',
      config: { objectName: 'crm_expense_report', filter: { id: cel`record.id` }, fields: { approver: cel`vars.ownerRecord.manager_id` } },
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
      id: 'get_report',
      type: 'get_record',
      label: 'Get Report',
      config: { objectName: 'crm_expense_report', filter: { id: cel`record.id` }, outputVariable: 'reportRecord' },
    },
    { id: 'check_amount', type: 'decision', label: `Total ${EXPENSE_FINANCE_REVIEW_AMOUNT} or More?` },
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
    {
      id: 'mark_approved', type: 'update_record', label: 'Mark Approved',
      config: { objectName: 'crm_expense_report', filter: { id: cel`record.id` }, fields: { status: 'approved' } },
    },
    {
      id: 'mark_rejected', type: 'update_record', label: 'Mark Rejected',
      config: { objectName: 'crm_expense_report', filter: { id: cel`record.id` }, fields: { status: 'rejected' } },
    },
    {
      id: 'back_to_draft', type: 'update_record', label: 'Back to Draft (recalled)',
      config: { objectName: 'crm_expense_report', filter: { id: cel`record.id` }, fields: { status: 'draft' } },
    },
    { id: 'end', type: 'end', label: 'End' },
  ],
  edges: [
    { id: 'e_start', source: 'start', target: 'get_owner', type: 'default' },
    { id: 'e_owner', source: 'get_owner', target: 'check_manager', type: 'default' },
    { id: 'e_has_manager', source: 'check_manager', target: 'stamp_approver', type: 'conditional', label: 'Has a manager', condition: HAS_MANAGER },
    { id: 'e_no_manager', source: 'check_manager', target: 'approver_review', type: 'conditional', label: 'No manager', condition: NO_MANAGER },
    { id: 'e_stamped', source: 'stamp_approver', target: 'approver_review', type: 'default' },
    { id: 'e_approve', source: 'approver_review', target: 'get_report', type: 'default', label: 'approve' },
    ...rejectEdges('approver_review', 'e_approver'),
    { id: 'e_get', source: 'get_report', target: 'check_amount', type: 'default' },
    // Re-read, not the trigger snapshot: the total the first approver saw is
    // the one locked since, and the two must partition every value.
    {
      id: 'e_large', source: 'check_amount', target: 'finance_review', type: 'conditional',
      label: `${EXPENSE_FINANCE_REVIEW_AMOUNT} or more`,
      condition: P`has(vars.reportRecord) && has(vars.reportRecord.total_amount) && vars.reportRecord.total_amount != null
        && vars.reportRecord.total_amount >= ${EXPENSE_FINANCE_REVIEW_AMOUNT}`,
    },
    {
      id: 'e_small', source: 'check_amount', target: 'mark_approved', type: 'conditional',
      label: `Under ${EXPENSE_FINANCE_REVIEW_AMOUNT}`,
      condition: P`!has(vars.reportRecord) || !has(vars.reportRecord.total_amount) || vars.reportRecord.total_amount == null
        || vars.reportRecord.total_amount < ${EXPENSE_FINANCE_REVIEW_AMOUNT}`,
    },
    { id: 'e_finance_approve', source: 'finance_review', target: 'mark_approved', type: 'default', label: 'approve' },
    ...rejectEdges('finance_review', 'e_finance'),
    { id: 'e_approved_end', source: 'mark_approved', target: 'end', type: 'default' },
    { id: 'e_rejected_end', source: 'mark_rejected', target: 'end', type: 'default' },
    { id: 'e_draft_end', source: 'back_to_draft', target: 'end', type: 'default' },
  ],
};
