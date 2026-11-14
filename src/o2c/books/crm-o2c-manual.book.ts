// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { defineBook } from '@objectstack/spec';

/**
 * The Order to Cash Manual (#2315) — the module's own pages, from
 * `src/o2c/docs/`. Built as the Marketing and Revenue Manuals are: a book of
 * this package, opened from *Help* by the entry `src/o2c/index.ts`
 * contributes, so the book, its entry and its pages leave together when a
 * tenant disables the module. The app's pages never link here; these pages
 * may link to the app's.
 */
export const CrmO2cManual = defineBook({
  name: 'crm_o2c_manual',
  label: 'HotCRM Order to Cash Manual',
  description: 'The collection plan, invoices and payments: what each figure counts, and who writes it.',
  icon: 'receipt',
  order: 5,
  groups: [
    { key: 'o2c', label: 'Order to Cash', order: 1, include: 'crm_o2c_*' },
  ],
});
