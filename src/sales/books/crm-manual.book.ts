// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { defineBook } from '@objectstack/spec';

/**
 * The User Manual (#2327) — what every member reads, opened from *Help* in the
 * app's navigation (`src/sales/apps/crm.app.ts`, `group_help`).
 *
 * A SPINE, not a list (ADR-0046 §6.2.1): each group names a rule, and a doc
 * whose name matches it files itself. A new `crm_sales_*` page lands under
 * Sales with no edit here; its place inside the group is its own `order:`
 * frontmatter.
 *
 * `audience` is left at the `'org'` default: every signed-in member. The
 * Admin Manual's pages stay out of this book on purpose — a doc's audience is
 * the UNION over the books that claim it (§6.7), so a group here matching
 * `crm_admin_*` would publish them to everyone.
 *
 * Getting Started is the one curated group (`pages`): the overview, then the
 * first-day page, then the assistant — an order a name glob cannot express
 * (#2329). Analytics files its pages by rule like Sales.
 *
 * Every module keeps a book of its own — Service (`src/service/books/`, #2415),
 * Revenue and Marketing — so this manual holds only the app package's pages.
 * ⛔ Do not reach into a module with a group `package`: that ties the group to
 * a package IDENTITY, which the hosted marketplace flattens away (cloud#3636).
 * The Service group did exactly that and showed empty on hosted, its pages
 * under UNCATEGORIZED (#2415).
 */
export const CrmManual = defineBook({
  name: 'crm_manual',
  label: 'HotCRM User Manual',
  description: 'How HotCRM works for sales: the rules behind the screens.',
  icon: 'book-open',
  order: 1,
  groups: [
    { key: 'start', label: 'Getting Started', order: 1, pages: ['crm_overview', 'crm_getting_started', 'crm_ai_skills'] },
    { key: 'sales', label: 'Sales', order: 2, include: 'crm_sales_*' },
    { key: 'analytics', label: 'Analytics', order: 3, include: 'crm_analytics_*' },
  ],
});
