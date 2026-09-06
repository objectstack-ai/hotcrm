---
'hotcrm': patch
---

Measure a contract's term on the calendar its dates were written on. The
`contract_validation` hook's `monthsBetween` parsed two stored `YYYY-MM-DD`
values — which the date-only parse anchors at **UTC midnight** — and then read
them back with `getFullYear` / `getMonth` / `getDate`, on the **local**
calendar. West of Greenwich that anchor is the previous evening, so both
operands slid back a day before the subtraction: measured,
`new Date('2026-01-01').getDate()` answers **31** in `America/New_York` and
**1** in `Europe/Berlin`. The three accessors are now `getUTCFullYear` /
`getUTCMonth` / `getUTCDate`.

**This changes which contracts can be saved, in a non-UTC deployment, back to
correct.** The count feeds a hard refusal, and the ±1-month tolerance that
absorbs a rounding difference in the middle of a range does not absorb an error
at its edge:

| contract | true span | measured before, west of Greenwich | outcome before |
| --- | --- | --- | --- |
| `2026-03-01` → `2027-04-30`, 12-month term | 13 months — legal, at the tolerance edge | 14 months | **refused**, quoting "14 months" for a range that has 13 |
| `2026-01-01` → `2026-05-01`, 2-month term | 4 months — a genuine mismatch | 3 months | **accepted** |

Both directions are real and both are now correct. The refusal message also
stops quoting a month count the contract's own dates do not have.

This is a **negative-offset-only** defect, unlike the mixed-calendar hook
arithmetic corrected alongside it: a UTC-midnight anchor read locally is the
same date at every non-negative offset, so `Europe/Berlin`, `UTC`,
`Pacific/Auckland` and `Asia/Tokyo` never disagreed, and neither did CI. Driving
the real hook over 7,200 (start, end) pairs — 400 consecutive start dates from
`2026-01-01`, each against ends at +1…+13 calendar months and +29/30/31/59/90
days — the fixed function now returns byte-identical counts in
`America/New_York`, `America/Santiago`, `Europe/Berlin`, `Pacific/Auckland` and
`UTC`. Before the change, `America/New_York` disagreed with `UTC` on 69 of the
80,200 ordered pairs drawn from that same 400-day window.

The refusal's own policy is untouched: `Math.abs(calc - term) > 1` is the same
comparison against the same tolerance. Only the measurement it consumes changed.
The third term of the expression is also unchanged in intent — it still asks
whether the end day-of-month has reached the start's, and subtracts the
incomplete final month when it has not; only the accessor it asks with moved to
UTC.

Contracts saved before this change are not re-measured or migrated: the hook
runs on insert and update, so an already-persisted row is re-validated the next
time it is written.
