---
'hotcrm': patch
---

Write the SLA-tracking half of `service/sla-and-escalation` to what the app
actually does, in all three locales.

Four claims on that page described behaviour this app does not have. Three were
confirmed against `origin/main` and rewritten; the fourth turned out to be true,
and is reported below rather than "fixed" into a new falsehood.

**Only Critical cases get an SLA due date.** The page opened with "Every case
gets an SLA due date the moment it's created", 45 lines above the sentence
#886/#890 had already written straight — that `case_sla_defaults`
(`src/objects/case.hook.ts`) stamps `sla_due_date` for `critical` only and
leaves every other priority blank. The page was contradicting itself; the lede
and the intro of *How SLA targets are calculated* now say what the hook does,
and the target table separates Critical's four hours (a deadline the system
keeps) from High / Medium / Low (a service commitment with no clock behind it).

**The High / Medium / Low "what breach looks like" cells described row colour,
not a breach.** There are no breach badges. The only colour declaration on a
case list is `rowColor` on the *All Cases* view, and it is keyed on
**priority**, not on violation — so it paints a High case orange (`#f97316`,
not the red the page promised) from the moment it is created, and Medium yellow
(`#eab308`) rather than amber. Those three rows now say that nothing fires at
all: `case_sla_monitor` only picks up cases whose `sla_due_date` has passed, and
they have none. What reports a breach in a list view is the **SLA Violated**
column.

**There is no live SLA countdown.** `countdown` and `remaining` appear nowhere
in the app's source, and the page header carries the case number, subject and
account — not an SLA timer with warning zones. The three-bullet
`2h 14m remaining` / `24m remaining` / `BREACHED – 1h 32m over` display is
replaced with what the case really shows: **SLA Due Date** and **SLA Violated**
as two ordinary fields in the **Key Information** strip, plus the two views that
do help (**SLA Calendar**, **SLA at Risk**) described for what they select on.
The *Tips for service agents* line telling agents to "watch your SLA countdown …
when you see the amber zone" pointed at the same missing feature and is
rewritten with it.

**The read-only claim was correct — it was the mechanism that was undocumented.**
"The breach flag is read-only for agents" is true: the Service Agent profile
masks `crm_case.is_sla_violated` as `readable: true, editable: false`
(`src/profiles/service-agent.profile.ts`), which is field-level security rather
than a `readonly` field — the field deliberately is not `readonly`, because
`case_sla_monitor` has to write it. The sentence keeps its claim and now names
where the lock lives. The neighbouring field bullet was wrong, though: the
checkbox is labelled **SLA Violated**, there is no *SLA Breached?* field, and it
does not compare resolution time against a target — the hourly sweep sets it on
open cases whose due date has already passed, which is why a case with no due
date is never a candidate and a case resolved late but before the next sweep is
never flagged.

Whether High / Medium / Low *should* have an SLA clock, and whether the breach
flag *should* be locked differently, stay open in #595 — this change only
records today's behaviour. No field definition, flow or view changed. Refs #903,
#886, #890.
