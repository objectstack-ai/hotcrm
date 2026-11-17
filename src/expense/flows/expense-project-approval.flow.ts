// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { P, cel } from '@objectstack/spec';
import type * as Automation from '@objectstack/spec/automation';
import { EXPENSE_FINANCE_REVIEW_AMOUNT } from '../../sales/objects/_thresholds';
type Flow = Automation.Flow;
type FlowEdge = Flow['edges'][number];

/**
 * Expense approval for an expense ON A PROJECT (#2316 phase 1b; in the
 * expense module since hotcrm#2556, when `crm_expense` left Project Delivery).
 *
 * Setting an expense that names a project to Submitted opens an approval
 * request for the project's Project Manager, who decides from the approvals
 * Inbox. An expense of EXPENSE_FINANCE_REVIEW_AMOUNT or more then goes to a
 * Finance Controller as well. An approved expense counts in the project's
 * cost through the summaries on `crm_project`.
 *
 * ## Why it lives here, and not in Project Delivery
 *
 * The `crm_project` field is Project Delivery's
 * (`src/psa/extensions/expense-project.extension.ts`), and this flow is the
 * project path, so it belongs there. It is here because of a platform gap
 * measured on 18.5.0: the build's per-package lint judges a record-change
 * flow's object against the package's OWN objects, not the packages its
 * manifest depends on, so a Project Delivery flow on `crm_expense` draws
 * `flow-trigger-unknown-object`, which `pnpm lint --strict` fails on. The
 * runtime publish gate already judges it against the dependency closure.
 * Once the build does too, this file and its two email templates move back.
 *
 * With Project Delivery disabled the `crm_project` field leaves the record,
 * so the entry condition below is false and this flow never starts; its
 * reads of `crm_project` are never reached.
 *
 * ## Two paths, never both
 *
 * An expense with no project goes to the spender's manager
 * (`expense_approval`, `./expense-approval.flow.ts`). This flow starts only
 * when the expense names a project; the two entry conditions are exact
 * complements, pinned by `test/expense-module.test.ts`.
 *
 * ## The approver, with no hook
 *
 * The flow reads the project (`get_project`), names its Project Manager as
 * the approver by expression (`vars.projectRecord.project_manager`, measured
 * on 18.5.0 before filing), and first writes the same person into the
 * expense's `approver`, which is what `expense_approver_edit` shares the
 * expense to and what *Expenses to Approve* lists. A project with no Project
 * Manager sends the request to an administrator (`admin_rescue`), as before.
 *
 * ## An over or locked project turns the expense back
 *
 * The expense's hook used to refuse spend on a Closed or Cancelled project,
 * and a submission on a project with Lock Time and Expenses ticked. A hook in
 * this package may not read a Project Delivery object it does not depend on,
 * and Project Delivery may not hook this package's object (ADR-0130 R4), so
 * the picker no longer offers an over project (the extension's lookup
 * filter) and this flow catches the rest: an expense submitted on a Closed or
 * Cancelled project, or on a locked one, goes straight back to Draft, and
 * its spender gets an inbox notice naming the project
 * (`../email-templates/`). No approval opens. The save that submitted it is
 * not refused, which is the one difference a person sees.
 *
 * ## The status is written here, not mirrored
 *
 * Shaped as `./expense-approval.flow.ts` is: approval nodes with
 * `lockRecord` and `first_response`, `runAs: 'system'`, a recall told apart
 * from a rejection, and the closing writes setting the status, so a two-tier
 * expense reaches the project's cost only once finance decides. The node ids
 * are the ones Project Delivery's `expense_approval` had before hotcrm#2556,
 * as `./expense-approval.flow.ts`' are: a request open across the upgrade
 * resumes under that name, through the same downstream nodes.
 */

const both = (a: { source: string }, b: { source: string }) => ({ dialect: 'cel' as const, source: `(${a.source}) && (${b.source})` });

/** A project on the record: the exact complement of the expense module's no-project entry. */
export const EXPENSE_HAS_PROJECT_CONDITION = P`has(record.crm_project) && record.crm_project != null && record.crm_project != ""`;

const SUBMITTED_NOW = P`has(record.status) && record.status == "submitted"
  && (!has(previous.status) || previous.status != "submitted")`;
const BORN_SUBMITTED = P`has(record.status) && record.status == "submitted"`;

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
const EXPENSE_NAME = cel`has(record.name) ? record.name : ""`;

const setStatus = (id: string, label: string, status: string) => ({
  id,
  type: 'update_record' as const,
  label,
  config: { objectName: 'crm_expense', filter: { id: cel`record.id` }, fields: { status } },
});

const turnBackNotice = (id: string, label: string, template: string) => ({
  id,
  type: 'notify' as const,
  label,
  config: {
    recipients: [cel`has(record.owner_id) ? record.owner_id : null`],
    channels: ['inbox'],
    severity: 'warning',
    topic: 'expense_turned_back',
    template,
    templateData: { name: EXPENSE_NAME, project: PROJECT_NAME },
    actionUrl: '/crm_expense/{{record.id}}',
  },
});

export const ExpenseProjectApprovalFlow: Flow = {
  name: 'expense_project_approval',
  label: 'Project Expense Approval',
  description: `When an expense on a project is submitted: the project manager decides, and an expense of ${EXPENSE_FINANCE_REVIEW_AMOUNT} or more then goes to a Finance Controller. On a Closed, Cancelled or locked project it goes back to Draft.`,
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
      label: 'Start (expense on a project submitted)',
      config: { objectName: 'crm_expense', triggerType: 'record-after-update', condition: both(SUBMITTED_NOW, EXPENSE_HAS_PROJECT_CONDITION) },
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
    turnBackNotice('notify_over', 'Notify — Project Over', 'crm.expense_project_over'),
    setStatus('turn_back_locked', 'Back to Draft (project locked)', 'draft'),
    turnBackNotice('notify_locked', 'Notify — Project Locked', 'crm.expense_project_locked'),
    {
      id: 'stamp_approver',
      type: 'update_record',
      label: 'Stamp the Project Manager as Approver',
      config: {
        objectName: 'crm_expense',
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
      id: 'get_expense',
      type: 'get_record',
      label: 'Get Expense',
      config: { objectName: 'crm_expense', filter: { id: cel`record.id` }, outputVariable: 'expenseRecord' },
    },
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
    { id: 'e_approved_end', source: 'mark_approved', target: 'end', type: 'default' },
    { id: 'e_rejected_end', source: 'mark_rejected', target: 'end', type: 'default' },
    { id: 'e_draft_end', source: 'back_to_draft', target: 'end', type: 'default' },
  ],
};

/** Insert twin of {@link ExpenseProjectApprovalFlow}: an expense on a project created already Submitted. */
export const ExpenseProjectApprovalOnCreateFlow: Flow = {
  ...ExpenseProjectApprovalFlow,
  name: 'expense_project_approval_on_create',
  label: 'Project Expense Approval (on create)',
  description: 'Approval intake for an expense on a project created already submitted (insert-time twin of expense_project_approval).',
  nodes: ExpenseProjectApprovalFlow.nodes.map((n) =>
    n.id === 'start'
      ? { ...n, config: { ...n.config, triggerType: 'record-after-create', condition: both(BORN_SUBMITTED, EXPENSE_HAS_PROJECT_CONDITION) } }
      : n,
  ),
};
