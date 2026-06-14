---
title: Service Process & SLA Rules
description: Case priority, SLA breach handling, automatic escalation, and satisfaction follow-up — the rules behind the Service desk.
---

# Service Process & SLA Rules

For service agents and service managers. Cases move from intake to resolution,
and the system enforces SLAs and escalations automatically — this guide explains
exactly when and how.

## Case priority

Every case carries a **priority** that drives its urgency:

`Low → Medium → High → Critical`

Each case also carries an **SLA Due Date** — the deadline to resolve it, set
when the case is logged per your support policy. The automation below watches
that clock and the priority for you.

## The clock is watched for you — SLA breach handling (automatic)

An **hourly** sweep checks every open case. If a case passes its **SLA Due Date**
without being resolved, the system automatically:

- marks it **SLA Violated**,
- **escalates** it (status → *Escalated*), and
- alerts the owner and their manager.

You never have to manually catch a missed SLA — but you should work cases before
the due date, because a breach is recorded permanently on the case.

## Critical cases escalate instantly (automatic)

The moment a case is set to **Critical** priority, it escalates without waiting
for the SLA clock:

- it is **reassigned to the owner's manager**,
- status moves to **Escalated** with an escalation reason stamped, and
- a **high-priority follow-up task** is created (due the next day), with the
  manager notified.

> Two safety nets, two triggers: **priority = Critical** escalates *immediately*;
> a **missed SLA Due Date** escalates *on breach*. Both reassign and alert.

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
