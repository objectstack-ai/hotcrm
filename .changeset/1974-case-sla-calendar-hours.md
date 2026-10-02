---
'hotcrm': patch
---

The case **SLA Due Date** field now says its unit: calendar hours

The SLA deadline on a case has always been counted in calendar (wall-clock)
hours. Nights, weekends and holidays count, because this app has no
business-hours calendar. Until now the form never said so. The **SLA Due Date**
field now carries a help text in all four languages:

> Set from the case priority and the account’s Customer Tier, in calendar
> hours: nights, weekends and holidays count.

No deadline changes. The matrix, the stamping rule and every published field
and hook name are the same as before. For maintainers: the unit is now carried
in code names (`CASE_SLA_CALENDAR_HOURS`, `caseSlaCalendarHours` and the
hook-body `slaCalendarHours` table). The repeated warning comments are reduced
to one, in `src/service/objects/_case-sla.ts`. The test now drives the shipped
hook body with the clock fixed at Friday 17:00. A Critical case is due Friday
21:00. On an SMB account, a Medium case is due Sunday 17:00 and a Low case the
next Friday 17:00.
