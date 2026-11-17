// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Project Delivery grant rows shared by the sets that only READ the module's
 * objects (hotcrm#2316 phase 1). Three sets carry the delivery work itself —
 * `project_manager`, `project_member`, `finance_controller` — and author their
 * rows in full; the sales sets that read projects take these.
 *
 * `crm_timesheet` and `crm_time_entry` are read beside `crm_project` because
 * the project's and the timesheet's summaries sum them, and a set that reads a
 * summary must read its source (`os lint` `security-rollup-source-unreadable`).
 * The timesheet is `private`, so the grant opens a member's own rows and the
 * ones shared to them, nothing more. The project's expense figures sum
 * `crm_expense`, which every set grants on its own since it became the expense
 * module's (`_expense-grants.ts`, hotcrm#2556). `crm_project_budget` and
 * `crm_project_budget_line` are read for the same reason since hotcrm#2547:
 * the project's Approved Budget sums the baseline version, which sums its
 * lines. Both are `controlled_by_parent`, so they open with the project.
 */

const READ_OWN = { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false, viewAllRecords: false, modifyAllRecords: false, readScope: 'own' as const };
// A `controlled_by_parent` child: whoever reads the timesheet reads its entries.
const READ_CHILD = { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false, viewAllRecords: false, modifyAllRecords: false };
const READ_ALL = { allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false, viewAllRecords: true, modifyAllRecords: false };

/** A rep: the projects shared to them, and the rows behind their figures. */
export const PSA_READ_OWN_OBJECTS = {
  crm_project: READ_OWN,
  crm_timesheet: READ_OWN,
  crm_time_entry: READ_CHILD,
  crm_project_budget: READ_CHILD,
  crm_project_budget_line: READ_CHILD,
};

/** A sales manager: every project, and every row behind its figures. */
export const PSA_READ_ALL_OBJECTS = {
  crm_project: READ_ALL,
  crm_timesheet: READ_ALL,
  crm_time_entry: READ_CHILD,
  crm_project_budget: READ_CHILD,
  crm_project_budget_line: READ_CHILD,
};
