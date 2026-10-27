# #2320 · Track 5 — Setup browser pass

- **Tested:** hotcrm `main` `1f3f888` (all `@objectstack/*` at 18.2.0; `/api/v1/health` answers `version 18.2.0`), `pnpm dev` on a fresh DB, dev admin, then `pnpm demo:staff` (exit 0, 5 personas, 28 rule-materialised shares, 2 pending large-deal approvals).
- **Browser:** preinstalled Chromium through Playwright, desktop 1440×900 and phone 390×844 (`isMobile`).
- **Personas:** dev admin; `na.rep` / `eu.rep` (sales rep); `sales.manager`; `service.agent`; `service.manager`; and a marketing user created through Setup in this pass (`marketing.qa@objectos.ai`, Create User, then holder of the `marketing_user` position).
- **Reverted:** the private-deal toggle (set, measured, unset); the locale (switched back to English after every locale run); the marketing user's position holding was removed and the user banned (Setup offers no delete for a user, see S8). Import was cancelled at the mapping step, nothing imported.
- **Counts:** 9 defects (2 HotCRM metadata, 1 HotCRM docs, 6 platform console), 14 UI/UX suggestions. 97 screenshots.
- **Server stop:** the session stopped once (~09:35Z to 12:53Z); the dev server was rebooted on the same DB and the pass resumed. Nothing was re-seeded.

## Coverage

### Inventory rows (ADM, PRM)

| Row | Result | How it was checked |
|---|---|---|
| ADM-001 App and navigation | pass | 7 groups as listed; landing measured per persona: admin, sales manager and marketing user land on Executive Overview; reps on Sales Home; service agent and manager on Service Overview (`20-admin-02`, nav dumps). Defect D1 is about a nav entry's audience, not the landing. |
| ADM-002 Sales Home | pass, with D9 | 4 KPIs, My Leads / My Open Deals / My Open Tasks tabs, AI card, Upcoming Events (`40-02`, `71`, `81-rep-01`). The AI card's instruction points at a panel this install does not have (D9). |
| ADM-003 Launcher and utility bar | pass (removed) | No entry in any persona's navigation. |
| ADM-004 Data import | pass | Accounts → Import → upload `assets/import-templates/accounts.csv`: the saved mapping "Account Import (CSV)" is applied with map/lookup transforms (`60`, `62`). Cancelled before import. |
| ADM-005 Data export | pass, S7 | Export as CSV / XLSX is offered under Display (`69-adm005-display-admin`); service agent sees it on Cases and not on Opportunities (no export bit). Server gate measured: `GET /api/v1/data/crm_opportunity/export` 403 for the agent, 200 for the rep. |
| ADM-006 Files and attachments | pass | Account record: Attachments tab with Upload, Discussion feed (`65-account-attachments-tab`). |
| ADM-007 Notifications | pass | Bell inbox lists the three escalation "Urgent task" notifications with bodies (`66`). |
| ADM-008 Multi-language | pass for HotCRM's own packs; platform gaps D5, D6, D7 | zh-CN: HotCRM nav, dashboards, list, record, Sales Home, Setup nav and Setup position/permission-set labels all translated (`52-zh-*`). ja-JP and es-ES spot checks: app nav, dashboard, record translated (`54-ja-*`, `55-es-*`). |
| ADM-009 Analytics datasets | pass (indirect) | Executive, Service and Sales Performance dashboards draw with values for personas that read the data. |
| ADM-010 Seed data | pass | Admin reads accounts 9, leads 21, opportunities 23, cases 38, events 29, campaign members 51, products 13, campaigns 7. |
| ADM-011 Demo data claim | pass (removed) | Boot log: platform hands seeded rows to the first admin; record owners show Dev Admin. |
| ADM-012 AI Live Data skill | not reachable | No assistant surface on this open-source install (no AI service; ADM-015 says `ai` is deliberately not required). See D9 for the copy that points users at it. |
| ADM-013 In-app rule books | pass, D3 | Help → This app's docs opens the four docs (`70`). The admin manual's sharing-rule table omits one rule (D3). |
| ADM-014 Field history | pass | Account record All Activity shows `Account Owner: ∅ → Dev Admin`. |
| ADM-015 Capability declaration | not tested | No browser surface shows a package's `requires`; Packages lists the four HotCRM packages at 6.0.0 (`11-06-packages`). |
| PRM-001 Permission-set matrix | pass | Setup lists HotCRM's sets (crm_user, guest_portal, marketing_user, sales_manager, sales_rep, service_agent, system_admin) and positions declaring them; service_manager position distributes service_agent (`13`). Record-access matrix below. |
| PRM-002 Guest portal | pass (API) | Anonymous `POST /api/v1/data/crm_lead/query` and `crm_account/query` answer 401. Form submission belongs to tracks 1 and 3. |
| PRM-003 Field-level security | pass | Rep: `annual_revenue` and `health_score` inputs disabled in the edit form (`45`) and a PATCH answers 403 `Field write denied`. Sales manager reads `crm_case.internal_notes` (set is read-only); agent reads it. |
| PRM-004 Export gate | pass, D4 | Server gate as in ADM-005. The Setup permission-set editor cannot show the export bit (D4). |
| PRM-005 Transfer axis | pass (read) | Tr column on sales_rep shows no transfer on core objects (`14`). Not exercised as a write. |
| PRM-006 Conditional sharing rules | pass, D3 | Declared Sharing Rules lists 12 HotCRM rules; rule grants visible in Record Shares (`10-11`). The row text says eleven (D3). |
| PRM-007 Flat positions | pass | 12 HotCRM positions in Setup (19 with platform ones), each with its own set or none; holders as staffed (`10-06`). |
| PRM-008 Row-level security (private deals) | pass | Rep marks an open deal private: manager 23→22, marketing 23→22, rep 16 and admin 23 unchanged; then unset (counts back to 23). |
| PRM-009 OWD distribution | pass | OWD badges in the permission-set grid: account/case/task Private, product and campaign Public read, campaign member and article feedback By parent. |
| PRM-010 Demo staffing | pass | `pnpm demo:staff` exit 0; NA rep sees 6 accounts, EU rep 2, manager 9. |

