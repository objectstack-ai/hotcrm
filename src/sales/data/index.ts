// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Sales seed data, and the composition knob every package's rows are selected
 * by.
 *
 * The rows themselves are authored per object family in the `*.seed.ts`
 * modules beside this file; `objectstack.config.ts` collects all four
 * packages' families into the single ordered `CrmSeedData` array it registers.
 * That assembly is NOT here, and cannot be: it names `crm_product`,
 * `crm_case`, `crm_campaign` and the rest, which are other packages' objects,
 * and a sales file may import from its own directory or from `src/sales/` only
 * (plan item 7). The ORDER it assembles in is load-bearing — rows reference
 * rows seeded earlier — so it lives in the one file that can see all four.
 *
 * Where to add a row follows from the object:
 *
 *   - `_shared.ts`        seed doctrine + helpers every package's rows use
 *   - `sales.seed.ts`     accounts, contacts, leads, opportunities
 *   - `activity.seed.ts`  tasks, events, event attendees
 *   - `forecast.seed.ts`  forecast snapshots
 *   - `src/revenue/data/` products, opportunity lines, contracts, quotes, quote lines
 *   - `src/service/data/` cases, knowledge articles
 *   - `src/marketing/data/` campaigns, campaign members
 */
export { accounts, contacts, leads, opportunities, OPPORTUNITY_LINES } from './sales.seed';
export { tasks, events, eventAttendeesFromContacts, eventAttendeesFromLeads } from './activity.seed';
export { forecasts } from './forecast.seed';
export { celDaysAgo, celDaysFromNow, lineTotal, linesTotal, type LineSpec } from './_shared';

// ─────────────────────────────────────── the SaaS / multi-org composition ──

/**
 * Which SHAPE of this app a build assembles (#1361).
 *
 * `default` is the community/single-org app and is what every build produces
 * unless something asks otherwise — the demo org, its storytelling data, and
 * the `demo_bootstrap` sweep that binds that data to the first user.
 *
 * `saas` is the shape a multi-org operator deploys on the enterprise runtime
 * under a walled tenancy posture (`OS_TENANCY_POSTURE=isolated`). The two
 * differ ONLY by what the composition registers; no code branches at runtime,
 * nothing is decided per tenant, and no enterprise package is imported. See
 * {@link SaasTenantSeedData} for why the seed set shrinks and
 * `objectstack.config.ts` for the flow/permission halves.
 */
export type HotCrmComposition = 'default' | 'saas';

/** The environment variable {@link resolveComposition} reads. */
export const COMPOSITION_ENV_VAR = 'HOTCRM_COMPOSITION';

/** Every value {@link resolveComposition} accepts, for diagnostics and tests. */
export const HOTCRM_COMPOSITIONS: readonly HotCrmComposition[] = ['default', 'saas'];

/**
 * Resolve the composition from the environment — and REFUSE anything else.
 *
 * The refusal is the point, and it is why this is a function rather than a
 * `=== 'saas'` comparison at the one call site. The failure mode a silent
 * default produces is not "the build is a bit wrong": `HOTCRM_COMPOSITION=sass`
 * would assemble the FULL demo union, and the operator would only find out when
 * every tenant they onboard receives nine accounts named after other people's
 * companies — a data-shape mistake that is expensive to unwind once tenants
 * have edited those rows. An unrecognised value therefore throws at
 * config-load time, where a build fails loudly and nothing has shipped.
 *
 * Unset and empty both mean `default`, deliberately: "no opinion" is the
 * community app, so no existing build, script or CI job changes behaviour by
 * saying nothing (`pnpm build`, `objectstack validate`, the cloud EE rigs'
 * `scripts/build-hotcrm-artifact.sh`).
 */
export function resolveComposition(
  raw: string | undefined = process.env[COMPOSITION_ENV_VAR],
): HotCrmComposition {
  const value = (raw ?? '').trim();
  if (value === '') return 'default';
  if ((HOTCRM_COMPOSITIONS as readonly string[]).includes(value)) {
    return value as HotCrmComposition;
  }
  throw new Error(
    `${COMPOSITION_ENV_VAR}="${value}" is not a HotCRM composition. ` +
      `Expected one of: ${HOTCRM_COMPOSITIONS.join(', ')} (or leave it unset for 'default').`,
  );
}
