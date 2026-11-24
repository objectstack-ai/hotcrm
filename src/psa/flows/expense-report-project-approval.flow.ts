// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { P, cel } from '@objectstack/spec';
import type * as Automation from '@objectstack/spec/automation';
import { EXPENSE_FINANCE_REVIEW_AMOUNT } from '../../sales/objects/_thresholds';
type Flow = Automation.Flow;
type FlowEdge = Flow['edges'][number];

/**
 * Expense report approval for a report ON A PROJECT (REQ-0011, hotcrm#2559;
 * it replaces the per-expense project approval hotcrm#2556 shipped, and
 * keeps its shape).
 *
 * Submitting a report that names a project opens an approval request for the
 * project's Project Manager, who decides from the approvals Inbox. A report
 * totalling EXPENSE_FINANCE_REVIEW_AMOUNT or more then goes to a Finance
 * Controller as well. Each expense on the report follows its status
 * (`src/expense/objects/expense_report.hook.ts`), and an approved expense counts in
 * the project's cost through the summaries on `crm_project`, as before.
 *
 * Submit for Reimbursement puts the expenses of each project on a report of
 * their own (`src/expense/actions/expense.actions.ts`), so a project manager decides
 * only their project's spend.
 *
 * ## Why it lives in Project Delivery
 *
 * The report's `crm_project` field is Project Delivery's
 * (`../extensions/expense-project.extension.ts`), and this flow is the
 * project path, so it is this module's, triggered on the expense module's
 * object along the manifest's dependency on it. From hotcrm#2556 it sat in
 * the expense module, because the build's per-package lint judged a
 * record-change flow's object against the package's OWN objects and
 * `pnpm lint --strict` failed on the `flow-trigger-unknown-object` warning
 * (objectstack#34616). 18.6.0 judges the dependency closure, so it moved
 * back with its two email templates (hotcrm#2575; the maintainer's
 * 2026-11-17 ruling, `docs/architecture/expense-module-plan.md`).
 *
 * With Project Delivery disabled the `crm_project` field leaves the report,
 * so the entry condition below is false and this flow never starts; its
 * reads of `crm_project` are never reached.
 *
 * ## Two paths, never both
 *
 * A report with no project goes to the submitter's manager
 * (`expense_report_approval`, `src/expense/flows/expense-report-approval.flow.ts`). This flow
 * starts only when the report names a project; the two entry conditions are
 * exact complements, pinned by `test/expense-module.test.ts`.
 *
 * ## The approver, with no hook
 *
 * The flow reads the project (`get_project`), names its Project Manager as
 * the approver by expression (`vars.projectRecord.project_manager`), and
 * first writes the same person into the report's `approver`, which is what
 * `expense_report_approver_edit` shares the report to and what *Reports to
 * Approve* lists. A project with no Project Manager sends the request to an
 * administrator (`admin_rescue`).
 *
 * ## An over or locked project turns the report back
 *
 * A report submitted on a Closed or Cancelled project, or on one with Lock
 * Time and Expenses ticked, goes straight back to Draft, its expenses with
 * it, and its submitter gets an inbox notice naming the project
 * (`../email-templates/`). No approval opens.
 *
 * Since hotcrm#2764 this is the backstop, not the usual path: the rules in
 * `../extensions/expense-project.extension.ts` refuse such a submission at
 * the click, before any flow runs, so the submitter is no longer told
 * "submitted for approval" about a report that is then turned back. These
 * branches still judge a project that closes or locks between the rule's
 * read and this flow's.
 *
 * ## The status is written here, not mirrored
 *
 * Shaped as `src/expense/flows/expense-report-approval.flow.ts` is: approval nodes with
 * `lockRecord` and `first_response`, `runAs: 'system'`, a recall told apart
 * from a rejection, and the closing writes setting the status.
 */

const both = (a: { source: string }, b: { source: string }) => ({ dialect: 'cel' as const, source: `(${a.source}) && (${b.source})` });

/** A project on the record: the exact complement of the no-project entry. */
export const EXPENSE_REPORT_HAS_PROJECT_CONDITION = P`has(record.crm_project) && record.crm_project != null && record.crm_project != ""`;

const SUBMITTED_NOW = P`has(record.status) && record.status == "submitted"
  && (!has(previous.status) || previous.status != "submitted")`;

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

/** The project is over: Closed or Cancelled. Completed still takes late claims, as a timesheet does. */
const OVER = P`has(vars.projectRecord) && vars.projectRecord != null
  && has(vars.projectRecord.status) && vars.projectRecord.status != null
  && (vars.projectRecord.status == "closed" || vars.projectRecord.status == "cancelled")`;
const NOT_OVER = P`!has(vars.projectRecord) || vars.projectRecord == null
  || !has(vars.projectRecord.status) || vars.projectRecord.status == null
  || (vars.projectRecord.status != "closed" && vars.projectRecord.status != "cancelled")`;
