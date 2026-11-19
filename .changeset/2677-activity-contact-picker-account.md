---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**A task's or an event's Related Contact picker offers only the contacts of the account the activity names (#2677).** Once **Related Account** is filled in on the New or Edit form, the **Related Contact** picker lists that account's contacts only, and narrows again when the account changes, the same way the Related Opportunity picker does since #2573. With no account chosen yet, every contact is offered as before. The picker narrows the choice only: an import or an API call that links an activity to another account's contact is not refused. The *Activities* page of the docs site and the in-app Sales Manual say so.
