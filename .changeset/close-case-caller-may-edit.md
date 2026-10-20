---
'hotcrm': patch
---

Close Case changes a case only for a person who may edit it

**Close Case** now runs as the person who uses it, so that person's own access to the case decides the
close. Someone who may edit the case closes it exactly as before: the resolution, the optional resolving
article, the closed date, the resolution time and the SLA result are all recorded, an escalated case's
follow-up task is still completed, and the account's **Last Activity Date** still moves. Someone who may
not edit the case is refused, and the case is left exactly as it was.
