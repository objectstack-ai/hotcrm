# HotCRM 4.0.1 browser pass — group C (growth, analytics, platform)

Card: objectstack-ai/hotcrm#2058 · Tester: group C · Branch: `claude/qa-browser-pass-c`

## Header

| Item | Value |
|---|---|
| Base sha | `1d7148bf` (`chore(release): 4.0.1 (#2056)`) on `origin/main` |
| Install / build | `pnpm install --frozen-lockfile` exit 0 · `pnpm build` exit 0 (18 objects, 14 views, 8 pages, 5 dashboards, 10 reports, 31 actions, 32 flows, 12 positions, 7 permission sets) |
| Server | `nohup pnpm dev > /tmp/dev.log 2>&1 &` (`objectstack dev -p 4001`), fresh DB under `.objectstack/data`; `/api/v1/health` 200 after ~46 s; no `NODE_MODULE_VERSION` flood |
| Admin login | `admin@objectos.ai` / `admin123` through the real `/_console/login` form |
| `pnpm demo:staff` | exit **0**, run once after the #2057 measurement; 5 personas created, 21 rule-materialised shares |
| Personas used | admin; Nina Reyes `na.rep@` (sales rep, NA); Emil Roth `eu.rep@` (sales rep, EU); Marta Quinn `sales.manager@`; Priya Raman `service.agent@` |
| Browser | Playwright 1.56 (project copy) driving the preinstalled Chromium 141.0.7390.37 (`/opt/pw-browsers/chromium-1194`), headless, 1440×900 (tall viewport only for full-dashboard captures) |
| Node | v22.22.0 |
| Start / end | 2026-10-10 17:54 UTC / 19:20 UTC |
| Deployment note | Boot logs that package-authored scheduled work is OFF (`OS_AUTOMATION_SCHEDULED_WORK_ENABLED` unset): `forecast_snapshot`, `campaign_completion`, `task_due_reminder`, `case_sla_monitor`, `opportunity_stagnation`, `quote_expiration`, `contract_expiration`, `contract_renewal` never fire on this box. This is documented in `content/docs/administration/automation.mdx`. |

## #2057 empty-bench measurement

Fresh boot, before `demo:staff`, so `sys_user_position` was empty. All steps were done as the dev admin in the browser.

1. **Account** `QA-C empty-bench account` (ACC-000010, id `_rCOXnYbwEnl5k8Q`), created with New → Create (`2057-01`, `2057-02`).
   - `approval_status = pending`. The record header shows the "In approval · editable" badge and a "Recall approval" button, the "Approvals 1" tab, and four admin buttons: Override Approve / Reject / Reassign / Recall.
   - A request exists: `areq_ac544ba6…`, `process_name flow:account_approval`, `current_step account_review`, `pending_approvers "position:sales_manager"`, `lockRecord:false`, `onEmptyApprovers: admin_rescue`.
   - Server log: `WARN [approvals] approver 'position:sales_manager' expanded to nobody …` and `approval node 'account_review' … resolved to no concrete approver — the request is decidable only by a privileged admin`.
2. **Opportunity** `QA-C empty-bench deal`, amount 120000, on Vertex Analytics (id `DGs4g4LCvnuGTMlq`) (`2057-03…05`).
   - `approval_status = pending`. The record shows **"Locked for approval"** and "Recall approval".
   - A request exists: `areq_04135ddc…`, `flow:opportunity_approval_on_create`, step `manager_review`, `pending_approvers position:sales_manager`. The same two WARN lines appear for `manager_review`.
   - The opportunity record page has **no Approvals tab**, unlike the account.
3. **Inbox and record pages** (Inbox nav → `/component/approvals/inbox`):
   - **My Pending: "No requests — You're all caught up — nothing is waiting on you."** (`C-01-admin-my-pending-empty.png`). The console asked `GET /api/v1/approvals/requests?status=pending&approverId=<admin id>,admin@objectos.ai,position:platform_admin,position:org_owner,position:everyone,role:user` and got none.
   - **Submitted by me** and **All** list both requests (`2057-07-inbox-submitted-by-me.png`, `2057-07-inbox-all.png`).
   - Opening the account request from All shows a drawer with Override Approve / Override Reject / Override Reassign / Send reminder / Override Recall (`C-18-request-drawer-raw-values.png`). Override Approve opens a dialog: "You hold no approver slot on this step … bypasses the approvers who have not acted — Sales Manager (no current holder). The decision is recorded as an admin override." (`2057-09`). Confirm → `POST /approvals/requests/areq_ac544…/approve` 200 → toast "Account approved: QA-C empty-bench account". The account is now `approval_status approved`.
   - On the opportunity record page, the header Override Approve → Confirm → 200, toast "Approved.". The opportunity is now `approval_status approved`, `approved_date 2026-10-10T18:12:06Z`, and the lock is gone (`2057-11`).
   - So the admin **can** decide both requests, from the inbox's All tab or from the record page, but never through My Pending.
4. **Who was notified** (`sys_inbox_message`, `sys_notification`, the bell, and the server log):
   - When the requests opened: **nobody.** No inbox, notification or email row was written for either request. The only trace is the two server WARN lines per request.
   - On decision, the record owner (the admin) received `account_approved` "Account approved: QA-C empty-bench account" and `opportunity_approved` "Deal approved: QA-C empty-bench deal", both info level and visible in the bell (`2057-12-bell-admin.png`). The bell header read "0 pending approvals".

## Coverage

Totals over 62 inventory rows: **42 pass · 14 fail · 5 not reachable · 1 not tested**; 21 findings (C-01…C-21).

