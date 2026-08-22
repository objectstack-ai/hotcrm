// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * The case SLA policy matrix — priority × account tier, in CALENDAR HOURS.
 *
 * # What this replaces
 *
 * Until #595 the only SLA rule in the app was "critical ⇒ now + 4h", hardcoded
 * in `case_sla_defaults`. Three of the four priorities therefore got NO
 * `sla_due_date` at all, which meant `case_sla_monitor` — the hourly sweep that
 * flags and escalates breaches — could never fire for them: it selects on
 * `sla_due_date < now`, and a blank date is never in the past. A High case
 * nobody touched entered neither the priority-escalation path nor the time
 * path. The field, the sweep and the four published per-priority targets were
 * all shipped; only the clock behind three of them was missing.
 *
 * `crm_account.tier` was the other half of the same gap: four options declared
 * on the account object and read by nothing outside `src/views/account.view.ts`.
 *
 * # ⚠️ CALENDAR HOURS, NOT BUSINESS HOURS
 *
 * Every number below is added to the WALL CLOCK. This app ships no
 * business-hours calendar, no working-day definition and no holiday list —
 * there is nothing in its metadata a deadline could be counted against, and
 * the platform provides no such service either. So a P1 raised at 5pm on a
 * Friday is due at 9pm that same Friday, and a Low case raised on the 23rd of
 * December runs its week down over the holidays.
 *
 * This is stated rather than hidden because it is the single most likely way
 * for these numbers to be misread. Teaching the deadline to skip non-working
 * time means teaching this module a calendar — it is not a matter of changing
 * a cell.
 *
 * # Why the `critical` row is flat
 *
 * Every cell in the `critical` row is 4 — deliberately, and it is the one
 * constraint on this table that is not a product opinion. Before #595 EVERY
 * critical case got 4 hours regardless of tier. Differentiating the row by
 * tier would LOOSEN the deadline on the critical cases of non-strategic
 * accounts, i.e. this change would take a clock away from work that already
 * had one. Flat at 4 keeps the new behaviour a strict superset of the old:
 * every case that had a due date still gets the same one, and three whole
 * priorities gain one. (The ruling on #595 asks for 4h as the *strategic*
 * cell; holding the rest of the row to it too is what makes "superset" true
 * rather than approximately true.)
 *
 * The remaining rows never exceed the per-priority target the user docs have
 * always published (High 8h, Medium 2 days = 48h, Low 7 days = 168h) — the
 * lowest tier gets exactly that commitment and the higher tiers get tighter.
 * No account is worse off at any priority than the docs already promised.
 *
 * # Where this constant is, and is not, the source of truth
 *
 * The hook body in `case.hook.ts` carries a HAND-COPIED mirror of this table
 * and cannot import it: L2 hook bodies run body-only in the QuickJS sandbox,
 * so a module constant resolves at authoring time and arrives as `undefined`
 * at runtime (see `_line-item-price-fill.ts`, and the same forced duplication
 * behind `test/priority-rank-parity.test.ts`). `src/data/service.seed.ts`
 * imports this module for real — seeds are authored-time data and hooks do not
 * run over them, so the seeded due dates have to be right on arrival.
 *
 * `test/case-sla-matrix.test.ts` is what keeps the two copies honest: it pins
 * all sixteen cells by DRIVING the shipped hook handler, so changing a cell in
 * either place without the other fails the suite.
 */

/** The four `crm_account.tier` options, tightest service level first. */
export const CASE_SLA_TIERS = ['strategic', 'enterprise', 'mid_market', 'smb'] as const;
export type CaseSlaTier = (typeof CASE_SLA_TIERS)[number];

/** The four `crm_case.priority` options that carry a clock. */
export const CASE_SLA_PRIORITIES = ['critical', 'high', 'medium', 'low'] as const;
export type CaseSlaPriority = (typeof CASE_SLA_PRIORITIES)[number];

/**
 * Tier used when the case names no account, or the account's tier is blank, or
 * the reader cannot see the account row (guest intake through the web form is
 * the ordinary case — it can create a case and read nothing else).
 *
 * `smb` is the loosest column AND the `defaultValue` the account object already
 * declares for `tier`, so an unreadable account is treated exactly like an
 * account nobody has classified. Erring loose is the safe direction: a deadline
 * invented tighter than the customer's contract would manufacture breaches out
 * of a permission error.
 */
export const CASE_SLA_DEFAULT_TIER: CaseSlaTier = 'smb';

/** Hours from case creation to `sla_due_date`, by priority and account tier. */
export const CASE_SLA_HOURS: Record<CaseSlaPriority, Record<CaseSlaTier, number>> = {
  //           strategic  enterprise  mid_market  smb
  critical: { strategic: 4, enterprise: 4, mid_market: 4, smb: 4 },
  high: { strategic: 6, enterprise: 8, mid_market: 8, smb: 8 },
  medium: { strategic: 24, enterprise: 36, mid_market: 48, smb: 48 },
  low: { strategic: 96, enterprise: 120, mid_market: 168, smb: 168 },
};

/** Look a cell up with the documented fallbacks. Unknown priority ⇒ no clock. */
export function caseSlaHours(priority: string, tier?: string | null): number | undefined {
  const row = CASE_SLA_HOURS[priority as CaseSlaPriority];
  if (!row) return undefined;
  return row[tier as CaseSlaTier] ?? row[CASE_SLA_DEFAULT_TIER];
}
