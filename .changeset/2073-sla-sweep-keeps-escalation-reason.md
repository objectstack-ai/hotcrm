---
"hotcrm": patch
---

**The hourly SLA sweep no longer overwrites the Escalation Reason on a case that is already escalated.** Before this release, when a case escalated with **Escalate Case** later passed its SLA Due Date, the sweep replaced the reason the agent typed with "Auto-escalated: SLA due date breached". It also moved the Escalated Date to the time of the sweep. The Escalation Reason keeps no history, so the agent's words could not be recovered.

Now the sweep checks whether a breached case is already escalated. If it is, the sweep sets **SLA Violated**, sets the status to *Escalated*, and leaves the Escalation Reason and the Escalated Date as they were. This also covers a case that was escalated, put back to *In Progress* to be worked, and then breached. That case goes back to *Escalated* with its original reason and date. The case owner is alerted as before.

A breached case that was never escalated is handled exactly as before: it gets the reason "Auto-escalated: SLA due date breached" and the time of the sweep as its Escalated Date.

Cases whose reason was already overwritten before this release keep the text they have now. The earlier reason was never stored anywhere else, so this release cannot restore it.
