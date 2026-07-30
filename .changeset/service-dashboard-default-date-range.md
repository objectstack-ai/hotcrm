---
'hotcrm': patch
---

Fix the Customer Service dashboard opening on all zeros.

`service_dashboard` defaulted its date range to `last_30_days` while the demo
cases run from 1 to 30 days old, so the default window sat exactly on the edge
of the data it aggregates: the runtime ANDs the dashboard range into every
widget query, and the oldest cases fell out of it — every KPI read 0 and every
chart reported no rows, with 38 cases in the system.

The default is now a rolling `last_90_days`, which always contains the full case
history whatever day the demo is opened on. `this_quarter` — what the CRM, Sales
and Executive dashboards use — is deliberately not the fix here: those window
`close_date` over a forward-looking pipeline, where a calendar quarter is the
intended framing, whereas a support desk reads a trailing window, and a calendar
quarter is only a few days long on 1 July.

A regression guard in `metadata-references.test.ts` now checks the default
against every reference day of a leap year and requires the window to clear the
oldest seeded case by a margin, so a flush-to-the-edge default (one timezone
rounding away from clipping data) fails in CI rather than in a demo.
