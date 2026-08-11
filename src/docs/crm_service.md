---
title: Service Process & SLA Rules
description: Case priority, SLA breach handling, automatic escalation, and satisfaction follow-up — the rules behind the Service desk.
# sources: flows/objects this doc documents. Schedules/rules here are guarded by
# test/docs-drift.test.ts; build ignores unknown frontmatter keys.
sources:
  - flow:case_sla_monitor
  - flow:case_escalation
  - flow:case_csat_followup
  - object:crm_case
  - object:crm_knowledge_article
---

# Service Process & SLA Rules

For service agents and service managers. Cases move from intake to resolution,
and the system enforces SLAs and escalations automatically — this guide explains
exactly when and how.

## Case priority

Every case carries a **priority** that drives its urgency:

`Low → Medium → High → Critical`

Each case also carries an **SLA Due Date** — the deadline to resolve it. It is
set automatically when the case is logged, from a **priority × account-tier
matrix**: the case's priority is looked up against the **Customer Tier** of its
account, and the resulting number of hours is added to the time of creation.
Critical is four hours on every tier; the other three priorities tighten as the
tier rises (an account with no tier set is treated as SMB).

> Those are **calendar** hours, not business hours. This app has no
> working-day calendar and no holiday list, so nights, weekends and holidays
> count against every target — a Critical case raised at 5pm on a Friday is due
> at 9pm that same Friday.

The automation below watches that clock and the priority for you.

## The clock is watched for you — SLA breach handling (automatic)

An **hourly** sweep checks every open case. If a case passes its **SLA Due Date**
without being resolved, the system automatically:

- marks it **SLA Violated**,
- **escalates** it (status → *Escalated*, with an escalation reason stamped), and
- alerts the owner.

You never have to manually catch a missed SLA — but you should work cases before
the due date, because a breach is recorded permanently on the case.

## Critical cases escalate instantly (automatic)

The moment a case is set to **Critical** priority, it escalates without waiting
for the SLA clock:

- status moves to **Escalated** with an escalation reason stamped, and the case
  is handed to the **Service Manager** carrying the fewest open cases — with
  nobody holding that position it stays with its current owner,
- an **urgent follow-up task** is created for the account owner (due the next
  day), and
- the case owner is notified.

> Two safety nets, two triggers: **priority = Critical** escalates *immediately*;
> a **missed SLA Due Date** escalates *on breach*. Both flag, hand the case to
> the Service Manager pool, and alert the agent it came from — and both leave it
> where it is when that pool is unstaffed.

## After a case closes — satisfaction follow-up (automatic)

When a case is set to **Closed**, the system waits **one day** and then prompts
the case owner to collect a **satisfaction (CSAT) rating** from the customer.
This keeps CSAT capture consistent without anyone remembering to chase it.

## Knowledge articles

**Knowledge** articles are your searchable library of solutions — for agents to
reference while resolving a case and for customers to self-serve. Keeping
articles current and well-titled is the main lever for deflection and faster
resolution times. (Today a case isn't directly linked to an article; agents
search Knowledge by topic.)

---

**Related:** who can see and edit which cases (escalation sharing), and how to
change SLA timing or escalation behavior, are covered in
**[Administration](crm_admin.md)**.
