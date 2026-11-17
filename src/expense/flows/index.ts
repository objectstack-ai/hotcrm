// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * The expense module's flows (hotcrm#2559): the approval of an expense report
 * with no project (the submitter's manager) and of one on a project (its
 * Project Manager; why that one is here and not in Project Delivery is in its
 * file). They replace the per-expense approvals hotcrm#2556 shipped.
 */
export { ExpenseReportApprovalFlow } from './expense-report-approval.flow';
export { ExpenseReportProjectApprovalFlow } from './expense-report-project-approval.flow';
