// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Seed helpers shared by every `*.seed.ts` family module.
 *
 * The seed data used to be one 100KB `src/data/index.ts`, which sat ~1.5KB
 * under the `pnpm hygiene` byte cap and turned the next demo record into a
 * build failure (#635). It is now split by object family — `catalog`, `sales`,
 * `service`, `marketing`, `revenue` — with `index.ts` reduced to the
 * aggregating `CrmSeedData` export. This module holds what more than one
 * family needs.
 */
import { cel } from '@objectstack/spec';

/**
 * A note on system-computed fields in seeds (#490, #617).
 *
 * ### Hooks DO run over seed writes — automations do not
 *
 * The seed loader writes with `{ isSystem: true, skipTriggers: true,
 * seedReplay: true }`, and the premise this file used to state — "hooks do NOT
 * run over seed rows" — was wrong (#617). Measured against 17.0.0-rc.1, and
 * matching `SeedLoaderService.SEED_OPTIONS`' own contract:
 *
 *   - `isSystem`   bypasses RBAC and DISABLES the security plugin's injection
 *                  of `organization_id` / `owner_id` — which is why seeded rows
 *                  land ownerless and `demo_bootstrap` has to claim them.
 *   - `skipTriggers` suppresses record-change AUTOMATION (autolaunched flows),
 *                  not lifecycle hooks. Seed data is pre-existing end state,
 *                  not a stream of user events.
 *   - `seedReplay` skips the `state_machine` entry/transition guards, so a
 *                  mid-lifecycle row (a `closed_won` deal) is accepted.
 *
 * Lifecycle HOOKS — derived fields, defaults, validation — still run. The boot
 * log shows them firing (`opportunity_amount_rollup`, `quote_total_rollup`),
 * and `crm_account.billing_country` / `crm_account.territory` are only ever
 * populated because `account_protection` derives them from `billing_address`
 * on the seed insert (#638, #639). `test/territory-seed-coverage.test.ts` pins that dependency.
 *
 * ### What that means for authoring
 *
 * The old conclusion survives the corrected premise, and is still the rule:
 *
 * 1. Seeding historical values into readonly fields (`created_date`,
 *    `stage_entry_date`, `last_contacted_date`, `actual_revenue`) is legitimate
 *    and load-bearing — it is the only way demo reports get history — and the
 *    platform explicitly preserves explicit seed values.
 * 2. Every seeded value of a hook-owned field MUST equal what the hook would
 *    compute (`is_closed` ⇔ status, `resolution_time_hours` ⇔ closed−created,
 *    opportunity `probability`/`forecast_category`/`expected_revenue` ⇔ stage,
 *    forecast `period_label` ⇔ period_start). Under the corrected premise a
 *    mismatch is rewritten immediately, at seed time, instead of on the first
 *    user edit — either way the demo does not show what was authored.
 * 3. A field the hook DERIVES and the schema marks `readonly` is not authored
 *    here at all (`crm_account.billing_country`, `crm_account.territory`):
 *    duplicating it would create a second source of truth for a value the hook
 *    already owns.
 *
 * Autonumber fields (`case_number`, `contract_number`, `quote_number`) are
 * NEVER seeded: the runtime owns those sequences (the SQL driver bootstraps
 * each counter past existing rows), so hand-numbering them only invites
 * drift. Upsert identity uses a natural key instead (subject / name /
 * description).
 */

/**
 * Build a CEL `daysAgo(N)` expression from a runtime number. Mirrors the
 * existing tagged-template usage (`cel\`daysAgo(N)\``) so we can produce
 * timestamps inside `.map()` generators without manufacturing fake template
 * string arrays.
 */
export const celDaysAgo = (n: number) => cel`daysAgo(${n})`;
export const celDaysFromNow = (n: number) => cel`daysFromNow(${n})`;

/**
 * A configured product line. `unit_price` is the NEGOTIATED price (what the
 * rep sold at); the catalog `list_price` is stamped separately from the
 * product record, exactly as the price-fill hook would.
 */
export type LineSpec = {
  readonly product: string;
  readonly quantity: number;
  readonly unit_price: number;
  /** Line-level discount %, defaults to 0. */
  readonly discount?: number;
  readonly description: string;
};

/** `quantity × unit_price × (1 − discount/100)`, rounded exactly as the rollup hooks round. */
export const lineTotal = (l: LineSpec): number =>
  Math.round(l.quantity * l.unit_price * (1 - (l.discount ?? 0) / 100) * 100) / 100;

export const linesTotal = (lines: readonly LineSpec[]): number =>
  Math.round(lines.reduce((sum, l) => sum + lineTotal(l), 0) * 100) / 100;
