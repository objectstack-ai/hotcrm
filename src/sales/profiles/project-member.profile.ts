// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { EXPENSE_OWN, EXPENSE_REPORT_OWN, EXPENSE_REQUEST_LINE_EDIT, EXPENSE_STANDARD_READ } from './_expense-grants';

/**
 * Project Member — a consultant staffed on projects (hotcrm#2316, plan
 * *Permissions, positions, sharing*). The `crm_project_member` position
 * distributes it (`src/sales/sharing/positions.ts`).
 *
 *   - `crm_project`, `crm_project_member` — read: the projects a member is
 *     staffed on reach them through the `project_team_read` rule.
 *   - `crm_project_task` — read: the team reads the project's plan
 *     (hotcrm#2545). Writing a task needs edit on the project, which the team
 *     does not have (ruling D), so the manager keeps the plan.
 *   - `crm_timesheet`, `crm_time_entry`, `crm_expense` — their own: a member
 *     writes their own timesheets and expenses and nobody else's.
 *   - `crm_rate_card` — read, WITHOUT what anything costs: the cost rate, and
 *     the cost copied onto their own entries and summed on their timesheets,
 *     are hidden at the field level, and so is the project's cost and margin
 *     block, which sums them. The bill side stays readable. The budget
 *     versions and their lines (hotcrm#2547) are cost too, so this set has
 *     no grant on `crm_project_budget` or `crm_project_budget_line`, and the
 *     project's Approved Budget, now the baseline version's total, is hidden
 *     with the rest of the cost block (`os lint`
 *     `security-rollup-source-unreadable`). ⛔ No View All
 *     on the rate card (it is `public_read` anyway): View All would vote on
 *     every field and undo the hiding.
 *   - `crm_account` — read, View All (ruling D on #2316, 2026-11-15): a
 *     member delivers for the customer and needs its name on the
 *     project page, WITHOUT the account's Order to Cash totals (hotcrm#2481,
 *     the field rows below). `crm_opportunity` stays closed (no grant): pipeline value
 *     is not delivery's, and the project's `crm_opportunity` field is hidden
 *     at the field level, so the member's page carries no restricted-record
 *     placeholder. The project's `crm_sales_order` (hotcrm#2561) is hidden the
 *     same way: what the customer bought and for how much is the sale's, not
 *     delivery's, so this set has no grant on the order either.
 */
