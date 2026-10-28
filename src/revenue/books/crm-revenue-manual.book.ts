// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { defineBook } from '@objectstack/spec';

/**
 * The Revenue Manual (#2327) — the revenue module's own pages, from
 * `src/revenue/docs/`. A book of this package rather than a group of the app's
 * User Manual: the module can be uninstalled, and then this book, its entry
 * under *Help* (contributed in `src/revenue/index.ts`) and its pages leave
 * together. The app's pages never link here; these pages may link to the
 * app's.
 */
export const CrmRevenueManual = defineBook({
  name: 'crm_revenue_manual',
  label: 'HotCRM Revenue Manual',
  description: 'Quotes: what the system fills in for you and what it does on its own.',
  icon: 'receipt',
  order: 3,
  groups: [
    { key: 'revenue', label: 'Quotes', order: 1, include: 'crm_revenue_*' },
  ],
});
