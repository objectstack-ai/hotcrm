// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Finance Controller — watches delivery cost and margin (hotcrm#2316, plan
 * *Permissions, positions, sharing*). The `crm_finance_controller` position
 * distributes it; the director and PMO positions hold it too.
 *
 *   - Every Project Delivery row — read, every record: projects, staffing,
 *     timesheets, entries and expenses.
 *   - `crm_project` — edit, every record: the controller sets and corrects
 *     the budget figure. ⛔ No create or delete: projects are delivery's. So
 *     not Modify All, which would grant delete (ADR-0049): the edit reach is
 *     the `project_finance_edit_*` shares in `src/psa/sharing/project.sharing.ts`,
 *     to the three positions holding this set.
 *   - `crm_rate_card` — full: the rates are finance's to set.
 *   - `crm_account`, `crm_opportunity`, `crm_contract` — read, every record.
 */
export const FinanceControllerProfile = {
  name: 'finance_controller',
  label: 'Finance Controller',
  description:
    'Finance: reads every project, its staffing, time and expenses, edits project budgets, and keeps the rate cards.',
  // Project Delivery, Sales and Order to Cash.
  tabPermissions: { crm_service: 'hidden' as const, crm_marketing: 'hidden' as const },
  objects: {
    crm_project:        { allowCreate: false, allowRead: true, allowEdit: true,  allowDelete: false, viewAllRecords: true, modifyAllRecords: false },
    crm_project_member: { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false, viewAllRecords: true, modifyAllRecords: false },
    crm_rate_card:      { allowCreate: true,  allowRead: true, allowEdit: true,  allowDelete: true,  viewAllRecords: true, modifyAllRecords: true },
    crm_timesheet:      { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false, viewAllRecords: true, modifyAllRecords: false },
    crm_time_entry:     { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false, viewAllRecords: true, modifyAllRecords: false },
    crm_expense:        { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false, viewAllRecords: true, modifyAllRecords: false },
    crm_account:        { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false, viewAllRecords: true, modifyAllRecords: false },
    crm_opportunity:    { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false, viewAllRecords: true, modifyAllRecords: false },
    crm_contract:       { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false, viewAllRecords: true, modifyAllRecords: false },
    // The contract's and the account's Order to Cash figures sum these, and a
    // set that reads a roll-up reads its source (`os lint`
    // `security-rollup-source-unreadable`). All three are children of the
    // contract this set reads.
    crm_billing_milestone: { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false, viewAllRecords: false, modifyAllRecords: false },
    crm_invoice:        { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false, viewAllRecords: false, modifyAllRecords: false },
    crm_payment:        { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false, viewAllRecords: false, modifyAllRecords: false },
    sys_attachment:     { allowCreate: true,  allowRead: true, allowEdit: false, allowDelete: true,  viewAllRecords: false, modifyAllRecords: false },
    sys_comment:        { allowCreate: true,  allowRead: true, allowEdit: true,  allowDelete: true,  viewAllRecords: false, modifyAllRecords: false },
    sys_activity:       { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false, viewAllRecords: false, modifyAllRecords: false },
  },
};
