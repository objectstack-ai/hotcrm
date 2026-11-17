// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Expense grant rows (REQ-0011, hotcrm#2556). Reimbursement is for every
 * employee, so every member records their own expenses — through `crm_user`,
 * the default every member holds, and again through each position set that
 * writes (the two read-only sets, `sales_leadership` and `service_director`,
 * add none of their own) — and the Expenses app is hidden from no set. `crm_expense` is `private`: an
 * own row opens the holder's expenses and the ones shared to them, which is
 * how an approver reaches what it approves (`expense_approver_edit` shares an
 * expense to the approver its approval stamps).
 *
 * Four shapes:
 *   - {@link EXPENSE_OWN} — the position sets: create, read, edit and delete
 *     their own.
 *   - {@link EXPENSE_OWN_FLOOR} — `crm_user`, every member's default: the
 *     same without delete, which the `everyone` anchor refuses on any object
 *     (`describeAnchorForbiddenBits`, `test/default-permission-set.test.ts`).
 *   - {@link EXPENSE_OWN_READ_ALL} — the sets that read every expense: finance
 *     (`finance_controller`, `ar_accountant`), and the sales managers and
 *     manager, who reads every project's figures and so every row behind
 *     them (`os lint` `security-rollup-source-unreadable`, as before
 *     hotcrm#2556). View All reads; it edits nothing that is not theirs.
 *   - {@link EXPENSE_READ_ALL} — `sales_leadership`, read-only by ruling
 *     (#2492 A): every expense read, nothing written. Its holders record their
 *     own through `crm_user`, as every member does.
 */

export const EXPENSE_OWN = {
  allowCreate: true, allowRead: true, allowEdit: true, allowDelete: true,
  viewAllRecords: false, modifyAllRecords: false, readScope: 'own' as const,
};

export const EXPENSE_OWN_FLOOR = {
  allowCreate: true, allowRead: true, allowEdit: true, allowDelete: false,
  viewAllRecords: false, modifyAllRecords: false, readScope: 'own' as const,
};

export const EXPENSE_OWN_READ_ALL = {
  allowCreate: true, allowRead: true, allowEdit: true, allowDelete: true,
  viewAllRecords: true, modifyAllRecords: false,
};

export const EXPENSE_READ_ALL = {
  allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false,
  viewAllRecords: true, modifyAllRecords: false,
};
