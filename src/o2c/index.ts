// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { defineStack, type ObjectStackDefinition } from '@objectstack/spec';

import { CrmO2cManual } from './books/index.js';
import { InvoiceImportMapping, PaymentImportMapping } from './mappings/index.js';
import { BillingMilestone, Invoice, Payment } from './objects/index.js';
import { billingMilestoneHook, invoiceHook, paymentHook } from './objects/hooks.js';
import { O2cTranslations } from './translations/index.js';
import { BillingMilestoneViews, InvoiceViews, PaymentViews } from './views/index.js';

/**
 * This package's hooks, for the artifact-wide sweeps (`allHooks` in
 * `objectstack.composition.ts`) — see `serviceHooks` in
 * `src/service/index.ts` for the arrangement. Every one attaches to a module
 * object (ADR-0130 R4).
 */
export const o2cHooks = [billingMilestoneHook, invoiceHook, paymentHook].flat();

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
 * finance's in the app's `ar_accountant` set. The contract and account totals
 * (`objectExtensions`) are #2416, which waits on objectstack#30303 and #30304.
 *
 * Packaged exactly as `src/service/index.ts` is; that file carries the
 * reasoning for `namespace`, `dependencies`, the absent `i18n` and the
 * artifact's version.
 */
export const createHotCrmO2cStack = (): ObjectStackDefinition => defineStack({
  manifest: {
    id: 'app.objectstack.hotcrm.o2c',
    name: 'HotCRM Order to Cash',
    // The app package's namespace, deliberately (ADR-0130 D1).
    namespace: 'crm',
    // The ARTIFACT's version (ADR-0130 D6) — `test/docs-declared-versions.test.ts`
    // holds it, and the range below, to the app package's.
    version: '6.1.0',
    type: 'module',
    description: 'HotCRM order-to-cash module — the collection plan, invoice and payment status on a contract.',
    engines: { protocol: '^18.3.0' },
    // The App package this module extends, and nothing else
    // (`module-split-plan.md` item 10: one dependency level).
    dependencies: { 'app.objectstack.hotcrm': '^6.1.0' },

    /**
     * The module's seam into the app's menu (rule R2): the app keeps the
     * `group_order_to_cash` anchor (`src/sales/apps/crm.app.ts`) with no
     * children of its own, and this module fills it; and its manual under the
     * app's *Help* group, as the revenue and marketing modules contribute
     * theirs. Both leave with the module.
     */
    navigationContributions: [
      {
        app: 'crm_enterprise',
        group: 'group_order_to_cash',
        priority: 50,
        items: [
          { id: 'nav_billing_milestones', type: 'object', objectName: 'crm_billing_milestone', label: 'Billing Milestones', icon: 'flag' },
          { id: 'nav_invoices', type: 'object', objectName: 'crm_invoice', label: 'Invoices', icon: 'receipt' },
          { id: 'nav_payments', type: 'object', objectName: 'crm_payment', label: 'Payments', icon: 'banknote' },
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

  objects: [BillingMilestone, Invoice, Payment],
  hooks: o2cHooks,
  views: [BillingMilestoneViews, InvoiceViews, PaymentViews],
  mappings: [InvoiceImportMapping, PaymentImportMapping],
  // Its manual (#2315), over `src/o2c/docs/`. See the book's own note.
  books: [CrmO2cManual],
  translations: [O2cTranslations],
});