### Setup surfaces (as the dev admin)

| Surface | Result | Shot |
|---|---|---|
| System Overview | pass | `01` |
| Packages, Packaged Automation | pass, S3 | `11-05`, `11-06`, `12` |
| Users, Create User, user row menu, Ban | pass, S1, S8 | `10-01`, `30`–`33`, `90`, `93` |
| Organization, Business Units, Teams, Invitations | pass | `10-02`…`10-05` |
| Positions list and detail, Add holder | pass, S2, S4 | `10-06`, `13`, `34`–`36` |
| Capabilities | pass | `10-07` |
| Permission Sets list and detail, field overrides | pass, D4, D8, S10 | `10-08`, `14`–`16` |
| Sharing Rules (organization), Declared Sharing Rules, Record Shares | pass | `10-09`…`10-11` |
| Approvals Inbox, Requests, Action History, Delegations | pass, D5, S9 | `11-01`…`11-04`, `53-zh-mgr-01` |
| Settings: All, Localization, Company, Branding | pass | `11-07`…`11-10` |
| Audit Log, Notification Templates, API Keys | pass | `11-11`…`11-13` |
| Setup → Reports | pass, S14 | `11-14` |
| User menu → Language (4 locales) | pass | `50`, `51` |

### Personas: navigation and record access

Every sidebar entry was clicked for each persona; an entry fails when its page shows "You don't have access" or a 4xx/5xx on an API call.

| Persona | Landing | Entries | Failing entries |
|---|---|---|---|
| Dev admin | Executive Overview | 31 | none |
| NA rep (EU rep same nav) | Sales Home | 27 | none |
| Sales manager | Executive Overview | 31 | none |
| Service agent | Service Overview | 24 | none |
| Service manager | Service Overview | 24 | none |
| Marketing user (made in Setup) | Executive Overview | 28 | **Service Overview** (all tiles, D1), **Sales Performance** (2 tiles, D2) |

