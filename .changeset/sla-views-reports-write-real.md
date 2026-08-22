---
'hotcrm': patch
---

Write the views / report / configuration half of `service/sla-and-escalation` to
what the app actually ships, in all three locales. Six claims sent readers
looking for screens, dropdowns and switches that do not exist; each was
re-confirmed against `origin/main` before being rewritten, and each keeps the
name it used so a reader who remembers it can find out what happened to it.

**Business hours are not configurable — there is no business-hours anything.**
The callout and the admin tip both promised that the clock could be told to
count 9-5 Mon-Fri instead of calendar hours, "controlled by your tenant's
business-hours setup". No working-day calendar, holiday list or setting of that
kind exists anywhere in `src/`; the only code that computes an SLA deadline is
`due.setHours(due.getHours() + 4)` in `src/objects/case.hook.ts`, straight off
the wall clock. Both places now say so, with the consequence spelled out: a
Critical case opened at 4pm Friday is due 8pm Friday, and nights, weekends and
holidays all count.

**The SLA Performance report has one breakdown, not four.** `sla_performance`
declares `rows: ['priority']` (`src/reports/case.report.ts`), so *Priority* was
the only one of the four bullets that was real — and the other three are not
merely absent from the report, they are unreachable in the semantic layer
underneath it. `case_metrics` (`src/datasets/case.dataset.ts`) declares five
dimensions — Status, Priority, Origin, Type, Created — with no owner/agent
dimension, no crossing over to `crm_account.tier`, and `created_date` bucketed
by **day** rather than month and not in that report's `rows` at all. The section
now states the one dimension, names each missing one with why it cannot be
selected, and records that the report measures the **SLA Violation Rate** over
closed cases (`runtimeFilter: { is_closed: true }`) rather than a compliance
percentage.

**Breached SLA and Critical Cases are not list views.** `crm_case` ships seven
(`src/views/case.view.ts`): *All Cases*, *Service Workflow*, *SLA Calendar*,
*Case Timeline*, *My Open Cases*, *Escalated Cases*, *⏰ SLA at Risk* — and none
of them filters on `is_sla_violated`. The two surfaces that do are metric tiles
on the Service Overview dashboard. The cadence table and the manager tip now
point at **Escalated Cases** (every case the sweep flags gets escalated into it)
plus the **SLA Violations** tile, and say plainly that the two old names name
nothing.

**The kanban board is called Service Workflow.** `case_workflow` carries
`label: 'Service Workflow'` and appears on the case list as the **Workflow**
tab; *Service Board* exists nowhere in the app.

**My Open Cases is a priority queue, not a deadline queue.** Its sort is
`priority_rank` descending first, `sla_due_date` ascending only as a
tie-breaker — and since only Critical cases are stamped with a due date, the
tie-breaker has nothing to order the lower bands by.

**Waiting on Customer does not pause the SLA clock**, and there is no config
that makes it. `sla_due_date` is written once and never recomputed, and
`case_sla_monitor`'s `status: { $nin: ['resolved', 'closed'] }` does not exclude
`waiting_customer` — so a case parked on the customer keeps running down its
four hours and is flagged and escalated on schedule. This was the costly one:
an agent who believed the tip stopped watching a live clock.

Whether the platform *should* offer a business-hours calendar, per-agent or
per-tier SLA breakdowns, or a pausable clock stays open in #595 — this change
records today's behaviour only. Documentation in three locales; no metadata
under `src/` changed. Refs #917, #903, #886.
