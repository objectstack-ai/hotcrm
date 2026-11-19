// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Project Delivery flow barrel (#2316 phase 1b) — the flows whose start node
 * names one of this module's objects, the one that keeps this module's
 * staffing titles in step with a renamed user (hotcrm#2568), and the project
 * path of the expense module's report and travel request, whose start node
 * names that module's object (hotcrm#2575). Registered, in
 * order, by the module's own stack (`psaFlows` in `src/psa/index.ts`).
 */
export { ProjectInitiationApprovalFlow } from './project-initiation-approval.flow';
export { TimesheetApprovalFlow, TimesheetApprovalOnCreateFlow } from './submission-approval.flow';
export { ProjectBudgetAlertFlow } from './project-budget-alert.flow';
export { ProjectBudgetApprovalFlow } from './project-budget-approval.flow';
export { ProjectMemberPersonRenameFlow } from './project-member-person-rename.flow';
export { ExpenseReportProjectApprovalFlow } from './expense-report-project-approval.flow';
export { ExpenseRequestProjectApprovalFlow, ExpenseRequestProjectApprovalOnCreateFlow } from './expense-request-project-approval.flow';
