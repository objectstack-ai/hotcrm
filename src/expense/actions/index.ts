// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * The expense module's action barrel (hotcrm#2559, hotcrm#2578).
 *
 * The doctrine for this metadata type is written once, in
 * `src/sales/actions/index.ts`; this file is the expense package's half of
 * the same file-by-file registration.
 */
export {
  SubmitForReimbursementAction, SubmitTripForReimbursementAction, SubmitExpenseReportAction, ReopenExpenseReportAction, MarkExpenseReportPaidAction,
} from './expense.actions';
export { SubmitExpenseRequestAction, CancelExpenseRequestAction, CloseExpenseRequestAction } from './expense-request.actions';