Rows each persona's session reads through `POST /api/v1/data/OBJECT/query` (403 = object denied):

| Object | admin | na.rep | eu.rep | sales.manager | service.agent | service.manager | marketing |
|---|---|---|---|---|---|---|---|
| crm_account | 9 | 6 | 2 | 9 | 9 | 9 | 9 |
| crm_contact | 9 | 6 | 2 | 9 | 9 | 9 | 9 |
| crm_lead | 21 | 0 | 0 | 21 | 21 | 21 | 21 |
| crm_opportunity | 23 | 16 | 5 | 23 | 0 | 0 | 23 |
| crm_quote | 6 | 6 | 0 | 6 | 403 | 403 | 403 |
| crm_contract | 4 | 4 | 0 | 4 | 403 | 403 | 403 |
| crm_case | 38 | 0 | 0 | 38 | 23 | 15 | 403 |
| crm_knowledge_article | 24 | 24 | 24 | 24 | 24 | 24 | 24 |
| crm_campaign | 7 | 7 | 7 | 7 | 7 | 7 | 7 |
| crm_campaign_member | 51 | 51 | 51 | 51 | 403 | 403 | 51 |
| crm_task | 10 | 6 | 0 | 10 | 0 | 0 | 0 |
| crm_event | 29 | 21 | 2 | 29 | 0 | 0 | 0 |
| crm_forecast | 7 | 0 | 0 | 7 | 403 | 403 | 403 |
| crm_product | 13 | 13 | 13 | 13 | 13 | 13 | 13 |

A service agent opening a campaign record sees no Members related list and no error (`43`).

### Phone width (390×844)

No page scrolls sideways. Captured: Setup overview, users, positions, a position, a permission set, declared sharing rules, approval requests, HotCRM home (admin), Sales Home (rep), Service Overview (agent), Approvals Inbox (manager) (`80-*`…`83-*`). The permission-set page is the one broken screen (D8); the positions list is usable but sparse (S4).

## Defects

**D1 · A marketing user sees Service Overview and every tile says "You don't have access".**
- Steps: Setup → Users → Create User (`marketing.qa@objectos.ai`); Positions → marketing_user → Add holder. Sign in as that user → HotCRM → sidebar Service → Service Overview.
- Expected: the `marketing_user` set "see[s] no cases" (its description in Setup); an entry whose every tile reads cases should not be shown to a member who cannot read cases. The sibling entries Cases and My Cases are already hidden for this user.
- Actual: the entry is shown; 9 tiles (28 matches) read "You don't have permission to view the data behind this widget"; `POST /api/v1/analytics/dataset/query` 403.
- Evidence: `41-mkt-noaccess-service_overview.png`, `40-01-mkt-service-overview.png`.
- Landing spot: `src/service/index.ts` line 209, `nav_service_dashboard`, gated by `NOT_A_SALES_REP` only (the position), with no `current_user.can("crm_case", "read")` term.
- Dedupe words: Service Overview marketing user no access; nav_service_dashboard visible; NOT_A_SALES_REP.

**D2 · The marketing user's Sales Performance dashboard has 2 "no access" tiles.**
- Steps: as D1's user → Insights… sidebar Sales → Sales Performance, scroll.
- Expected: as D1, a dashboard shown to a persona should not carry tiles that persona can never read; marketing_user has no `crm_forecast` read (403 in the matrix).
- Actual: 2 tiles render the no-access placeholder; 403 on the dataset query. The tile names are below the fold in the capture; the forecast-bound tiles (`quota_attainment_by_rep` on `forecast_metrics`) are the likely pair, not confirmed.
- Evidence: `41-mkt-noaccess-sales_performance.png` (top of the dashboard; the walk counted 2 placeholders).
- Landing spot: `src/sales/dashboards/sales.dashboard.ts` (tile audience) or the nav gate `OPPORTUNITY_AUDIENCE` in `src/sales/apps/crm.app.ts`; same family as D1.
- Dedupe words: Sales Performance marketing forecast tile no access.

