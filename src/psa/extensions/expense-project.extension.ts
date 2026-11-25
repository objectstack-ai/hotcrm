// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { P } from '@objectstack/spec';
import { Field } from '@objectstack/spec/data';

/**
 * The expense's Project field (hotcrm#2556). `crm_expense` is the expense
 * module's since that card, and knows nothing of projects; this module adds
 * the lookup through `objectExtensions` (ADR-0130 D5), so it comes and goes
 * with Project Delivery: disabled, the field leaves the object and the
 * records, and an expense is recorded and approved without it; enabled again,
 * the stored values return (measured on 18.5.0 before filing).
 *
 * Optional, where it was required while the object was this module's: an
 * expense with no project is an employee's ordinary claim, approved by their
 * manager in the expense module. The column keeps its name, so every stored
 * row keeps its project across the upgrade.
 *
 * A Closed or Cancelled project is not offered in the picker. That replaces
 * the refusal the expense's own hook used to make, which may not move here
 * (ADR-0130 R4: no hook on another package's object). The picker is the
 * form's guard only; a write through the API is caught when its report is
 * submitted, which the report's rules below refuse on an over or locked
 * project.
 *
 * The expense report's Project (hotcrm#2559). Submit for Reimbursement puts
 * the expenses of each project on a report of their own and names the project
 * on it, which routes the report to that project's Project Manager. It is
 * read-only to people: the report's project is the one its expenses were
 * grouped by.
 *
 * A report cannot be submitted on a Closed, Cancelled or locked project
 * (hotcrm#2764): the three `validations` contributed to `crm_expense_report`
 * refuse the write that makes it Submitted, at the click, with the reason and
 * what to do, as `timesheet.hook.ts` refuses a timesheet. They are rules and
 * not a hook because no hook may attach to another package's object
 * (ADR-0130 R4), and they are this module's because the expense module knows
 * nothing of projects. Until that card the submission was accepted, the
 * click said "submitted for approval", and the flow then turned the report
 * back to Draft. The flow keeps its turn-back branches
 * (`../flows/expense-report-project-approval.flow.ts`) for what a rule
 * cannot see: a project closed or locked between the rule's read and the
 * flow's.
 *
 * A Draft is never refused: a report can be written, changed and deleted on
 * such a project; only its submission is stopped.
 */
/**
 * The travel request's Project field (hotcrm#2581, F3d), on the same terms as
 * the expense's: optional, the same picker, gone with Project Delivery. A
 * request on a project is approved by the project's Project Manager, one
 * without by the traveler's manager (`src/expense/flows/expense-request-approval.flow.ts`);
 * the project path is this module's own
 * (`../flows/expense-request-project-approval.flow.ts`).
 *
 * Locked with the request's other planned values once it is Approved,
 * Cancelled or Closed: the project chose the approver, so moving an approved
 * request to another project would show it approved by someone who never saw
 * it. The predicate is the one on `crm_expense_request`'s own planned values
 * (`src/expense/objects/expense_request.object.ts`), written out here because
 * a module imports only from its own directory or from `src/sales/`.
 *
 * Its related list puts a project's travel requests on the project page. A
 * request is private, so each reader sees there the ones they own, approve or
 * read through View All; ⛔ no summary on the project: a request is a plan,
 * not a cost (the cost arrives with the expenses).
 */
const REQUEST_PLAN_LOCKED = P`has(record.status) && (record.status == "approved" || record.status == "cancelled" || record.status == "closed")`;

/**
 * A report becomes Submitted on a project: the write that the three refusals
 * below judge. `previous` is null on a create, so a report created or imported
 * directly as Submitted on a Closed, Cancelled or locked project is refused
 * too. That is deliberate: the turn-back flow runs only on an update
 * (`record-after-update`), so such a report used to be accepted as Submitted
 * on a project that takes no expenses; now every write that makes a report
 * Submitted asks the same question. The project test sits here, in `when`, because a rule that reads
 * through an empty reference is unevaluable and rejects the write (objectql
 * `resolveTraversalScope`); a report with no project is not checked.
 */
