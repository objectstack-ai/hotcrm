// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { defineStack, type ObjectStackDefinition, type ObjectStackDefinitionInput } from '@objectstack/spec';

import { RevenueEmailTemplates } from './email-templates/index.js';
import {
  ContractRenewalFlow, QuoteExpirationFlow, ContractExpirationFlow, BillingHandoffContractActivatedFlow,
} from './flows/index.js';
import { Contract, OpportunityLineItem, Product, Quote, QuoteLineItem } from './objects/index.js';
import {
  contractHook, opportunityLineItemHook, productHook, quoteHook, quoteLineItemHook,
} from './objects/hooks.js';
import { PaymentTermsPicklist } from './picklists/index.js';
import { ContractViews, ProductViews, QuoteViews } from './views/index.js';

/**
 * The collections of this package that the artifact-wide sweeps also read,
 * named once, here — the same arrangement as `src/service/index.ts`'s
 * `serviceHooks` / `serviceFlows`: `objectstack.composition.ts` assembles
 * `allHooks` and `allFlows` out of each package's own list, so this package's
 * half of them is the very array its stack registers. `.flat()` because a
 * `*.hook.ts` may default-export an ARRAY of hooks.
 */
export const revenueHooks = [
  contractHook, opportunityLineItemHook, productHook, quoteHook, quoteLineItemHook,
].flat();

/**
 * This package's flows — see {@link revenueHooks}.
 *
 * ⚠️ `quote_generation` is NOT here although its file is: the app package
 * registers it, because the sales action that launches it (`generate_quote`
 * on `crm_opportunity`) is refused by `defineStack` when the flow it names
 * belongs to another package of the artifact (objectstack#25514). Maintainer
 * ruling 2026-10-24 on #2270, option 1: keep it in the app package until a
 * published platform release carries that fix, then register it here. See
 * `appRegisteredModuleItems` in `objectstack.composition.ts`.
 */
export const revenueFlows = [
  ContractRenewalFlow, QuoteExpirationFlow, ContractExpirationFlow, BillingHandoffContractActivatedFlow,
];

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
 * It owns `crm_product`, `crm_opportunity_line_item`, `crm_quote`,
 * `crm_quote_line_item` and `crm_contract`, and the items authored against
 * them: their hooks and views, the `payment_terms` option list, the contract
 * and quote-expiry flows, the quote and contract notification templates and
 * their seed rows.
 *
 * Two items authored here are registered by the app package for now —
 * `quote_generation` (see {@link revenueFlows}) and `product_metrics`, which
 * the app's CRM Overview dashboard binds: `os validate` judges each package
 * alone and refuses a widget naming another package's dataset
 * (objectstack#25514). Both move here once a published release carries that
 * fix (maintainer ruling 2026-10-24 on #2270).
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
    description: 'HotCRM revenue module — products, opportunity line items, quotes, and contracts.',
    engines: { protocol: '^18.0.0' },
    // The App package this module extends — and nothing else: the graph is a
    // star (plan decision 5), ⛔ no edge to another module.
    dependencies: { 'app.objectstack.hotcrm': '^6.0.0' },

    /**
     * The three entries this module puts into the app's Sales group.
     *
     * Rule R3: the app's own `navigation` may not name this package's objects,
     * so the group stays the app's and this module fills it. A contributed item
     * lands after the group's own children, so Quotes, Contracts and Products
     * now follow Sales Performance (#2270) — the same rule that put My Cases
     * last in *My Work* (#1907). ⛔ No per-item `order` to restore the old
     * position: see the navigation note in `src/service/index.ts`.
     */
    navigationContributions: [
      {
        app: 'crm_enterprise',
        group: 'group_sales',
        priority: 40,
        items: [
          { id: 'nav_quote',    type: 'object', objectName: 'crm_quote',    label: 'Quotes',    icon: 'receipt' },
          // Contracts close the sales cycle: quote → signed agreement → renewal.
          { id: 'nav_contract', type: 'object', objectName: 'crm_contract', label: 'Contracts', icon: 'file-signature' },
          // In Sales, not Marketing (#1259): products are the revenue master
          // data every quote line and opportunity line item points at.
          { id: 'nav_product',  type: 'object', objectName: 'crm_product',  label: 'Products',  icon: 'package' },
        ],
      },
    ],
  },

  // What THIS package's metadata needs: `automation` and `triggers` for the
  // record-change and scheduled contract and quote flows — each refused by
  // name when deleted. (`analytics` joins when `product_metrics` registers
  // here.)
  requires: ['automation', 'triggers'],

  objects: [Contract, OpportunityLineItem, Product, Quote, QuoteLineItem],
  picklists: [PaymentTermsPicklist],
  hooks: revenueHooks,
  views: [ContractViews, ProductViews, QuoteViews],
  flows: revenueFlows,
  emailTemplates: RevenueEmailTemplates,

  ...collections,
});