**D3 · Two docs count the sharing rules wrong: 12 ship, the inventory says eleven and the admin manual lists eleven.**
- Steps: Setup → Declared Sharing Rules (12 items, `10-10`); HotCRM → Help → This app's docs → Administration (`70`).
- Expected: the inventory row is "anchor is truth" and the in-app manual describes every rule.
- Actual: `docs/feature-inventory.md` PRM-006 says 「十一条条件共享规则」 and omits the forecast rule; `src/docs/crm_admin.md` "Record visibility" table has no row for `forecast_manager_sharing` (Forecasts — Sales Manager Edit), added by #2282.
- Landing spot: `docs/feature-inventory.md` PRM-006; `src/docs/crm_admin.md`.
- Dedupe words: eleven sharing rules forecast_manager_sharing docs.

**D4 · Platform: the Setup permission-set editor has no Export column, so `allowExport` cannot be seen on the set.**
- Steps: Setup → Permission Sets → sales_rep.
- Expected: PRM-004 calls `allowExport` the real export gate; the position page's summary of the same set shows `E T = Export/Transfer`.
- Actual: the set editor's grid has C R U D Tr VA MA, read and write scope and Bulk; no Export column, and expanding a row shows field rows only. sales_rep's `crm_case` export bit (true, server answers 200) is invisible here.
- Evidence: `14`, `15-permset-sales-rep-case-expanded.png`, `13-position-service-manager.png` (E column present).
- Landing spot: console permission-set editor (objectui / objectstack Setup).
- Dedupe words: permission set editor export column allowExport missing.

**D5 · Platform: under zh-CN the approval inbox and requests list show the flow and step names in English.**
- Steps: switch to 中文（中国）; as sales.manager open 待我审批; as admin Setup → 审批申请.
- Expected: the pack carries `flows.opportunity_approval.label` 大额商机审批 and `approvals.manager_review.label` 销售经理审核 (`src/sales/translations/zh-CN/app.ts`), read since spec 18.1.0.
- Actual: "Large Deal Approval" / "Sales Manager Review" in both; the record's object reads "Opportunity", not 商机.
- Evidence: `53-zh-mgr-01-approvals-inbox.png`, `52-zh-09-setup-approval-requests.png`.
- Landing spot: console approvals inbox and `sys_approval_request` list (platform).
- Dedupe words: approval inbox flow label translation zh-CN step label.

**D6 · Platform: under zh-CN the permission-set detail header shows the English label.**
- Steps: 中文 → Setup → 权限集 → sales_rep.
- Expected: the list on the previous page shows 销售代表 for the same set.
- Actual: the detail header reads "Sales Representative".
- Evidence: `52-zh-07-setup-permset-sales-rep.png`, `53-zh-admin-01-permset-list.png`.
- Landing spot: console permission-set editor header.
- Dedupe words: permission set detail label untranslated.

**D7 · Platform: the Setup metadata list pages are untranslated in ja-JP and es-ES.**
- Steps: 日本語 or Español → Setup → Positions.
- Expected: zh-CN translates the same page (岗位 · 仅可新建 · 19 个条目 · 新建 · 全部来源).
- Actual: "Position · create-only · 19 items · New · All sources · All", the column headers, "None" and "Artifact" stay English; the Setup sidebar and HotCRM's position labels are translated.
- Evidence: `54-ja-03-setup-positions.png`, `55-es-03-setup-positions.png`, `52-zh-06-setup-positions.png`.
- Landing spot: console metadata list (platform ja-JP / es-ES message catalogs).
- Dedupe words: metadata list page ja-JP es-ES untranslated create-only items.

**D8 · Platform: on the permission-set page the Assigned Users panel covers the object grid.**
- Steps: Setup → Permission Sets → sales_rep, at 1440×900 and at 390×844.
- Expected: the object grid, the page's main content, is readable.
- Actual: desktop shows about 5 object rows between the legend and the pinned Assigned Users panel, and the Bulk column and field count are cut off at the right; at 390 px no object row is visible at all, and "Only granted" and the read-only banner are clipped.
- Evidence: `14`, `16`, `80-admin-05-setup-permset-detail-phone.png`.
- Landing spot: console permission-set editor layout.
- Dedupe words: permission set assigned users panel overlaps grid mobile.

