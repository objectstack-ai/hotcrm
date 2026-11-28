// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { defineStack, type ObjectStackDefinition, type ObjectStackDefinitionInput } from '@objectstack/spec';

import { O2cApp } from './apps/index.js';
import { CrmO2cManual } from './books/index.js';
import { ContractAccountExtensions, SalesOrderExtensions } from './extensions/index.js';
import { SalesOrderAmountPlanStepFlow, SalesOrderConfirmedPlanStepFlow, SalesOrderContractFillFlow } from './flows/index.js';
import { InvoiceImportMapping, PaymentImportMapping } from './mappings/index.js';
import { BillingMilestone, Invoice, Payment } from './objects/index.js';
import { billingMilestoneHook, invoiceHook, paymentHook } from './objects/hooks.js';
import { O2cTranslations } from './translations/index.js';
import { O2cFlowStepTranslations } from './translations/flow-steps.js';
import { BillingMilestoneViews, InvoiceViews, PaymentViews } from './views/index.js';

/**
 * This package's hooks, for the artifact-wide sweeps (`allHooks` in
 * `objectstack.composition.ts`) — see `serviceHooks` in
 * `src/service/index.ts` for the arrangement. Every one attaches to a module
 * object (ADR-0130 R4).
 */
export const o2cHooks = [billingMilestoneHook, invoiceHook, paymentHook].flat();

/**
 * This package's flows — see {@link o2cHooks}: the one that passes an order's
 * contract, set after the rows were saved, to the order's rows (hotcrm#2724),
 * and the two that give a confirmed order a payment plan step and keep a lone
 * step at the order's total (hotcrm#2806). Each starts on the app package's
 * `crm_sales_order`, along this manifest's dependency on it; see each flow's
 * own note.
 */
export const o2cFlows = [SalesOrderContractFillFlow, SalesOrderConfirmedPlanStepFlow, SalesOrderAmountPlanStepFlow];

/**
 * `app.objectstack.hotcrm.o2c` — the ORDER TO CASH module (「订单与回款」) of
 * this artifact (REQ-0007, `docs/architecture/order-to-cash-module-plan.md`).
 *
 * A `type: 'module'` package shipped inside the one HotCRM artifact, as
 * `src/revenue/` and `src/marketing/` are, and switched on or off per tenant
 * through the platform's package disable — the plan's *Recorded 2026-11-05*
 * section, which supersedes the 2026-10-26 "born standalone" line: on 18.3.0
 * a separately built app cannot hold a lookup or master-detail into a HotCRM
 * object (`object-reference-unknown`), and the collection plan, invoices and
 * payments are master-details of `crm_contract`.
 *
 * Phase 1a (#2315) ships the module's own three objects — the collection plan
 * (`crm_billing_milestone`), `crm_invoice` and `crm_payment` — with their
 * hooks, views, import mappings, translations and manual. Their grants are
 * rows in the app package's permission sets (ADR-0130 addendum, 2026-09-02),
 * finance's in the app's `ar_accountant` set. Phase 1b (#2416) adds the
 * contract and account totals through `objectExtensions`
 * (`./extensions/`), on 18.4.0, which carries objectstack#30303 and #30304.
 * Since hotcrm#2465 the module declares its own app, Order to Cash, where
 * finance works; the Sales app keeps only the collection plan.
 *
 * Packaged exactly as `src/service/index.ts` is; that file carries the
 * reasoning for `namespace`, `dependencies`, the absent `i18n` and the
 * artifact's version.
 */
/**
 * What the composition hands this package: its seed families, cut out of the
 * artifact's ordered union (`O2cSeedData` in `objectstack.composition.ts`,
 * #2529).
 */
export type HotCrmO2cCollections = Pick<ObjectStackDefinitionInput, 'data'>;

export const createHotCrmO2cStack = (
  collections: HotCrmO2cCollections = {},
): ObjectStackDefinition => defineStack({
  manifest: {
    id: 'app.objectstack.hotcrm.o2c',
    name: 'HotCRM Order to Cash',
    // The app package's namespace, deliberately (ADR-0130 D1).
    namespace: 'crm',
    // The ARTIFACT's version (ADR-0130 D6) — `test/docs-declared-versions.test.ts`
    // holds it, and the range below, to the app package's.
    version: '6.7.0',
    type: 'module',
    description: 'HotCRM order-to-cash module — the collection plan, invoice and payment status on a contract.',
    engines: { protocol: '^19.0.0-next.2' },
    // The App package this module extends, and nothing else
    // (`module-split-plan.md` item 10: one dependency level).
    dependencies: { 'app.objectstack.hotcrm': '^6.7.0' },

    /**
     * The module's seam into the Sales app (rule R2). Finance works in this
     * module's own app (`./apps/o2c.app.ts`, hotcrm#2465); the Sales app keeps
     * only the collection plan, which the reps and managers write: the app
     * keeps the `group_collection_plan` anchor (`src/sales/apps/crm.app.ts`)
     * with no children of its own, and this module fills it. The manual
     * stays under the Sales app's *Help* group too, for those who write the
     * plan. Both leave with the module, as the app does.
     */
    navigationContributions: [
      {
        app: 'crm_enterprise',
        group: 'group_collection_plan',
        priority: 50,
        items: [
          { id: 'nav_billing_milestones', type: 'object', objectName: 'crm_billing_milestone', label: 'Payment Plans', icon: 'flag' },
        ],
      },
      {
        app: 'crm_enterprise',
        group: 'group_help',
        priority: 50,
        items: [
          { id: 'nav_help_o2c', type: 'doc', book: 'crm_o2c_manual', label: 'Order to Cash Manual', icon: 'receipt' },
        ],
      },
    ],
  },

  // What THIS package's metadata needs (see `requires` in
  // `src/service/index.ts`): `automation` and `triggers` for the record-change
  // flow (hotcrm#2724).
  requires: ['automation', 'triggers'],

  // Finance's app (hotcrm#2465); see the app's own note.
  apps: [O2cApp],
  objects: [BillingMilestone, Invoice, Payment],
  // The contract's and the account's receivables figures (#2416), and the
  // order's planned, invoiced and received (hotcrm#2560); see each
  // extension's own note.
  objectExtensions: [...ContractAccountExtensions, ...SalesOrderExtensions],
  hooks: o2cHooks,
  flows: o2cFlows,
  views: [BillingMilestoneViews, InvoiceViews, PaymentViews],
  mappings: [InvoiceImportMapping, PaymentImportMapping],
  // Its manual (#2315), over `src/o2c/docs/`. See the book's own note.
  books: [CrmO2cManual],
  translations: [O2cTranslations, O2cFlowStepTranslations],
  // The demo collection plan, invoices and payments (#2529), registered by
  // the package that owns their objects; see `src/o2c/data/o2c.seed.ts`.
  data: collections.data,
});