const SUBMITTED_ON_A_PROJECT = P`has(record.status) && record.status == "submitted"
  && (previous == null || !has(previous.status) || previous.status != "submitted")
  && has(record.crm_project) && record.crm_project != null && record.crm_project != ""`;

/**
 * One refusal of a report's submission (hotcrm#2764), shaped as
 * `contract_same_account` on `crm_sales_order` is: the project is read one
 * hop through the reference in `then`, behind the `when` above. Every read of
 * the project carries `has()` (AGENTS.md "Validation predicates must be TOTAL",
 * #630), as the flow's own `OVER` / `LOCKED` tests do, so a project row read
 * without `status` or `time_entry_locked` leaves the rule answerable instead of
 * unevaluable, which would refuse the write (`test/expense-report-project-rules-total.test.ts`).
 *
 * The message is fixed text: 18.6.0 interpolates no record values into a
 * rule's message, so it says "this report's project" where the timesheet's
 * hook names the project. The report's page shows the project beside it.
 */
const refuseSubmission = (name: string, condition: ReturnType<typeof P>, message: string) => ({
  name,
  type: 'conditional' as const,
  severity: 'error' as const,
  message,
  when: SUBMITTED_ON_A_PROJECT,
  then: { name: `${name}_check`, type: 'script' as const, severity: 'error' as const, message, condition },
});

export const ExpenseProjectExtensions = [
  {
    extend: 'crm_expense',
    fields: {
      crm_project: Field.lookup('crm_project', {
        label: 'Project',
        group: 'basic',
        relatedListColumns: ['name', 'owner_id', 'expense_date', 'category', 'amount', 'status'],
        lookupFilters: [{ field: 'status', operator: 'notIn', value: ['closed', 'cancelled'] }],
      }),
    },
  },
  {
    extend: 'crm_expense_report',
    fields: {
      crm_project: Field.lookup('crm_project', {
        label: 'Project',
        group: 'basic',
        readonly: true,
        relatedListColumns: ['report_number', 'name', 'owner_id', 'total_amount', 'status'],
      }),
    },
    validations: [
      refuseSubmission(
        'expense_report_project_closed',
        P`has(record.crm_project.status) && record.crm_project.status == "closed"`,
        "This report's project is Closed and takes no expenses, so the report cannot be submitted. Delete the report, move its expenses to an open project, and submit them again.",
      ),
      refuseSubmission(
        'expense_report_project_cancelled',
        P`has(record.crm_project.status) && record.crm_project.status == "cancelled"`,
        "This report's project is Cancelled and takes no expenses, so the report cannot be submitted. Delete the report, move its expenses to an open project, and submit them again.",
      ),
      refuseSubmission(
        'expense_report_project_locked',
        // One reason at a time, as the flow gives: unticking the lock does not
        // open a Closed or Cancelled project.
        P`has(record.crm_project.time_entry_locked) && record.crm_project.time_entry_locked == true
          && (!has(record.crm_project.status) || (record.crm_project.status != "closed" && record.crm_project.status != "cancelled"))`,
        "This report's project is locked for time and expenses, so the report cannot be submitted. Keep it as a draft, and submit it again once the project manager unticks Lock Time and Expenses on the project.",
      ),
    ],
  },
  {
    extend: 'crm_expense_request',
    fields: {
      crm_project: Field.lookup('crm_project', {
        label: 'Project',
        group: 'trip',
        relatedListColumns: ['request_number', 'name', 'owner_id', 'destination', 'start_date', 'end_date', 'estimated_amount', 'status'],
        lookupFilters: [{ field: 'status', operator: 'notIn', value: ['closed', 'cancelled'] }],
        readonlyWhen: REQUEST_PLAN_LOCKED,
      }),
    },
  },
];
