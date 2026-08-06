---
'hotcrm': patch
---

Write the "first-response SLA", the Lead reports section and two enumeration-free
behaviour claims to source, in all three locales.

**A measurable first-response target never existed.** Three pages presented one as
if the app kept it: the setup checklist's §11 SLA matrix carried an entire *First
response* column (1 hour at Critical through 1 business day at Low), the reports
page promised *"% first-response on time"*, and the Service Cube listed both a
*First-response time (minutes)* measure and an *SLA met %*. `first_response_date`
does have a writer — `logActivityAction` in `src/actions/global.actions.ts` stamps
it the first time a call or meeting that already took place is logged on a case —
but nothing in the repo compares that stamp against a target: `case_metrics`
(`src/datasets/case.dataset.ts`) declares no first-response measure, no report or
tile reads it, and no flow alerts on it. The four numbers themselves appear
nowhere, and `content/docs/service/sla-and-escalation`, which the checklist links
to for them, does not mention a first response at all. All three pages now name
the stamp, name what is absent, and state the first-response promise for what it
is — the team's own service commitment. The SLA matrix keeps its resolution
column, with Critical marked as the one row `case_sla_defaults` turns into a
deadline. The cube's SLA measure is named as what `case_metrics` really declares:
an **SLA Violation Rate**, not a compliance percentage.

**The Service reports table listed six reports where `src/reports/case.report.ts`
publishes three.** *Cases by Status and Priority*, the SLA report and *Cases
Opened by Priority × Day* are real; *Case Volume by Origin*, *Case Resolution
Time*, *Top Accounts by Case Volume*, *Reopened Cases* and *CSAT by Agent* are
not published anywhere, and most of them ask `case_metrics` for something it
does not carry — there is no agent dimension, no account dimension, no reopen
marker on the case and no measure over **Customer Satisfaction**, so three of
those five cannot be built as custom reports either. The section now lists the
three real reports with their real grouping, and says of each absent one why it
is absent. Two subscription examples that named a report from that list now name
a published one.

**The Lead reports section listed three reports that do not exist**, and omitted
the one that does. `src/reports/` publishes exactly one lead report — **Lead
Engagement by Month × Source** (`src/reports/lead.report.ts`), a matrix of
contacted-lead volume by source and month — while the page listed *Lead Conversion
Funnel*, *Lead Source ROI* and *Aged Leads*, none of which is published anywhere.
Two of them also spelled a lead status that does not exist: *Working* is a row in
the import alias table (`src/mappings/lead_import.mapping.ts`) that maps a legacy
value onto **Contacted** at import time, not a value of `crm_lead.status`, whose
route is *New → Contacted → Qualified → Unqualified → Converted*. The section now
lists the real report, names the three absent ones, and says what `lead_metrics`
can and cannot answer.

**Two behavioural claims outside any enumeration.** The setup checklist sent
admins to a **Setup → Opportunity → Stages** screen that does not exist — the
stages are the `stage` field's options in `src/objects/_picklists.ts` and the
probabilities are the `STAGE_PROBABILITY` map in `src/objects/opportunity.hook.ts`,
which re-derives probability from the stage on every save. And the state-machines
page advised hanging automation off a transition because it is *"much more
performant"*; there is no transition to hang it on (the table is a warning-severity
validation rule that logs and emits nothing), and the comparison had no basis. The
tip now describes what the app actually does — a `record_change` flow that narrows
itself in its start condition, as `opportunity_won_alert` does.

Documentation only; `src/` unchanged. Fixes #936, #951, #952.
