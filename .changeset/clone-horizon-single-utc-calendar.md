---
'hotcrm': patch
---

Give a cloned opportunity its 90-day close date on one calendar. **Clone
Opportunity** sets the new deal's `close_date` to today + 90 days; it stepped
those 90 days on the server's **local** calendar and then rendered the result on
the **UTC** one. The two agree only while a local day is exactly 24 hours long,
so on any deployment running in a zone that observes daylight saving the stored
date can land **one day off** — earlier when the 90-day window contains a
spring-forward, later when it contains a fall-back. A UTC deployment was never
affected, which is why this was never seen in CI.

The exposure, measured across a full year of clone instants in
`America/New_York`, `Europe/Berlin`, `America/Santiago`, `Australia/Sydney` and
`Pacific/Auckland`: roughly half the days of the year start a 90-day window that
crosses a transition, and on such a day the wrong answer comes out for clones
made within one hour of a UTC day boundary — about 1 in 50 clones overall in a
DST-observing zone, and none at all in `UTC` or `Asia/Tokyo`.

A day matters here because `close_date` is persisted, tracked in field history,
and read by everything downstream: it is the date-range filter field on the
Sales, Pipeline and Executive dashboards, the month and quarter dimension of the
opportunity dataset (so an off-by-one at a month or quarter edge files the deal
in the neighbouring bucket), the window the nightly forecast snapshot uses to
decide which period a deal belongs to, and the field behind the "Close date
should not be in the past" warning that the 90-day horizon exists to keep clear
of. Nothing downstream could tell the date had been computed wrongly.

The horizon itself is unchanged — still 90 days, still counted from the moment
the clone is made. Only the calendar the step is counted on moved, so it now
matches the calendar the value is written on.
