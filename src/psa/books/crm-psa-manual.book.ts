// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { defineBook } from '@objectstack/spec';

/**
 * The Project Delivery Manual (#2316 phase 1c) — the module's own pages, from
 * `src/psa/docs/`. Built as the Order to Cash Manual is: a book of this
 * package, opened from the Project Delivery app's *Help*, so the book, its
 * entry and its pages leave together when a tenant disables the module. The
 * app's pages never link here; these pages may link to the app's.
 */
export const CrmPsaManual = defineBook({
  name: 'crm_psa_manual',
  label: 'HotCRM Project Delivery Manual',
  description: 'Projects, staffing, cost, approvals and the budget lock: what each figure counts, and who decides.',
  icon: 'briefcase',
  order: 6,
  groups: [
    { key: 'psa', label: 'Project Delivery', order: 1, include: 'crm_psa_*' },
  ],
});
