// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { defineStack, type ObjectStackDefinition } from '@objectstack/spec';

import { PsaApp } from './apps/index.js';
import { PsaTranslations } from './translations/index.js';

/**
 * `app.objectstack.hotcrm.psa` — the PROJECT DELIVERY module (PSA,
 * 「项目交付」) of this artifact (REQ-0002, `docs/architecture/psa-module-plan.md`,
 * hotcrm#2316).
 *
 * A `type: 'module'` package shipped inside the one HotCRM artifact, as
 * `src/o2c/` is, and switched on or off per tenant through the platform's
 * package disable. The maintainer ruled the shape on 2026-11-15 (the plan's
 * *Recorded 2026-11-15*, option A): a suite module with its own app, depending
 * on the app package only. A separately built artifact cannot hold a lookup
 * into a HotCRM object (`object-reference-unknown`, objectstack#25805 closed
 * not planned), and a project is a child of an account, an opportunity and a
 * contract.
 *
 * Phase 0 joins the suite: the manifest, the Project Delivery app skeleton
 * (`./apps/`) and its labels. It owns no object, hook or seed row yet; phase 1
 * adds the six v1 objects (project, member, rate card, timesheet and its
 * entries, expense), their approvals and the cost and margin roll-ups. Their
 * grants will be rows in the app package's permission sets (ADR-0130 addendum,
 * 2026-09-02).
 *
 * Packaged exactly as `src/service/index.ts` is; that file carries the
 * reasoning for `namespace`, `dependencies`, the absent `i18n` and the
 * artifact's version.
 */
export const createHotCrmPsaStack = (): ObjectStackDefinition => defineStack({
  manifest: {
    id: 'app.objectstack.hotcrm.psa',
    name: 'HotCRM Project Delivery',
    // The app package's namespace, deliberately (ADR-0130 D1).
    namespace: 'crm',
    // The ARTIFACT's version (ADR-0130 D6) — `test/docs-declared-versions.test.ts`
    // holds it, and the range below, to the app package's.
    version: '6.2.1',
    type: 'module',
    description: 'HotCRM project delivery module — projects, staffing, time, expenses and delivery margin.',
    engines: { protocol: '^18.4.0' },
    // The App package this module extends, and nothing else
    // (`module-split-plan.md` item 10: one dependency level). No dependency
    // on Order to Cash: how the two connect is decided in phase 3 (ruling 4).
    dependencies: { 'app.objectstack.hotcrm': '^6.2.1' },
  },

  // The delivery team's app; see the app's own note.
  apps: [PsaApp],
  translations: [PsaTranslations],
});
