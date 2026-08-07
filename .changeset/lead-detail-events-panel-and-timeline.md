---
'hotcrm': patch
---

Show a lead's calls and meetings on the lead. **Log a Call** sits in the lead
record header, the click writes a real event linked straight back to that lead —
and then the lead showed neither. Its *Related* tab listed tasks only, its
*Activity* tab listed the Created/Updated audit trail only, and the call the rep
had just made could be found nowhere except **My Calendar**.

Two separate causes, one per tab:

- **Related tab** — the page never asked for events. An account's detail page
  gets its related lists generated for it (it is a slotted page, so the platform
  synthesizes the Related tab from the incoming relationships); the lead page
  builds its own layout end to end and therefore only shows what it lists. It now
  lists an **Events** panel — subject, type, status, start time and owner, newest
  first — scoped by the lead link on the event, alongside the existing Tasks
  panel. Booked meetings and calls that already happened both appear; the
  Planned/Held distinction is a column, not a filter.
- **Activity tab** — the timeline was configured to hide completed activity. A
  call or meeting you log is recorded as something that *happened*, so hiding
  completed items hid every interaction and left the field-change entries behind
  — the audit-only feed that was reported. Past activity is what the tab is for,
  so it is shown.

Same page, two other corrections that came with the measurement: the timeline's
activity-type filter named an object (`crm_task`) where the component takes feed
item types, so it had never filtered anything; it is gone, and the timeline now
shows every kind of entry it can render, matching the case and opportunity pages.
The metadata guard that had been checking those values against the app's object
names now checks them against the platform's feed-item vocabulary, which is what
the renderer actually reads. Fixes #1034.
