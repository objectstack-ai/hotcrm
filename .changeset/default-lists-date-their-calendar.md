---
'hotcrm': patch
---

Give every default list that offers the calendar switch a `calendar` block, so
the calendar it opens shows real dates instead of guessed ones.

Seven default lists — Campaigns, Cases, Contracts, Events, Opportunities,
Quotes, Tasks — declared `calendar` in `appearance.allowedVisualizations`, which
puts a calendar toggle on the list, while their `calendar:` configuration sat
only on a sibling NAMED view (`campaign_calendar`, `sla_calendar`,
`renewal_calendar`, `event_calendar`, `close_date_calendar`, `quote_calendar`,
`task_calendar`). The toggle does not read the sibling. With no field named as
the event date, the renderer invented one and every record that lacked it piled
onto "today" — a screen that looks right and is entirely wrong.

Each of the seven now dates its own calendar with the field that object's
dedicated calendar view already uses, so switching a list to calendar and
opening the named calendar view show the same thing:

| List | Event date | Also |
| --- | --- | --- |
| All Campaigns | `start_date` | ends at `end_date` |
| All Cases | `sla_due_date` | the deadline the queue already sorts by |
| All Contracts | `end_date` | renewal dates; the term span stays on the gantt |
| All Events | `start_datetime` | ends at `end_datetime` |
| Open Deals | `close_date` | the forecast date the list sorts by |
| All Quotes | `quote_date` | ends at `expiration_date` |
| All Tasks | `due_date` | the due date the list sorts by |

Records with no value in that field stay off the calendar, which is the truthful
answer; nothing is placed on a date it does not have.

A guard in `test/view-references.test.ts` now holds every list that offers a
calendar — default or named, today's and tomorrow's — to declaring a
`startDateField`, and to dating it with a field that exists and is a
date/datetime.
