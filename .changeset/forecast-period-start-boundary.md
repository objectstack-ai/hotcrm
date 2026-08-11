---
'hotcrm': patch
---

A forecast may only start on a calendar-period boundary — a hand-filled `Period Start` in the middle of a month or quarter is now refused instead of quietly producing a window that outruns its own label.

`forecast_derive_period` keeps a caller-supplied `period_start` as given, then
derives `period_end` as "start + one period". That is a ROLLING window, not "the
last day of the calendar period this start belongs to", so the window length was
right and its POSITION drifted with whatever was typed, while `period_label`
named the period the START fell in. Measured on the real handler:

| period  | period_start | derived period_end | derived period_label |
| ------- | ------------ | ------------------ | -------------------- |
| quarter | 2026-07-15   | 2026-09-30         | Q3 2026              |
| quarter | 2026-08-15   | **2026-10-31**     | Q3 2026              |
| quarter | 2026-09-20   | **2026-11-30**     | Q3 2026              |
| month   | 2026-08-17   | 2026-08-31         | Aug 2026 (half a month) |

The last three rows are internally inconsistent, and no consumer can tell:
`this_quarter_forecasts` and the quota-attainment widget pin `period_start` by
equality, and the nightly `forecast_snapshot` sweep selects the current row with
`period_start <= today <= period_end`.

Two object validation rules — `period_start_first_of_period` and
`quarter_starts_on_quarter_boundary` — now refuse such a write on every path
(record form, API, seed) with a `VALIDATION_FAILED` error, rather than a warning
that lets the row land. `Period Start` remains free otherwise: any month start
is a valid monthly forecast, and January 1 / April 1 / July 1 / October 1 open a
quarterly one.

Nothing this app writes changes: the snapshot flow sends only `period` and the
hook derives a boundary start from it, and every seeded forecast already starts
on a calendar boundary. Manual entry by a manager keeps working — with the start
on the boundary of the period being forecast, which is what the label always
claimed.

Fixes #1008.
