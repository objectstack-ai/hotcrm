---
'hotcrm': patch
---

List rows are tinted only when they need attention. Nine list views used to give every row a colour, one per value of a field that already shows as a coloured badge in its own column, so a whole page of colour marked no row. Now:

- **Cases** (*All Cases* and *Unassigned — triage*): a case flagged **SLA Violated** is red. Before, the tint followed priority and painted every case, breached or not.
- **Tasks**: an urgent task is red.
- **Event Attendees**: a declined invitation is red.
- **Accounts**: an inactive account is grey; active accounts are no longer green.
- **Open Deals**, **Events**, **Knowledge Articles** and the **High Priority** leads list are no longer tinted.

The *Unassigned — triage* and *All Accounts* tints are not visible yet. The console fetches only a list's columns, and neither list has a column for the field its tint reads (**SLA Violated**, **Active**). They will show once the platform fetches that field.
