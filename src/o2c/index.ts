// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { defineStack, type ObjectStackDefinition } from '@objectstack/spec';

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
 * Packaged exactly as `src/service/index.ts` is; that file carries the
 * reasoning for `namespace`, `dependencies`, the absent `i18n` and the
 * artifact's version. Phase 0 ships the package and its seam into the app's
 * menu; the objects, and their entries in the group below, are phase 1.
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
     * The one seam into the app's menu (rule R2): the app keeps the
     * `group_order_to_cash` anchor (`src/sales/apps/crm.app.ts`) with no
     * children of its own, and this module fills it. No item yet — the
     * objects the items open are phase 1.
     */
    navigationContributions: [
      { app: 'crm_enterprise', group: 'group_order_to_cash', priority: 50, items: [] },
    ],
  },
});
