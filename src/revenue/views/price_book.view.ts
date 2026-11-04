// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { defineView } from '@objectstack/spec/ui';

/**
 * Price Book Views (REQ-0009 phase 3, #2318)
 *
 *   • grid — every price book: which one is standard, which are active, and
 *     the window each is meant for. Inline edit, as every grid here: a rep
 *     reads books and edits none, and the grant, not the grid, decides.
 *
 * No "active books" list view: a list filter wants a form field that sets it
 * (`test/metadata-references.test.ts`), and this object's form is derived,
 * not enumerated. The Active column, and the quote's own picker, which offers
 * only active books, carry that.
 *
 * No form is authored: the form and the record page derive from the object's
 * `fieldGroups` (AGENTS.md, escape hatches). A book's prices are its entries,
 * listed on its record page through the entry's master-detail
 * (`crm_price_book_entry.crm_price_book`, `relatedListColumns`), and added in
 * bulk by the Add Products action (`price_book_add_products`).
 */
export const PriceBookViews = defineView({
  list: {
    type: 'grid',
    name: 'all_price_books',
    label: 'All Price Books',
    userActions: { editInline: true },
    data: { provider: 'object', object: 'crm_price_book' },
    columns: [
      { field: 'name', width: 240, link: true, pinned: 'left', sortable: true },
      { field: 'is_standard', width: 110, align: 'center' },
      { field: 'is_active', width: 100, align: 'center' },
      { field: 'valid_from', width: 130, sortable: true },
      { field: 'valid_to', width: 130, sortable: true },
      { field: 'description', width: 320 },
    ],
    sort: [{ field: 'name', order: 'asc' }],
    pagination: { pageSize: 50 },
  },
});
