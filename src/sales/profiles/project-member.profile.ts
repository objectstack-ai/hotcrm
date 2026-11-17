// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { O2C_ACCOUNT_FIGURE_FIELDS } from './_o2c-figures';
import { EXPENSE_OWN } from './_expense-grants';

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
 *     project page. `crm_opportunity` stays closed (no grant): pipeline value
 *     is not delivery's, and the project's `crm_opportunity` field is hidden
 *     at the field level, so the member's page carries no restricted-record
 *     placeholder.
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
    // are `controlled_by_parent` under the ACCOUNT, so a read grant here would
    // open the rows of every account this set reads. Irene ruled 2026-11-17
    // 05:08Z 「保持现在的范围」: sales (own accounts) and finance read the rows;
    // consultants read neither the rows nor, once hotcrm#2481 lands, the
    // totals. Until then the totals sum a child
    // the set cannot read, which `os lint --strict` reports as
    // `security-rollup-source-unreadable`; the meant pair is acknowledged
    // with the platform's switch from objectstack#34664, added with the bump
    // that ships it.
    crm_rate_card:      { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false, viewAllRecords: false, modifyAllRecords: false },
    crm_timesheet:      { allowCreate: true,  allowRead: true, allowEdit: true,  allowDelete: true,  viewAllRecords: false, modifyAllRecords: false, readScope: 'own' as const },
    crm_time_entry:     { allowCreate: true,  allowRead: true, allowEdit: true,  allowDelete: true,  viewAllRecords: false, modifyAllRecords: false },
    // Their own expenses, as every internal set (hotcrm#2556, `_expense-grants.ts`).
    crm_expense: EXPENSE_OWN,
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
    // The account's Order to Cash figures, read as every account reader reads
    // them (`_o2c-figures.ts`: the #2315 ruling authors them readable and
    // forbids `readable: false` rows).
    ...O2C_ACCOUNT_FIGURE_FIELDS,
  },
};
