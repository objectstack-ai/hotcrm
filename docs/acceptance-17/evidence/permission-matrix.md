# HotCRM 17.0 rc.2 — Declared Permission / Sharing Matrix (for acceptance testing)

Sources (all read on branch `claude/hotcrm-17-rc1-acceptance-hj869o`):

- `/home/user/hotcrm/src/profiles/sales-rep.profile.ts`, `sales-manager.profile.ts`, `service-agent.profile.ts`, `marketing-user.profile.ts`, `system-admin.profile.ts` (also `guest-portal.profile.ts`, insert-only, out of scope here)
- `/home/user/hotcrm/src/sharing/account.sharing.ts`, `case.sharing.ts`, `opportunity.sharing.ts`, `campaign.sharing.ts`, `positions.ts`, `demo-staffing.ts`
- `/home/user/hotcrm/src/objects/*.object.ts` (`sharingModel`, `owner` fields)
- `/home/user/hotcrm/test/authorization-coverage.test.ts` (declared invariants), plus `test/sharing-coverage.test.ts` and `test/demo-staffing.test.ts` for #549/#548 context
- `/home/user/hotcrm/scripts/demo-staff.ts` (test-user creation path)

Platform semantics that the metadata relies on (as documented in-repo):

- Permission sets are **explicit-allow only**. An object absent from a profile's `objects` map is denied at the object-CRUD gate *before* OWD/sharing/`view_all_data` are consulted.
- On a `private`-OWD object, the row baseline is **owner-only** (keyed on the platform `owner_id` column, NOT the app-authored `owner` lookup — see #548 below); `viewAllRecords: true` widens to all rows; sharing rules (`sys_record_share`) only ever widen.
- `controlled_by_parent` objects (contact, campaign_member, event_attendee, opportunity/quote line items) derive row access from their parent (ADR-0055); `readScope`/`viewAllRecords` are inert there and the coverage test forbids authoring a scope on them.
- 17.0: `allowExport` is a hard opt-in gate (unset = export DENIED even for admins; `viewAllRecords`/`modifyAllRecords` do not substitute). Export is read-derived: it never widens rows.
- Install-time binding: **a permission set whose name matches a position is bound to that position** (`test/demo-staffing.test.ts`). Plus the platform's additive `member_default` set for every org member (grants e.g. baseline crm_account read at `own` depth — see `src/sharing/demo-staffing.ts` header).

## 1. Object-level matrix

OWD per object (from `sharingModel` in `src/objects/*.object.ts`):

| Object | OWD | Owner field notes |
|---|---|---|
| crm_account | private | app `owner` lookup + `renewal_owner`; platform `owner_id` is what sharing reads |
| crm_campaign | public_read | `owner` lookup |
| crm_campaign_member | controlled_by_parent (parent: crm_campaign) | no owner field (was `private` pre-#488) |
| crm_case | private | `owner` lookup |
| crm_contact | controlled_by_parent (master-detail: crm_account) | `owner` lookup (rows still follow the account) |
| crm_contract | private | `owner` lookup |
| crm_event | private | `owner` lookup (comment: #548 Option B decided, not implemented) |
| crm_event_attendee | controlled_by_parent (parent: crm_event) | — |
| crm_forecast | private | `owner` lookup |
| crm_knowledge_article | public_read | — |
| crm_lead | private | `owner` |
| crm_opportunity | private | `owner`; `is_private` checkbox honoured only by RLS (see §3) |
| crm_opportunity_line_item | controlled_by_parent (parent: crm_opportunity) | — |
| crm_product | public_read | — |
| crm_quote | private | `owner` |
| crm_quote_line_item | controlled_by_parent (parent: crm_quote) | — |
| crm_task | private | `owner` |

Legend: `C R U D` = allowCreate/Read/Edit/Delete; `VA` = viewAllRecords; `MA` = modifyAllRecords; `own` = explicit `readScope: 'own'`; `X` = allowExport; `—` = **no grant at all (object-level 403 for this profile)**; `deny` = grant present with every flag false.

| Object (OWD) | sales_rep | sales_manager | service_agent | marketing_user | system_admin |
|---|---|---|---|---|---|
| crm_lead (private) | CRU-, own, X | CRUD, VA+MA, X | -R--, VA, X | CRU-, VA, X | CRUD, VA+MA, X |
| crm_account (private) | CRU-, own, X | CRUD, VA+MA, X | -R--, VA, X | -R--, VA, X | CRUD, VA+MA, X |
| crm_contact (cbp) | CRU-, X (rows follow account) | CRUD, VA+MA, X | -RU-, VA, X | CRU-, VA, X | CRUD, VA+MA, X |
| crm_opportunity (private) | CRU-, own, X | CRUD, VA+MA, X (+RLS is_private) | **deny** (explicit all-false) | -R--, VA, X (+RLS is_private) | CRUD, VA+MA, X |
| crm_quote (private) | CRU-, own | CRUD, VA+MA | — | — | CRUD, VA+MA |
| crm_contract (private) | -R--, own | CRU-, VA | — | — | CRUD, VA+MA |
| crm_product (public_read) | -R--, VA | CRU-, VA | -R--, VA | — | CRUD, VA+MA |
| crm_campaign (public_read) | -R--, VA | CRU-, VA | — | CRU-, VA (+RLS update-widening) | CRUD, VA+MA |
| crm_case (private) | -R--, own, X | -R--, VA, X | CRU-, own, X | — | CRUD, VA+MA, X |
| crm_task (private) | CRUD, own | CRUD, VA+MA | CRUD, own | — | CRUD, VA+MA |
| crm_event (private) | CRUD, own | CRUD, VA+MA | CRUD, own | — | CRUD, VA+MA |
| crm_event_attendee (cbp) | CRUD | CRUD | CRUD | — | CRUD, VA+MA |
| crm_forecast (private) | -R--, own | CRU-, VA+MA | — | — | CRUD, VA+MA |
| crm_knowledge_article (public_read) | -R--, VA | -R--, VA | CRU-, VA | -R--, VA | CRUD, VA+MA |
| crm_opportunity_line_item (cbp) | CRUD (via parent) | CRUD (via parent) | — | — | CRUD, VA+MA |
| crm_quote_line_item (cbp) | CRUD (via parent) | CRUD (via parent) | — | — | CRUD, VA+MA |
| crm_campaign_member (cbp) | -R-- | -R-- | — | CRU- | CRUD, VA+MA |

`system_admin` additionally declares `systemPermissions: [view_setup, manage_users, customize_application, view_all_data, modify_all_data, manage_profiles, manage_roles, manage_sharing]`.

Export-bit invariant (pinned by `authorization-coverage.test.ts`): `allowExport` exists exactly where allowRead exists AND the app ships an export surface — the surface set is exactly `crm_account, crm_case, crm_contact, crm_lead, crm_opportunity`. No other object carries the bit on any set; guest_portal carries none.

## 2. Field-level security (FLS) — complete declared list

There are NO other FLS declarations besides these (`fields` maps in the five profiles; system_admin declares none):

| Field | sales_rep | sales_manager | service_agent | marketing_user |
|---|---|---|---|---|
| crm_account.health_score | read-only | read+write | read-only | read-only |
| crm_account.annual_revenue | read-only | (unauthored) | (unauthored) | (unauthored) |
| crm_account.description | read+write | (unauthored) | (unauthored) | (unauthored) |
| crm_opportunity.amount | read+write | read+write | (no read on object at all) | read-only |
| crm_opportunity.probability | read+write | (unauthored) | — | (unauthored) |
| crm_quote.internal_notes | read+write (stays writable after quote sent, per quote.hook) | read+write | (no object grant) | (no object grant) |
| crm_case.internal_notes | **MASKED (readable: false, editable: false)** | read-only | read+write | (no object grant) |
| crm_case.is_sla_violated | (unauthored) | (unauthored) | read-only | — |
| crm_case.resolution_time_hours | (unauthored) | (unauthored) | read-only | — |

Notes for the tester:

- The only fully **masked** field in the app is `crm_case.internal_notes` for **sales_rep**. Expect it absent/nulled in rep reads of a case they otherwise can read. The coverage test guarantees no view filters/sorts on it (a masked field in a filter throws `field_predicate_denied`).
- `crm_opportunity.amount` is NOT masked for anyone who can read opportunities — the differences are editability (marketing read-only; rep/manager/admin writable).
- FLS is only authored where the same set holds allowRead on the object (test-pinned), so e.g. marketing has no case FLS because it has no case grant.

## 3. Sharing rules and row-level security policies

### Criteria sharing rules (9 total, all `type: 'criteria'`, all target positions)

| # | Rule name | File | Object | Condition (CEL) | Level | Target position |
|---|---|---|---|---|---|---|
| 1 | account_team_sharing | src/sharing/account.sharing.ts | crm_account | `record.type == "customer" && record.is_active == true` | edit | sales_manager |
| 2 | north_america_territory | src/sharing/account.sharing.ts | crm_account | `record.billing_country in ["US","CA","MX"]` | edit | na_sales_team |
| 3 | europe_territory | src/sharing/account.sharing.ts | crm_account | `record.billing_country in ["UK","DE","FR","IT","ES"]` (deliberately `UK` not `GB`) | edit | eu_sales_team |
| 4 | campaign_leadership_manager | src/sharing/campaign.sharing.ts | crm_campaign | `record.status in ["planning","in_progress"] && record.is_active == true` | edit | marketing_manager |
| 5 | campaign_leadership_director | src/sharing/campaign.sharing.ts | crm_campaign | same as #4 | edit | marketing_director |
| 6 | case_escalation_sharing | src/sharing/case.sharing.ts | crm_case | `record.priority == "critical" && record.is_closed == false` | edit | service_manager |
| 7 | case_director_sharing | src/sharing/case.sharing.ts | crm_case | same as #6 | **read** | service_director |
| 8 | opportunity_sales_sharing | src/sharing/opportunity.sharing.ts | crm_opportunity | `!(record.stage in ["closed_won","closed_lost"]) && record.amount >= 100000` | read | sales_director |
| 9 | opportunity_executive_sharing | src/sharing/opportunity.sharing.ts | crm_opportunity | same as #8 | read | executive |

Positions are FLAT (ADR-0090 D3 — no hierarchy, no roll-up), which is why every leadership rung (executive, service_director, marketing_manager, marketing_director) has its own explicit rule. Declared positions (`src/sharing/positions.ts`): executive, sales_director, sales_manager, sales_rep, service_director, service_manager, service_agent, marketing_director, marketing_manager, marketing_user, na_sales_team, eu_sales_team. The territory team positions are record groupings only — no permission set binds to them.

Rules #4/#5 target a `public_read` object at `edit` level — read adds nothing there; what these rules actually add is WRITE access to live campaigns for marketing leadership. The `authorization-coverage` test pins that a share on a public_read object must not be read-level.

### Row-level security policies (in `rowLevelSecurity` of profiles)

| Policy | Set | Object | Op | Predicate (`using`) |
|---|---|---|---|---|
| opportunity_private_owner_only | sales_manager | crm_opportunity | select | `is_private == false \|\| owner == current_user.id` |
| opportunity_private_owner_only_marketing | marketing_user | crm_opportunity | select | `is_private == false \|\| owner == current_user.id` |
| marketing_campaign_updates | marketing_user | crm_campaign | update | `id != null` (all-rows widener vs member_default's owner-only-writes) |
| marketing_campaign_member_updates | marketing_user | crm_campaign_member | update | `id != null` |

The **is_private rule**: `crm_opportunity.is_private` is settable in the opportunity form, and the ONLY thing enforcing it is these two RLS policies — carried by exactly the two sets holding `viewAllRecords` on opportunities (sales_manager, marketing_user). Compiles to `{$or:[{is_private:false},{owner:<caller>}]}`. Note the predicate keys on the app `owner` lookup, not platform `owner_id` (relevant to #548). system_admin carries **no** such policy — an admin (viewAllRecords + view_all_data) is expected to see private deals. sales_rep needs no policy (own-scope already excludes others' deals). The sharing rules #8/#9 vs the RLS interact: a sales_director share on a >=100k deal that is ALSO is_private is only filtered for sets carrying the RLS — sales_director holds no persona set here, so if a tester stands one up, check which layer wins.

## 4. Testable expectations per profile

Assume seed data: 9 accounts (6 NA, 2 EU (UK/DE), 1 no-territory SG); `demo_bootstrap` assigns ownership of ALL seeded records to the first user (dev admin). API base `http://localhost:4001`, cookie auth via `POST /api/v1/auth/sign-in/email`. Query via `POST /api/v1/data/<object>/query`.

### sales_rep (e.g. RC1ACC-rep, position `sales_rep` only, no territory)

1. `GET/query crm_forecast` → only rows where `owner_id` = self (freshly created user owning nothing: 0 rows, NOT a 403).
2. `query crm_account` → only self-owned accounts (0 for a new user with no territory position); after creating an account, exactly that one.
3. `query crm_opportunity` → own only; another user's >=100k deal must NOT appear (rep holds no leadership position).
4. `query crm_product` and `crm_knowledge_article` and `crm_campaign` → ALL rows (viewAllRecords on public_read catalogs).
5. Read an own case → `internal_notes` masked (absent/null); write to `crm_case.internal_notes` → denied/ignored (FLS).
6. Create opportunity + line items (POST crm_opportunity, crm_opportunity_line_item) → 2xx; line items on someone ELSE's opportunity → denied (parent-derived write).
7. Export: list-export/report-export on crm_opportunity → allowed but contains only own book. Export on crm_quote → denied (`EXPORT_NOT_PERMITTED`; no allowExport bit).
8. NEGATIVE: `DELETE crm_account/<id>` → 403 (allowDelete false).
9. NEGATIVE: `PATCH crm_account.health_score` → denied (FLS read-only); `PATCH crm_account.annual_revenue` → denied.
10. NEGATIVE (with `na_sales_team` added, after rule evaluate): reads the 6 NA accounts not owned + their contacts, but the accounts' quotes/contracts/tasks/events related lists stay empty (own-only children) — **this is #549, expected, do NOT file**.

### sales_manager (RC1ACC-mgr, position `sales_manager`)

1. `query crm_opportunity` → ALL non-private deals org-wide (viewAllRecords), and edit/delete on any of them succeeds (modifyAllRecords).
2. `query crm_opportunity` with a deal flagged `is_private=true` owned by someone else → row HIDDEN (RLS); own private deal → visible.
3. `query crm_forecast` → every rep's snapshots; PATCH a rep's forecast committed number → 2xx.
4. Read case → `internal_notes` visible; PATCH `crm_case.internal_notes` → denied (FLS read-only for this set).
5. Via sharing rule #1 (`account_team_sharing`): after rule evaluation, holds edit share on all active customer accounts (redundant with viewAllRecords for read — verify via `sys_record_share` rows or `POST /api/v1/security/explain`).
6. Submitting an opportunity >= $100k for approval → `manager_review` node resolves to this user (non-empty approver slate).
7. NEGATIVE: `POST crm_case` → 403 (allowCreate false); `PATCH crm_case` non-internal fields → 403 (allowEdit false).
8. NEGATIVE: `DELETE crm_contract`, `DELETE crm_product`, `DELETE crm_campaign` → 403 (allowDelete false on all three).
9. NEGATIVE: quote export → `EXPORT_NOT_PERMITTED` (no allowExport on crm_quote despite full CRUD+MA — 17.0 gate).

### service_agent (RC1ACC-agent, position `service_agent`)

1. `query crm_account` / `crm_contact` / `crm_lead` → ALL rows (viewAllRecords context reads); PATCH contact → 2xx, PATCH account → 403 (allowEdit false).
2. `query crm_case` → own queue only; another agent's non-critical case hidden.
3. Critical open case owned by another agent → still hidden for the agent (escalation rules target service_manager/service_director positions, NOT service_agent).
4. Knowledge: create + edit own draft article → 2xx; read all published → all rows; DELETE article → 403.
5. `log_call`/`log_meeting` on a case → creates crm_event → 2xx (#592 grant).
6. Read a case → `internal_notes` readable AND writable; `is_sla_violated`, `resolution_time_hours` read-only (PATCH denied).
7. NEGATIVE: `query crm_opportunity` → 403 object-level (explicit all-false deny — before OWD is even consulted).
8. NEGATIVE: `query crm_quote`, `crm_contract`, `crm_forecast`, `crm_campaign_member` → 403 (no grant at all).
9. NEGATIVE: on a territory/org-readable account detail page, tasks/events related lists show only agent-owned rows even though the account is fully readable — **#549, expected**.

### marketing_user (RC1ACC-mkt, position `marketing_user`)

1. `query crm_lead`, `crm_contact` → all rows, editable; DELETE lead → 403.
2. `query crm_opportunity` → all NON-private rows (viewAllRecords + RLS); private deal owned by someone else → hidden; amount readable but PATCH amount → denied (FLS read-only + allowEdit false anyway).
3. "Add to Campaign" action: enrolls leads into a campaign the user did NOT create → 2xx (needs RLS wideners `marketing_campaign_updates` + `marketing_campaign_member_updates`; if this 403s, the RLS widening regressed).
4. PATCH a `crm_campaign_member.status` created by the enrollment flow (system-created row) → 2xx (same widener).
5. Export lead/contact/account/opportunity lists → allowed; campaign export → denied (no bit).
6. NEGATIVE: `query crm_case`, `crm_task`, `crm_quote`, `crm_product`, `crm_event`, `crm_forecast` → 403 (no grants).
7. NEGATIVE: `POST crm_account` → 403 (allowCreate false); `DELETE crm_campaign` → 403.
8. NEGATIVE: DELETE a crm_campaign_member row → 403 (delete reserved to manager/admin — actually only system_admin grants it).

### system_admin (dev admin or RC1ACC-admin, see §5 binding caveat)

1. Full CRUD on every one of the 17 objects, all rows, including is_private opportunities (no RLS on this set) — `query crm_opportunity` must include private deals owned by others.
2. Masked fields do NOT apply: reads `crm_case.internal_notes` etc. everywhere.
3. Export on crm_lead/account/contact/opportunity/case → allowed; export on crm_quote/campaign/task/... → `EXPORT_NOT_PERMITTED` **even for admin** (17.0: modifyAllRecords does not substitute for allowExport — expected, not a bug).
4. Setup surfaces reachable (view_setup, manage_users, manage_sharing).
5. NEGATIVE-ish: any NEW object added without a system_admin grant would 403 for admin too (explicit-allow-only); rc acceptance can spot-check one uncatalogued sys-adjacent surface if present.

### Known-broken / do-not-refile areas

- **#548 — two ownership columns.** Every object carries the app-authored `owner` lookup (drives "My …" views, notifications, analytics owner axis) AND the platform `owner_id` (the ONLY column the sharing service's private-OWD baseline reads). The `owner_id` migration is "decided (Option B) but not implemented" (`event.object.ts` comment). Consequence to expect: **editing the `owner` field on a record does not move row-level access** — the old owner may keep reading it and the new owner may not see it, and RLS `owner == current_user.id` (is_private policies) diverges from OWD `owner_id` behavior after a reassignment. Import mappings also still target `owner`. Attribute all reassignment-visibility anomalies to #548; do not file duplicates.
- **#549 — sharing rules do not cascade to children.** Territory/team rules are authored on `crm_account` ONLY. A rep/agent who receives an account via territory/team share reads the account + its contacts (controlled_by_parent), but quotes, contracts, tasks, events on it stay own-only, and opportunities widen only via the >=$100k leadership rules; cases only via the critical-escalation rules. Related lists that look "missing rows" on shared accounts are the pinned status quo (`test/sharing-coverage.test.ts` ACCOUNT_CHILD_COVERAGE ledger: contact=derived, opportunity=partial, case=partial, quote/contract/task/event=own_only). Open business decision — do not file duplicates.
- Also note (#621 history): territory rules filter on the flat `crm_account.billing_country` projection maintained by `account.hook.ts` — an account whose `billing_address.country` is typo'd/lowercase gets normalized (trim+uppercase); EU list uses `UK` not `GB`.

## 5. Creating test users (RC1ACC-*)

How the app itself does it (`scripts/demo-staff.ts` driving `src/sharing/demo-staffing.ts`, all idempotent, local-server-only guard):

1. **Sign in as dev admin**: `POST /api/v1/auth/sign-in/email` with `admin@objectos.ai` / `admin123` (exists only under `NODE_ENV=development`, server from `pnpm dev` on port 4001). Keep the session cookie; send `Origin: http://localhost:4001` (better-auth rejects other origins; use hostname `localhost`, not `127.0.0.1` — the latter 403s INVALID_ORIGIN).
2. **Create user**: `POST /api/v1/auth/admin/create-user` with `{email, password (>=8 chars), name, mustChangePassword: false}`. This is the ONLY sanctioned path — direct `sys_user` inserts are refused by the ADR-0092 write guard and would be un-loginable anyway. It also creates the `sys_member` row (role `member`) automatically. Without `mustChangePassword: false` every subsequent call 403s PASSWORD_EXPIRED.
3. **Bind positions**: `POST /api/v1/data/sys_user_position` with `{user_id, position, organization_id}` (org id read from the admin's own `sys_member` row). **Profile binding = position binding**: a permission set whose name matches a position is bound to it at install time, so giving a user position `sales_rep` gives them the SalesRepProfile set.
4. **Re-evaluate sharing rules** (mandatory — seeded rows were written `isSystem: true`, so the grant-materialising hook skipped them): list `sys_sharing_rule` where `active = true`, then `POST /api/v1/sharing/rules/<id>/evaluate` for each (diff-based, safe to rerun).
5. Verify per user with `POST /api/v1/security/explain` and/or `POST /api/v1/data/crm_account/query` as that user.

Recommended RC1ACC roster (mirrors DemoOrgStaffing's shape; password e.g. `rc1acc-Pass1`):

| Email | Positions | Bound profile |
|---|---|---|
| RC1ACC-rep@objectos.ai | `sales_rep` (optionally + `na_sales_team` for territory tests) | sales_rep |
| RC1ACC-mgr@objectos.ai | `sales_manager` | sales_manager |
| RC1ACC-agent@objectos.ai | `service_agent` | service_agent |
| RC1ACC-mkt@objectos.ai | `marketing_user` | marketing_user |
| RC1ACC-admin@objectos.ai | (no CRM position — see caveat) | system_admin |

**system_admin caveat**: `system_admin` is NOT in `CrmPositions`, so the name-match binding does not apply; the set binds to the platform admin anchor. `create-user` provisions `sys_member` role `member`, so a freshly created RC1ACC-admin will NOT hold the system_admin set — either run admin assertions as the dev-admin seed account (`admin@objectos.ai`, which demo_bootstrap makes owner of all seed records), or elevate the new user's member role through Setup → Users before testing. Verify with `POST /api/v1/security/explain` that the set actually resolved before attributing failures.

Alternative: extend `DemoOrgStaffing` locally (scratch copy) and run `pnpm demo:staff --url http://localhost:4001` — but note the shipped table only covers rep/rep/manager, and the script's verify step asserts territory behavior you may not want for all five users; direct API calls per steps 1-4 are cleaner for RC1ACC.

Keep test users NON-owners of seeded records (ownership stays with the dev admin) — a share proven against a record the user owns proves nothing, since private OWD already admits the owner.
