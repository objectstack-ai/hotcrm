---
'hotcrm': minor
---

Enforce a hard ceiling on quote discounts, and give "large deal" one definition.

**Discount ceiling.** `crm_quote` gains `discount_within_ceiling`, an
error-severity script validation refusing any quote whose **Discount %** exceeds
**60**. This narrows the accepted surface: a save that previously succeeded at
70% now comes back `VALIDATION_FAILED` with *"Discount cannot exceed 60%"*, and
nothing is written. The rule replaces `valid_discount`, which cut at `> 100` and
could never fire — field bounds are evaluated before object validations, so the
field's own `max: 100` already refused every input that could have reached it.

It is an **invariant**, not a transition gate: it is evaluated against the merged
record on every write, so a row stored above the ceiling is refused on any edit
until its discount is brought back under the line (always allowed). That is the
deliberate difference from `requiredWhen`, which #1069 measured as reaching only
the write that enters the gated state. HotCRM's seeded data is unaffected — the
deepest discount it ships is 20%.

**One "large deal".** The threshold was written as four independent literals
across three files (the approval entry gate, the won-deal alert, and both
large-deal sharing rules), plus a second tier stated twice for the director step.
All of them now interpolate `src/objects/_thresholds.ts`, and
`test/deal-threshold-parity.test.ts` reads the shipped metadata back and fails if
any site stops agreeing. No threshold value changes, so no routing, alerting or
sharing behaviour changes with it.

The discount-triggered approval routing proposed alongside this is deliberately
not included; the quotes documentation, which described that routing as if it
already existed, now states the shipped rule instead.
