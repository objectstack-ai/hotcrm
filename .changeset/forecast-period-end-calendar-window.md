---
"hotcrm": patch
---

Forecast: a hand-filled Period End must now be the last day of its own calendar period

A forecast row's window is supposed to be the calendar period its label names.
Since #1008 the **start** was pinned to a calendar boundary, but **Period End**
stayed editable on the record form and only had to be *after* Period Start — so
the same inconsistent row was still reachable from the other end. A quarterly
forecast starting 2026-07-01 could be saved with a hand-typed Period End of
2027-05-15 and stored under the label **Q3 2026**: a row that says one quarter
and spans ten months.

That row is not cosmetic. The *This Quarter* forecast view and the Sales
dashboard's *Quota Attainment by Rep* table match Period Start by equality, and
the nightly Forecast Snapshot sweep picks the current row with
`period_start <= today <= period_end` — so an over-long window makes one row
answer to "current" for months on end.

**What changes for you.** A write that sets Period End by hand is now refused
unless it is the last day of the period Period Start opens — 2026-09-30 for a
quarter starting 2026-07-01, 2026-08-31 for Aug 2026. The Period End field's
help text on the record form states the rule, in all four locales.

Nothing else about the field changed: it is still editable, and leaving it
blank still derives it automatically, so the nightly sweep and every other
automated writer are untouched. Because the check is a record-level validation
rather than a field constraint, it also applies to rows that were **already**
stored with a bad window — such a row is refused on its next edit until the
window is corrected, and correcting it is always allowed.
