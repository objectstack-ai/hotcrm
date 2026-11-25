// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Commercial governance thresholds — the money lines this app draws, authored
 * ONCE.
 *
 * "What counts as a large deal" is one business question with four consumers:
 * the approval entry gate and the won-deal alert (`src/sales/flows/`), and the
 * sales-director and executive rules (`src/sales/sharing/opportunity.sharing.ts`).
 * Each interpolates the constant below, and each cuts at `>=`.
 *
 * ⛔ Both halves are load-bearing, and neither may drift. Four independent
 * literals mean a deployment that raises the bar in one place ships a product
 * where a deal is large enough for the director to *see* and not large enough
 * to *approve* — governance narrower than visibility, which is the
 * counter-intuitive direction the next author will assume the reverse of.
 * Maintainer ruling: **a deal at the line is a large deal**, so every site cuts
 * at `>=` rather than `>`. `test/deal-threshold-parity.test.ts` reads the
 * compiled CEL of every flow condition and sharing rule back out of the shipped
 * metadata and fails if any site stops agreeing on the number OR the operator.
 *
 * If a reason ever appears for leadership to see a deal that needs no approval,
 * that reason belongs **here**, next to the constant, and the split becomes a
 * design instead of drift. Nothing in this repo makes that argument today.
 *
 * `HIGH_VALUE_DEAL_AMOUNT` below is deliberately NOT part of that guarantee:
 * its `>` and `<=` halves are one branch stated in complementary polarity,
 * which must PARTITION rather than agree. Two operators there are the design.
 */

/**
 * A "large deal" — the amount at which an opportunity stops being routine.
 *
 * Consumed by the approval entry gate, the won-deal alert and both large-deal
 * sharing rules. `src/docs/crm_sales_opportunities.md` and
 * `src/docs/crm_admin_automation.md` (and their `.zh.md` siblings) publish
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
 * `crm_quote.discount_within_ceiling` and
 * `crm_quote_line_item.discount_within_ceiling` both interpolate this constant.
 * The second is not a copy for symmetry's sake: the quote-level percentage and
 * the per-line percentage are INDEPENDENT inputs to the same total
 * (`quote_total_rollup` discounts each line and sums, then `quote_workflow`
 * applies the quote's percentage to the sum), so a quote at `discount: 0`
 * with every line at 90% clears the quote-level rule outright and still
 * prices 90% below list.
 * Ceiling one multiplier and the other is the way around it.
 *
 * ⚠️ What this constant does NOT settle is what the ceiling means once the two
 * multipliers COMPOUND — 60% per line and 60% on the quote is ~84% effective.
 * That is an open business-policy question, and neither rule pretends to answer
 * it.
 *
 * ### Why 60, and why only one number
 *
 * The ceiling is ABSOLUTE — there is no approval path to unblock a quote above
 * it. A blocking rule with no override has to sit where refusing is
 * unambiguously right, not where reviewing would be useful. 30% would refuse
 * aggressive-but-real commercial deals outright and leave the rep nothing to do
 * about it; 60% refuses "a rep can give 90% off a $99K deal and nothing reviews
 * it" while leaving genuine strategic pricing alone. The stock catalogue
 * agrees: the deepest discount HotCRM seeds anywhere is 20%
 * (`src/<pkg>/data/*.seed.ts`).
 *
 * The SOFT line beside it is {@link QUOTE_DISCOUNT_APPROVAL_PERCENT}: below the
 * ceiling, a discount above that line is not refused but reviewed (#2751).
 *
 * ### Why this is a validation rule and not `Field.percent({ max })`
 *
 * ⚠️ Platform constraint, measured both ways on a legacy row already above the
 * ceiling (`test/quote-discount-ceiling.test.ts`): a field-level `max`
 * validates the WRITTEN VALUE only, so a row stored above the ceiling before
 * the rule existed keeps accepting edits forever — the same silent legacy hole
 * `requiredWhen` has. A `type: 'script'` validation is evaluated against the
 * MERGED record on every write, so it is a true invariant. Both fields keep
 * `max: 100` as the arithmetic domain of a percentage; the policy line lives in
 * the rules.
 */
export const QUOTE_DISCOUNT_CEILING = 60;

/**
 * The discount above which a quote needs a sales manager's approval before it
 * is presented, in percent (#2751, the maintainer's ruling of 2026-11-25 on
 * option A: 30, the soft tier #599 suggested beside the 60 hard ceiling).
 *
 * Read against the quote's own Discount % AND each of its lines' (the deepest
 * line is the quote's `max_line_discount` roll-up): either one above the line
 * sends the quote to `quote_discount_approval` when it is submitted for
 * review, and `discount_approval_before_presented` refuses to present it
 * until a manager has approved that deep a discount. A discount AT the line
 * needs no approval — the comparison is `>` everywhere, as the ruling words
 * it ("above 30 %").
 *
 * The two numbers do different jobs and stay separate: above
 * {@link QUOTE_DISCOUNT_CEILING} nothing can approve a quote, between the two
 * a manager decides.
 */
export const QUOTE_DISCOUNT_APPROVAL_PERCENT = 30;

/**
 * Expense amount at which an expense also needs a finance controller's
 * sign-off, after its first approver (hotcrm#2316 phase 1b; shared since
 * hotcrm#2556). Two packages read it: the expense module's own approval, for
 * an expense with no project, and Project Delivery's, for an expense on a
 * project. A source more than one package needs lives here, in one copy
 * (`module-split-plan.md` item 7). An expense of exactly this amount goes to
 * finance.
 */
export const EXPENSE_FINANCE_REVIEW_AMOUNT = 2_000;
