---
'hotcrm': patch
---

Repair three classes of silently-inert validation declarations (#514, items 3, 7 and 12)

Every rule below is metadata that `os validate` accepts and that no test ever
evaluated, so each failed without erroring.

**Unguarded CEL predicates on `crm_product` (item 3).** Strict CEL aborts on
`dyn<null> < int`, which makes an unguarded comparison skip the rule entirely
instead of failing it. `price_positive` (`record.list_price < 0`) and
`cost_less_than_price` (`record.cost >= record.list_price`) both lacked the
`!= null` guard that `quote_line_item.unit_price_positive` already models.
`cost` is absent on every seeded product, so the cost warning had never
evaluated on a single row. Both operands are now guarded. No seed data changes
state: no seeded product has a negative list price or a cost at all.

**`end_after_start` operator drift (item 12).** The same rule had three
spellings. `crm_campaign` used `<`, accepting a campaign that ends the day it
starts while its own message promised "End Date must be after Start Date".
`crm_forecast.period_end_after_start` also used `<`, with an "on or after"
message contradicting its rule name. `crm_contract` was already correct. All
three now use `<=` in the violation predicate and say "must be after"; forecast
periods are months or quarters, so rejecting a zero-length period is the
intended reading. No seeded campaign or forecast has `end == start`.

**Duplicated `revenue_positive` (item 7).** `crm_account` declared a validation
saying "Annual Revenue must be positive" while `account.hook.ts` threw "must be
greater than or equal to 0" for the same condition — the two disagreed about
whether zero was allowed, though both compared `< 0` (it is allowed). The
duplicate declaration is removed; the hook remains the single enforcement
point, and it is the tested one. This is behaviour-visible only in the error
message a client sees for a negative revenue, which is now consistently the
hook's.

New guards land in `test/object-validation-predicates.test.ts`: a repo-wide
sweep that null-guards every operand of every ordering comparison in every
object validation, the date-range twins pinned to one operator and one wording,
and a single-enforcement-point check for `annual_revenue`. The sweep carries
one documented exception — `opportunity_line_item.unit_price_positive`, the
remaining half of item 3 — and a companion test fails if that entry ever goes
stale.
