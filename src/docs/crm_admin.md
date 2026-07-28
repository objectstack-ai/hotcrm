---
title: Administration — Roles, Sharing & Automation Knobs
description: The role hierarchy, record-visibility (sharing) rules, profiles, and where every automated threshold is configured.
# sources: the automation/sharing/role metadata this doc documents. The knobs
# table is guarded by test/docs-drift.test.ts; build ignores unknown frontmatter keys.
sources:
  - flow:opportunity_approval
  - flow:lead_assignment
  - flow:opportunity_stagnation
  - flow:opportunity_won_alert
  - flow:quote_generation
  - flow:quote_expiration
  - flow:case_sla_monitor
  - flow:case_escalation
  - flow:case_csat_followup
  - flow:contract_renewal
  - flow:contract_expiration
  - sharing_rule:account_team_sharing
  - sharing_rule:opportunity_sales_sharing
  - sharing_rule:case_escalation_sharing
  - role:crm_role_hierarchy
---

# Administration — Roles, Sharing & Automation

For administrators and implementers. This covers the parts of HotCRM that aren't
visible by clicking around: **who can see whose data**, and **where the automated
thresholds live** so you can tune them.

## Role hierarchy

Visibility rolls **up** the hierarchy — a manager can see the records owned by
people below them.

```
Executive
├── Sales Director ── Sales Manager ── Sales Representative
├── Service Director ── Service Manager ── Service Agent
└── Marketing Director ── Marketing Manager ── Marketing User
```

These same roles back the approval and escalation automation: large deals route
to **Sales Manager** / **Sales Director**; critical cases reassign to the owner's
**manager** (one level up).

## Record visibility (sharing rules)

Ownership-based access is widened by these rules:

| Rule | Object | Access | Purpose |
|---|---|---|---|
| Account Team | Account | **Edit** | Named account-team members can edit the account. |
| Territory — North America / Europe | Account | **Edit** | Regional teams edit accounts in their territory. |
| Sales Sharing | Opportunity | **Read** | Broader sales visibility into opportunities. |
| Case Escalation | Case | **Edit** | Escalated cases become editable by the escalation handler. |

## Profiles

Permission sets ship for the standard personas: **System Administrator**,
**Sales Manager**, **Sales Representative**, **Service Agent**, **Marketing
User**, and **Guest (Public Forms)** for unauthenticated web-to-lead capture.

## Automation knobs — where every threshold lives

The business rules are defined in the **flows** under `src/flows/`. To change a
threshold, edit the flow and redeploy. These are the values an admin most often
revisits:

| Behavior | Current setting | Defined in |
|---|---|---|
| Large-deal approval (manager) | amount **> $100,000** | `opportunity-approval.flow.ts` |
| Large-deal approval (+ director) | amount **> $500,000** | `opportunity-approval.flow.ts` |
| Hot-lead follow-up SLA | **1 day** (Lead Score ≥ 4★) | `lead-assignment.flow.ts` |
| Standard-lead follow-up SLA | **3 days** | `lead-assignment.flow.ts` |
| Stalled-deal nudge | **> 14 days** in stage, swept daily **07:30** | `opportunity-stagnation.flow.ts` |
| Won-deal alert | **Closed Won** over **$100,000** | `opportunity-won-alert.flow.ts` |
| Quote default validity | **30 days** | `quote-generation.flow.ts` |
| Quote auto-expiration sweep | daily **01:00** | `quote-expiration.flow.ts` |
| Case SLA breach sweep | **hourly** | `case-sla-monitor.flow.ts` |
| Critical-case auto-escalation | priority = **Critical** | `case-escalation.flow.ts` |
| CSAT request delay after close | **1 day** | `case-csat-followup.flow.ts` |
| Contract renewal reminder | each contract's **Renewal Notice Days**, swept daily **08:00** | `contract-renewal.flow.ts` |
| Contract auto-expiration | past **end date**, swept daily **00:00** | `contract-expiration.flow.ts` |

> Object names, fields, and relationships are visible directly in **Studio** and
> on each record's detail page — they are intentionally **not** duplicated here.
> This guide documents only what those screens can't tell you.

## AI skills

HotCRM ships **skills**, not assistants of its own. The platform provides the
assistant (ObjectStack ADR-0063: the runtime owns exactly two agents and the
surface you are in binds one); an app extends it by authoring skills that
attach by surface affinity. HotCRM's six — live data, lead qualification, case
triage, email drafting, revenue forecasting, customer 360 — operate over live
CRM data and reach anything that *changes* state through the same Actions the
UI buttons use, so permissions and audit are identical. The end user simply
asks — no agent selection required.
