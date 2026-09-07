---
'hotcrm': patch
---

Stop telling a rep to revisit the lost Acme add-on "in Q3". The
`Acme Add-on (Lost)` opportunity's description ended *"Revisit in Q3 when that
contract is up for renewal"*, while the record itself seeds `close_date` and
`stage_entry_date` as `daysAgo(25)`. The date moves with every seed load and the
quarter does not, so on the day this was measured the sentence pointed a rep at
the quarter the deal had already been lost in.

### The quarter was wrong in two directions at once

- **It was a fixed period on a moving record.** `daysAgo(25)` resolves to a
  different calendar day every time the demo database is seeded; `Q3` was
  authored once. They agree only by accident, and the label carries no year, so
  it is ambiguous as well as drifting. There is no fiscal-period mechanism to
  read it against either — `fiscal` occurs twice in `src/`, both times inside
  free-text loss prose, and `objectstack.config.ts` never mentions it — so the
  quarter could only ever have been a hand-typed calendar one.
- **It contradicted the record's own loss narrative.** The same record's
  `loss_details` reads *"Marketing is locked into a 2-year HubSpot contract; the
  buying window opens when that renews."* A two-year lock and a revisit this
  quarter cannot both be true, and `loss_reason` / `loss_details` are exactly
  what the loss-analysis reports are seeded to demonstrate.

### What replaces it

The sentence now anchors the follow-up to the event instead of the calendar:
revisit when that contract comes up for renewal, because that is when the buying
window opens. That is the story `loss_details` already tells, and the same shape
the `Acme Corporation` description uses for this very fact — no date to drift.

The quarter is removed rather than re-derived. Deriving one here would mean
importing `revenue.seed.ts`'s module-private `forecastQuarterLabel` into
`sales.seed.ts`, and `revenue.seed.ts` already imports `sales.seed.ts` — the
reverse reference is a circular import for a label the record does not own.
`#1660` settled this for the sibling `next_step` on the same account: no date
goes back into this prose, absolute or relative, because a second copy is a
second thing to drift.

`close_date`, `stage_entry_date`, `loss_reason`, `loss_details` and the seed
record name are all unchanged — the record was already correct; only the prose
describing it was not.
