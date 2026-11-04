---
title: Access — Positions, Sharing & Permission Sets
description: Who can see whose records — positions, the sharing rules that widen ownership, and the permission sets behind them.
order: 1
# sources: the sharing/position metadata this doc documents. Build ignores
# unknown frontmatter keys.
sources:
  - sharing_rule:account_team_sharing
  - sharing_rule:opportunity_sales_sharing
  - sharing_rule:opportunity_executive_sharing
  - sharing_rule:case_escalation_sharing
  - sharing_rule:case_director_sharing
  - sharing_rule:case_escalated_from_sharing
  - sharing_rule:campaign_leadership_manager
  - sharing_rule:campaign_leadership_director
  - position:crm_positions
---

# Access — Positions, Sharing & Permission Sets

For administrators and implementers. This covers the part of HotCRM that isn't
visible by clicking around: **who can see whose data**, and why.

## Positions

Positions are the groups that distribute record access. **Setup → People &
Organization → Position Holders** lists them, with who holds each: a director, a manager and a front-line rung for each of sales,
service and marketing, an **Executive** position, and two territory
groupings (**NA Sales Team** and **EU Sales Team**).

They are **flat** — nothing rolls up. A Sales Director does not inherit a Sales
Manager's access; each rung that needs a record is named by its own sharing
rule, which is why the leadership rules below come in pairs.

These same names back the approval and escalation automation: large deals route
to **Sales Manager** / **Sales Director**; an escalated case is handed to the
**Service Manager** holding the fewest open cases. Note what the flatness means
there: the hand-off targets the *position*, not "the owner's manager" — there is
no reporting line to walk — and with nobody holding it the case keeps its
owner.

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
| Escalated Cases — Previous Owner | Case | **Read** | The agent an escalation took the case from keeps sight of it until it is closed. |
| Live Campaigns — Marketing Manager / Director | Campaign | **Edit** | Marketing leadership works any live campaign. |
| Forecasts — Sales Manager Edit | Forecast | **Edit** | Sales Managers adjust any rep's forecast. An edit share never grants delete, so forecasts stay undeletable for them. |

## Queues — records nobody owns yet

A new case or lead that arrives with no owner goes to a queue, not to a sharing
rule. HotCRM ships two: **Support Intake** (`case_intake`, members: everyone
holding *Service Agent*) and **Lead Intake** (`lead_intake`, members: everyone
holding *Sales Rep*). An assignment rule hands each new ownerless record to the
member with the least open work. When the queue has no members, the record
waits there with no owner: every member can open it and click **Claim** to
become its owner, and nothing else on the record changes.

To add one person to a queue without giving them the position, go to
**Setup → Access Control → Queue Members** and add a row with the queue's name
(`case_intake` or `lead_intake`) and the person as member. The two queues ship
with the app, so **Setup → Access Control → Queues** does not list them.

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

## Permission sets

Permission sets ship for the standard personas: **System Administrator**,
**Sales Manager**, **Sales Representative**, **Service Agent**, **Service
Manager**, **Marketing User**, and **Guest (Public Forms)** for unauthenticated
web-to-lead capture.

Permission sets are **explicit-allow only**: an object no set names is denied to
every user, administrators included — the object-level CRUD gate refuses the
call before OWD, sharing rules or *View All Data* are consulted. Adding an
object to the app therefore always means adding a grant for it;
`test/authorization-coverage.test.ts` fails the build when one is missing.

Export is **granted, not implied**. The platform's own administrator access
carries no export, so an administrator, the account that set the deployment up
included, exports a list only once a set granting export is assigned to them:
**System Administrator** grants it on Leads, Accounts, Contacts, Opportunities
and Cases. On a local demo box, `pnpm demo:staff` assigns that set to the dev
admin. The administrator's set is also what opens this **Admin Manual**: it is
published to holders of **System Administrator** only (**Tenant Administrator**
on a multi-organization deployment), and nobody else sees it under **Help**.

Two record-level rules sit on top of the object grants:

- `crm_opportunity.is_private` — a deal flagged Private is visible only to its
  owner, including to the sets that hold org-wide opportunity read (Sales
  Manager, Marketing User).
- Field-level security masks `crm_account.health_score` (read-only below Sales
  Manager), `crm_case.internal_notes` (service-only; hidden from Sales Rep),
  `crm_account.annual_revenue` and the computed case SLA fields.

## Turning a module off

HotCRM ships as the core app plus three modules — **HotCRM Service**,
**HotCRM Revenue** and **HotCRM Marketing** — and a module you do not use can be
turned off at **Setup → Installed Apps**: choose *Show all*, open the module
and choose **Disable**. **Enable** turns it back on.

While a module is off, nobody sees it, administrators included:

- Its entries leave the sidebar — the Service group and *My Cases* for
  Service, *Quotes*, *Products* and *Price Books* for Revenue, *Campaigns* for
  Marketing — and its records cannot be opened.
- The core app stops offering the buttons that lead into it: **Add to
  Campaign** on leads and contacts while Marketing is off, **Generate Quote**
  on opportunities while Revenue is off. The CRM Overview's *List Price by
  Category* tile is left out while Revenue is off.
- A field that points into the module, such as an opportunity's *Campaign* or
  the case a task is related to, keeps the value it already has on the record
  page, but its picker offers nothing new. The module's related lists read
  empty.

Turning a module off deletes nothing: its records stay in the database, and
turning the module back on brings them, its sidebar entries and its buttons
back.

---

**Related:** where every automated threshold lives — see
[Automation](./crm_admin_automation.md).
