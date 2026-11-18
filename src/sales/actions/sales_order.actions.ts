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
 * draft — and only to a person who may edit orders, since the draft is named
 * on the order. The flow re-judges both, so a REST trigger past the button is
 * refused the same way.
 */
export const DraftContractAction: Action = {
  name: 'draft_contract',
  label: 'Draft Contract',
  objectName: 'crm_sales_order',
  icon: 'file-signature',
  type: 'flow',
  target: 'sales_order_draft_contract',
  locations: ['record_header', 'record_more'],
  visible: P`(!has(record.crm_contract) || record.crm_contract == null || record.crm_contract == "") && current_user.can("crm_sales_order", "edit")`,
  refreshAfter: true,
};
