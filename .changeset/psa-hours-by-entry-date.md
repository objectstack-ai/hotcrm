---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**Projects Overview counts each approved hour in the week it was worked.** The Time Utilization dataset (`time_utilization`) now reads time entries, with the timesheet included for the person, the project and the approval, so a timesheet that crosses a week is split between the two weeks instead of landing in the week it starts. The Approved Hours by Week and Billable Share by Person tiles filter on the timesheet's status, which ObjectStack 18.5.0 serves across the include (objectstack#33512). Dimension and measure names are unchanged. The analytics pages and the Project Delivery Manual say so (#2483).
