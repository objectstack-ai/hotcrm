// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { P } from '@objectstack/spec';

/**
 * Expense record sharing (hotcrm#2556). An expense is `private` to its
 * spender; this RECORD-RELATIVE rule (`type: 'field'`, #14103) opens it to
 * the approver its approval stamps when it is submitted: the project's
 * Project Manager on a project (Project Delivery's flow), otherwise the
 * spender's manager (`../flows/expense-approval.flow.ts`). It re-materialises
 * when that write changes the column; an empty column shares with nobody.
 *
 * Moved here from Project Delivery with the object, name unchanged. The
 * condition matches every row: `record.id != ""` holds for every expense, and
 * the recipient column is what narrows the rule.
 */
export const ExpenseApproverEditSharingRule = {
  name: 'expense_approver_edit',
  label: 'Expenses — Approver',
  object: 'crm_expense',
  type: 'criteria' as const,
  condition: P`record.id != ""`,
  accessLevel: 'edit' as const,
  sharedWith: { type: 'field' as const, value: 'approver' },
};

/**
 * Travel request record sharing (hotcrm#2578), the same shape as
 * {@link ExpenseApproverEditSharingRule}: a request is `private` to its
 * traveler, and this rule opens it to the approver its approval stamps when it
 * is submitted, the traveler's manager (`../flows/expense-request-approval.flow.ts`).
 */
export const ExpenseRequestApproverEditSharingRule = {
  name: 'expense_request_approver_edit',
  label: 'Travel Requests — Approver',
  object: 'crm_expense_request',
  type: 'criteria' as const,
  condition: P`record.id != ""`,
  accessLevel: 'edit' as const,
  sharedWith: { type: 'field' as const, value: 'approver' },
};
