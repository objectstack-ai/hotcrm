// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { defineStack } from '@objectstack/spec';

/**
 * `app.objectstack.hotcrm.o2c` — ORDER TO CASH (「订单与回款」), a standalone
 * app installed beside HotCRM (REQ-0007, `docs/architecture/order-to-cash-module-plan.md`).
 *
 * Born standalone (the plan's *Recorded 2026-10-26*, `module-split-plan.md`
 * items 10, 11 and 13): its own artifact, built from
 * `objectstack.o2c.config.ts`, and ⛔ never composed into the HotCRM artifact
 * (`objectstack.composition.ts` does not import this file). Phase 0 ships the
 * package and its seam into the app's menu; the objects are phase 1.
 *
 * Four properties are load-bearing:
 *
 *  - **`type: 'app'`** — the consumer-installable unit (ADR-0019 D2), so an
 *    administrator installs it on its own; a `type: 'module'` ships only
 *    inside an artifact.
 *  - **One dependency, `app.objectstack.hotcrm`** — and nothing else
 *    (`module-split-plan.md` item 10). The platform's pre-install check
 *    (ADR-0141 D2) refuses the install, `422 DEPENDENCY_MISSING`, on an
 *    environment that has no HotCRM inside the range.
 *  - **HotCRM's namespace, `crm`** — a declared dependency on the package that
 *    holds `crm` makes this package its co-owner at the install gate (ADR-0141
 *    D5), so the phase 1 objects keep the `crm_` prefix (`crm_invoice`, not
 *    `o2c_invoice`; AGENTS.md, Tech Stack rule 2).
 *  - **Its own version.** One version per artifact (ADR-0130 D6), and this is
 *    a different artifact: it does not move with HotCRM's.
 */
export const HotCrmO2cStack = defineStack({
  manifest: {
    id: 'app.objectstack.hotcrm.o2c',
    name: 'HotCRM Order to Cash',
    namespace: 'crm',
    version: '0.1.0',
    type: 'app',
    description: 'Order to Cash for HotCRM — the collection plan, invoice and payment status on a contract.',
    // The protocol HotCRM states (`src/sales/index.ts`); bump the two together.
    engines: { protocol: '^18.3.0' },
    dependencies: { 'app.objectstack.hotcrm': '^6.0.0' },

    /**
     * The one seam into HotCRM's menu (rule R2): the app keeps the
     * `group_order_to_cash` anchor (`src/sales/apps/crm.app.ts`) with no
     * children of its own, and this package fills it. Phase 0 contributes no
     * item yet — the objects the items open are phase 1.
     */
    navigationContributions: [
      { app: 'crm_enterprise', group: 'group_order_to_cash', priority: 50, items: [] },
    ],
  },
});
