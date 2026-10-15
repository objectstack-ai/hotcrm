---
"hotcrm": patch
---

**A service agent no longer loses a case the moment it is escalated.** An escalated case is handed to the Service Manager with the fewest open cases, and an agent only sees the cases they own. So an agent who logged a Critical case saw "Case created successfully" over a "Record not found" page. An agent who pressed Escalate Case got the same page when it refreshed.

The case now records the agent it was taken from in a new read-only **Escalated From** field. A new sharing rule, *Escalated Cases — Previous Owner*, lets that agent read the case until it is closed. They can follow the case but cannot edit it: the manager works it. No other agent gains access, and the manager's and director's access is unchanged. A case escalated with no owner names nobody, and nobody can type a name into the field.
