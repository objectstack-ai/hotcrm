---
"hotcrm": patch
---

Service: setting a case's Status to Escalated by Edit is now the same escalation as the Escalate Case button (#2497). The save stamps the Escalated flag and date and raises the priority to Critical, and it needs an Escalation Reason; without one it is refused. Before, the status alone changed: the case was handed over and a follow-up task opened, but reports, the critical-case share and the button still saw an unescalated Low case.
