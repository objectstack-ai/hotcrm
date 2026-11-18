---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**A fresh demo's service desk stays inside its SLAs for two weeks (#2452, item 3).** The demo cases' SLA due dates used to be exactly what the priority × customer-tier matrix stamps on a new case, 4 to 168 hours after it was opened. No open case can stay inside a window that short, so a fresh demo had 7 of 23 open cases past SLA on the day it was seeded and 23 of 23 three days later (#2431). Following the objectstack maintainer's ruling on objectstack#32679, the demo's dates stay where they are, and the seed loosens its own SLA target instead. Every open demo case that starts inside its window is now due at the end of that window plus 14 days, which reads as a renegotiated deadline. The SLA Violations tile shows the same seven deliberate breaches from the day the demo is seeded until two weeks later: *Data export timing out for large datasets*, *Mobile app crashes on iOS 17*, *Login issues after platform upgrade* (the one the hourly sweep escalates), and four generated Critical and High cases. Resolved and closed demo cases keep their matrix due dates, so SLA Performance and the compliance gauge read as before. The SLA matrix and the deadline a newly raised case gets do not change. Seed changes reach a new database only. An existing one keeps its rows.