/** Lock Time and Expenses is ticked on the project. */
const LOCKED = P`has(vars.projectRecord) && vars.projectRecord != null
  && has(vars.projectRecord.time_entry_locked) && vars.projectRecord.time_entry_locked == true`;
const NOT_LOCKED = P`!has(vars.projectRecord) || vars.projectRecord == null
  || !has(vars.projectRecord.time_entry_locked) || vars.projectRecord.time_entry_locked != true`;

const PROJECT_NAME = cel`has(vars.projectRecord) && vars.projectRecord != null && has(vars.projectRecord.name) && vars.projectRecord.name != null ? vars.projectRecord.name : ""`;
const REPORT_NAME = cel`has(record.name) ? record.name : ""`;

const setStatus = (id: string, label: string, status: string) => ({
  id,
  type: 'update_record' as const,
  label,
  config: { objectName: 'crm_expense_report', filter: { id: cel`record.id` }, fields: { status } },
});

const turnBackNotice = (id: string, label: string, template: string) => ({
  id,
  type: 'notify' as const,
  label,
  config: {
    recipients: [cel`has(record.owner_id) ? record.owner_id : null`],
    channels: ['inbox'],
    severity: 'warning',
    topic: 'expense_report_turned_back',
    template,
    templateData: { name: REPORT_NAME, project: PROJECT_NAME },
    actionUrl: '/crm_expense_report/{{record.id}}',
  },
});

export const ExpenseReportProjectApprovalFlow: Flow = {
  name: 'expense_report_project_approval',
  label: 'Project Expense Report Approval',
  description: `When an expense report on a project is submitted: the project manager decides, and a report totalling ${EXPENSE_FINANCE_REVIEW_AMOUNT} or more then goes to a Finance Controller. On a Closed, Cancelled or locked project it goes back to Draft.`,
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
      label: 'Start (report on a project submitted)',
      config: { objectName: 'crm_expense_report', triggerType: 'record-after-update', condition: both(SUBMITTED_NOW, EXPENSE_REPORT_HAS_PROJECT_CONDITION) },
    },
    {
      id: 'get_project',
      type: 'get_record',
      label: 'Get Project',
      config: { objectName: 'crm_project', filter: { id: cel`record.crm_project` }, outputVariable: 'projectRecord' },
    },
    // The branch is on the edges, where the engine reads it.
    { id: 'check_project', type: 'decision', label: 'Project Open?' },
    setStatus('turn_back_over', 'Back to Draft (project over)', 'draft'),
    turnBackNotice('notify_over', 'Notify — Project Over', 'crm.expense_report_project_over'),
    setStatus('turn_back_locked', 'Back to Draft (project locked)', 'draft'),
    turnBackNotice('notify_locked', 'Notify — Project Locked', 'crm.expense_report_project_locked'),
    {
      id: 'stamp_approver',
      type: 'update_record',
      label: 'Stamp the Project Manager as Approver',
      config: {
        objectName: 'crm_expense_report',
        filter: { id: cel`record.id` },
        fields: {
          approver: cel`has(vars.projectRecord) && vars.projectRecord != null && has(vars.projectRecord.project_manager) && vars.projectRecord.project_manager != null ? vars.projectRecord.project_manager : null`,
        },
      },
    },
    {
      id: 'approver_review',
      type: 'approval',
      label: 'Project Manager Review',
      config: {
        approvers: [{ type: 'expression', value: 'vars.projectRecord.project_manager' }],
        excludeSubmitter: true,
        onEmptyApprovers: 'admin_rescue',
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
    setStatus('mark_approved', 'Mark Approved', 'approved'),
    setStatus('mark_rejected', 'Mark Rejected', 'rejected'),
    setStatus('back_to_draft', 'Back to Draft (recalled)', 'draft'),
    { id: 'end', type: 'end', label: 'End' },
  ],
  edges: [
    { id: 'e_start', source: 'start', target: 'get_project', type: 'default' },
    { id: 'e_project', source: 'get_project', target: 'check_project', type: 'default' },
    { id: 'e_over', source: 'check_project', target: 'turn_back_over', type: 'conditional', label: 'Closed or Cancelled', condition: OVER },
    { id: 'e_locked', source: 'check_project', target: 'turn_back_locked', type: 'conditional', label: 'Locked', condition: both(NOT_OVER, LOCKED) },
    { id: 'e_open', source: 'check_project', target: 'stamp_approver', type: 'conditional', label: 'Open', condition: both(NOT_OVER, NOT_LOCKED) },
    { id: 'e_over_notice', source: 'turn_back_over', target: 'notify_over', type: 'default' },
    { id: 'e_over_end', source: 'notify_over', target: 'end', type: 'default' },
    { id: 'e_locked_notice', source: 'turn_back_locked', target: 'notify_locked', type: 'default' },
    { id: 'e_locked_end', source: 'notify_locked', target: 'end', type: 'default' },
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
