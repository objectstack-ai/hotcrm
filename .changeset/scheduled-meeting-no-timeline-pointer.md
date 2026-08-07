---
'hotcrm': patch
---

Stop writing an unrenderable timeline row when a meeting is scheduled, and take
the out-of-range value it carried off `sys_activity.type` with it.

`Schedule a Meeting` wrote its `sys_activity` timeline pointer with
`type: 'scheduled'`, which is not one of the values that field declares — the
platform's options are `created`, `updated`, `deleted`, `commented`,
`mentioned`, `shared`, `assigned`, `completed`, `login`, `logout`, `system`.
The Console's activity timeline maps every row's `type` through a table keyed on
exactly those values and skips whatever it cannot map, so the row was written,
stored out-of-range, and rendered nowhere:

```
book a meeting → crm_event (planned) ✓   attendees ✓   sys_activity ✓
                 record's Activity tab → nothing at all
```

Not a filter hiding it — the feed item was never built. Every one of the five
activity targets (lead, contact, account, opportunity, case) behaved this way,
because one shared action body writes all fifteen actions.

A booking now writes **no** timeline row. The activity timeline is a record of
what happened, and `crm_event.status` already draws that line: only a *held*
event moves the customer's contact clock, because a meeting booked for next
quarter is not an interaction that happened. `Log a Call` and `Log a Meeting`
are unchanged — they still write the pointer, now with a literal
`type: 'completed'` instead of a ternary that could reach an undeclared value.

Nothing about a booking is hidden by this: it stays on the calendar views and in
the record's **Events** related list, both of which read the event itself. The
`sys_activity` row had exactly one consumer — the timeline renderer that was
dropping it.

The action's return value keeps its `activityId` key and answers `null` for a
booking, rather than dropping the key and leaving a caller to guess.

**Existing rows.** Any `sys_activity` row already stored with
`type: 'scheduled'` is left in place: it renders as nothing today and will
continue to, the object is append-only telemetry on a 14-day retention window
(`lifecycle.retention.maxAge`), so it ages out on its own, and HotCRM deploys
fresh-install-only. No migration ships with this change. Fixes #1046.
