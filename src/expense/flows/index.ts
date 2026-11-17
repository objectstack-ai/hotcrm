// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * The expense module's flows (hotcrm#2556): the approval of an expense with
 * no project (the spender's manager), the approval of one on a project (its
 * Project Manager; why that one is here and not in Project Delivery is in its
 * file), the approval of a travel request with no project (the traveler's
 * manager, hotcrm#2578), the approval of one on a project (its Project
 * Manager, hotcrm#2581; here for the same platform gap), and the insert twin
 * of each.
 */
export { ExpenseApprovalFlow, ExpenseApprovalOnCreateFlow } from './expense-approval.flow';
export { ExpenseProjectApprovalFlow, ExpenseProjectApprovalOnCreateFlow } from './expense-project-approval.flow';
export { ExpenseRequestApprovalFlow, ExpenseRequestApprovalOnCreateFlow } from './expense-request-approval.flow';
export { ExpenseRequestProjectApprovalFlow, ExpenseRequestProjectApprovalOnCreateFlow } from './expense-request-project-approval.flow';
