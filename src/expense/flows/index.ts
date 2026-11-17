// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * The expense module's flows (hotcrm#2559): the approval of an expense report
 * with no project (the submitter's manager) and of one on a project (its
 * Project Manager; why that one is here and not in Project Delivery is in its
 * file), replacing the per-expense approvals hotcrm#2556 shipped; the
 * approval of a travel request with no project (the traveler's manager,
 * hotcrm#2578) and of one on a project (its Project Manager, hotcrm#2581;
 * here for the same platform gap), each with its insert twin.
 */
export { ExpenseReportApprovalFlow } from './expense-report-approval.flow';
export { ExpenseReportProjectApprovalFlow } from './expense-report-project-approval.flow';
export { ExpenseRequestApprovalFlow, ExpenseRequestApprovalOnCreateFlow } from './expense-request-approval.flow';
export { ExpenseRequestProjectApprovalFlow, ExpenseRequestProjectApprovalOnCreateFlow } from './expense-request-project-approval.flow';
