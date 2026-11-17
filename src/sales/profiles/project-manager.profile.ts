// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { privateOpportunityPolicy } from './_private-opportunity';
import { EXPENSE_OWN } from './_expense-grants';

/**
 * Project Manager — runs projects in the Project Delivery module (hotcrm#2316,
 * `docs/architecture/psa-module-plan.md`, *Permissions, positions, sharing*).
 * The `crm_project_manager` position distributes it, and the director and PMO
 * positions hold it beside `finance_controller` (`src/sales/sharing/positions.ts`).
 *
 * It lives in the APP package although its grants are on module objects:
 * permission sets stay whole here (ADR-0130 addendum, 2026-09-02).
 *
 *   - `crm_project` — create, read and edit; no View All. A manager reaches
 *     the projects they own, the ones they manage (edit, by the
 *     `project_manager_edit` rule) and the ones they are staffed on (read).
 *     ⛔ No delete: a project with booked hours is closed or cancelled.
 *   - `crm_project_member` — full: staffing is the manager's. A child of the
 *     project, so it needs edit on the project, which the rule above gives.
 *   - `crm_project_task` — full: the plan is the manager's (hotcrm#2545),
 *     written on the projects they own or manage, for the same reason.
 *   - `crm_project_budget`, `crm_project_budget_line` — full: a manager plans
 *     the budget versions and sends them for approval (hotcrm#2547). Children
 *     of the project, written where the manager may edit it; the hooks keep a
 *     sent version's lines and the decisions out of a person's hands.
 *   - `crm_timesheet`, `crm_time_entry`, `crm_expense` — a manager books their
 *     own time and expenses, and edits the ones they approve (the
 *     `*_approver_edit` rules).
 *   - `crm_rate_card` — read, cost included: a manager staffs at a rate.
 *   - `crm_account`, `crm_opportunity`, `crm_contract` — read, every record:
 *     a project is opened for any customer, from any deal or contract.
 *   - `crm_sales_order`, `crm_sales_order_line` — read (hotcrm#2561): a
 *     project may name the order it delivers, so the manager picks it and
 *     reads what was sold. Every order, as every contract; the lines open with
 *     their order (`controlled_by_parent`).
 */
export const ProjectManagerProfile = {
  name: 'project_manager',
  label: 'Project Manager',
  description:
    'Delivery: opens and runs projects, staffs them at a rate card, books time and expenses, and reads every account, opportunity, contract and order.',
  // Which HotCRM apps the launcher offers: Project Delivery and Sales.
  // Visibility, not access, as on `sales_rep`; Project Delivery is offered by
  // silence, so disabling the module drops it (objectstack#33648).
  tabPermissions: { crm_service: 'hidden' as const, crm_marketing: 'hidden' as const, crm_o2c: 'hidden' as const },
  objects: {
    crm_project:        { allowCreate: true,  allowRead: true, allowEdit: true,  allowDelete: false, viewAllRecords: false, modifyAllRecords: false, readScope: 'own' as const },
    crm_project_member: { allowCreate: true,  allowRead: true, allowEdit: true,  allowDelete: true,  viewAllRecords: false, modifyAllRecords: false },
    crm_project_task:   { allowCreate: true,  allowRead: true, allowEdit: true,  allowDelete: true,  viewAllRecords: false, modifyAllRecords: false },
    crm_project_budget:      { allowCreate: true, allowRead: true, allowEdit: true, allowDelete: true, viewAllRecords: false, modifyAllRecords: false },
    crm_project_budget_line: { allowCreate: true, allowRead: true, allowEdit: true, allowDelete: true, viewAllRecords: false, modifyAllRecords: false },
    crm_rate_card:      { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false, viewAllRecords: false, modifyAllRecords: false },
    crm_timesheet:      { allowCreate: true,  allowRead: true, allowEdit: true,  allowDelete: true,  viewAllRecords: false, modifyAllRecords: false, readScope: 'own' as const },
    crm_time_entry:     { allowCreate: true,  allowRead: true, allowEdit: true,  allowDelete: true,  viewAllRecords: false, modifyAllRecords: false },
    // Their own expenses, as every internal set (hotcrm#2556, `_expense-grants.ts`).
    crm_expense: EXPENSE_OWN,
    crm_account:        { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false, viewAllRecords: true,  modifyAllRecords: false },
    crm_opportunity:    { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false, viewAllRecords: true,  modifyAllRecords: false },
    crm_contract:       { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false, viewAllRecords: true,  modifyAllRecords: false },
    crm_sales_order:      { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false, viewAllRecords: true,  modifyAllRecords: false },
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
  rowLevelSecurity: [privateOpportunityPolicy('opportunity_private_owner_only_project_manager')],
};
