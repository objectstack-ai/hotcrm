---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**A fresh demo database shows a support desk that keeps most of its SLAs (#2288).** The demo cases used to be created whole days ago while their SLA clocks run in hours, so every open case was past due the moment it was seeded: after the first hourly SLA sweep, 29 of the 38 cases were marked as SLA violated and the Cases list was almost all red, seven of the red rows already closed or resolved. Each case the sweep escalated also opened its own urgent "Escalated: …" task due tomorrow, so the admin's task list filled with near-identical rows.

The demo cases now follow how a real desk looks. Open cases were raised in the last few days and are still inside their SLA window. Closed and resolved cases finished on time, to the hour. A few old open cases are deliberate breaches. A fresh seed now shows 7 of 38 cases violated (18%), none of them closed or resolved, and one escalation task, from the sweep escalating "Login issues after platform upgrade". The Daily Case Volume chart and the Cases Opened by Priority × Day report still spread the cases across the month. Recent days are busier because open work is recent, but no day holds more than five of the generated cases. Because no seeded closed case finished late, the SLA compliance gauge reads 100% on a fresh seed, from the cases' own dates. SLA clocks keep running after the seed loads: an open case breaches when its window ends, and the hourly sweep escalates it, as on a real desk. Run `pnpm demo:reset` to start again from a fresh seed.

Only the demo seed changes. Existing databases keep their cases: the case seed is insert-only.
