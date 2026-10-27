// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { defineStack, type ObjectStackDefinition, type ObjectStackDefinitionInput } from '@objectstack/spec';

import { RevenueEmailTemplates } from './email-templates/index.js';
import { ProductDataset } from './datasets/index.js';
import { QuoteExpirationFlow, QuoteGenerationFlow } from './flows/index.js';
import {
  OpportunityLineItem, PriceBook, PriceBookEntry, Product, Quote, QuoteLineItem,
} from './objects/index.js';
import {
  opportunityLineItemHook, priceBookEntryHook, priceBookHook, productHook, quoteHook, quoteLineItemHook,
} from './objects/hooks.js';
import { ProductViews, QuoteViews } from './views/index.js';

/**
 * The collections of this package that the artifact-wide sweeps also read,
 * named once, here — the same arrangement as `src/service/index.ts`'s
 * `serviceHooks` / `serviceFlows`: `objectstack.composition.ts` assembles
 * `allHooks` and `allFlows` out of each package's own list, so this package's
 * half of them is the very array its stack registers. `.flat()` because a
 * `*.hook.ts` may default-export an ARRAY of hooks.
 */
export const revenueHooks = [
  opportunityLineItemHook, priceBookHook, priceBookEntryHook, productHook, quoteHook, quoteLineItemHook,
].flat();

/**
 * This package's flows — see {@link revenueHooks}.
 *
 * `quote_generation` is launched by an app-package action (`generate_quote`
 * on `crm_opportunity`); the app stack resolves that target through
 * `artifactFlows` (see `src/sales/index.ts`).
 */
export const revenueFlows = [QuoteExpirationFlow, QuoteGenerationFlow];

/**
 * What this package registers but does not assemble: its seed rows, which the
 * `HOTCRM_COMPOSITION` knob selects at the root (#1361). Under `saas` this is
 * the one package that registers any — the product catalogue is a revenue
 * family. See `seedDataFor` in `objectstack.composition.ts`.
 */
export type HotCrmRevenueCollections = Pick<ObjectStackDefinitionInput, 'data'>;

/**
 * `app.objectstack.hotcrm.revenue` — the REVENUE module of this artifact
 * (ADR-0130 D4, `module-split-plan.md` decision 5): the unit ADR-0130 §1.3(c)
 * says must be sellable on its own.
 *
 * It owns `crm_product`, `crm_price_book`, `crm_price_book_entry`,
 * `crm_opportunity_line_item`, `crm_quote` and `crm_quote_line_item`, and the
 * items authored against them: their hooks and views, the quote-generation
 * and quote-expiry flows, the `product_metrics` dataset, the quote
 * notification template and their seed rows. `crm_contract` and everything authored against it — hook, views, the
 * three contract flows, the `payment_terms` option list, the two contract
 * notification templates and the contract seed rows — moved to the app
 * package (`module-split-plan.md` item 11): the contract references only
 * app-package objects, and O2C and PSA hang off it, so it lives where every
 * add-on can reach it in one dependency level. The quote-accepted contract
 * draft (`quote_accepted_contract_draft`) is now a write along this module's
 * edge into the app package.
 *
 * Two of them are reached from the app package: `quote_generation` (see
 * {@link revenueFlows}) and `product_metrics`, which the app's CRM Overview
 * Top Products tile binds — a widget reference `os validate` resolves against
 * the artifact's packages since objectstack#25514.
 *
 * It is packaged exactly as `src/service/index.ts` is, and that file carries
 * the reasoning for each load-bearing property — the app package's
 * `namespace`, `dependencies` as the edge, no `i18n`, and a `requires` of this
 * package's own. What stays in the app package although it reads these
 * objects: the permission sets (whole by the ADR-0130 2026-09-02 addendum),
 * the CRM Overview dashboard, and the opportunity record page that lists
 * quotes and line items.
 */
export const createHotCrmRevenueStack = (
  collections: HotCrmRevenueCollections,
): ObjectStackDefinition => defineStack({
  manifest: {
    id: 'app.objectstack.hotcrm.revenue',
    name: 'HotCRM Revenue',
    // The app package's namespace, deliberately (ADR-0130 D1).
    namespace: 'crm',
    // The ARTIFACT's version (ADR-0130 D6) — `test/docs-declared-versions.test.ts`
    // holds it, and the range below, to the app package's.
    version: '6.0.0',
    type: 'module',
    description: 'HotCRM revenue module — products, price books, opportunity line items and quotes.',
    engines: { protocol: '^18.2.0' },
    // The App package this module extends — and nothing else: the graph is a
    // star (plan decision 5), ⛔ no edge to another module.
    dependencies: { 'app.objectstack.hotcrm': '^6.0.0' },

    /**
     * The three entries this module puts into the app's Sales group.
     *
     * Rule R3: the app's own `navigation` may not name this package's objects,
     * so the group stays the app's and this module fills it. A contributed item
     * lands after the group's own children, so Quotes, Products and Price
     * Books follow Sales Performance and Contracts (#2270) — the same rule that
     * put My Cases last in *My Work* (#1907). Contracts is the app's own entry since
     * `crm_contract` moved there (`module-split-plan.md` item 11). ⛔ No
     * per-item `order` to restore the old position: see the navigation note in
     * `src/service/index.ts`.
     */
    navigationContributions: [
      {
        app: 'crm_enterprise',
        group: 'group_sales',
        priority: 40,
        items: [
          { id: 'nav_quote',    type: 'object', objectName: 'crm_quote',    label: 'Quotes',    icon: 'receipt' },
          // In Sales, not Marketing (#1259): products are the revenue master
          // data every quote line and opportunity line item points at.
          { id: 'nav_product',  type: 'object', objectName: 'crm_product',  label: 'Products',  icon: 'package' },
          // The catalogue's prices, beside it (#2313). Its entries are reached
          // through their book, as a line item is through its quote.
          { id: 'nav_price_book', type: 'object', objectName: 'crm_price_book', label: 'Price Books', icon: 'book-open' },
        ],
      },
    ],
  },

  // What THIS package's metadata needs: `automation` and `triggers` for the
  // scheduled quote-expiry flow, `analytics` for `product_metrics` — each
  // refused by name when deleted.
  requires: ['automation', 'triggers', 'analytics'],

  objects: [OpportunityLineItem, PriceBook, PriceBookEntry, Product, Quote, QuoteLineItem],
  hooks: revenueHooks,
  views: [ProductViews, QuoteViews],
  flows: revenueFlows,
  datasets: [ProductDataset],
  emailTemplates: RevenueEmailTemplates,

  ...collections,
});