export const ProjectMemberProfile = {
  name: 'project_member',
  label: 'Project Member',
  description:
    'Delivery: reads the projects they are staffed on, and writes their own timesheets and expenses, without seeing cost rates.',
  // Project Delivery and Sales, as on `project_manager`.
  tabPermissions: { crm_service: 'hidden' as const, crm_marketing: 'hidden' as const, crm_o2c: 'hidden' as const },
  objects: {
    crm_project:        { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false, viewAllRecords: false, modifyAllRecords: false, readScope: 'own' as const },
    crm_project_member: { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false, viewAllRecords: false, modifyAllRecords: false },
    crm_project_task:   { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false, viewAllRecords: false, modifyAllRecords: false },
    crm_account:        { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false, viewAllRecords: true,  modifyAllRecords: false },
    // Order to Cash: NO read on invoices and payments. Since hotcrm#2557 both
    // are `controlled_by_parent` under the ACCOUNT, and this set reads every
    // account (View All above), so a read grant here would open the rows of
    // every account. Irene ruled 2026-11-17 05:08Z 「保持现在的范围」: sales
    // (own accounts) and finance read the rows; consultants read neither the
    // rows nor the totals (the `crm_account` field rows below, hotcrm#2481),
    // so the totals sum no source this set can read and `os lint`
    // `security-rollup-source-unreadable` has nothing to report here.
    crm_rate_card:      { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false, viewAllRecords: false, modifyAllRecords: false },
    crm_timesheet:      { allowCreate: true,  allowRead: true, allowEdit: true,  allowDelete: true,  viewAllRecords: false, modifyAllRecords: false, readScope: 'own' as const },
    crm_time_entry:     { allowCreate: true,  allowRead: true, allowEdit: true,  allowDelete: true,  viewAllRecords: false, modifyAllRecords: false },
    // Their own expenses and travel requests, as every internal set (hotcrm#2556, hotcrm#2578, `_expense-grants.ts`).
    crm_expense: EXPENSE_OWN,
    crm_expense_report: EXPENSE_REPORT_OWN,
    crm_expense_request: EXPENSE_OWN,
    crm_expense_request_line: EXPENSE_REQUEST_LINE_EDIT,
    crm_expense_standard: EXPENSE_STANDARD_READ, // every standard, read (hotcrm#2616)
    sys_attachment:     { allowCreate: true,  allowRead: true, allowEdit: false, allowDelete: true,  viewAllRecords: false, modifyAllRecords: false },
    sys_comment:        { allowCreate: true,  allowRead: true, allowEdit: true,  allowDelete: true,  viewAllRecords: false, modifyAllRecords: false },
    sys_activity:       { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false, viewAllRecords: false, modifyAllRecords: false },
  },
  fields: {
    'crm_rate_card.cost_rate':    { readable: false, editable: false },
    'crm_time_entry.cost_rate':   { readable: false, editable: false },
    'crm_time_entry.cost_amount': { readable: false, editable: false },
    'crm_timesheet.total_cost':   { readable: false, editable: false },
    // The project's cost block, for the same reason: it sums what a member
    // may not read, and the margin follows from it. Expense Cost goes with it,
    // so the block is hidden whole rather than half.
    'crm_project.approved_budget':         { readable: false, editable: false },
    'crm_project.actual_labor_cost':       { readable: false, editable: false },
    'crm_project.actual_expense_cost':     { readable: false, editable: false },
    'crm_project.actual_cost':             { readable: false, editable: false },
    'crm_project.cost_variance':           { readable: false, editable: false },
    'crm_project.budget_consumed_percent': { readable: false, editable: false },
    'crm_project.gross_margin':            { readable: false, editable: false },
    'crm_project.gross_margin_percent':    { readable: false, editable: false },
    // Ruling D (#2316): the opportunity stays closed to a member, so the
    // field that points at it is left off their project page.
    'crm_project.crm_opportunity':         { readable: false, editable: false },
    // hotcrm#2561: the order the project delivers, closed to a member as the
    // opportunity is.
    'crm_project.crm_sales_order':         { readable: false, editable: false },
    // The account's Order to Cash totals, hidden from a consultant: Irene's
    // ruling of 2026-11-15 (hotcrm#2481), "consultants (`project_member`) must
    // not see the account's Order to Cash totals". It departs here from the
    // #2315 ruling (2026-11-05: these figures are authored readable, with no
    // `readable: false` rows, `_o2c-figures.ts`): the 11-15 ruling is later and
    // names this set. The rows bind over this set's own View All on the account
    // since objectstack#33828 (18.6.0): a set's own `readable: false` row wins
    // over its own View All vote. A consultant still reads the account and its
    // other fields; a person who also holds a set reading these totals (a rep,
    // finance) reads them through that set.
    'crm_account.invoiced_amount':         { readable: false, editable: false },
    'crm_account.received_amount':         { readable: false, editable: false },
    // Unpaid and Uninvoiced replace the Receivable Balance, with the hidden
    // halves they are summed from (hotcrm#2806): the same audience as before.
    'crm_account.unpaid_amount':           { readable: false, editable: false },
    'crm_account.uninvoiced_amount':       { readable: false, editable: false },
    'crm_account.unpaid_on_orders':        { readable: false, editable: false },
    'crm_account.unpaid_on_contracts':     { readable: false, editable: false },
    'crm_account.uninvoiced_on_orders':    { readable: false, editable: false },
    'crm_account.uninvoiced_on_contracts': { readable: false, editable: false },
  },
};
