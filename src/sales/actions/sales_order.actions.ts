// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { Action } from '@objectstack/spec/ui';
import { P } from '@objectstack/spec';

/**
 * Draft Contract — the order's contract, on demand (REQ-0010 rule 2,
 * hotcrm#2558).
 *
 * Launches `sales_order_draft_contract` (`../flows/sales-order-draft-contract.flow.ts`),
 * which drafts the contract an accepted quote used to draft by itself — the
 * same type, term and field values — at the order's total, and names it on
 * the order. The flow carries the reasons and the refusals.
 *
 * `visible`: only while the order names no contract — an order placed under a
 * framework contract already names that one, and a drafted order names its
 * draft — never on a cancelled order, whose sale is off (hotcrm#2756), and
 * only to a person who may edit orders, since the draft is named on the
 * order. Draft, Confirmed and Completed orders are all offered it. The flow
 * re-judges the contract and the status, so a REST trigger past the button is
 * refused the same way. The predicate is total: a page's first render holds
 * no status, which offers nothing.
 */
export const DraftContractAction: Action = {
  name: 'draft_contract',
  label: 'Draft Contract',
  objectName: 'crm_sales_order',
  icon: 'file-signature',
  type: 'flow',
  target: 'sales_order_draft_contract',
  locations: ['record_header', 'record_more'],
  visible: P`has(record.status) && record.status != "cancelled"
    && (!has(record.crm_contract) || record.crm_contract == null || record.crm_contract == "") && current_user.can("crm_sales_order", "edit")`,
  refreshAfter: true,
};

/**
 * The order's lifecycle actions (hotcrm#2716).
 *
 * Before these, an order moved only through Edit and the Status dropdown, and
 * users looking for a Confirm button found none. Each action is one step of
 * `sales_order_status_progression` (`../objects/sales_order.object.ts`) and is
 * offered only on the statuses that step leaves from:
 *
 * | action          | from               | to        |
 * |-----------------|--------------------|-----------|
 * | Confirm Order   | Draft              | Confirmed |
 * | Complete Order  | Confirmed          | Completed |
 * | Cancel Order    | Draft, Confirmed   | Cancelled |
 *
 * Confirmed → Draft, the machine's one remaining move, has no button (the
 * card names none): it is made through Status on the form, which stays
 * editable until the platform offers a field only actions may change
 * (objectstack#36806), or through the API.
 * `test/sales-order-lifecycle-actions.test.ts` derives every pair from the
 * declared transitions and fails when the two disagree. The machine is
 * unchanged and stays the rule for every door: the form, the API, a batch
 * update and an import.
 *
 * # A declarative update, as the caller
 *
 * `operation: 'update'` + `patch`, as the quote's actions
 * (`src/revenue/actions/quote.actions.ts`, which gives the reasoning): the
 * platform's action door writes the patch AS THE CALLER, so the order's
 * permissions, the state machine and `sales_order_workflow` judge it exactly
 * as they judge the same status set by Edit. A move the machine does not allow
 * from the status the order holds by then (another person cancelled it a
 * moment ago) is refused with the machine's own message, in the user's
 * language. Each patch is the status alone: what follows from it — the lines
 * locking once the order leaves Draft — is the hook's.
 *
 * `current_user.can("crm_sales_order", "edit")` keeps the buttons off a reader
 * who may not edit orders. Every predicate is total: a page's first render
 * holds no status, which offers nothing.
 *
 * # Wording
 *
 * Each asks first and says what the move does to the order, so the rule is
 * read before the attempt rather than after a refusal. Complete and Cancel
 * cannot be undone: both are final in the machine.
 */

export const ConfirmSalesOrderAction: Action = {
  name: 'confirm_sales_order',
  label: 'Confirm Order',
  objectName: 'crm_sales_order',
  icon: 'check-circle',
  operation: 'update',
  patch: { status: 'confirmed' },
  locations: ['record_header', 'list_item'],
  variant: 'primary',
  visible: P`has(record.status) && record.status == "draft" && current_user.can("crm_sales_order", "edit")`,
  confirmText: 'Confirm this order? Its lines and its amount are then locked: to change them, the order has to go back to Draft.',
  successMessage: 'Order {{ record.name }} confirmed.',
  refreshAfter: true,
};

export const CompleteSalesOrderAction: Action = {
  name: 'complete_sales_order',
  label: 'Complete Order',
  objectName: 'crm_sales_order',
  icon: 'circle-check-big',
  operation: 'update',
  patch: { status: 'completed' },
  locations: ['record_header', 'list_item'],
  variant: 'primary',
  visible: P`has(record.status) && record.status == "confirmed" && current_user.can("crm_sales_order", "edit")`,
  confirmText: 'Complete this order? A completed order is final: its status and its lines can no longer change.',
  successMessage: 'Order {{ record.name }} completed.',
  refreshAfter: true,
};

export const CancelSalesOrderAction: Action = {
  name: 'cancel_sales_order',
  label: 'Cancel Order',
  objectName: 'crm_sales_order',
  icon: 'circle-x',
  operation: 'update',
  patch: { status: 'cancelled' },
  locations: ['record_header', 'list_item'],
  visible: P`has(record.status) && (record.status == "draft" || record.status == "confirmed") && current_user.can("crm_sales_order", "edit")`,
  confirmText: 'Cancel this order? A cancelled order is final: it cannot be reopened, and its lines can no longer change.',
  successMessage: 'Order {{ record.name }} cancelled.',
  refreshAfter: true,
};
