---
title: Automation — Where Every Threshold Lives
description: Every automated threshold and schedule, the flow that defines it, the scheduled-work switch, and the AI skills.
order: 2
# sources: the automation metadata this doc documents. The knobs table is
# guarded by test/docs-drift.test.ts; build ignores unknown frontmatter keys.
sources:
  - flow:opportunity_approval
  - flow:lead_assignment
  - flow:opportunity_stagnation
  - flow:opportunity_won_alert
  - flow:quote_generation
  - flow:quote_expiration
  - flow:case_sla_monitor
  - flow:case_escalation
  - flow:contract_renewal
  - flow:contract_expiration
---

# Automation — Where Every Threshold Lives

For administrators and implementers. The user guides tell people what the system
does on its own; this page tells you **where each of those rules is defined**,
so you can tune it.

## Automation knobs

The business rules are defined in the **flows**, and each package keeps its own
flows in its `flows/` directory. To change a threshold, edit the flow and
redeploy. These are the values an admin most often revisits:

| Behavior | Current setting | Defined in |
|---|---|---|
| Large-deal approval (manager) | amount **$100,000 or more** | `opportunity-approval.flow.ts` |
| Large-deal approval (+ director) | amount **> $500,000** | `opportunity-approval.flow.ts` |
| Hot-lead follow-up SLA | **1 day** (Lead Score ≥ 4★) | `lead-assignment.flow.ts` |
| Standard-lead follow-up SLA | **3 days** | `lead-assignment.flow.ts` |
| Stalled-deal nudge | **> 14 days** in stage, swept daily **07:30** (scheduled work only) | `opportunity-stagnation.flow.ts` |
| Won-deal alert | **Closed Won** at **$100,000** or more | `opportunity-won-alert.flow.ts` |
| Quote default validity | **30 days** | `quote-generation.flow.ts` |
| Quote auto-expiration sweep | daily **01:00** (scheduled work only) | `quote-expiration.flow.ts` |
| Case SLA breach sweep | **hourly** (scheduled work only) | `case-sla-monitor.flow.ts` |
| Critical-case auto-escalation | priority = **Critical** | `case-escalation.flow.ts` |
| Contract renewal reminder | each contract's **Renewal Notice Days**, swept daily **08:00** (scheduled work only) | `contract-renewal.flow.ts` |
| Contract auto-expiration | past **end date**, swept daily **00:00** (scheduled work only) | `contract-expiration.flow.ts` |

## Scheduled work is off until you switch it on

The five rows marked *scheduled work only* are scheduled flows, and a deployment
runs scheduled flows only once it sets `OS_AUTOMATION_SCHEDULED_WORK_ENABLED=true`
(`1`, `on` and `yes` also count; `os doctor` prints the effective value). A
default install leaves it unset and boots those flows unbound: each logs that it
declares a `schedule` trigger but is NOT bound. So nothing sweeps there. No quote
or contract expires on its own, no SLA breach is flagged, and no stalled-deal or
renewal reminder goes out. The times above are what runs once the switch is on.

> Object names, fields, and relationships are visible directly in **Studio** and
> on each record's detail page — they are intentionally **not** duplicated here.
> This guide documents only what those screens can't tell you.

## AI skills

HotCRM ships **skills**, not assistants of its own. The platform provides the
assistant (ObjectStack ADR-0063: the runtime owns exactly two agents and the
surface you are in binds one); an app extends it by authoring skills that
attach by surface affinity. There is nothing to switch on per skill: which
skills exist is decided by the app. What each one does, and the buttons it may
press, is in [Using the Assistant](./crm_ai_skills.md).

---

**Related:** who can see whose records — see [Access](./crm_admin_access.md).
What each rule looks like to the people it affects — see
[Opportunities](./crm_sales_opportunities.md) and
[Cases & SLAs](./crm_service_cases.md).
