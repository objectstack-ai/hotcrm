# HotCRM full functional browser pass on ObjectStack 18.0.0 — 2026-10-20

Card: objectstack-ai/hotcrm#2207, track 1. One cloud tester drove a locally booted, seeded install of `main` in Chromium at 1440×900, over every row of `docs/feature-inventory.md` and the extras the card names, and re-measured the 8 cards filed from #2188's track 1. Evidence only: this branch is never merged.

## Build

- **`main` sha:** `16c28664cbc55215448f474e13610c6caa98ba81` (PR #2204).
- **`@objectstack/*`:** 18.0.0 (all 19 pinned packages; `node_modules/@objectstack/runtime` reports 18.0.0). Setup → Packages shows HotCRM and HotCRM Service 5.1.2.
- **Tooling:** Chromium 141.0.7390.37 (`/opt/pw-browsers/chromium`, driven by Playwright 1.63.0 from the repo's devDependency); Node 22.22.0; pnpm 10.33.0.
- **Boot commands and exit codes:**
  - `pnpm install` → exit 0 (57 s).
  - `pnpm dev` (port 4001) → "Server is ready"; `/_console/` 200. Flows: 33, 14 bound. Seed: one source continued in the background after the 8 s inline budget and landed about 40 s after start (374 rows).
  - `pnpm demo:staff` → **exit 0** on the fresh database: 5 users, positions assigned, the book handed over (opportunities 16 / 5 / 2 to na.rep / eu.rep / manager, leads 21 to the manager), 11 sharing rules re-evaluated (21 grants), 2 Large Deal Approval requests pending for the sales manager.
  - At 15:16Z I stopped the server and restarted it as `OS_AUTOMATION_SCHEDULED_WORK_ENABLED=true pnpm dev` on the same database, so the hourly sweeps could fire inside the pass (see *Choices made*). The boot then reported 22 flows bound.
- **Personas and logins (no passwords here):**
  - **Dev admin:** `admin@objectos.ai`; credentials from `AGENTS.md` ("dev admin, seeded on an empty DB") and the boot banner.
  - **Staffed personas,** passwords declared in `src/sales/sharing/demo-staffing.ts`: `na.rep@objectos.ai` (Nina Reyes), `eu.rep@objectos.ai` (Emil Roth), `sales.manager@objectos.ai` (Marta Quinn), `service.agent@objectos.ai` (Priya Raman), `service.manager@objectos.ai` (Tomas Okafor).
  - **Marketing user:** `marketing.user@objectos.ai` ("QA Marketing User"), created by the tester as the admin:
    1. Setup → People & Organization → Users → **Create User** (email, name, password). The form has no profile field. Its "Require Password Change On First Login" switch is on by default and I left it on, so the first sign-in landed on "You must change your password"; I changed the password there (`shots/16-NAV-mkt-landing.png` is after the change).
    2. The user's record → **Positions** tab → New → Position **marketing_user** → Create. The position carries the `marketing_user` permission set.
    - Screenshots: `shots/01-ADM-setup-create-user-form.png`, `shots/01-ADM-setup-create-marketing-user.png`, `shots/01-ADM-setup-position-new.png`, `shots/01-ADM-setup-marketing-user-positioned.png`.
  - **Anonymous visitor:** a browser context with no session.
- **Cases handed to the service agent (#2206 workaround).** As the admin, through each case's console Edit form → Case Owner → Priya Raman: CASE-00001, CASE-00005, CASE-00006, CASE-00009, CASE-00010, CASE-00026 (`shots/02-SVC-admin-reassign-case-to-agent.png`). #2206 itself is not re-reported.
- **First evidence:** `shots/00-home-admin.png` (the platform home after sign-in as the admin).

## Coverage

161 rows: **143 pass · 3 fail · 12 not reachable · 0 not tested · 3 n/a (rows the inventory marks removed)**.

- The 3 fails are prior cards that still reproduce (OPP-007 = #2191, CON-002 = #2192) and the export file's content (ADM-005 = F-01, F-02).
- "Not reachable": 6 AI skills (no AI service in this open-source boot; ADM-015 says `ai` is deliberately not required) and 6 daily schedule-only flows. For those, `POST /api/v1/automation/<flow>/trigger` answers 403 "This caller may not start this flow", Setup → Packaged Automation offers only On / Clone, and their fire times (00:00–08:00) did not fall inside the pass. The two hourly sweeps (SVC-008, ACT-004) did fire and pass.

| Row | Verdict | Reason | Screenshot |
|---|---|---|---|
| LEA-001 | pass | Lead list for the manager (21 seeded + web and imported leads), field groups, 1–5 star score; the rep sees own leads only | shots/21-LEA-014-all-leads.png |
| LEA-002 | pass | Transition table holds at warning level (new→contacted→qualified saved 200). But Converted is still offered in Edit and Create — F-01 / #2189 still reproduces | shots/24-F01-lead-status-converted-in-edit.png |
| LEA-003 | pass | unqualified without reason → 400 "Disqualification reason is required…"; reason duplicate without survivor/confirmed → 400 | (REST) |
| LEA-004 | pass | Web lead (VP title, corporate email, phone, website, revenue) rating 4; forged rating 5 from a guest recomputed to 1 | (REST) |
| LEA-005 | pass | Three web leads round-robined na.rep → eu.rep → na.rep | (REST) |
| LEA-006 | pass | /forms/contact-us → 302 /_console/f/contact-us; anonymous browser submit 201; forged status/owner/is_converted/converted_account/duplicate_status/rating stripped | shots/20-LEA-006-web-to-lead-form.png, shots/20-LEA-006-web-to-lead-submitted.png |
| LEA-007 | pass | Guest lead with upper-case email of an existing lead stored lower-cased, flagged suspected, duplicate_of_lead = Pia Anand | shots/21-LEA-014-suspected-duplicates.png |
| LEA-008 | pass | Converted lead: title edit → 409 RECORD_LOCKED; description edit 200 | (REST) |
| LEA-009 | pass | na.rep set the web lead to Qualified → high task "Follow up with qualified lead: Wren Halvorsen…" due +2 days, owner na.rep | (REST) |
| LEA-010 | pass | na.rep converted Wren Halvorsen: screen names the new account ("creates a new account named BlueFjord Shipping AS", #2073 item 8 now fixed); amount required; account + contact + opportunity 64,000 prospecting created; operator notified | shots/26-LEA-010-convert-wizard-step1.png, shots/26-LEA-010-convert-wizard-filled.png, shots/26-LEA-010-convert-done.png |
| LEA-011 | pass | Rating-4 web lead → next_followup_date +1 day and warning "Hot lead — follow up within 24h"; rating-1 lead +3 days and "New lead assigned to you…" (#2073 item 7 wording now fixed) | (REST) |
| LEA-012 | pass | Schedule Follow-up screen flow: task "Send pricing deck" due 2026-10-27, lead next_followup_date synced; toast "Follow-up scheduled." | shots/27-LEA-012-schedule-followup-form.png, shots/27-LEA-012-schedule-followup-done.png |
| LEA-013 | pass | Marketing user: 2 rows on All Leads → bulk bar Add to Campaign → Cloud Migration Webinar → Run → "Succeeded 2 / 2" (2 dispatches). Sales manager has no campaign-member create right, so neither the bar nor the row menu offers it (as the row describes) | shots/28-LEA-013-mkt-add-to-campaign-step2.png, shots/28-LEA-013-mkt-add-to-campaign-result.png, shots/28-LEA-013-mgr-row-menu.png |
| LEA-014 | pass | All 8 tabs draw (All, My, Hot, High Priority, Suspected Duplicates, Pipeline kanban, Calendar, Cards) | shots/21-LEA-014-*.png |
| LEA-015 | pass | Default create form, edit form, conversion wizard and public form render. The other named form views have no UI entry; not separately driven | shots/25-LEA-015-new-lead-form.png |
| LEA-016 | pass | Detail: Convert Lead / Schedule Follow-up / Log a Call / Edit, highlights, 5-stage path, Details/Related/Activity/History | shots/23-LEA-016-lead-detail.png |
| LEA-017 | not reachable | AI skill; no AI service in this open-source boot (ADM-015: `ai` deliberately not required) | — |
| LEA-018 | pass | Console import with the shipped "Lead Import (CSV)" mapping now sends format csv: 3/3 created, synonyms applied (LinkedIn→social, Google Ads→paid_search), owner = importer. The mapping is offered but still not preselected (#2194 T1-U06) | shots/30-LEA-018-import-shipped-mapping.png, shots/30-LEA-018-import-after-1.png |
| LEA-019 | pass | Lead Inflow report (lead_metrics) answered 200 and drew — see *Extras* | shots/91-RPT-*.png |
| ACC-001 | pass | Account list, cards and detail render (tier, health score, segment, territory); attachments section on the record | shots/31-ACC-006-all-accounts.png, shots/33-ACC-008-account-detail.png |
| ACC-002 | pass | Exact duplicate "Acme Corporation" → 409 UNIQUE_VIOLATION; "QA  Brücken   GmbH" → name_normalized "qa brücken gmbh" | (REST) |
| ACC-003 | pass | billing_address.country " de " → billing_country "DE", territory "emea" | (REST) |
| ACC-004 | pass | ftp:// website → 400; negative revenue → 400 (manager); a rep gets 403 field-write on annual_revenue; delete Acme (customer, 3 opportunities) → 409 DELETE_RESTRICTED with the "mark inactive" hint | (REST) |
| ACC-005 | pass | See ACT-010 (held event and completed task bubble last_activity_date to the account); Send Email also stamped it | (REST) |
| ACC-006 | pass | 6 tabs draw; bulk bar Update Tier / Transfer Owner / Delete; Update Tier on 2 rows → "Succeeded 2 / 2" (bulk 405, per-row PATCH fallback; an Undo button is new). The confirm still prints raw {{count}} / {{tier}} — F-05 still reproduces. Map: 9 of 10 accounts now carry coordinates (#2060 item 15 no longer reproduces); the external tile host is blocked in this container | shots/31-ACC-006-*.png, shots/31-ACC-006-mass-tier-confirm.png |
| ACC-007 | pass | Account Workbench: curated grid with Industry / Type / Account Owner quick filters only | shots/32-ACC-007-workbench.png |
| ACC-008 | pass | Slotted detail: Log a Call / Log a Meeting / Schedule a Meeting / Edit; Details / Related (18) / Attachments; discussion feed | shots/33-ACC-008-account-detail.png |
| ACC-009 | pass | Contact detail renders; deleting a prospect account cascaded its contact (read back 0 rows) | shots/34-ACC-009-contact-detail.png |
| ACC-010 | pass | "Hal.Brook@Acme.example" stored lower-case; same email again → 409 DUPLICATE_VALUE; deleting a contact on an open opportunity → 409 DELETE_RESTRICTED with a clear message | (REST) |
| ACC-011 | pass | Record header More actions → Mark as Primary Contact → confirm → "Contact marked as primary!"; Hal primary, John demoted | shots/34-ACC-011-mark-primary-confirm.png, shots/34-ACC-011-mark-primary-done.png |
| ACC-012 | pass | Send Email (Subject / Body) → 200 emailId + activityId; contact last_contacted_date stamped. Toast is the generic "Action completed successfully" | shots/35-ACC-012-send-email-form.png |
| ACC-013 | pass | Rep-created contact → owner inbox "New contact: Hal Brook" (contact_welcome) | (REST) |
| ACC-014 | pass | All Contacts (grouped by account), People Directory, Primary Contacts draw | shots/36-ACC-014-*.png |
| ACC-015 | pass | Console import with the shipped "Account Import (CSV)" and "Contact Import (CSV)" mappings: 2/2 created each; re-import of the same accounts file → 2 updated (upsert) | shots/38-ACC-015-account-import-shipped-mapping.png, shots/38-ACC-015-contact-import-after-1.png |
| ACC-016 | not reachable | AI skill; no AI service in this boot | — |
| ACC-017 | not reachable | AI skill; no AI service in this boot | — |
| ACC-018 | pass | Accounts by Industry & Type and Customer Churn Signals reports answered 200 and drew — see *Extras*; account/contact datasets feed the executive and CRM dashboards | shots/91-RPT-*.png |
| OPP-001 | pass | Opportunity list and detail; required name/account/amount/stage/close date; attachments | shots/40-OPP-010-open-opportunities.png, shots/41-OPP-016-opp-detail.png |
| OPP-002 | pass | closed_won without win_reason → 400 "Win Reason is required"; closed_lost without loss_reason → 400; backward needs_analysis→qualification saved (warning level by design) | (REST) |
| OPP-003 | pass | qualification→needs_analysis with a forged probability 99: probability 40, expected_revenue 31,600, forecast_category best_case | (REST) |
| OPP-004 | pass | stage_entry_date reset to today, days_in_stage 0; Stale tab sorts by days in stage | shots/40-OPP-010-stale-opportunities.png |
| OPP-005 | pass | Won deal: amount edit → 409 RECORD_LOCKED "only description, next_step, notes may be edited"; description 200; close_date stamped today on the win | (REST) |
| OPP-006 | pass | eu.rep won Northwind Grid Modernization in the Edit form: Northwind Energy prospect→customer; high task "Activate new customer…" due +3 days. The first Update fails once on Win Reason (6th tab) — #2194 T1-U02, unchanged | shots/42-OPP-006-win-first-save.png, shots/42-OPP-006-won-record.png |
| OPP-007 | fail | Lines roll up (BlueFjord deal 64,000 → 36,000 → 43,000 as lines were added), but a line added while the deal is approval-locked is still saved and its rollup fails: Acme Platform Upgrade 150,000 vs lines 156,000 — F-03 / #2191 still reproduces | (REST + server log 15:44:56Z) |
| OPP-008 | pass | Line with no unit_price → unit_price = list_price 18,000; negotiated 7,000 kept | (REST) |
| OPP-009 | pass | Sales Pipeline kanban: columns per stage with amount sums; closed deals excluded | shots/40-OPP-010-pipeline-kanban.png |
| OPP-010 | pass | All 10 tabs draw (Open Deals, All, Pipeline, Forecast Calendar, Timeline, Cards, My Open, and under "3 more": Stale, Tender This Quarter (designed empty state), Closing This Quarter) | shots/40-OPP-010-*.png |
| OPP-011 | pass | 2 deals → Update Stage → Proposal → one aggregate dispatch (`_selectedIds` of 2) → "Succeeded 2 / 2" | shots/43-OPP-011-mass-update-stage.png, shots/43-OPP-011-mass-update-stage-done.png |
| OPP-012 | pass | Clone → "Copy of Globex Manufacturing Suite", prospecting, amount kept, close date +90 days; toast "Opportunity cloned successfully!" (the page stays on the original) | shots/44-OPP-012-clone-result.png |
| OPP-013 | not reachable | Daily 07:30 schedule only. `POST /api/v1/automation/opportunity_stagnation/trigger` → 403 "This caller may not start this flow"; Setup → Packaged Automation offers On/Clone only, no run-now; 07:30 did not fall inside the pass | — |
| OPP-014 | pass | Wayne 1.2M won after both approvals → owner inbox "Large deal won: … closed at 1200000" — the amount is still unformatted, F-08 / #2193 still reproduces | shots/96-F08-large-deal-won-unformatted.png |
| OPP-015 | pass | is_private deal: owner and admin 200; sales manager, marketing user and eu.rep 404 by id and absent from lists | (REST) |
| OPP-016 | pass | Detail header Generate Quote / Clone Opportunity / Log a Call / Edit, 7-stage path, highlights | shots/41-OPP-016-opp-detail.png |
| OPP-017 | pass | Opportunity reports and dashboards answered 200 — see *Extras* | shots/91-RPT-*.png |
| QUO-001 | pass | Quote list and detail (QTE-0007 auto-number, pricing block, 6-stage path) | shots/55-QUO-001-quote-detail.png |
| QUO-002 | pass | draft→in_review→presented→accepted held; "Contact is required" blocks presented without a contact (400); expired QTE-0001 → draft → 409 | (REST) |
| QUO-003 | pass | REST-created quote got expiration_date = quote_date + 30 days; accepted quote: discount edit → 409 "only internal_notes may be edited" | (REST) |
| QUO-004 | pass | Generate Quote screen flow (name / valid days / discount): QTE-0007 seeded from the deal amount 79,000 −10% = 71,100, contact filled from the deal; toast with a View link. Quote Name still has no default (#2194 T1-U03, unchanged) | shots/53-QUO-004-generate-quote-form.png, shots/53-QUO-004-generate-quote-done.png |
| QUO-005 | pass | na.rep accepted QTE-0007 → draft contract CTR-0005, 54,720, 12 months, owner the rep | shots/58-CON-007-contract-timeline.png |
| QUO-006 | pass | Same acceptance closed the deal: closed_won, win_reason quote_accepted, close_date today | (REST) |
| QUO-007 | pass | Lines 1×50,000 and 2×6,000 −10% → subtotal 60,800, quote discount 10% → 54,720; a line on the accepted quote → 409 | (REST) |
| QUO-008 | not reachable | Daily 01:00 schedule only; trigger API 403; no run-now in Setup | — |
| QUO-009 | pass | All Quotes, Quote Pipeline (status kanban with total sums), Quote Calendar draw | shots/54-QUO-009-*.png |
| QUO-010 | pass | Product list grouped by category, PRD-#### numbers | shots/56-QUO-012-all-products.png |
| QUO-011 | pass | list_price < cost → 400; sku "qa-wid-1" stored "QA-WID-1"; delete a referenced product → 409 "it is on 14 opportunity line items and 5 quote line items. To retire it instead, turn off Active." (#2060 item 12's product half no longer reproduces) | (REST) |
| QUO-012 | pass | Product list by category and the image gallery catalog draw | shots/56-QUO-012-product-catalog.png |
| QUO-013 | pass | product_metrics feeds the CRM Overview tile; every query on that dashboard 200 — see *Extras* | shots/90-DASH-05-admin-crm_overview_dashboard.png |
| CON-001 | pass | Contract list and detail, CTR-#### numbers | shots/58-CON-007-all-contracts.png |
| CON-002 | fail | Terminal states still not held: admin set expired CTR-0003 → activated (200; it now reads Activated with an end date of Sep 15 in the past); manager set activated CTR-0005 → draft (200) and back. F-04 / #2192 still reproduces | shots/57-F04-contract-expired-reactivated.png |
| CON-003 | pass | 12-month term with a 20-month range → 400; shrinking end_date after activation → 409 | (REST) |
| CON-004 | pass | Activation stamped signed_date 2026-10-20; Vertex Analytics is a customer. (A sales rep owns the quote-born contract but cannot edit it: sales_rep has read-only contract access by design) | (REST) |
| CON-005 | not reachable | Daily 00:00 schedule only; trigger API 403 | — |
| CON-006 | not reachable | Daily 08:00 schedule only; trigger API 403 | — |
| CON-007 | pass | Renewal Calendar, Contract Terms (gantt), Contract Timeline grouped by account, list | shots/58-CON-007-*.png |
| SVC-001 | pass | Case list and detail, CASE-##### numbers (web cases got CASE-00039 / 00040), priorities, origins, attachments | shots/60-SVC-013-all-cases.png, shots/61-SVC-014-case-detail-agent.png |
| SVC-002 | pass | Close without resolution → 400 "Resolution is required when closing a case"; escalated reachable from in_progress; new→in_progress 200 | (REST) |
| SVC-003 | pass | Web case high → sla_due_date +8 h (smb default); critical → +4 h. An escalation of an already past-due case keeps the earlier date by design (hook comment: the re-derived date only moves the deadline earlier) | (REST) |
| SVC-004 | pass | priority_rank high 3, critical 4 | (REST) |
| SVC-005 | pass | /forms/support → /_console/f/support; anonymous browser submit 201 (CASE-00039, origin web, owner round-robined to the service agent); forged status/owner/internal_notes/resolution stripped. The form still collects no way to reach the visitor — F-02 / #2190 still reproduces | shots/22-SVC-005-web-to-case-form.png, shots/22-SVC-005-web-to-case-filled.png, shots/22-SVC-005-web-to-case-submitted.png |
| SVC-006 | pass | Close → closed_date stamped, resolution_time_hours 63.9, is_closed true | shots/64-SVC-006-closed-case.png |
| SVC-007 | pass | Forged critical web case CASE-00040 auto-escalated ("Auto-escalated: critical priority") and reassigned to the service manager; critical notice sent | (REST) |
| SVC-008 | pass | Hourly sweep at 16:00 (scheduled work enabled): is_sla_violated went from 13 to 29 cases; overdue cases escalated, and "SLA breached: case CASE-00010 / CASE-00026…" (critical) reached the agent | (REST) |
| SVC-009 | pass | Agent escalation → urgent task "Escalated: CASE-00001…" due next day to the account owner; closing the case completed it (open PR #2187 from last round has landed); Acme last_activity_date bumped | (REST) |
| SVC-010 | pass | Agent: Escalate Case (confirm, then reason) → critical, escalated, owner Tomas (service manager), escalated_from Priya. Service manager: Close Case (resolution + optional article) → closed. The extra confirm before each form is #2194 T1-U04, unchanged. Agent keeps read after escalating and loses it once the case closes (#2060 item 3 family, unchanged) | shots/63-SVC-010-escalate-form.png, shots/63-SVC-010-escalate-after-agent.png, shots/64-SVC-010-close-form.png |
| SVC-011 | n/a | Removed (#1428) | — |
| SVC-012 | pass | Agent's Log a Call on CASE-00039 stamped first_response_date | shots/75-ACT-009-case-log-call-form.png |
| SVC-013 | pass | All 8 tabs draw for agent / service manager (All, Service Workflow kanban, SLA Calendar, Timeline, My Open, Unassigned triage (empty), and under "2 more": Escalated, SLA at Risk) | shots/60-SVC-013-*.png |
| SVC-014 | pass | Detail: SLA highlights, 6-stage path, Escalate / Close / Log a Call, Details / Related / Activity | shots/61-SVC-014-case-detail-agent.png |
| SVC-015 | pass | Service manager reads the open critical cases through the escalation share (7 open critical); the agent sees only own | shots/60-SVC-013-svcmgr-escalated-cases.png |
| SVC-016 | pass | Activity timeline shows "Case escalated —" and "Case closed —" milestone entries | shots/64-SVC-016-case-activity-timeline.png |
| SVC-017 | not reachable | AI skill; no AI service in this boot | — |
| SVC-018 | pass | Service dashboard: 15 queries all 200, 14 chart marks; the 3 case reports 200 | shots/90-DASH-03-admin-service_dashboard.png, shots/91-RPT-08-cases_by_status_priority.png |
| KB-001 | pass | Agent created KA-0025 with category, audience public, linked source case | shots/65-KB-001-article-detail.png |
| KB-002 | pass | draft → in_review → published → archived → published all saved | (REST) |
| KB-003 | pass | Publish without body → 400 "Articles cannot be published without a body."; without summary → saved (warning) | (REST) |
| KB-004 | pass | published_at set on first publish and kept on re-publish after archive | (REST) |
| KB-005 | pass | Helpful vote by a rep → "Thanks — recorded as helpful.", helpful_count 0→1 | shots/66-KB-005-helpful-vote.png |
| KB-006 | pass | All Articles, Published, My Drafts draw | shots/65-KB-006-*.png |
| KB-007 | pass | Agent create/edit 200, delete 403; rep read 200, edit 403; anonymous GET 401 | (REST) |
| MKT-001 | pass | Campaign list and detail, CPG-#### codes, response_rate / roi compute | shots/70-MKT-007-all-campaigns.png, shots/71-MKT-001-campaign-detail.png |
| MKT-002 | pass | start after end → 400 "The campaign's Start Date (…) must not be after its End Date (…)" (labels, not API names: #2060 item 12's campaign half no longer reproduces); in_progress without dates → 400; actual cost over budget saved (warning) | (REST) |
| MKT-003 | pass | Members carry a lead or a contact; sent → responded → unsubscribed; members readable by the marketing user | shots/73-MKT-009-mark-responded.png |
| MKT-004 | pass | Marketing user: Enroll Members screen flow (Leads, status New) → 6 leads enrolled (9 → 15 members), toast "Eligible members enrolled in campaign." (#2060 item 8 no longer reproduces). The form still requires both the lead and the contact criterion (#2194 T1-U05, unchanged) | shots/72-MKT-004-mkt-enroll-form.png, shots/72-MKT-004-mkt-enroll-toast.png |
| MKT-005 | pass | Enrolment recomputed response_rate 33.33 → 20; attributing and winning a 95,000 deal on CPG-0004 → actual_revenue 120,000 → 215,000, won opportunities 1 → 2, ROI 900 → 1,691.67 | (REST) |
| MKT-006 | not reachable | Daily 02:00 schedule only; trigger API 403 | — |
| MKT-007 | pass | Campaign Schedule (gantt), Launch Calendar, Marketing Timeline draw | shots/70-MKT-007-*.png |
| MKT-008 | pass | Marketing user edited an admin-owned campaign (200); a sales rep's edit → 403 | (REST) |
| MKT-009 | pass | Mark Responded (member header button) → responded + response_date + has_responded, toast "Response recorded on this campaign member."; status unsubscribed → contact Sarah Johnson email_opt_out true | shots/73-MKT-009-mark-responded.png |
| FCT-001 | pass | Forecast object: quota, four buckets, attainment / coverage / expected formulas; detail renders | shots/74-FCT-001-forecast-detail.png |
| FCT-002 | pass | Manager created a quarter forecast with only period + period_start 2026-10-01 → period_end 2026-12-31, label "Q4 2026", snapshot_date today; a mid-quarter start → 400 with both reasons | (REST) |
| FCT-003 | not reachable | Daily 03:00 schedule only; trigger API 403. This Quarter shows its designed empty state until the sweep has run | shots/74-FCT-005-this-quarter-forecasts.png |
| FCT-004 | pass | Buckets read crm_opportunity.forecast_category, which the stage hook writes (pipeline / best_case / commit / closed seen) | (REST) |
| FCT-005 | pass | All Forecasts, This Quarter, My Forecast draw. All Forecasts now groups by Period Start, newest first (#2060 item 11 no longer reproduces); the group heading prints the raw date "2026-10-01" (objectui#13234, known) | shots/74-FCT-005-all-forecasts.png |
| FCT-006 | not reachable | AI skill; no AI service in this boot | — |
| FCT-007 | pass | Sales Performance dashboard drew, every dataset query 200 — see *Extras* | shots/90-DASH-02-admin-sales_dashboard.png |
| FCT-008 | pass | Executive Overview and CRM Overview drew, every query 200 — see *Extras* | shots/90-DASH-01-admin-executive_dashboard.png, shots/90-DASH-05-admin-crm_overview_dashboard.png |
| FCT-009 | pass | forecast_metrics tiles on Sales Performance / CRM Overview answered 200 | shots/90-DASH-02-admin-sales_dashboard.png |
| FCT-010 | pass | The Reports group (collapsed by default) holds one entry per shipped report: admin sees all 10, the service agent the 5 it can read. New in 18.0.0: an "All reports" entry opens the console's report index, which lists only 7 — F-03 | shots/91-RPT-00-admin-reports-index-and-nav.png, shots/91-RPT-00-agent-reports-index-and-nav.png |
| ACT-001 | pass | Task related to an account; urgent → priority_rank 4; reminder after due date → 400 with a clear message | (REST) |
| ACT-002 | pass | status completed → completed_date stamped, progress_percent 100, is_completed true | (REST) |
| ACT-003 | pass | Monthly recurring task due 2026-10-31 completed → next occurrence due 2026-11-30 (month-end clamp) | shots/76-ACT-006-task-gantt.png |
| ACT-004 | pass | Hourly sweep at 16:00 (scheduled work enabled): probe task with reminder 15:52 → owner inbox "Task reminder: QA reminder probe" (warning), reminder_date cleared, reminder_sent true | (REST) |
| ACT-005 | pass | New urgent task → owner inbox "Urgent task: QA urgent probe" (warning) | (REST) |
| ACT-006 | pass | Task tabs draw: All, Board, Schedule, Execution Plan (gantt), Worklog Timeline, My Open, and under "2 more" Today's (10) and Overdue (13) | shots/76-ACT-006-*.png |
| ACT-007 | pass | Logged call event: type call, status held, duration 15 | (REST) |
| ACT-008 | pass | log_call returned an attendee row id | (REST) |
| ACT-009 | pass | Case Log a Call (subject, duration, contact and internal attendees, notes) → event + attendee + activity; lead / contact / account / opportunity headers carry Log a Call (and Log a Meeting / Schedule a Meeting) | shots/75-ACT-009-case-log-call-form.png |
| ACT-010 | pass | eu.rep's held call on contact Priya Shah moved Lattice Education last_activity_date 2026-10-14 → 2026-10-20 and stamped the contact's last_contacted_date | (REST) |
| ACT-011 | pass | Event tabs draw: All, Event Calendar, Team Schedule, My Calendar, Upcoming, Interaction History | shots/77-ACT-011-*.png |
| ACT-012 | pass | Activity group (Events, Sales Activity); Sales Activity dashboard drew — see *Extras* | shots/90-DASH-04-admin-sales_activity_dashboard.png |
| ACT-013 | pass | event_metrics / task_metrics tiles answered 200 | shots/90-DASH-04-admin-sales_activity_dashboard.png |
| APR-001 | pass | ≥100K opened manager review (Initech raised to 110,000 → pending); 1.2M got manager_review then director_signoff | shots/50-APR-005-mgr-inbox.png |
| APR-002 | pass | Pending deal: rep edit of amount or next_step → 409 RECORD_LOCKED; approval_status mirrors pending / approved / rejected | (REST) |
| APR-003 | pass | Approve → approved_date + owner inbox "Deal approved"; Reject → approval_status rejected + warning "Deal rejected… Review and revise before resubmitting" | shots/51-APR-003-mgr-approve-wayne-dialog.png, shots/51-APR-003-mgr-reject-acme-done.png |
| APR-004 | pass | sales_director has no holder → the director step landed in the dev admin's inbox (admin rescue); admin approved | shots/52-APR-004-admin-inbox-director-rescue.png |
| APR-005 | pass | My Work → Inbox opens approvals:inbox with the manager's 5 pending requests (2 deals, 3 account reviews); approve/reject from the record view, which shows "Locked for approval" | shots/50-APR-005-mgr-inbox.png, shots/51-APR-003-mgr-approve-wayne-request.png |
| PRM-001 | pass | Setup → Permission Sets lists the app's 7 sets (guest_portal, marketing_user, sales_manager, sales_rep, service_agent, service_manager, system_admin) beside platform ones; each persona's reach matched its set in every domain above | shots/80-PRM-001-permission-sets.png |
| PRM-002 | pass | Anonymous: both form submits 201; GET /api/v1/data/crm_case 401; POST /api/v1/data/crm_lead 401; KB read 401 | (REST) |
| PRM-003 | pass | Rep: health_score / annual_revenue write 403; sales manager reads case internal_notes but its edit → 403; service manager writes it | (REST) |
| PRM-004 | pass | Rep export: crm_lead 200 CSV (own rows only), crm_quote 403 EXPORT_NOT_PERMITTED; the console now draws the export door (Display → Export as CSV / XLSX). The exported file has two content defects — F-01, F-02 | shots/81-ADM-005-mgr-display-popover.png |
| PRM-005 | pass | Rep owner change on a lead → 403 "requires the transfer grant"; service agent created a task owned by the service manager → 201 | (REST) |
| PRM-006 | pass | Territory and team rules grant (na.rep 6 accounts, eu.rep 2, with edit); demo:staff evaluated 11 rules, 21 grants. Setup → Declared Sharing Rules now lists all 11 packaged rules (last round's empty-list observation no longer holds) | shots/80-PRM-006-declared-sharing-rules.png |
| PRM-007 | pass | Setup → Positions lists the 12 app positions, flat. Boot log warns that 5 of them reach their permission sets only by same-name match — carried by #2200 | shots/80-PRM-007-positions.png |
| PRM-008 | pass | See OPP-015 (private deal hidden from manager, marketing and the other rep) and MKT-008 (marketing edits others' campaigns). But see S-1 | (REST) |
| PRM-009 | pass | Products, campaigns and KB: every persona with object read sees all rows (rep 14 products / 7 campaigns / 25 articles); leads, accounts, opportunities and cases private (rep sees own + shared) | (REST) |
| PRM-010 | pass | `pnpm demo:staff` exit 0: 5 loginable users, positions assigned, 11 rules re-evaluated, 2 approvals pending for the sales manager | (boot) |
| ADM-001 | pass | App with Home, Sales Home, Service, Sales, My Work, Activity, Marketing, Insights, Reports; admin / manager / marketing land on Executive Overview | shots/10-NAV-admin-landing.png |
| ADM-002 | pass | Sales Home is the reps' landing: 4 KPIs, My Leads / My Open Deals / My Open Tasks, AI hint card, upcoming events | shots/12-NAV-narep-landing.png |
| ADM-003 | n/a | Removed (#2118) | — |
| ADM-004 | pass | All three shipped mappings import through the console (LEA-018, ACC-015); F-07 / objectui#13156 fixed | shots/30-LEA-018-import-shipped-mapping.png |
| ADM-005 | fail | The export control is now drawn (Display → Export as CSV / XLSX) and the file downloads (F-06 fixed). But the file is wrong: a contact lookup is exported as the contact's job title, and booleans as 是 / 否 for an English user — F-01, F-02 | shots/81-ADM-005-mgr-display-popover.png, shots/81-ADM-005-export-csv-content.png |
| ADM-006 | pass | Admin uploaded a file on Acme (presign 200, PUT 200, complete 200, sys_attachment 201). No other profile may create sys_attachment, so reps see no Upload even on their own deal — deliberate, "upload waits upstream" (#2029, sales-rep.profile.ts) | shots/81-ADM-006-admin-attachments-tab.png, shots/81-ADM-006-rep-own-deal-attachments.png |
| ADM-007 | pass | Notifications seen: lead routing (hot / normal), lead converted, contact welcome, quote created, deal approved / rejected, large deal won, urgent task, task reminder, case escalated, SLA breach | shots/96-F08-large-deal-won-unformatted.png |
| ADM-008 | pass | Manager switched to 中文（中国）: nav, dashboard, list, record, kanban and approvals pages translated; the Activity group is now 互动 and Events 活动 (#2060 item 13 no longer reproduces). Approval process names stay English (objectstack#24863, known) | shots/92-I18N-zh-exec-dashboard.png, shots/93-I18N-zh-*.png |
| ADM-009 | pass | Every dashboard and report query answered 200 (67 dashboard queries, 18 report queries) | shots/90-DASH-*.png, shots/91-RPT-*.png |
| ADM-010 | pass | Seed landed: 374 rows (9 accounts, 21 leads, 23 opportunities, 38 cases, 29 events, 51 campaign members, 6 quotes, 24 articles) | (boot) |
| ADM-011 | n/a | Removed (#1892) | — |
| ADM-012 | not reachable | AI skill; no AI service in this boot | — |
| ADM-013 | pass | Help → "This app's docs" opens the packaged docs (Overview, Sales, Service, Administration) | shots/82-ADM-013-app-docs.png |
| ADM-014 | pass | Lead History tab lists the status changes and conversion with actor and time | shots/83-ADM-014-lead-history.png |
| ADM-015 | pass | Setup → Packages lists HotCRM and HotCRM Service 5.1.2, enabled | shots/84-ADM-015-packages.png |

## Findings

Three new findings (F-01 to F-03). The prior cards are in *Re-measure*; known items crossed on the way are listed after the findings, one line each.

### F-01 — List export writes a contact lookup as the contact's job title, not the contact's name

- **Persona / URL / steps:**
  - service.manager, `/_console/apps/app.objectstack.hotcrm/crm_case` (All Cases) → Display → **Export as CSV**.
  - The console sends `GET /api/v1/data/crm_case/export?format=csv&fields=case_number,subject,crm_account,crm_contact,priority,status,origin,sla_due_date,is_sla_violated,is_escalated,owner_id&orderby=…` → 200 `text/csv`, file `Case-All Cases-20261020-161553.csv`.
- **Expected:** the Contact column names the contact, as the grid does ("John Smith"). `crm_contact` declares `nameField: 'full_name'` (`src/sales/objects/contact.object.ts:319`). ADM-005: list CSV/XLSX export.
- **Actual:**
  - `CASE-00001,Login issues after platform upgrade,Acme Corporation,VP of Engineering,…` — "VP of Engineering" is John Smith's `title`. CASE-00002 / 00007 export "Chief Procurement Officer".
  - The same through the REST door, as other personas: `crm_lead/export?fields=converted_contact` → "VP of Operations" for Wren Halvorsen (na.rep); `crm_opportunity/export?fields=primary_contact` → "Director of Commercial Systems" for Apex Logistics Data Hub (manager).
  - Lookups to `crm_account` and `sys_user` export the right names (Acme Corporation, Tomas Okafor).
- **Evidence:** `shots/81-ADM-005-export-csv-content.png` (the downloaded file's first lines), `shots/81-ADM-005-svcmgr-crm_case-export-csv.png`, `shots/81-ADM-005-mgr-display-popover.png`.
- **class:** a (wrong result in an exported file). **reach:** the list Display → Export door; `GET /api/v1/data/:object/export`.
- **Suspected landing spot:** the platform's export handler (`@objectstack/runtime` / `@objectstack/objectql` lookup-label resolution), which appears to take a field literally named `title` as the record label ahead of the object's declared `nameField`. Not `src/`: the app declares `nameField` correctly.
- **Dedupe words:** `export lookup label`, `nameField full_name`, `contact title exported`.
- **Known carrier:** none found (hotcrm issue search on export / lookup / title: 0 hits).

### F-02 — List export writes booleans as 是 / 否 for an English user

- **Persona / URL / steps:** same file as F-01 (service.manager, English UI). Also na.rep, who never changed language: `GET /api/v1/data/crm_lead/export?format=csv&fields=full_name,is_converted,do_not_call,…` with `Accept-Language: en-US`.
- **Expected:** the file speaks the user's language: the grid and the record show English (checkbox / "Yes"); the column headers in the same file are English ("SLA Violated", "Escalated", "Converted").
- **Actual:** every boolean cell is `是` or `否`: `…,2026-10-18 08:00:00,是,是,Tomas Okafor`; `Wren Halvorsen,是,否,…`. Headers and select labels in the same rows are English.
- **Evidence:** `shots/81-ADM-005-export-csv-content.png`; REST output quoted above.
- **class:** a. **reach:** the list export door and `GET /api/v1/data/:object/export`.
- **Suspected landing spot:** the platform export formatter (boolean cell rendering takes a fixed or server-default locale instead of the caller's). Not `src/`.
- **Dedupe words:** `export boolean 是 否`, `export locale`, `CSV yes no`.
- **Known carrier:** none found.

### F-03 — The console's new "All reports" index leaves out the service module's 3 reports

- **Persona / URL / steps:** admin, then service.agent: sidebar Reports → **All reports** → `/_console/apps/app.objectstack.hotcrm/reports`.
- **Expected:** the index lists the app's shipped reports, as the same sidebar group does one entry each (FCT-010; `crm.app.ts` "EVERY shipped report, one entry each"). `GET /api/v1/meta/report` returns all 10, three of them with package `app.objectstack.hotcrm.service`.
- **Actual:**
  - Admin: the index lists 7 (the `app.objectstack.hotcrm` ones). Cases by Status and Priority, SLA Performance and Cases Opened by Day are missing, though the sidebar under it lists all 10 and each opens by URL.
  - Service agent: the index lists 2 (Accounts by Industry and Type, Lead Engagement by Month × Source); the agent's sidebar lists those plus the 3 case reports, which are the agent's main reports.
- **Evidence:** `shots/91-RPT-00-admin-all-reports.png`, `shots/91-RPT-00-admin-reports-index-and-nav.png`, `shots/91-RPT-00-agent-all-reports.png`, `shots/91-RPT-00-agent-reports-index-and-nav.png`.
- **class:** a (broken path: a report is missing from its index). **reach:** the console report index.
- **Suspected landing spot:** the console (objectui) report index, which appears to filter reports by the app's own package id; it should include the packages that contribute to the app (here the service module through `navigationContributions`). New in this console pin (it answers objectui#13020). Not `src/`.
- **Dedupe words:** `report index module package`, `All reports missing case reports`, `app.objectstack.hotcrm.service reports`.
- **Known carrier:** none found (objectui#13020 asked for the index; it does not cover module reports).

### Known items crossed on this build (one line each)

- **#2189 (F-01 last round), wider than filed:** the Create form offers Converted too. `POST crm_lead {"status":"converted"}` by na.rep → 201 with `is_converted: false`, and the record-change `lead_assignment` run then fails (`update_record(crm_lead) failed: … Cannot edit converted lead Born Converted`, server log 15:37:53Z).
- **#2200:** the boot log warns `position_name_fold_grant` for sales_rep, sales_manager, service_agent, service_manager and marketing_user ("This grant is in force and ungoverned … Declare it explicitly"). Still reproduces.
- **#2029:** only the admin can upload an attachment; every app profile has `sys_attachment` read-only, so no Upload button for a rep even on the rep's own deal. Still as carried.
- **#2060 item 3 family:** the agent keeps read on a case right after escalating it and loses it once the service manager closes it (`GET …/crm_case/uvvdWqZdrWHIlyE3` → 404 for the agent). Unchanged.
- **objectstack#24863:** approval process and step names stay English in zh-CN ("Large Deal Approval", "Sales Manager Review"); the record type also reads "Opportunity" there. Still reproduces.
- **objectui#13234:** All Forecasts group headings print the raw date "2026-10-01". Still reproduces.
- **objectui#12331 family:** the opportunity list header draws "Update Stage" with nothing selected (an aggregate bulk action in the header). Still reproduces.
- **18.0.0 expected behaviour (not findings):** the director step of Large Deal Approval shows the approving manager as its requester; the owner got both the app's "Deal approved" notice and the platform's.
- **No longer reproduces:** #2073 item 7 (routing message now "New lead assigned to you: …"); #2073 item 8 (the conversion screen names the account it will create or join); #2060 item 8 (Enroll Members ends with "Eligible members enrolled in campaign."); #2060 item 11 (All Forecasts ordered by Period Start); #2060 item 12 (campaign and product errors use labels and "opportunity line items"); #2060 item 13 (zh-CN Activity group 互动, Events 活动); #2060 item 15 (9 of 10 accounts carry coordinates; the external map tile host is blocked in this container); last round's open PR #2187 (closing an escalated case completes its follow-up task); last round's observation that Setup → Sharing Rules listed no packaged rules (Declared Sharing Rules now lists all 11).

## Re-measure

| Prior id | Card | Upstream state given | Reading on 18.0.0 | Screenshot |
|---|---|---|---|---|
| F-01 | #2189 | open | **Still reproduces.** eu.rep set Forged Guest to Converted in Edit → "Lead updated successfully", `is_converted` false, no converted records; `{"status":"new"}` → 409 RECORD_LOCKED. Also reachable from Create (see above) | `shots/24-F01-lead-status-converted-in-edit.png`, `shots/24-F01-lead-status-converted-saved.png` |
| F-02 | #2190 | open | **Still reproduces.** The form asks Subject, Description, Case Type, Priority only; CASE-00039 landed with no account, contact or address | `shots/22-SVC-005-web-to-case-filled.png` |
| F-03 | #2191 | open | **Still reproduces.** A line added to approval-locked Acme Platform Upgrade → 201; deal stays 150,000 while lines sum 156,000; log `opportunity_amount_rollup … RECORD_LOCKED (onError=log; suppressing)` 15:44:56Z | `shots/45-OPP-007-F03-amount-vs-lines.png` |
| F-04 | #2192 | open | **Still reproduces.** expired CTR-0003 → activated 200 (end date Sep 15, 2026); activated CTR-0005 → draft 200 and back | `shots/57-F04-contract-expired-reactivated.png` |
| F-08 | #2193 | open | **Still reproduces.** "Wayne Enterprise License closed at 1200000. Congratulations to the team." | `shots/96-F08-large-deal-won-unformatted.png` |
| F-05 | objectui#13154 | closed | **Still reproduces on this pin.** Update Tier confirm reads "Update tier on {{count}} account(s) to {{tier}}?"; the run itself succeeds (now with an Undo button) | `shots/31-ACC-006-mass-tier-confirm.png` |
| F-06 | objectui#13155 | closed | **Fixed.** Display popover → Export as CSV / Export as XLSX; the CSV downloads with the view's columns. The file's content has two new defects: F-01, F-02 | `shots/81-ADM-005-mgr-display-popover.png` |
| F-07 | objectui#13156 | closed | **Fixed.** With the shipped mapping the console sends `{"format":"csv","csv":…}`: leads 3/3 created, accounts 2/2 created then 2/2 updated, contacts 2/2 created. The mapping is still not preselected (#2194 T1-U06) | `shots/30-LEA-018-import-shipped-mapping.png`, `shots/30-LEA-018-import-after-1.png` |

Counts: fixed 2, still reproduces 6 (one of them, F-05, is closed upstream), changed 0.

## Security

- S-1: a security finding in Opportunities (private deals); details in the final message.

## UI and UX suggestions

New ones only. Sizes: S under a day, M a few days. Of #2194's track-1 items, the ones crossed are unchanged on 18.0.0 (T1-U02 win reason on the 6th tab, T1-U03 no quote name default, T1-U04 extra confirm before Escalate / Close, T1-U05 both enrolment criteria required, T1-U06 mapping not preselected, T1-U07 dates without year, T1-U09 opportunity name = company, T1-U10 rep sidebar shows Service entries), except **T1-U08, changed:** the forecast record title is now "Q4 2026 (2026-10-01)", with the period start but still no owner (`shots/74-FCT-001-forecast-detail.png`).

### U-01 — Escalated Cases tab lists closed cases
- **Page / persona:** Cases → Escalated Cases, service manager.
- **Now:** CASE-00001, closed at 15:56, is still listed; the tab filters `is_escalated = true` only. Its sibling SLA at Risk excludes resolved and closed cases, and the file's own comment on that tab asks for the human tab and the automation to answer the same way.
- **Suggestion:** add `status not_in [resolved, closed]` to Escalated Cases, or rename it to say it is a history.
- **Why:** a manager's escalation queue that keeps closed work grows forever.
- **Landing spot:** `src/service/views/case.view.ts` (`escalated_cases`). **Size:** S. **#2194:** not carried.
- **Screenshot:** `shots/60-SVC-013-svcmgr-escalated-cases.png`.

### U-02 — A lookup to a record the viewer cannot read prints its raw id
- **Page / persona:** knowledge article KA-0025, na.rep.
- **Now:** Source Case reads "CTPnPnOW17jcvcy-" with a question-mark icon (the case GET answers 404 for the rep).
- **Suggestion:** show "Restricted record" (or the label without a link), never the id.
- **Why:** an id is meaningless to a user and looks like broken data.
- **Landing spot:** console (objectui) lookup display. **Size:** S. **#2194:** not carried.
- **Screenshot:** `shots/66-KB-005-helpful-vote.png`.

### U-03 — Send Email ends with a generic toast
- **Page / persona:** contact record → More actions → Send Email, na.rep.
- **Now:** "Action completed successfully". Its siblings say what happened ("Contact marked as primary!", "Call logged successfully!").
- **Suggestion:** a `successMessage` such as "Email queued to <contact>".
- **Landing spot:** `src/sales/actions/contact.actions.ts` (`send_email`). **Size:** S. **#2194:** not carried.
- **Screenshot:** `shots/35-ACC-012-send-email-form.png`.

### U-04 — Clone Opportunity stays on the original record
- **Page / persona:** opportunity record → Clone Opportunity, na.rep.
- **Now:** toast "Opportunity cloned successfully!" and the page stays on the source deal; the clone (id returned in the response) is found only through the list.
- **Suggestion:** open the clone, or put a View link in the toast as Generate Quote does.
- **Landing spot:** `src/sales/actions/opportunity.actions.ts` (clone) or the console action result handling. **Size:** S. **#2194:** not carried.
- **Screenshot:** `shots/44-OPP-012-clone-result.png`.

### U-05 — All Forecasts groups twice, one row per group
- **Page / persona:** Forecasts → All Forecasts, sales manager.
- **Now:** each forecast sits under "Period Start 2026-10-01" and again under "Oct 2026 (1)": two headings per row. The view's own comment explains why: the spec's `GroupingFieldSchema` cannot order one field's groups by another field, so the app nests `period_start` over `period_label`, and calls the single-level form a platform gap.
- **Suggestion:** let a grouping field order its groups by another field (e.g. group by `period_label`, ordered by `period_start`), then collapse the view to one level.
- **Why:** half the rows on this page are headings.
- **Landing spot:** platform spec / console grouping (`GroupingFieldSchema`), then `src/sales/views/forecast.view.ts`. **Size:** M. **#2194:** not carried; it pairs with objectui#13234 (the raw date heading).
- **Screenshot:** `shots/74-FCT-005-all-forecasts.png`.

## Extras

- **Dashboards (5), as admin:** Executive Overview 10 queries, Sales Performance 18, Customer Service 15, Sales Activity 14, CRM Overview 10 — all `POST /api/v1/analytics/dataset/query` 200; DOM probe 13 / 18 / 14 / 16 / 15 chart marks; 0 "No data yet" tiles. The manager's Executive Overview excludes the private deal (2,698,500 vs the admin's 2,793,500). `shots/90-DASH-0*.png`.
- **Reports (10), as admin:** each opened from its URL; 18 dataset calls, all 200; charted reports drew bars, matrix reports drew tables. `shots/91-RPT-01..10-*.png`. The report index is F-03.
- **Lead conversion wizard:** na.rep, Wren Halvorsen: names the account it will create; without an amount it stops at "Please complete the required fields: Opportunity Amount"; with one it creates account, contact and a 64,000 deal. `shots/26-LEA-010-*.png`.
- **Public forms:** slugs from metadata — `publicLink` `/forms/contact-us` (`src/sales/views/lead.view.ts:942`) and `/forms/support` (`src/service/views/case.view.ts:501`), confirmed by `GET /api/v1/forms/<slug>` 200. Both `/forms/*` URLs 302 to `/_console/f/<slug>`. Anonymous browser submits 201 each, plus forged REST payloads to both (LEA-006, SVC-005). `shots/20-LEA-006-*.png`, `shots/22-SVC-005-*.png`.
- **Persona landings and sidebars:** `shots/10-NAV-admin-landing.png` … `shots/16-NAV-mkt-landing.png`.
  - Admin and manager: Executive Overview, full nav.
  - Reps: Sales Home (Open Leads 0: the seeded leads belong to the manager); the sidebar still lists Service Overview, Cases, Knowledge and My Cases (#2194 T1-U10).
  - Service agent and manager: Service Overview; no opportunity, quote, contract, campaign or forecast entries. The agent's Service Overview reads 0 everywhere until cases are handed over (#2206).
  - Marketing user: Executive Overview; Campaigns; no Cases, Quotes or Contracts.
- **zh-CN:** the manager switched Language → 中文（中国） in the user menu and back to English afterwards. Pages captured: Executive Overview, lead list, opportunity record, approvals inbox, case kanban. `shots/92-I18N-*.png`, `shots/93-I18N-zh-*.png`.

## Choices made

- **Scheduled work.** The trigger API refuses schedule flows (403), and a default `pnpm dev` binds none of the 8. I restarted with `OS_AUTOMATION_SCHEDULED_WORK_ENABLED=true` (named by the boot banner) at 15:16Z, which let the 16:00 hourly sweeps (SVC-008, ACT-004) fire inside the pass. Daily flows stayed "not reachable"; I edited no cron and no product file. Axes: it measures shipped behaviour through a documented deployment knob and adds nothing to the product.
- **REST beside the browser.** Server rules (state machines, freezes, field-level security, export gate) were driven through the same public REST door the console uses, as the persona; the browser was kept for screens. Those rows say "(REST)".
- **Data writes.** All test writes went to the local dev database. Several seeded records changed state through the tests (Wayne 1.2M won, Northwind Grid won, Acme Platform Upgrade rejected, Initech raised to 110,000 and pending, CTR-0003 re-activated, CASE-00001 escalated and closed), and later screenshots and totals include them.
- **Marketing user's password.** The Create User switch "Require Password Change On First Login" was on by default; I kept the platform default and changed the password on first sign-in.
- **Re-measure scope.** Only the 8 cards this dispatch lists were re-measured, one reading each. Other #2060 / #2073 items were judged only where my route crossed them.
- **Known-item reads.** #2073 was read in full; #2060's items were taken from last round's report; the positions item was matched to #2200 by issue search.
- **Locale left behind:** none (the manager was switched back to English).

## Deviations

- **Upstream cards not read.** objectui#13154–13156 and objectstack#24863 are in repositories this session cannot reach; their states are as the dispatch gives them. F-01 to F-03 were deduped against hotcrm issues only.
- **No AI service.** All 6 AI-skill rows are "not reachable".
- **The map tile host** (`demotiles.maplibre.org`) is blocked by this container's network policy, so Accounts by Location shows markers on a blank map with a style-load error; not a product finding.
