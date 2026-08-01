---
title: Administration — Positions, Sharing & Automation Knobs
description: Positions, record-visibility (sharing) rules, profiles, and where every automated threshold is configured.
# sources: the automation/sharing/position metadata this doc documents. The knobs
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
  - sharing_rule:opportunity_executive_sharing
  - sharing_rule:case_escalation_sharing
  - sharing_rule:case_director_sharing
  - sharing_rule:campaign_leadership_manager
  - sharing_rule:campaign_leadership_director
  - position:crm_positions
---

# Administration — Positions, Sharing & Automation

For administrators and implementers. This covers the parts of HotCRM that aren't
visible by clicking around: **who can see whose data**, and **where the automated
thresholds live** so you can tune them.

## Positions

Positions are the groups that distribute record access:

```
Executive
Sales Director      Sales Manager      Sales Representative
Service Director    Service Manager    Service Agent
Marketing Director  Marketing Manager  Marketing User
NA Sales Team       EU Sales Team          (territory groupings)
```

They are **flat** — nothing rolls up. A Sales Director does not inherit a Sales
Manager's access; each rung that needs a record is named by its own sharing
rule, which is why the leadership rules below come in pairs.

These same names back the approval and escalation automation: large deals route
to **Sales Manager** / **Sales Director**; critical cases reassign to the owner's
**manager**.

## Record visibility (sharing rules)

Ownership-based access is widened by these rules:

| Rule | Object | Access | Purpose |
|---|---|---|---|
| Account Team | Account | **Edit** | Sales Managers edit active customer accounts. Criteria-based despite the name — there is no account-team roster object. |
| Territory — North America / Europe | Account | **Edit** | Regional teams edit accounts in their territory. |
| Sales Sharing | Opportunity | **Read** | Sales Director sees large open deals. |
| Large Open Deals — Executive | Opportunity | **Read** | The same deals at the Executive rung. |
| Case Escalation | Case | **Edit** | Escalated cases become editable by the escalation handler. |
| Escalated Cases — Service Director | Case | **Read** | Service Director sees what the manager is paged about. |
| Live Campaigns — Marketing Manager / Director | Campaign | **Edit** | Marketing leadership works any live campaign. |

Detail objects — opportunity line items, quote line items, campaign members and
contacts — carry **no** sharing rules by design: their record access derives
from their parent (`controlled_by_parent`, ADR-0055), so a share on the parent
is what widens them. Writing one requires edit access to that parent.

**A rule widens one object, not the records under it.** The account rules above
hand over the account and — through `controlled_by_parent` — its contacts.
Quotes, contracts and tasks on that account are `private` with no rule of their
own, and opportunities only widen for the ≥ $100k leadership rules, so those
related lists stay own-only for a territory recipient. Whether that should
change is an open product decision (#549); until it is made, the docs describe
the own-only behaviour rather than promising a 360° view.

## Profiles

Permission sets ship for the standard personas: **System Administrator**,
**Sales Manager**, **Sales Representative**, **Service Agent**, **Marketing
User**, and **Guest (Public Forms)** for unauthenticated web-to-lead capture.

Permission sets are **explicit-allow only**: an object no set names is denied to
every user, administrators included — the object-level CRUD gate refuses the
call before OWD, sharing rules or *View All Data* are consulted. Adding an
object to the app therefore always means adding a grant for it;
`test/authorization-coverage.test.ts` fails the build when one is missing.

Two record-level rules sit on top of the object grants:

- `crm_opportunity.is_private` — a deal flagged Private is visible only to its
  owner, including to the sets that hold org-wide opportunity read (Sales
  Manager, Marketing User).
- Field-level security masks `crm_account.health_score` (read-only below Sales
  Manager), `crm_case.internal_notes` (service-only; hidden from Sales Rep),
  `crm_account.annual_revenue` and the computed case SLA fields.

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
