---
"hotcrm": patch
---

**Raising a case's priority now brings its SLA Due Date in.** A case kept the SLA Due Date it got when it was opened, whatever happened to its priority afterwards. A Medium case escalated to Critical with **Escalate Case** stayed on its Medium deadline (36 hours from opening, on an Enterprise account), and a Low case raised to High kept its 7-day deadline.

Now a priority change that shortens the target sets the SLA Due Date to the new priority's hours from the moment of the change, on the account's Customer Tier, as the matrix on the SLA & Escalation page gives them. For example, a Medium case escalated to Critical is due four hours after the escalation, and a Low case on a Mid-Market account raised to High is due eight hours after the edit.

The new deadline is counted from the change, not from when the case was opened. Counted from the opening, a case escalated late would be past due the moment it was escalated, and the hourly SLA sweep would flag it as violated straight away. The new date is used only when it is sooner than the one the case already has. A case raised in the last hours of its old window keeps its sooner deadline, and a case already past due stays past due, so its breach is still recorded.

Lowering the priority does not move the SLA Due Date, and neither does any other edit, including a save that sends the same priority again. A due date someone typed in by hand is kept, unless a later priority raise gives a sooner one. A save that sets the SLA Due Date itself keeps the date it sets. Cases whose priority was raised before this release keep the deadline they have.