| inventory id | result | note |
|---|---|---|
| MKT-001 | pass | Created `CPG-0008 - QA-C budget campaign`. Autonumber CPG-{0000}; `roi` −100 with cost 2000 / revenue 0; `response_rate` 20 after 1 of 5 responded. 8 campaigns readable by the rep (public_read). |
| MKT-002 | fail (C-10, C-11) | Start > end blocked by the hook (400, message uses raw API names, C-11). In-progress without dates blocked by the form. Over-budget **warning** never reaches the user (C-10). |
| MKT-003 | pass | A member with neither lead nor contact → 400 "A campaign member must reference either a Lead or a Contact" shown in the form. Members list under the campaign's Related tab. |
| MKT-004 | pass | Admin: Enroll Members → screen (Leads / New) → 5 leads enrolled with `added_date`, status Sent; 1 skipped. Rep side: see C-13. |
| MKT-005 | pass | num_sent/num_leads went 0→5 on enrolment, num_responses 0→1 on Mark Responded, num_opportunities 0→1 when an opportunity was attributed (attribution set via `PATCH`, because the inline-edit lookup had no stable selector). Lead conversion and status-transition triggers not exercised. |
| MKT-006 | not reachable | `campaign_completion` is a schedule flow; scheduled work is off on the dev deployment (boot WARN). No manual-run UI. |
| MKT-007 | fail (C-06) | Gantt "Campaign Schedule", calendar "Launch Calendar" and timeline "Marketing Timeline" all render with data. The timeline repeats group headers (C-06). |
| MKT-008 | not tested | marketing_manager / marketing_director / marketing_user are unstaffed by design (`demo-staffing.ts`). `campaign_leadership_*` rules show matched=6, holders=0 in the `demo:staff` output. |
| MKT-009 | pass | Mark Responded (row menu and record header) → `status responded`, `response_date` set. Editing the member to Unsubscribed → lead Kai Watanabe `email_opt_out: true`. |
| FCT-001 | pass | Forecast list shows quota / closed / commit / pipeline; `attainment_pct` 59 for Oct 2026 (295k/500k). The new Q4 2026 row has `coverage_ratio`/`expected_amount` computed. `crm_forecast` is private: Nina sees 1, Emil 0. |
| FCT-002 | fail (C-08) | Server derives `period_end` 2026-12-31, label "Q4 2026" and `snapshot_date` from `{period:'quarter', period_start:'2026-10-01'}`. The New form refuses to submit without the derived fields. |
| FCT-003 | not reachable | `forecast_snapshot` is a schedule flow; scheduled work is off (boot WARN). The "This Quarter" view says "This Quarter Has No Snapshots Yet". |
| FCT-004 | pass | "Pipeline by Forecast Category" (Best Case 173,000 / Commit 1,531,000 / Pipeline 380,500) and the Pipeline Coverage report use the same buckets. |
| FCT-005 | fail (C-09) | All Forecasts (grouped), This Quarter (empty-state copy), My Forecast. Groups are ordered alphabetically (C-09). |
| FCT-006 | not reachable | No AI service on the open-source dev server (ADM-015 by design); no assistant entry in the console. |
| FCT-007 | pass | `sales_dashboard`: 17 dataset queries, all 200; 22 chart elements drawn. "Quota Attainment by Rep" is 0 rows / "No data yet" by design: no current-quarter snapshot, because the sweep is off. |
| FCT-008 | pass | `executive_dashboard`: 9 queries, 200, 13 chart elements. `crm_overview_dashboard`: 9 queries, 200, 18 elements. |
| FCT-009 | pass | `forecast_metrics` answers 200 (0 rows for the current quarter, by design). |
| FCT-010 | pass | Insights → Pipeline Coverage / Lead Inflow / SLA Performance open the three reports with rows. |
| ACT-001 | pass | Task form with Related Records (5 lookups) and collapsed Recurrence & Effort; `priority_rank` 4 for urgent. |
| ACT-002 | pass | Completed → `completed_date` stamped, `progress_percent` 100, `is_completed` true. |
| ACT-003 | pass | Weekly recurring task completed → clone created, due 2026-10-19 (+7 days), not started. |
| ACT-004 | not reachable | `task_due_reminder` is a schedule flow; scheduled work is off. |
| ACT-005 | pass | New urgent task → toast "Urgent task: QA-C urgent weekly task …" and a `sys_inbox_message` (warning) to the owner. |
| ACT-006 | fail (C-05) | 8 views reachable (4 tabs + "4 more"). Worklog Timeline groups everything under `[OBJECT OBJECT]` (C-05). The completed task's due cell is red "Overdue 3d" (C-19). |
| ACT-007 | pass | Log a Call (25 min) → `crm_event` type call, status held, end = start + 25 min, `duration_minutes` 25. |
| ACT-008 | pass | Log a Call with internal attendee Nina → 2 `crm_event_attendee` ids returned. |
| ACT-009 | pass | Account "Log a Call" → `{eventId, activityId, attendeeIds}`, toast "Call logged successfully!". Only the account variant was driven; lead / contact / opportunity / case variants not tested. |
| ACT-010 | pass | QA-C account `last_activity_date` went from null to 2026-10-10 after the held call. |
| ACT-011 | fail (C-05) | Event Calendar, My Calendar, Upcoming (8), Interaction History (19) render. Team Schedule timeline has a single `[OBJECT OBJECT]` group for 3 owners (C-05). |
| ACT-012 | pass | Activity group = Events + Sales Activity. Activity dashboard: 13 queries, all 200, 13 chart elements. Inventory wording drift in C-21. |
| ACT-013 | pass | `event_metrics` (weekly buckets 2026-W34…W41) and `task_metrics` answer 200 with rows. |
| APR-001 | pass | Nina's $600K deal → manager_review (Marta) → approved → director_signoff (`position:sales_director`, unstaffed) → admin rescue → `approved`, `approved_date` set. |
| APR-002 | pass | While pending, Nina's `PATCH` → 400 `RECORD_LOCKED` "… is locked while an approval is in progress". The record shows no Edit. `approval_status` mirrors pending → approved / rejected. first_response not distinguishable with one approver. |
| APR-003 | pass | Marta rejects the $150K deal → `rejected`. Nina's inbox gets "Deal rejected: QA-C rep reject deal" (warning). Approve → "Deal approved: …" (info). |
| APR-004 | fail (C-01) | Empty bench holds for admin takeover and the override works, but the admin is never told and their My Pending stays empty (C-01). |
| APR-005 | pass | My Work → Inbox opens the approvals inbox. Marta's My Pending showed 4. |
| PRM-001 | pass | Persona object doors match the profiles (rep reads 6 accounts and 0 leads; agent gets 403 on opportunity / campaign / forecast). Count drift in C-21. |
| PRM-002 | fail (C-03, C-20) | Anonymous `/_console/forms/contact-us` redirects to login (C-03). Anonymous `POST /api/v1/forms/contact-us/submit` → 201, and anonymous data reads → 401. The submitted lead stays ownerless (C-20). |
| PRM-003 | fail (C-02) | Server: rep `annual_revenue` write → 403; `crm_case.internal_notes` absent from the rep's record and API. Console: the rep's edit form offers `annual_revenue` as an editable input (C-02). |
| PRM-004 | fail (C-04) | Rep exports accounts (6 NA rows). Agent: opportunity export → 403 `EXPORT_NOT_PERMITTED`. Rep: campaign export → 403. **Dev admin: account export → 403** and no Export button (C-04). |
| PRM-005 | pass | Rep `PATCH owner_id` → 403 "… requires the transfer grant". The UI still offers the owner picker (part of C-02). |
| PRM-006 | pass | `demo:staff` re-evaluation: NA 6 / EU 2 accounts, case_escalation 8 grants. Search and list bounded accordingly. Rule count drift in C-21. |
| PRM-007 | pass | 12 app positions in `sys_position` (plus platform ones); no hierarchy roll-up observed (Marta sees via viewAll, not via reps). |
| PRM-008 | pass | Nina's private deal: admin yes, Nina yes, **Marta no**, Emil no. Analytics agrees (Marta's owner totals exclude it). |
| PRM-009 | pass | Account private (rep 6/12), campaign public_read (rep 8/8, read-only), contact controlled by parent (rep 6 contacts, the ones on her accounts). |
| PRM-010 | pass | `pnpm demo:staff` exit 0; all five personas log in through the form. |
| ADM-001 | pass | HotCRM app, royal-blue branding, Home → Executive Overview, 6 groups (Sales / My Work / Activity / Marketing / Service / Insights). Inventory says 7 incl. Approvals (C-21). |
| ADM-002 | fail (C-07) | Sales Home renders only at a typed URL `/page/sales_home_page`; no nav or landing path. |
| ADM-003 | fail (C-07) | App switcher ("Switch Application: HotCRM, Setup") and header search work. `app_launcher_page` and `utility_bar_page` render only at typed URLs; no utility bar is docked. |
| ADM-004 | pass | Import Account → shipped mapping "Account Import (CSV)" offered → 2 QA-C rows from `assets/import-templates/accounts.csv` → `POST …/import` 200, "Imported 2 rows." |
| ADM-005 | fail (C-04) | Export works for rep and agent; the dev admin cannot export. |
| ADM-006 | pass | Account Attachments tab: upload `qa-c-note.txt` → presigned + complete 200, `sys_attachment` 201, listed (21 B · text/plain). |
| ADM-007 | pass | Notify rows seen: urgent_task, case_escalated, account_approved, opportunity_approved / rejected, with severity info / warning / critical. Email delivery not checked. |
| ADM-008 | fail (C-15, C-16) | en / zh-CN / ja-JP / es-ES switch from the user menu. Nav, list, form, option, dashboard and inbox chrome all follow. Exceptions: approval flow / step names and the object type in the inbox stay English (C-15); zh-CN duplicates "活动" (C-16). |
| ADM-009 | pass | Nine datasets queried by dashboards / reports (account, opportunity, lead, contact, event, task, forecast, product, case), all 200. |
| ADM-010 | pass | Accounts 9, leads 21, opportunities 23, events 27, campaigns 7; cases 38 (inventory says 8, C-21). |
| ADM-011 | pass | Removed as stated: no `demo_bootstrap` among 32 flows; the boot log shows the platform's own seed claim (195 rows → admin). |
| ADM-012 | not reachable | No AI service on the open-source server; no assistant surface. |
| ADM-013 | pass | Help & Documentation → `/_console/docs` lists "Hotcrm · 4 articles". The in-app docs page renders `crm_admin`. |
| ADM-014 | pass | The record Activity feed shows field history ("Approval Status: Pending → Approved"). The actor is shown as "System" (C-17). |
| ADM-015 | pass | Artifact `requires`: app `[automation, triggers, analytics, auth, ui, approvals, sharing, hierarchy-security]`, service `[automation, triggers, analytics, sharing]`; no `ai`. |

