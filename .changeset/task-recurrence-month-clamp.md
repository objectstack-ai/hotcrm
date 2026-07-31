---
'hotcrm': patch
---

Clamp monthly/yearly task recurrence to the last valid day instead of
overflowing into the next month.

`advanceDate` stepped months with `Date.setMonth`, which rolls a day that does
not exist in the target month forward rather than clamping. A recurring task due
Jan 31 spawned its next occurrence on **Mar 3** — drifting further into the
following month on every occurrence and skipping February outright. Feb 29 on a
leap year had the same shape.

Month and year steps now move to the 1st before doing the arithmetic and then
clamp the day to the target month's length: Jan 31 → Feb 28 (Feb 29 in a leap
year), Mar 31 → Apr 30, Feb 29 2028 → Feb 28 2029.

Note the residual behaviour, which is asserted rather than left to be discovered:
each occurrence is computed from the previous due date, not from an anchor day,
so a month-end series settles on the shorter day (Jan 31 → Feb 28 → Mar 28)
instead of returning to the 31st. Preserving the anchor needs a schema change;
the behaviour being replaced drifted forward without bound, so this is a strict
improvement.

`advanceDate` also moves inside the handler. It was the last module-level helper
in `src/objects/`, and every sibling hook documents why that is unsafe: L2 hook
bodies run body-only in the QuickJS sandbox, where module scope is not
available.
