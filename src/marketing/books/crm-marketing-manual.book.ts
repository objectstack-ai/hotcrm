// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { defineBook } from '@objectstack/spec';

/**
 * The Marketing Manual (#2330) — the marketing module's own pages, from
 * `src/marketing/docs/`. Built as the Revenue Manual is
 * (`src/revenue/books/crm-revenue-manual.book.ts`): a book of this package,
 * opened from *Help* by the entry `src/marketing/index.ts` contributes, so
 * the book, its entry and its pages leave together when the module is
 * uninstalled. The app's pages never link here; these pages may link to the
 * app's.
 */
export const CrmMarketingManual = defineBook({
  name: 'crm_marketing_manual',
  label: 'HotCRM Marketing Manual',
  description: 'Campaigns: what the numbers count, and what runs on its own.',
  icon: 'megaphone',
  order: 4,
  groups: [
    { key: 'marketing', label: 'Campaigns', order: 1, include: 'crm_marketing_*' },
  ],
});
