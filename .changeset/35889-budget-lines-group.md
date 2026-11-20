---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**A project budget keeps its lines in its form and record page when the platform stops inlining master-detail children by default (objectstack#35889).**

The budget object gains a **Budget Lines** field group naming its lines, between the version and the totals. Today it draws the lines' table at that place on the budget's record page, and the New / Edit Budget form keeps its line grid as before. Once the platform change in objectstack#35889 ships, a master-detail child is inlined in its parent's form, and drawn in its record page's body, only where a field group of the parent names it; without this group the budget lines would become a tab and leave the form.

Nothing in the data changes.
