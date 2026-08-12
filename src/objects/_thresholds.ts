// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Commercial governance thresholds — the money lines this app draws, authored
 * ONCE (#599).
 *
 * ### What this replaces
 *
 * "What counts as a large deal" was answered by four independent numeric
 * literals sitting in three files, with nothing joining them:
 *
 * | site | literal |
 * | --- | --- |
 * | `flows/opportunity-approval.flow.ts` start condition (both the update and the insert twin share it) | `record.amount > 100000` |
 * | `flows/opportunity-won-alert.flow.ts` start condition | `record.amount > 100000` |
 * | `sharing/opportunity.sharing.ts` — sales-director rule | `record.amount >= 100000` |
 * | `sharing/opportunity.sharing.ts` — executive rule | `record.amount >= 100000` |
 *
 * plus a second tier stated twice, in complementary polarity, for the director
 * step: `vars.oppRecord.amount > 500000` / `<= 500000`.
 *
 * Nothing failed if you edited three of the four. The consequence is not
 * cosmetic: the approval flow, the congratulations alert and the leadership
 * pipeline view are three different answers to the same business question, and
 * a deployment that raises the bar in one place quietly ships a product where a
 * deal is large enough for the director to *see* and not large enough to
 * *approve*. Every site now interpolates the constant below, and
 * `test/deal-threshold-parity.test.ts` reads the shipped metadata back and
 * fails if any of them stops agreeing.
 *
 * ### ⚠️ The operators are deliberately NOT unified here — the value is
 *
 * The approval and won-alert sites cut at `> LARGE_DEAL_AMOUNT`; the two
 * sharing rules cut at `>= LARGE_DEAL_AMOUNT`. Converging the *value* leaves
 * that boundary disagreement exactly where it was, and it is real: an
 * opportunity at **exactly $100,000.00** — the single likeliest amount in a
 * CRM — is shared with the sales director and the executive, and is neither
 * routed for approval nor announced when it is won.
 *
 * That is a product decision (does a $100K deal need manager approval?), not a
 * refactor, and #599's ruling scoped this card to the constant. So the drift is
 * not silently "fixed" by picking an operator here: it is pinned as a recorded
 * fact in the parity test and filed for triage. What this module guarantees is
 * that both operators now cut at the SAME NUMBER, and cannot drift apart again.
 */

/**
 * A "large deal" — the amount at which an opportunity stops being routine.
 *
 * Consumed by the approval entry gate, the won-deal alert and both large-deal
 * sharing rules. `src/docs/crm_sales.md` and `src/docs/crm_admin.md` publish
 * this number to users, and `test/docs-drift.test.ts` fails if they drift from
 * what the flows actually ship.
 */
export const LARGE_DEAL_AMOUNT = 100_000;

/**
 * The second approval tier — above this a Sales Director signs off as well as
 * the manager. Consumed by the `check_high_value` branch of
 * `opportunity-approval.flow.ts`, in both polarities.
 */
export const HIGH_VALUE_DEAL_AMOUNT = 500_000;

/**
 * The hard ceiling on a discount percentage, in percent — on a quote, and on
 * each of its line items.
 *
 * ### One number, two rules, because a quote's total has two multipliers
 *
 * `crm_quote.discount_within_ceiling` (#599) and
 * `crm_quote_line_item.discount_within_ceiling` (#1086) both interpolate this
 * constant. The second is not a copy for symmetry's sake: the quote-level
 * percentage and the per-line percentage are INDEPENDENT inputs to the same
 * total (`quote_total_rollup` discounts each line, sums, then applies the
 * quote's percentage to the sum), so a quote at `discount: 0` with every line
 * at 90% cleared the quote-level rule outright and still priced 90% below
 * list. Ceiling one multiplier and the other is the way around it.
 *
 * What this constant does NOT settle is what the ceiling means once the two
 * multipliers COMPOUND — 60% per line and 60% on the quote is ~84% effective.
 * That is a business-policy question, open as #1109, and neither rule pretends
 * to answer it.
 *
 * ### Why 60, and why only one number
 *
 * #599 as filed proposed a **pair** — a soft ceiling that warns (suggested 30%)
 * and a hard ceiling that blocks (suggested 60%). The soft half had exactly one
 * consumer in that proposal: discount-triggered approval routing, which the
 * maintainer's ruling **deferred**. Shipping the soft constant anyway would add
 * a declared number that nothing reads, and this repo has measured that a
 * `severity: 'warning'` script validation is admitted with *no observable
 * surface at all* — no warning on the result, nothing in the envelope. It would
 * be a sixth entry for the "declared and then not applied" table in
 * `test/win-loss-capture.test.ts`. So only the enforced number exists here; the
 * soft tier returns with the approval routing that gives it a job.
 *
 * ### Why 60 rather than 30
 *
 * The ceiling is ABSOLUTE — there is no approval path to unblock a quote above
 * it, because that is the deferred half. A blocking rule with no override has
 * to sit where refusing is unambiguously right, not where reviewing would be
 * useful. 30% would refuse aggressive-but-real commercial deals outright and
 * leave the rep nothing to do about it; 60% refuses the case the card was filed
 * for — "a rep can give 90% off a $99K deal, and nothing reviews it" — while
 * leaving genuine strategic pricing alone. The stock catalogue agrees: the
 * deepest discount HotCRM seeds anywhere is 20% (`src/data/*.seed.ts`), so the
 * ceiling refuses nothing this app ships and nothing it plausibly sells.
 *
 * 30% keeps its meaning as the line where a human should *look*, which is the
 * deferred card's business, and is deliberately not encoded as a constant until
 * something enforces it.
 *
 * ### Why this is a validation rule and not `Field.percent({ max })`
 *
 * Measured, both ways, on a legacy row already above the ceiling — on the quote
 * (#599) and again on the line item (#1086), both in
 * `test/quote-discount-ceiling.test.ts`: a field-level `max` validates the
 * WRITTEN VALUE only, so a row stored above the ceiling before the rule existed
 * keeps accepting edits forever — the same silent legacy hole #1069 reports for
 * `requiredWhen`. A `type: 'script'` validation is evaluated against the MERGED
 * record on every write, so it is a true invariant. Both fields keep `max: 100`
 * as the arithmetic domain of a percentage; the policy line lives in the rules.
 */
export const QUOTE_DISCOUNT_CEILING = 60;
