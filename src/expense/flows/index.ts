// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * The expense module's flows (hotcrm#2559): the approval of an expense report
 * with no project (the submitter's manager), replacing the per-expense
 * approval hotcrm#2556 shipped, and of a travel request with no project (the
 * traveler's manager, hotcrm#2578) with its insert twin. A report or a
 * request on a project goes to its Project Manager through Project
 * Delivery's flows (`src/psa/flows/`, hotcrm#2575).
 */
export { ExpenseReportApprovalFlow } from './expense-report-approval.flow';
export { ExpenseRequestApprovalFlow, ExpenseRequestApprovalOnCreateFlow } from './expense-request-approval.flow';
