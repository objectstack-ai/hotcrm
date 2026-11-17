// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Expense module action barrel (hotcrm#2578).
 *
 * The doctrine for this metadata type is written once, in
 * `src/sales/actions/index.ts`; this file is the expense package's half of the
 * same file-by-file registration.
 */
export { SubmitExpenseRequestAction, CancelExpenseRequestAction, CloseExpenseRequestAction } from './expense-request.actions';