**D9 · Sales Home tells the user to open an assistant panel this install does not have.**
- Steps: as na.rep → Sales Home → card "Ask the AI Assistant".
- Expected: copy that names a control the user can find (os-dev class a, misleading copy); ADM-015 says the open-source build has no AI service.
- Actual: "Open the assistant panel from the right edge of the page…": no assistant control exists on the page (searched every button and link for assist/ask/AI/chat; none).
- Evidence: `71-adm012-sales-home-ai-card.png`, `40-02-mkt-sales-home.png`.
- Landing spot: `src/sales/pages/home.page.ts` `ai_briefing` card (line 294), or a platform way to show a card only when the `ai` capability is present.
- Dedupe words: Sales Home AI assistant card no panel open source.

## UI / UX suggestions

Kept apart from the defects; for the maintainer discussion, not for filing.

| # | Where | What a user meets today | Proposed change | Who benefits | Shot |
|---|---|---|---|---|---|
| S1 | Setup → Users → Create User | Permission Set is a free-text box with no picker; no Position field, though HotCRM grants access by position | A picker for permission sets, plus an optional Position picker | Admins onboarding staff | `30`, `31` |
| S2 | Position → Add holder | The member list shows names only | Show email beside the name | Admins in orgs with similar names | `35` |
| S3 | Setup → Packaged Automation | A green On toggle beside "Not running here" for the 5 scheduled flows; the reason names an env var | Grey the toggle or say "On, but scheduled work is off on this deployment" in plain words | Admins wondering why SLA and renewal jobs never fire | `12` |
| S4 | Setup metadata lists (Positions, Permission Sets) | Singular titles ("Position"), the API name is the first column; at 390 px each row is ~180 px tall and labels truncate | Plural titles, label first with the API name as subtext, a compact card layout on phone | Admins | `10-06`, `80-admin-03` |
| S5 | Console home | The HotCRM tile is magenta; inside, the app is orange | Use the app's brand colour on the tile | Every user | `00`, `20-admin-02` |
| S6 | Service personas' sidebar; Setup set description | Opportunities and My Deals are shown (by design since #2231) and always empty; the service_agent set says "see no opportunities" | Reword the description to the effective access, or hide the two entries for service positions as #2268 did for dashboards | Service staff, admins reading Setup | nav dumps |
| S7 | List views | Export as CSV / XLSX lives under Display | Put Export in the toolbar or the ⋯ menu | Anyone exporting | `69-adm005-display-admin` |
| S8 | Setup → Users row menu | Edit, Ban, Set Password, Impersonate, Set Manager; no delete or deactivate | A Deactivate action named as such | Admins cleaning up test accounts | `90` |
| S9 | Approval Requests list | The column "Record ID" shows the record's name | Rename it "Record" | Admins | `11-02` |
| S10 | Permission set → field overrides | The internal field "Search Index (`__search`)" is listed first | Hide platform-internal fields | Admins | `16` |
| S11 | Executive Overview → Pipeline by Stage | Axis shows `NeedsAnalysis` (raw); Sales Performance shows "Needs Analysis" for the same stage | Use the option label (cross-note for track 4) | Leadership | `20-admin-02`, `41-mkt-noaccess-sales_performance` |
| S12 | In-app docs | Sidebar header reads "Hotcrm"; the code block of positions highlights "Team" as a keyword | Use the app label "HotCRM"; render the block as plain text | Admins reading the manual | `70` |
| S13 | List Display menu (service agent on Opportunities) | "Edit inline" is offered on a list the agent cannot edit | Hide inline edit when the object grants no edit | Service staff | `69-adm005-display-service.agent-crm_opportunity` |
| S14 | Setup → All reports | "No reports — This app has no reports you can open." behind a sidebar entry | Hide the entry when empty, or link to the CRM's reports | Admins | `11-14` |
