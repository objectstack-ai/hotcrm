// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Project Delivery flow barrel (#2316 phase 1b) — the flows whose start node
 * names one of this module's objects. Registered, in order, by the module's
 * own stack (`psaFlows` in `src/psa/index.ts`).
 */
export { ProjectInitiationApprovalFlow } from './project-initiation-approval.flow';
export { TimesheetApprovalFlow, TimesheetApprovalOnCreateFlow } from './submission-approval.flow';
// The approval of an expense on a project (hotcrm#2556). Its start node names
// the expense module's object, which a record-change flow may (measured on
// 18.5.0: a build warning, and the flow fires).
export { ExpenseProjectApprovalFlow, ExpenseProjectApprovalOnCreateFlow } from './expense-project-approval.flow';
export { ProjectBudgetAlertFlow } from './project-budget-alert.flow';
export { ProjectBudgetApprovalFlow } from './project-budget-approval.flow';
