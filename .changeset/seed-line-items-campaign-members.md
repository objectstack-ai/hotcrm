---
'hotcrm': patch
---

Seed the CPQ and marketing surfaces that shipped empty. A fresh install had no
opportunity line items, no quote line items and no campaign members at all, so
the Products related list was blank on every one of the seeded opportunities,
no quote had a breakdown, and every campaign reported `num_sent` 0 with a 0%
response rate and 0% ROI — the exact screens a marketplace evaluator opens
first. This adds 65 opportunity lines across all 20 deals, 16 quote lines
across all 5 quotes, and 51 campaign members across all 7 campaigns.

The parent totals are now DERIVED from the child rows rather than typed in:
each opportunity's `amount` and `expected_revenue` are computed from its line
items with `opportunity_amount_rollup`'s own arithmetic, and each quote's
`subtotal` / `discount_amount` / `total_price` with `quote_total_rollup`'s —
so a seeded deal cannot disagree with its own breakdown, and editing a seeded
line item recomputes the same figure instead of visibly correcting it. Every
seeded currency figure is unchanged from before; they are just no longer
independent of the rows that justify them. Campaign metrics are derived the
same way, from membership plus the opportunities now attributed via
`crm_campaign`, so the completion snapshot is a no-op rather than a rewrite.
Campaign members stick to the `sent` / `responded` / `unsubscribed` lifecycle —
the states an actual writer produces.

Also fixes seed values that contradicted a field contract or were too thin to
demo: a lead rated `4.5` against a whole-star field the hook rounds to integers,
a campaign marked `in_progress` with a start date twelve days in the future, a
four-product catalog with no costs (widened to thirteen priced products with
margins, SKUs and billing terms), and a three-row forecast history (widened to
eight, all additions in settled past periods so a current-period snapshot sweep
cannot collide with them). A new `test/seed-consistency.test.ts` re-derives each
hook's computation from the seed data and fails when a seeded parent drifts from
its children.