Also covered:
- **Dashboards (5):** every widget query answered 200. Chart-element probe counts: executive 13, sales 22, activity 13, CRM overview 18, service 14. One designed-empty widget (quota attainment).
- **Reports (10):** all 10 open; every `POST /analytics/dataset/query` answered 200 with rows.
- **Navigation:** all 24 sidebar links open without an error (~4.5 s each, including a fixed 3.5 s settle).
- **Global search:** ⌘K "Vertex" as admin → account, contact, events, lead, opportunities. As the EU rep → "No results found" (`totalHits 0`); no leak.
- **Approvals inbox:** see APR and #2057 above.

## Findings

### C-01 — Admin-rescue approval requests are invisible in the admin's "My Pending" and notify no one
- Inventory: APR-004, APR-005 (and #2057) · Persona: admin · URL `/_console/apps/app.objectstack.hotcrm/component/approvals/inbox`
- **Steps:**
  1. On an empty bench (or for a $600K deal at the unstaffed `director_signoff` step), create a ≥$100K opportunity or a new account.
  2. As the admin, open My Work → Inbox.
- **Expected:** a request that the server says is "decidable only by a privileged admin" is put in front of that admin. `opportunity-approval.flow.ts` describes `admin_rescue` as "holds for admin takeover instead of stranding the record"; inventory APR-004 says "挂起等管理员接管".
- **Actual:**
  - My Pending reads "You're all caught up — nothing is waiting on you". The request only shows under All / Submitted by me.
  - No `sys_inbox_message` or `sys_notification` row is written when the request opens.
  - The bell says "0 pending approvals".
- **Evidence:**
  - Screenshots: `C-01-admin-my-pending-empty.png`, `C-01-director-step-admin-rescue.png`, `2057-12-bell-admin.png`.
  - `GET /api/v1/approvals/requests?status=pending&approverId=<admin>,admin@objectos.ai,position:platform_admin,position:org_owner,position:everyone,role:user` → empty, while `sys_approval_request` holds `status pending, pending_approvers "position:sales_manager"`.
  - Server log: `WARN [approvals] approval node 'manager_review' on crm_opportunity/DGs4g4LCvnuGTMlq resolved to no concrete approver — the request is decidable only by a privileged admin`.
- **Owner:** platform: `@objectstack` approvals service / console inbox (objectui). The app correctly declares `onEmptyApprovers: 'admin_rescue'`; routing a rescue request to the admin's queue and notifying the admin is platform behaviour.
- **Severity guess:** p2
- **Dedupe words:** `admin_rescue`, `resolved to no concrete approver`, `You're all caught up`, `My Pending`, `position:sales_manager`

### C-02 — Field-level read-only fields are rendered editable for a sales rep; save fails with a 403
- Inventory: PRM-003, PRM-005 · Persona: Nina Reyes (sales rep) · URL `/_console/apps/app.objectstack.hotcrm/crm_account/record/5ZPnnvToqRIN0TLk`
- **Steps:**
  1. As `na.rep@objectos.ai`, open Vertex Analytics → Edit.
  2. Change Annual Revenue 9500000 → 9999999 → Save.
- **Expected:** Annual Revenue (and Health Score) read-only for the rep, per `src/sales/profiles/sales-rep.profile.ts:109` `'crm_account.annual_revenue': { readable: true, editable: false }` and `:117`. Account Owner not editable without `allowTransfer` (`src/sales/profiles/index.ts:107`).
- **Actual:**
  - The input is editable.
  - Save → `PATCH /api/v1/data/crm_account/5ZPnnvToqRIN0TLk` **403** `{"error":"[Security] Field write denied: not permitted to edit [annual_revenue] on 'crm_account'","code":"PERMISSION_DENIED"}`, shown as a red footer message.
  - The owner picker is also offered. A rep `PATCH owner_id` → 403 "changing record ownership on update requires the transfer grant".
- **Evidence:**
  - Screenshots: `C-02-fls-annual-revenue-editable.png`, `C-02-fls-annual-revenue-save-denied.png`.
  - `GET /api/v1/meta/object/crm_account` as the rep returns `annual_revenue.readonly: false` and no per-user permission block.
- **Owner:** platform (metadata service does not project the caller's field permissions) and/or console (objectui does not consult them). The metadata here is correct and the server enforces it.
- **Severity guess:** p2
- **Dedupe words:** `Field write denied`, `annual_revenue`, `PERMISSION_DENIED`, `editable: false`, `transfer grant`

### C-03 — The public Web-to-Lead form redirects anonymous visitors to the login page
- Inventory: PRM-002 · Persona: anonymous · URLs `/_console/forms/contact-us`, `/forms/contact-us`
- **Steps:**
  1. In a fresh browser with no session, open `/forms/contact-us` (the `publicLink` in `src/sales/views/lead.view.ts:941`).
  2. Open `/_console/forms/contact-us` (the console's `/forms/:name` route).
- **Expected:** an anonymous visitor can fill the "Tell us about yourself / About your company / How can we help?" form. Sources: inventory PRM-002 "匿名访客仅可创建 lead 与 case(服务两个公开表单)"; `content/docs/sales/leads.mdx:108` "Anonymous Web-to-Lead submissions are always accepted".
- **Actual:**
  - `/forms/contact-us` → `{"success":false,"error":{"code":"ENDPOINT_NOT_FOUND"}}`.
  - `/_console/forms/contact-us` → redirect to `/_console/login?redirect=%2Fforms%2Fcontact-us`.
  - The backend works: `GET /api/v1/forms/contact-us` 200 (form definition) and anonymous `POST /api/v1/forms/contact-us/submit` 201.
- **Evidence:**
  - Screenshot: `C-03-public-form-redirects-to-login.png`.
  - `GET /api/v1/auth/get-session` 401 → login redirect.
- **Owner:** console (objectui): the `/forms/:name` route sits behind the auth guard. The form metadata and the submit endpoint are fine.
- **Severity guess:** p2
- **Dedupe words:** `/forms/contact-us`, `publicLink`, `redirect=%2Fforms`, `Web-to-Lead`, `ENDPOINT_NOT_FOUND`

### C-04 — The dev admin cannot export any object; the Export button is hidden for the admin while reps have it
- Inventory: ADM-005, PRM-004 · Persona: admin · URL `/_console/apps/app.objectstack.hotcrm/crm_account`
- **Steps:**
  1. As `admin@objectos.ai`, open Accounts and look for Export.
  2. Call `GET /api/v1/data/crm_account/export?format=csv&fields=name,territory`.
- **Expected:** the administrator exports the five export-enabled objects. Sources: inventory ADM-005, and `src/sales/profiles/system-admin.profile.ts:23-31`, which carries `allowExport: true`.
- **Actual:**
  - The toolbar has New / Import / 2 more / Filter / Sort, with no Export.
  - The API answers **403** `{"code":"EXPORT_NOT_PERMITTED","error":"Export is not permitted on object 'crm_account' for this user"}`.
  - The rep and the service agent export the same object with 200.
- **Evidence:**
  - Screenshot: `C-04-admin-accounts-no-export.png`.
  - `POST /api/v1/security/explain {object:crm_account, operation:export}` as admin → `permissionSets [admin_full_access, organization_admin_no_bypass, member_default]` → `object_crud denies — No resolved permission set grants export on 'crm_account'`.
- **Owner:** platform: `admin_full_access` (the set the platform binds to `platform_admin` / `org_owner`) grants no export. The app's own `system_admin` set, which does, is held by no one. Per AGENTS.md rule 4 this is a platform default. The alternative owner is this repo's binding of `system_admin`.
- **Severity guess:** p2
- **Dedupe words:** `EXPORT_NOT_PERMITTED`, `admin_full_access`, `allowExport`, `grants export on 'crm_account'`

### C-05 — Timeline views grouped by a lookup render one `[OBJECT OBJECT]` group
- Inventory: ACT-006, ACT-011 · Persona: admin · URLs `/crm_event/view/crm_event.event_timeline` ("Team Schedule"), `/crm_task/view/crm_task.task_timeline` ("Worklog Timeline")
- **Steps:**
  1. Events → tab Team Schedule.
  2. Tasks → 4 more → Worklog Timeline.
- **Expected:** one swimlane per owner (inventory ACT-011 "按人泳道的团队 timeline"; ACT-006 "按人 worklog timeline"). Both views declare `groupByField: 'owner_id'` (`src/sales/views/event.view.ts:92`, `src/sales/views/task.view.ts:149`).
- **Actual:** a single header `[OBJECT OBJECT] 29` holds all 29 events, though they belong to Nina, Emil, Marta and admin. Tasks: `[OBJECT OBJECT] 11`.
- **Evidence:** `C-05-event-team-schedule-object-object.png`, `C-05-task-worklog-timeline-object-object.png`. The data API returns `owner_id` as distinct ids.
- **Owner:** console (objectui) timeline renderer: it stringifies the expanded lookup object instead of grouping by its id or label. The metadata is valid.
- **Severity guess:** p2
- **Dedupe words:** `[OBJECT OBJECT]`, `groupByField`, `owner_id`, `Team Schedule`, `Worklog Timeline`

### C-06 — The campaign timeline repeats a group header for each run of the same channel
- Inventory: MKT-007 · Persona: admin · URL `/crm_campaign/view/crm_campaign.campaign_timeline`
- **Steps:** Campaigns → Marketing Timeline.
- **Expected:** one group per channel (`groupByField: 'channel'`, `src/marketing/views/campaign.view.ts:90`).
- **Actual:** headers read DIGITAL 1 → EMAIL 1 → DIGITAL 1 → EVENTS 1 → DIGITAL 1 → … Each group shows count 1, although 3 campaigns are digital. Items stay in date order and the header restarts whenever the channel changes.
- **Evidence:** `C-06-campaign-timeline-repeated-groups.png`. Data in start-date order: digital, email, digital, events, digital, partner, events.
- **Owner:** console (objectui) timeline grouping: it groups adjacent rows instead of bucketing by key.
- **Severity guess:** p3
- **Dedupe words:** `Marketing Timeline`, `DIGITAL 1`, `groupByField: 'channel'`, `campaign_timeline`

### C-07 — The Sales Home page, App Launcher and Utility Bar have no UI path; reps land on Executive Overview
- Inventory: ADM-002, ADM-003 · Persona: sales rep, sales manager, service agent · URLs `/page/sales_home_page`, `/page/app_launcher_page`, `/page/utility_bar_page`
- **Steps:**
  1. Log in as `na.rep@objectos.ai`; note the landing page.
  2. Look for Sales Home in the sidebar and app menu.
  3. Type `/page/sales_home_page`.
- **Expected:** a three-column Sales Home is the default home for sales_rep / manager (inventory ADM-002). `content/docs/sales/activities.mdx:96` says "The Sales Home page — its My Open Tasks tab … so what you owe is on the page you land on". ADM-003 promises a utility bar and an app launcher.
- **Actual:**
  - Every persona lands on `/dashboard/executive_dashboard`.
  - No navigation item, menu or default route reaches `sales_home_page`, `app_launcher_page` or `utility_bar_page`; each renders only when typed.
  - Sales Home then stacks in a single column.
  - Nothing outside translations references `sales_home_page`, and `nav_home` points to `executive_dashboard` (`src/sales/apps/crm.app.ts`, `nav_home`).
- **Evidence:** `C-07-rep-lands-on-executive-dashboard.png`, `C-07-sales-home-only-by-typed-url.png`, `adm-03-page-utility_bar_page.png`, `adm-03-page-app_launcher_page.png`.
- **Owner:** this repo's `src/sales/apps/crm.app.ts` (`nav_home`) if the intent is a nav entry or home override. Console (objectui) if `type: 'home'` / `'utility'` / `'app'` pages are meant to mount automatically. Either way the docs promise what the app does not do.
- **Severity guess:** p2
- **Dedupe words:** `sales_home_page`, `utility_bar_page`, `app_launcher_page`, `the page you land on`, `three-column`

### C-08 — The forecast New form demands fields the hook derives
- Inventory: FCT-002 · Persona: admin · URL `/crm_forecast?form=new`
- **Steps:**
  1. Forecasts → New.
  2. Owner Nina, Period Quarter, Period Start 2026-10-15, Quota 300000 → Create.
- **Expected:** "写入时自动派生 `period_start`/`period_end`/`period_label`… 与 `snapshot_date`" (inventory FCT-002; `src/sales/objects/forecast.hook.ts:8-12` "so callers (UI, …) don't have to compute them").
- **Actual:**
  - Toast "Please check the highlighted fields: Period End, Snapshot Date"; the form will not submit.
  - The server accepts `{owner_id, period:'quarter', period_start:'2026-10-01', quota}` → 201 with `period_end 2026-12-31`, `period_label "Q4 2026"`, `snapshot_date 2026-10-10`.
  - A mid-quarter start is refused with a message about Period End, although the caller never supplied one.
- **Evidence:** `C-08-forecast-form-requires-derived-fields.png`. API 201 body as above.
- **Owner:** this repo, `src/sales/objects/forecast.object.ts:106` (`period_end` `required: true`) and `:137` (`snapshot_date` `required: true`). The console enforces `required` client-side before the beforeInsert hook can derive.
- **Severity guess:** p3
- **Dedupe words:** `Period End is required`, `Snapshot Date is required`, `forecast_derive_period`, `crm_forecast`

### C-09 — "All Forecasts" groups periods in alphabetical order, not chronological
- Inventory: FCT-005 · Persona: admin · URL `/crm_forecast`
- **Steps:** Forecasts → All Forecasts.
- **Expected:** periods in time order, as the view's sort `period_start desc` intends.
- **Actual:** groups run Sep 2026 → Q4 2026 → Q4 2025 → Q3 2026 → Q2 2026 → Q1 2026 → Oct 2026 → Aug 2026.
- **Evidence:** `C-09-forecast-groups-alphabetical.png`.
- **Owner:** this repo, `src/sales/views/forecast.view.ts:39` `grouping: { fields: [{ field: 'period_label', order: 'desc' }] }`. Descending order of a text label is alphabetical.
- **Severity guess:** p3
- **Dedupe words:** `period_label`, `All Forecasts`, `grouping`, `Sep 2026`

### C-10 — The campaign "Actual Cost exceeds Budgeted Cost" warning never reaches the user
- Inventory: MKT-002 · Persona: admin · URL `/crm_campaign?form=new`
- **Steps:** New campaign with Budgeted Cost 1000 and Actual Cost 2000 → Create.
- **Expected:** a visible warning ("实际成本超预算告警", inventory MKT-002; rule `actual_cost_within_budget`, `severity: 'warning'`, `src/marketing/objects/campaign.object.ts:299`).
- **Actual:**
  - Only "Campaign created successfully".
  - `POST /api/v1/data/crm_campaign` 201 carries no warning.
  - The record page shows no warning either.
- **Evidence:** `C-10-over-budget-no-warning.png`. Server log only: `WARN Validation rule 'actual_cost_within_budget' (warning): Actual Cost exceeds Budgeted Cost`.
- **Owner:** platform (the data API does not return warning-severity results) and console (does not show them).
- **Severity guess:** p3
- **Dedupe words:** `actual_cost_within_budget`, `Actual Cost exceeds Budgeted Cost`, `severity: 'warning'`

### C-11 — The campaign date error shows raw API field names
- Inventory: MKT-002 · Persona: admin · URL `/crm_campaign?form=new`
- **Steps:** New campaign, Status Planning, Start 2026-11-10, End 2026-11-01 → Create.
- **Expected:** a user-facing message with field labels. The object's own rule says "End Date must be after Start Date".
- **Actual:** toast "Campaign start_date (2026-11-10) must not be after end_date (2026-11-01)." (400 `VALIDATION_FAILED`, `fields: []`, so no field is highlighted).
- **Evidence:** `C-11-campaign-date-error-raw-field-names.png`.
- **Owner:** this repo, `src/marketing/objects/campaign.hook.ts:84`: the `refuse(...)` user message is built from API names.
- **Severity guess:** p3
- **Dedupe words:** `must not be after end_date`, `campaign_validation`, `start_date`

### C-12 — A sales rep is offered Escalate / Close Case, which end in a raw flow-node permission error
- Inventory: PRM-001 / PRM-003 (persona boundary) · Persona: Nina Reyes · URL `/crm_case/record/TDLbVvTzBAi8BPBU` (QA-C case owned by Nina)
- **Steps:**
  1. As the rep, open a case she owns.
  2. Escalate Case → Continue → enter a reason → Submit.
- **Expected:** the rep has `crm_case.allowEdit: false` (`src/sales/profiles/sales-rep.profile.ts:62`), so the actions are hidden or disabled. If they stay visible, they should fail with a plain permission message.
- **Actual:**
  - Both Escalate Case and Close Case are offered.
  - After the confirmation and the reason screen, the dialog shows "Node 'escalate' failed: update_record(crm_case) failed: You do not have permission to perform this action."
  - The response is `POST /api/v1/automation/escalate_case/runs/…/resume` **400** `FLOW_FAILED`.
- **Evidence:** `C-12-rep-escalate-case-node-error.png`.
- **Owner:** this repo, the case actions' `visible` predicates in `src/service/actions/case.actions.ts` (`escalate_case` / `close_case`), which ignore the caller's permission; or console (objectui), if actions are expected to be filtered by object permission.
- **Severity guess:** p3
- **Dedupe words:** `Node 'escalate' failed`, `update_record(crm_case) failed`, `escalate_case`, `Escalate Case`

### C-13 — "Enroll Members" ends silently: no result message, and a rep can run it to enrol nobody
- Inventory: MKT-004 · Persona: admin; Nina Reyes · URL `/crm_campaign/record/Nlpd7VajT_QqO6tF`
- **Steps:**
  1. As admin: Enroll Members → Leads / New → Submit.
  2. As the rep (no `crm_campaign_member` create, 0 readable leads): same with status Contacted.
- **Expected:** the user learns what happened ("5 enrolled, 1 skipped"), and a role that cannot create members is not offered the action.
- **Actual:**
  - Admin: the dialog closes with no toast, although the run summary says `selected 6, acted 5, skipped 1`.
  - Rep: the button is offered (`visible` only checks campaign status, `src/marketing/actions/campaign.actions.ts:28`). The run returns `acted 0`, again silently.
- **Evidence:** `mkt-05-enroll-result.png` (admin, no feedback), `C-13-rep-enroll-members-silent.png`. Resume response bodies are quoted above.
- **Owner:** this repo, `src/marketing/actions/campaign.actions.ts:28` (visibility) and `src/marketing/flows/campaign-enrollment.flow.ts` (no closing screen or message). Possibly also console, for showing no completion message for screen flows.
- **Severity guess:** p3
- **Dedupe words:** `Enroll Members`, `campaign_enrollment`, `acted`, `skipped`

### C-14 — The service agent's navigation and Home are built from objects they cannot read
- Inventory: PRM-001 (persona boundary), ADM-001 · Persona: Priya Raman (service agent) · URLs `/dashboard/executive_dashboard`, `/crm_opportunity`
- **Steps:**
  1. Log in as `service.agent@objectos.ai`.
  2. Look at Home, then click Opportunities, Campaigns, Forecasts.
- **Expected:** nav entries for objects the profile cannot read are hidden. `src/sales/profiles/service-agent.profile.ts` grants no read on opportunity, campaign or forecast.
- **Actual:**
  - All entries are shown; each opens a "You don't have access" panel (`GET /api/v1/data/crm_opportunity` 403).
  - Home is the Executive Overview, whose revenue widgets read "You don't have access" (`/analytics/dataset/query` 403).
- **Evidence:** `C-14-agent-home-no-access-widgets.png`, `C-14-agent-opportunities-no-access.png`.
- **Owner:** console (objectui), which doesn't filter `type: object` nav items by the caller's object permission. The app's nav has no per-profile mechanism; only `requiresObject` exists, and it guards existence, not permission.
- **Severity guess:** p3
- **Dedupe words:** `You don't have access`, `PERMISSION_DENIED`, `service_agent`, `crm_opportunity`

### C-15 — In non-English locales, the approvals inbox shows flow, step and object names in English
- Inventory: ADM-008, APR-005 · Persona: Marta Quinn, zh-CN · URL `/component/approvals/inbox` (All tab), and the opportunity record's approval panel
- **Steps:**
  1. User menu → Language → 中文（中国）.
  2. Open the Inbox → 全部.
- **Expected:** everything the user reads follows the locale (inventory ADM-008 "全量翻译").
- **Actual:**
  - Rows read "Account Approval / Account Review", "Large Deal Approval (on create) / Sales Manager Review".
  - The record type reads "Account" / "Opportunity", though the pack labels them 客户 / 商机.
  - The opportunity's 审批 panel shows "Large Deal Approval (on create)".
- **Evidence:** `C-15-zh-inbox-english-flow-names.png`, `loc-zh-opp-record.png`.
- **Owner:**
  - Flow and node labels: this repo, `src/sales/translations/zh-CN/app.ts:604`. The `flows:` block carries only screen flows; there are no `account_approval` / `opportunity_approval` / `opportunity_approval_on_create` keys, and the same holds for ja-JP and es-ES.
  - Object type: console (objectui), which uses the raw object label instead of the translated one.
- **Severity guess:** p3
- **Dedupe words:** `Large Deal Approval (on create)`, `Sales Manager Review`, `Account Approval`, `flows.account_approval`

### C-16 — zh-CN gives the Activity group and its Events item the same label "活动"
- Inventory: ADM-008, ACT-012 · Persona: Marta Quinn, zh-CN · URL `/crm_event`
- **Steps:** switch to 中文（中国） and look at the sidebar.
- **Expected:** distinct labels (en: "Activity" group, "Events" item).
- **Actual:**
  - The sidebar reads 活动 › 活动 / 销售活动.
  - The object list title is also 活动.
  - Campaigns are 营销活动, so "活动" carries three meanings on one screen.
- **Evidence:** `C-16-zh-activity-events-same-label.png`.
- **Owner:** this repo, `src/sales/translations/zh-CN/app.ts:30-31` (`group_activity: { label: '活动' }`, `nav_event: { label: '活动' }`).
- **Severity guess:** p3
- **Dedupe words:** `group_activity`, `nav_event`, `活动`

### C-17 — The record activity feed credits user actions to "System"
- Inventory: ADM-014 · Persona: admin, Nina Reyes · URL `/crm_opportunity/record/S7P8r0PLJbDXwAMG` → Activity
- **Steps:** as Nina, create an opportunity, then open its Activity tab.
- **Expected:** "Nina Reyes created …".
- **Actual:** "System · 9m ago · Created Opportunity "QA-C private deal"". The admin's own account creation also reads "System".
- **Evidence:** `C-17-activity-feed-actor-system.png`. `sys_activity` row: `actor_id pJWmBC2VVCmXEzmPyL0Qq5kMI1VV2w8H` (Nina), `created_by` the same.
- **Owner:** console (objectui) activity feed: the server records the right actor.
- **Severity guess:** p3
- **Dedupe words:** `All Activity`, `System`, `actor_id`, `sys_activity`

### C-18 — The approval request drawer shows raw option values, a truncated approver id and the wrong headline amount
- Inventory: APR-005 · Persona: admin · URL `/component/approvals/inbox` → request drawer
- **Steps:** Inbox → All → open "Account Approval".
- **Expected:** option labels (Full, Prospect, Other), the approver as "Sales Manager", and a meaningful headline figure.
- **Actual:**
  - Commercial Capability "full", Account Type "prospect", Territory "other".
  - "Waiting on: positi…ager".
  - The headline figure is "Child Account Revenue 0", which the list also uses ("Account · 0").
- **Evidence:** `C-18-request-drawer-raw-values.png`, `2057-07-inbox-all.png`.
- **Owner:** console (objectui): the drawer renders `payload_json` values without the field metadata.
- **Severity guess:** p3
- **Dedupe words:** `Waiting on`, `positi…ager`, `Child Account Revenue`, `payload_json`

### C-19 — A completed task's due date shows a red "Overdue 3d"
- Inventory: ACT-002, ACT-006 · Persona: admin · URL `/crm_task`
- **Steps:** open Tasks → All Tasks.
- **Expected:** a completed task is not shown as overdue (its own Is Overdue column is unticked).
- **Actual:** "Acme — schedule AI governance workshop" (Completed, ✓ Is Completed) shows due "Overdue 3d" in red.
- **Evidence:** `C-19-completed-task-overdue-red.png`.
- **Owner:** console (objectui) relative-date renderer: the column is a plain `due_date` (`src/sales/views/task.view.ts:44`).
- **Severity guess:** p3
- **Dedupe words:** `Overdue 3d`, `due_date`, `is_overdue`

### C-20 — An anonymous Web-to-Lead submission stays ownerless with two reps staffed, and `lead_assignment` fails
- Inventory: PRM-002 (also LEA lead routing) · Persona: anonymous · URL `POST /api/v1/forms/contact-us/submit`
- **Steps:**
  1. After `demo:staff` (Nina and Emil hold `sales_rep`), submit the contact-us form anonymously with first/last name, email, company and description.
  2. Read the lead as admin.
- **Expected:** "An ownerless lead — web-to-lead, CSV import, API capture — is assigned on insert … to whichever holder of the `sales_rep` position has the fewest open leads" (`content/docs/administration/setup.mdx:68`; `src/sales/objects/lead.hook.ts:38-103`).
- **Actual:**
  - Lead `7xgL9oYmYgNxQ0Ly` has `owner_id: null`, `lead_source web`.
  - Server log `ERROR Trigger-fired run of flow 'lead_assignment' failed … Node 'notify_std' failed: notify: at least one recipient is required, but every recipient template resolved to nothing: {record.owner_id}`.
- **Evidence:** API 201 body (owner null), the server log line above, and the admin's `GET /api/v1/data/crm_lead/7xgL9oYmYgNxQ0Ly`.
- **Owner:** this repo, `src/sales/objects/lead.hook.ts:78` (the rep-pool read of `sys_user_position` runs under the anonymous caller and comes back empty), and `src/sales/flows/lead-assignment.flow.ts` (`notify_std` with no recipient guard). It is platform instead if hooks on guest writes are meant to read with system scope.
- **Severity guess:** p2
- **Dedupe words:** `lead_assignment`, `notify_std`, `every recipient template resolved to nothing`, `owner_id: null`, `contact-us`

### C-21 — `docs/feature-inventory.md` disagrees with the shipped app in five rows
- Inventory: ADM-001, ACT-012, PRM-001, PRM-006, ADM-010 · Persona: n/a
- **Expected / Actual:**

  | line | inventory says | measured |
  |---|---|---|
  | `docs/feature-inventory.md:250` (ADM-001) | 7 navigation groups including Approvals | 6 groups; APR-005 (line 229) itself says the Approvals group was removed in #1259 |
  | `:218` (ACT-012) | Activity group = 事件/日历/互动历史 | Events + Sales Activity; calendar and history are tabs |
  | `:235` (PRM-001) | 六个 profile | 7 app permission sets incl. `service_manager`; build summary "7 Permissions" |
  | `:240` (PRM-006) | 九条条件共享规则 | 10 rules in `sys_sharing_rule`, incl. `case_unassigned_triage_sharing` |
  | `:259` (ADM-010) | 工单 8 | 38 seeded cases (8 named + 30 "Demo case NN" from `src/service/data/service.seed.ts:314`) |

  `content/docs/whats-new.mdx:58` also says "5 core surfaces (Sales, Service, Insights, Approvals)". That is a v1.0 entry, so it is dated, but it names a group that no longer exists.
- **Evidence:** the `demo:staff` log, `sys_sharing_rule` list, build summary, and the sidebar screenshots (`overview-home-*.png`).
- **Owner:** this repo, `docs/feature-inventory.md`.
- **Severity guess:** p3
- **Dedupe words:** `7 个导航组`, `九条条件共享规则`, `六个 profile`, `工单 8`

## Not defects but worth knowing

- **Running `demo:staff` opens approval requests on seeded deals.** Re-owning seeded ≥$100K deals ("Acme Platform Upgrade" 150K, "Wayne Enterprise License" 1.2M) fired the update-twin `opportunity_approval`. Those deals are now locked pending Marta, with the admin as requester. That is consistent with the flow's own rule, but it is a surprise on a demo box.
- **The service agent sees 0 cases** (`readScope: 'own'`; every seeded case is owned by the admin). The intake pool only fills with new ownerless cases. This is by design per `demo-staffing.ts`, but the agent's My Cases is empty on a demo box.
- **Analytics responses return the generated SQL** (`"sql":"SELECT owner_id AS …"`) to every caller, including reps. Row and object scope were correctly enforced: the agent gets 403, reps get only their own rows, and the manager's totals exclude the private deal.
- **Anonymous form submit response** returns the full created lead record to the anonymous caller.
- **Forecast `period_label`** is stored English text ("Q4 2026", "Sep 2026"), so group headers stay English in zh-CN and ja-JP. It is data, not a pack string.
- **Opportunity record pages have no Approvals tab**, while account record pages do. Approval state still shows via the badge and the 审批 panel.
- **The task status path** (Not Started → … → Completed) on the task record is display-only: clicking a step does nothing. Status changes go through Edit.
- **A typed `?form=new` URL for an object the user cannot create** (rep, campaign) opens a fully disabled form rather than a message.
- **Timings:** list, record and dashboard routes became interactive within ~1–2 s. Dashboards finished drawing within the 6–8 s settle I used. No page was slow enough to flag.
- **Server log:** 2 ERROR lines in total. One is C-20. The other is the expected campaign hook refusal (`campaign_validation` threw for start > end), logged at ERROR for a user validation, which is noisy.
- **Flaky:** none observed. Every finding above was reproduced at least twice, or confirmed by both screenshot and API.

## Open questions (choices I made)

- **APR-004 marked fail via C-01.** The rescue itself works; I scored the row on discoverability, because the inventory promises "挂起等管理员接管".
- **C-04 owner.** I named the platform default (`admin_full_access` without export). The alternative is that this repo should bind its `system_admin` set to the dev admin's position.
- **C-07 owner.** I named both this repo's nav and the console's page-type mounting, because I could not tell which side the `type: 'home'` intent belongs to.
- **API instead of UI.** Opportunity campaign attribution (MKT-005) and the forecast derivation proof (FCT-002) were driven via REST, because the inline-edit lookup and the form gate blocked the UI path. Everything else was driven in the browser.
- **The QA-C case** (`TDLbVvTzBAi8BPBU`, owned by Nina) was created by the admin via API to give the rep a case to test FLS against, since reps cannot create cases.
- **Scheduled flows** (MKT-006, FCT-003, ACT-004) are recorded as "not reachable" rather than tested by flipping `OS_AUTOMATION_SCHEDULED_WORK_ENABLED`, because the brief forbids config changes.
- **Locale check method:** the same 10 screens were captured in en / zh / ja / es and compared string by string. Remaining identical strings were proper names, record data, or valid Spanish words (Email, Digital, Normal, Pipeline, Marketing).
- **C-20 overlaps the LEA domain** (another tester's group). I filed it because it surfaced on my PRM-002 path.
