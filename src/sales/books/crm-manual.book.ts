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
 * The Service group reaches into the service module through `package`: its
 * docs live in `src/service/docs/` and belong to that package, and a group
 * rule matches only its own book's package unless it names another. Revenue
 * keeps a book of its own (`src/revenue/books/`), because the module can be
 * uninstalled and the app's manual must not depend on it.
 */
export const CrmManual = defineBook({
  name: 'crm_manual',
  label: 'HotCRM User Manual',
  description: 'How HotCRM works for sales and service: the rules behind the screens.',
  icon: 'book-open',
  order: 1,
  groups: [
    { key: 'start', label: 'Getting Started', order: 1, pages: ['crm_overview', 'crm_getting_started', 'crm_ai_skills'] },
    { key: 'sales', label: 'Sales', order: 2, include: 'crm_sales_*' },
    { key: 'service', label: 'Service', order: 3, include: 'crm_service_*', package: 'app.objectstack.hotcrm.service' },
    { key: 'analytics', label: 'Analytics', order: 4, include: 'crm_analytics_*' },
  ],
});
