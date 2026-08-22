---
'hotcrm': patch
---

Correct what the Forecasting page teaches about a `period_start` or `period_end`
you supply by hand. In all three locales it said a supplied value "is kept
exactly as you sent it" and that "nothing snaps it back", with a worked example:
send `period_start` 2026-07-15 for a quarterly snapshot and get a row stored
mid-quarter under a **Q3 2026** label.

That write is refused. Three validations now pin a forecast's window to the
calendar period it is labelled with:

- `period_start_first_of_period` / `quarter_starts_on_quarter_boundary` — the
  start must be the period's own first day, and a quarterly forecast must
  additionally start on January 1, April 1, July 1 or October 1.
- `period_end_matches_calendar_period` — a hand-typed end must be that period's
  last day; leave it blank and the derivation still fills it in.

The page's *advice* was already right — send the period's first day, or send no
`period_start` at all. Its *reason* was the pre-validation one: send it because
the period-scoped filters will otherwise miss the row. A reader who reasoned from
that reason got an error the page said could not happen, so both are corrected
together. Being hard to find is now given as why the rules exist rather than as
what happens instead of them.

The rewritten paragraph also states the repair path, which the page never had:
because these are record-level validations, a row stored before they shipped is
refused on its next save — even a save that does not touch the period — until its
window is corrected, and that correction is always accepted.
