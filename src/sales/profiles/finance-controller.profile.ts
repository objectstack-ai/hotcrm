// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { privateOpportunityPolicy } from './_private-opportunity';
import { EXPENSE_OWN_READ_ALL, EXPENSE_REPORT_OWN_READ_ALL } from './_expense-grants';

/**
 * Finance Controller — watches delivery cost and margin (hotcrm#2316, plan
 * *Permissions, positions, sharing*). The `crm_finance_controller` position
 * distributes it; the director and PMO positions hold it too.
 *
 *   - Every Project Delivery row — read, every record: projects, staffing,
 *     tasks, timesheets, entries and expenses.
 *   - `crm_project` — edit, every record: the controller corrects a
 *     project's financial details. ⛔ No create or delete: projects are delivery's. So
 *     not Modify All, which would grant delete (ADR-0049): the edit reach is
 *     the `project_finance_edit_*` shares in `src/psa/sharing/project.sharing.ts`,
 *     to the three positions holding this set.
 *   - `crm_rate_card` — full: the rates are finance's to set.
 *   - `crm_project_budget`, `crm_project_budget_line` — read, every record,
 *     and create and edit (hotcrm#2547): finance plans a top-up with the
 *     manager and decides the large ones from the Inbox. No delete, as on
 *     the project. The Approved Budget itself is never typed: it is the
 *     baseline version's total.
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
    crm_project_task:   { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false, viewAllRecords: true, modifyAllRecords: false },
    crm_project_budget:      { allowCreate: true, allowRead: true, allowEdit: true, allowDelete: false, viewAllRecords: true, modifyAllRecords: false },
    crm_project_budget_line: { allowCreate: true, allowRead: true, allowEdit: true, allowDelete: false, viewAllRecords: true, modifyAllRecords: false },
    crm_rate_card:      { allowCreate: true,  allowRead: true, allowEdit: true,  allowDelete: true,  viewAllRecords: true, modifyAllRecords: true },
    crm_timesheet:      { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false, viewAllRecords: true, modifyAllRecords: false },
    crm_time_entry:     { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false, viewAllRecords: true, modifyAllRecords: false },
    // Their own expenses, as every internal set (hotcrm#2556, `_expense-grants.ts`).
    crm_expense: EXPENSE_OWN_READ_ALL,
    crm_expense_report: EXPENSE_REPORT_OWN_READ_ALL,
    crm_account:        { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false, viewAllRecords: true, modifyAllRecords: false },
    crm_opportunity:    { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false, viewAllRecords: true, modifyAllRecords: false },
    crm_contract:       { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false, viewAllRecords: true, modifyAllRecords: false },
    // Orders (REQ-0010, #2555): read, every record.
    crm_sales_order:      { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false, viewAllRecords: true, modifyAllRecords: false },
    crm_sales_order_line: { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false, viewAllRecords: false, modifyAllRecords: false },
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
  // ADR-0058: this set reads opportunities org-wide, so it carries the
  // private-deal row filter with it (`_private-opportunity.ts`, hotcrm#2489):
  // a deal its owner flagged Private stays the owner's.
  rowLevelSecurity: [privateOpportunityPolicy('opportunity_private_owner_only_finance')],
};
