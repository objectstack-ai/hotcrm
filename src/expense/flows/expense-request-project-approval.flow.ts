// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { P, cel } from '@objectstack/spec';
import type * as Automation from '@objectstack/spec/automation';
type Flow = Automation.Flow;

/**
 * Travel request approval for a request ON A PROJECT (REQ-0011, hotcrm#2581,
 * F3d).
 *
 * Setting a travel request that names a project to Submitted opens an
 * approval request for the project's Project Manager, who decides from the
 * approvals Inbox. The person who answers for the project's cost approves the
 * trip, as they approve its expenses (`./expense-project-approval.flow.ts`),
 * so one trip never goes to two different approvers. One tier, as a request
 * without a project has: no finance step.
 *
 * ## Why it lives here, and not in Project Delivery
 *
 * The request's `crm_project` field is Project Delivery's
 * (`src/psa/extensions/expense-project.extension.ts`), and this flow is the
 * project path, so it belongs there. It is here for the platform gap
 * `./expense-project-approval.flow.ts` names (objectstack#34616: the build's
 * per-package lint judges a record-change flow's object against the package's
 * own objects, so a Project Delivery flow on `crm_expense_request` fails
 * `pnpm lint --strict`). The maintainer's 2026-11-17 03:27Z interim ruling
 * for the expense flows applies to this one as well; once the build judges
 * the dependency closure, this file moves back with them (hotcrm#2575's
 * move-back list, `docs/architecture/expense-module-plan.md`).
 *
 * With Project Delivery disabled the `crm_project` field leaves the record,
 * so the entry condition below is false and this flow never starts; its read
 * of `crm_project` is never reached.
 *
 * ## Two paths, never both
 *
 * A request with no project goes to the traveler's manager
 * (`expense_request_approval`, `./expense-request-approval.flow.ts`). This
 * flow starts only when the request names a project; the two entry
 * conditions are exact complements, pinned by `test/expense-request.test.ts`.
 *
 * ## The approver
 *
 * Read off the project (`get_project`) and named by expression
 * (`vars.projectRecord.project_manager`), as on the expense; the same person
 * is first written into the request's `approver`, which is what
 * `expense_request_approver_edit` shares the request to and what *Requests to
 * Approve* lists. A project with no Project Manager, or a traveler who is the
 * project's own Project Manager (nobody approves their own), sends the request
 * to an administrator (`admin_rescue`), as the expense does.
 *
 * ## No turn-back on an over project
 *
 * Unlike the expense, a request submitted on a Closed, Cancelled or locked
 * project is not turned back: a request is a plan, not a cost, and Lock Time
 * and Expenses stops spend, not asking. The picker offers no Closed or
 * Cancelled project; one reached through the API still goes to the Project
 * Manager, who says no (AGENTS.md rule 8: a person's judgement decides).
 *
 * ## The status is written here, not mirrored
 *
 * Shaped as `./expense-request-approval.flow.ts` is, which carries the notes:
 * the approval node with `lockRecord` and `first_response`,
 * `runAs: 'system'`, a recall told apart from a rejection by the decision the
 * resume lands as, and the closing writes setting the status themselves.
 */

const both = (a: { source: string }, b: { source: string }) => ({ dialect: 'cel' as const, source: `(${a.source}) && (${b.source})` });

/** A project on the request: the exact complement of the no-project entry of `expense_request_approval`. */
export const EXPENSE_REQUEST_HAS_PROJECT_CONDITION = P`has(record.crm_project) && record.crm_project != null && record.crm_project != ""`;

const SUBMITTED_NOW = P`has(record.status) && record.status == "submitted"
  && (!has(previous.status) || previous.status != "submitted")`;
const BORN_SUBMITTED = P`has(record.status) && record.status == "submitted"`;

const RECALLED = P`has(vars.approver_review) && has(vars.approver_review.decision) && vars.approver_review.decision == "recall"`;
const NOT_RECALLED = P`!has(vars.approver_review) || !has(vars.approver_review.decision) || vars.approver_review.decision != "recall"`;

const setStatus = (id: string, label: string, status: string) => ({
  id,
  type: 'update_record' as const,
  label,
  config: { objectName: 'crm_expense_request', filter: { id: cel`record.id` }, fields: { status } },
});

export const ExpenseRequestProjectApprovalFlow: Flow = {
  name: 'expense_request_project_approval',
  label: 'Project Travel Request Approval',
  description: 'When a travel request on a project is submitted: the project manager approves or rejects it. One tier only.',
  type: 'record_change',
  status: 'active',
  // Elevated for the reasons `expense_request_approval` gives: the gate must
  // engage for a submission written by any writer, a user-less one included,
  // and the closing writes land on a record the approval node holds locked,
  // which only a platform write may. The decider is still attributed.
  runAs: 'system',
  variables: [],
  nodes: [
    {
      id: 'start',
      type: 'start',
      label: 'Start (travel request on a project submitted)',
      config: {
        objectName: 'crm_expense_request',
        triggerType: 'record-after-update',
        condition: both(SUBMITTED_NOW, EXPENSE_REQUEST_HAS_PROJECT_CONDITION),
      },
    },
    {
      id: 'get_project',
      type: 'get_record',
      label: 'Get Project',
      config: { objectName: 'crm_project', filter: { id: cel`record.crm_project` }, outputVariable: 'projectRecord' },
    },
    {
      id: 'stamp_approver',
      type: 'update_record',
      label: 'Stamp the Project Manager as Approver',
      config: {
        objectName: 'crm_expense_request',
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
    setStatus('mark_approved', 'Mark Approved', 'approved'),
    setStatus('mark_rejected', 'Mark Rejected', 'rejected'),
    setStatus('back_to_draft', 'Back to Draft (recalled)', 'draft'),
    { id: 'end', type: 'end', label: 'End' },
  ],
  edges: [
    { id: 'e_start', source: 'start', target: 'get_project', type: 'default' },
    { id: 'e_project', source: 'get_project', target: 'stamp_approver', type: 'default' },
    { id: 'e_stamped', source: 'stamp_approver', target: 'approver_review', type: 'default' },
    { id: 'e_approve', source: 'approver_review', target: 'mark_approved', type: 'default', label: 'approve' },
    { id: 'e_approver_reject', source: 'approver_review', target: 'mark_rejected', type: 'conditional', label: 'reject', condition: NOT_RECALLED },
    { id: 'e_approver_recall', source: 'approver_review', target: 'back_to_draft', type: 'conditional', label: 'reject', condition: RECALLED },
    { id: 'e_approved_end', source: 'mark_approved', target: 'end', type: 'default' },
    { id: 'e_rejected_end', source: 'mark_rejected', target: 'end', type: 'default' },
    { id: 'e_draft_end', source: 'back_to_draft', target: 'end', type: 'default' },
  ],
};

/** Insert twin of {@link ExpenseRequestProjectApprovalFlow}: a travel request on a project created already Submitted. */
export const ExpenseRequestProjectApprovalOnCreateFlow: Flow = {
  ...ExpenseRequestProjectApprovalFlow,
  name: 'expense_request_project_approval_on_create',
  label: 'Project Travel Request Approval (on create)',
  description: 'Approval intake for a travel request on a project created already submitted (insert-time twin of expense_request_project_approval).',
  nodes: ExpenseRequestProjectApprovalFlow.nodes.map((n) =>
    n.id === 'start'
      ? { ...n, config: { ...n.config, triggerType: 'record-after-create', condition: both(BORN_SUBMITTED, EXPENSE_REQUEST_HAS_PROJECT_CONDITION) } }
      : n,
  ),
};
