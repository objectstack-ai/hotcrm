---
'hotcrm': minor
---

Demo data for the activity model: the Sales Activity dashboard now has numbers behind it

The activity model shipped with its objects, actions, cube and dashboard but no
records, so a freshly seeded demo showed a complete Sales Activity dashboard
reading zero on every widget, an empty calendar, empty interaction histories,
and three "Quiet 30 / 60 / 90+ Days" tiles with nothing to count.

The demo database now ships 27 interactions and their attendee rows, spread
across leads, contacts, accounts, opportunities and cases, over roughly nine
weeks and across calls, meetings, demos, webinars and an onsite visit. Both
sides of the `held` / `planned` split are represented: interactions that
happened, meetings that are merely booked, and a cancelled and a no-show row.
Every timestamp is relative to the boot date, so the demo reads the same on any
day it is installed.

`crm_account.last_activity_date` is now laid out across the churn bands rather
than clustered inside a fortnight: three accounts sit at 41, 72 and 104 days of
silence, one per tile, and each has a re-engagement meeting on the calendar
without its clock moving — which is what the `held` / `planned` distinction is
for. The at-risk account's health score and its activity clock finally agree.

Seeded interactions reach the database owned by nobody, as every seeded record
does, so the demo bootstrap sweep now claims `crm_event` alongside the other
owner-scoped objects. Without that, every interaction would be invisible to
every rep, absent from the "Activity by Rep" breakdown and editable by no one.
The attendee junction takes its access from the event it hangs off and is
deliberately not claimed.
