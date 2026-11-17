// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * The expense module's flows (hotcrm#2559): the approval of an expense report
 * with no project (the submitter's manager) and of one on a project (its
 * Project Manager; why that one is here and not in Project Delivery is in its
 * file), replacing the per-expense approvals hotcrm#2556 shipped, and the
 * approval of a travel request (the traveler's manager, hotcrm#2578) with its
 * insert twin.
 */
export { ExpenseReportApprovalFlow } from './expense-report-approval.flow';
export { ExpenseReportProjectApprovalFlow } from './expense-report-project-approval.flow';
export { ExpenseRequestApprovalFlow, ExpenseRequestApprovalOnCreateFlow } from './expense-request-approval.flow';
