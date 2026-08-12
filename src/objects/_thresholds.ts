// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Commercial governance thresholds — the money lines this app draws, authored
 * ONCE (#599).
 *
 * ### What this replaces
 *
 * "What counts as a large deal" was answered by four independent numeric
 * literals sitting in three files, with nothing joining them. What each site
 * wrote then, and what it interpolates today:
 *
 * | site | was | ships now |
 * | --- | --- | --- |
 * | `flows/opportunity-approval.flow.ts` start condition (both the update and the insert twin share it) | `record.amount > 100000` | `record.amount >= LARGE_DEAL_AMOUNT` |
 * | `flows/opportunity-won-alert.flow.ts` start condition | `record.amount > 100000` | `record.amount >= LARGE_DEAL_AMOUNT` |
 * | `sharing/opportunity.sharing.ts` — sales-director rule | `record.amount >= 100000` | `record.amount >= LARGE_DEAL_AMOUNT` |
 * | `sharing/opportunity.sharing.ts` — executive rule | `record.amount >= 100000` | `record.amount >= LARGE_DEAL_AMOUNT` |
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
 * ### The operator was converged after the value, and it took a ruling (#1087)
 *
 * #599 converged the *number* and deliberately left the comparisons alone: the
 * approval and won-alert sites still cut at `> LARGE_DEAL_AMOUNT` while the two
 * sharing rules cut at `>=`. That residue was real, not a rounding edge. An
 * opportunity at **exactly $100,000.00** was shared with the sales director and
 * the executive as a large open deal, and was neither routed for approval nor
 * announced when it was won — visible to leadership, invisible to governance.
 * A threshold set at a round number *attracts* deals priced at exactly that
 * number ("a hundred K" is how deals get quoted), so the boundary case was
 * plausibly the modal large deal rather than a measure-zero one.
 *
 * Which way to converge was a product decision — it changes who signs what — so
 * it was escalated rather than guessed, and #1087 ruled: **a deal at the line is
 * a large deal.** Every site now cuts at `>=`. The decisive argument was not the
 * boundary population but the mental model: governance narrower than visibility
 * is the counter-intuitive direction, and the next author extending this system
 * will assume the reverse (*if leadership can see it, someone signs it*). One
 * line, and at or above it everything applies.
 *
 * So this module now guarantees two things about "large deal", not one: every
 * consumer cuts at the same NUMBER, and every consumer cuts the same WAY.
 * `test/deal-threshold-parity.test.ts` reads both back out of the shipped
 * metadata — the compiled CEL of every flow condition and sharing rule — and
 * fails if any site stops agreeing on either.
 *
 * If a reason ever appears for leadership to see a deal that needs no approval,
 * that reason belongs **here**, next to the constant, and the split becomes a
 * design instead of the drift it was. It is not written here because nothing in
 * this repo makes that argument.
 *
 * `HIGH_VALUE_DEAL_AMOUNT` below is deliberately NOT part of this: its `> ` and
 * `<= ` halves are one branch stated in complementary polarity, which must
 * PARTITION rather than agree. Two operators there are the design.
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
