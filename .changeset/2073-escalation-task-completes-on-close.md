---
"hotcrm": patch
---

**Closing a case now completes its escalation follow-up task.** Escalating a case opens an urgent "Escalated: CASE-…" task for the account owner. Nothing closed that task when the case was closed, so a closed case left an urgent task in the account owner's **My Open Tasks**, one for each time the case was escalated.

Now, when a case moves to *Closed*, each of its escalation tasks that is still open is set to **Completed**. This happens however the case is closed: with **Close Case**, or by setting the status to *Closed* on the record. The task records the person who closed the case as the one who completed it. A task its owner already completed is not changed, and the case's other tasks are left as they are. Reopening the case does not reopen the task.

Completing the task counts as activity on the account, as completing any task does, so the account's **Last Activity Date** moves to the day the case was closed.
