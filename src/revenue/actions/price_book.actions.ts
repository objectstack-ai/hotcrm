// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { Action } from '@objectstack/spec/ui';
import { P } from '@objectstack/spec';

/**
 * Add Products to a price book (REQ-0009 phase 3, #2318).
 *
 * Flow-typed: launches the `price_book_add_products` screen flow, which prices
 * every active product the book does not price yet at one percentage of its
 * List Price. The console's flow-action trigger sends `{ recordId, objectName }`,
 * the `enroll_leads` pattern.
 *
 * Offered only to a caller who may create price book entries: the flow inserts
 * each entry as the caller, so a sales rep, who reads books and edits none,
 * would only be refused product by product. The server's refusal is the gate
 * (a manager adding to a book they do not own is refused there and counted);
 * `visible` only stops offering a button that cannot succeed. No
 * `successMessage`: the flow carries the run's own.
 */
export const AddPriceBookProductsAction: Action = {
  name: 'add_price_book_products',
  label: 'Add Products',
  objectName: 'crm_price_book',
  icon: 'package-plus',
  type: 'flow',
  target: 'price_book_add_products',
  locations: ['record_header', 'record_more'],
  visible: P`current_user.can("crm_price_book_entry", "create")`,
  refreshAfter: true,
};
