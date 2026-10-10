---
'hotcrm': patch
---

Tables keep cell editing when the console moves to the next objectui release

Every HotCRM table (each list view shown as a grid, such as **All Leads**,
**Open Deals** or **My Open Tasks**) now states that its cells can be edited in
place. The platform treats a table that says nothing about this as read-only,
and the next console release follows that rule. Without this change, the
**Edit inline** button would have disappeared from every HotCRM table, and
people could only have edited a record through its form.

Who may edit has not changed. **Edit inline** is still offered only to a user
who can edit records of that object. A user with read-only access sees the
table without it, as before.
