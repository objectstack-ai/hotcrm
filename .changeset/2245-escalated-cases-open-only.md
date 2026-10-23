---
"hotcrm": patch
---

**Cases → Escalated Cases now lists only escalated cases that are still open.** A case that was escalated and then resolved or closed used to stay on the tab forever, because the tab filtered on the escalation flag alone, so a service manager's escalation queue kept growing with finished work. The tab now also leaves out cases whose status is *Resolved* or *Closed*, the same rule **⏰ SLA at Risk** uses. The escalation itself (the flag, the hand-off to a service manager, the sharing rules) is unchanged.
