// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Project Member — a consultant staffed on projects (hotcrm#2316, plan
 * *Permissions, positions, sharing*). The `crm_project_member` position
 * distributes it (`src/sales/sharing/positions.ts`).
 *
 *   - `crm_project`, `crm_project_member` — read: the projects a member is
 *     staffed on reach them through the `project_team_read` rule.
 *   - `crm_timesheet`, `crm_time_entry`, `crm_expense` — their own: a member
 *     writes their own timesheets and expenses and nobody else's.
 *   - `crm_rate_card` — read, WITHOUT what anything costs: the cost rate, and
 *     the cost copied onto their own entries and summed on their timesheets,
 *     are hidden at the field level, and so is the project's cost and margin
 *     block, which sums them. The bill side stays readable. ⛔ No View All
 *     on the rate card (it is `public_read` anyway): View All would vote on
 *     every field and undo the hiding.
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
    crm_rate_card:      { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false, viewAllRecords: false, modifyAllRecords: false },
    crm_timesheet:      { allowCreate: true,  allowRead: true, allowEdit: true,  allowDelete: true,  viewAllRecords: false, modifyAllRecords: false, readScope: 'own' as const },
    crm_time_entry:     { allowCreate: true,  allowRead: true, allowEdit: true,  allowDelete: true,  viewAllRecords: false, modifyAllRecords: false },
    crm_expense:        { allowCreate: true,  allowRead: true, allowEdit: true,  allowDelete: true,  viewAllRecords: false, modifyAllRecords: false, readScope: 'own' as const },
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
    'crm_project.actual_labor_cost':       { readable: false, editable: false },
    'crm_project.actual_expense_cost':     { readable: false, editable: false },
    'crm_project.actual_cost':             { readable: false, editable: false },
    'crm_project.cost_variance':           { readable: false, editable: false },
    'crm_project.budget_consumed_percent': { readable: false, editable: false },
    'crm_project.gross_margin':            { readable: false, editable: false },
    'crm_project.gross_margin_percent':    { readable: false, editable: false },
  },
};
