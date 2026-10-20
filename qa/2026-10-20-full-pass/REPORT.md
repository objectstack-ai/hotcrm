# HotCRM full functional browser pass, 2026-10-20

Card: objectstack-ai/hotcrm#2188. One cloud tester drove a locally booted, seeded install of `main` in Chromium at 1440×900, over every row of `docs/feature-inventory.md` and the extras the card names. Evidence only: this branch is never merged.

## Build

- **`main` sha:** `b94cf8568ca5583f942b852bdeaa6eb58cf97266`.
- **Versions:**
  - `@objectstack/*` 18.0.0-next.5 (all 18 pinned packages; `node_modules/@objectstack/runtime` reports 18.0.0-next.5);
  - the app packages HotCRM / HotCRM Service report 5.1.2 in Setup → Packages.
- **Tooling:**
  - Chromium 141.0.7390.37 (`/opt/pw-browsers/chromium`, driven by Playwright 1.63.0 from the repo's own devDependency);
  - Node 22.22.0, pnpm 10.33.0.
- **Boot commands and exit codes:**
  - `pnpm install` → exit 0.
  - `pnpm dev`, port 4001 → served `/_console/` 200 within 30 s. Seed: 1 source continued in the background after the 8 s inline budget, then landed (9 accounts, 21 leads, 23 opportunities, 38 cases, 29 events, 51 campaign members, 6 quotes).
  - `pnpm demo:staff` → exit 0: 5 users, positions assigned, 11 sharing rules re-evaluated, 2 approval requests pending for the sales manager.
  - At about 02:33Z I stopped the dev server and restarted it as `OS_AUTOMATION_SCHEDULED_WORK_ENABLED=true pnpm dev`, on the same `.objectstack/data` DB, so the schedule-only flows could fire (see *Choices made*). The boot then reported 22 flows bound instead of 14.
  - At about 02:40Z the container itself restarted and killed the server mid-run. I relaunched the same command; the DB, the sessions and the evidence survived.
- **Personas and logins used (no passwords here):**
  - **Dev admin:** `admin@objectos.ai`. Credentials from `AGENTS.md` ("dev admin, seeded on an empty DB") and the `scripts/demo-staff.ts` defaults.
  - **The five staffed personas**, with passwords declared in `src/sales/sharing/demo-staffing.ts`:
    - `na.rep@objectos.ai` (sales rep, NA territory);
    - `eu.rep@objectos.ai` (sales rep, EU territory);
    - `sales.manager@objectos.ai` (sales manager);
    - `service.agent@objectos.ai` (service agent);
    - `service.manager@objectos.ai` (service manager).
  - **Marketing user:** `marketing.user@objectos.ai` ("QA Marketing User"), created by the tester through Setup as the admin:
    1. Setup → People & Organization → Users → **Create User** (email, name, password, "Require Password Change On First Login" switched off). There is no profile field on that form.
    2. The user's record → **Positions** tab → New → Position **Marketing User (marketing_user)** → Create.
    3. The position carries the `marketing_user` permission set, the same way `demo:staff` assigns positions. The user then saw exactly the marketing-user surface: Campaigns, no Cases, lead export allowed.
    - Screenshots: `shots/02-ADM-setup-create-marketing-user.png`, `shots/02-ADM-setup-position-picked.png`.
  - **Anonymous visitor:** a browser context with no session.

## Coverage

161 rows: **140 pass · 6 fail · 12 not reachable · 0 not tested · 3 n/a (rows the inventory marks removed)**.

"Not reachable" rows are AI skills (no AI service in this open-source boot; ADM-015 says `ai` is deliberately not required) or daily schedule-only flows. The trigger API refuses those flows, and their fire times did not fall inside the pass (see *Choices made*).
| Row | Verdict | Reason | Screenshot |
|---|---|---|---|
| LEA-001 | pass | Lead list (21 seeded + web leads), field groups and 1–5 star score render; manager sees all, rep sees own | shots/20-LEA-001-lead-list.png |
| LEA-002 | pass | Transition table is warning-level by design: unqualified→contacted saved 200. But Converted is selectable in Edit — see F-01 | shots/24-F-lead-status-converted-by-edit.png |
| LEA-003 | pass | PATCH unqualified without reason → 400 "Disqualification reason is required…"; duplicate without survivor → 400 | (REST) |
| LEA-004 | pass | Web lead with VP title, corporate email, phone and website got rating 3; forged rating 5 from a guest recomputed to 1 | (REST) |
| LEA-005 | pass | Web leads round-robined to eu.rep then na.rep (sales_rep pool) | (REST) |
| LEA-006 | pass | /forms/contact-us → 302 /_console/f/contact-us; anonymous submit 201; forged status/owner/conversion/duplicate fields stripped. Heading shows "Lead" | shots/21-LEA-006-web-to-lead-form.png |
| LEA-007 | pass | Guest lead with upper-case email of an existing lead stored lower-cased and flagged suspected (duplicate_of_lead = Pia Anand) | shots/29-LEA-014-suspected-duplicates.png |
| LEA-008 | pass | Converted lead: status/title edit → 409 RECORD_LOCKED; description edit 200 | (REST) |
| LEA-009 | pass | eu.rep set web lead to Qualified in Edit → high task "Follow up with qualified lead…" due +2 days to owner | shots/23-LEA-009-lead-qualified.png |
| LEA-010 | pass | na.rep converted a new lead with opportunity: reused existing Acme account, new contact (not primary), opp 42,000 prospecting. Amount now required up front. Wizard still shows no account choice (#2073 item 8) | shots/26-LEA-010-convert-wizard-opportunity.png, shots/26-LEA-010-convert-done.png |
| LEA-011 | pass | Rating-3 web lead got next_followup_date +3 days; owner notified (topic lead_routing) — but with the "to assign" wording, #2073 item 7 | (REST) |
| LEA-012 | pass | Schedule Follow-up screen flow: task "Send pricing deck" due 2026-10-27 created; lead next_followup_date synced | shots/27-LEA-012-schedule-followup-form.png, shots/27-LEA-012-schedule-followup-done.png |
| LEA-013 | pass | Manager selected 2 rows on All Leads → bulk-bar Add to Campaign → 2 dispatches, 2 members created. On Hot Leads the toolbar button refuses a 2-row selection (single-record by design, per action comment) | shots/28-LEA-013-mgr-allleads-step2.png |
| LEA-014 | pass | All 8 tabs draw (All, My, Hot, High Priority, Suspected Duplicates, Pipeline kanban, Calendar, Cards) | shots/29-LEA-014-*.png |
| LEA-015 | pass | Default create form (no owner prompt now), edit form, conversion wizard and public web_to_lead form render. The other named form views have no UI entry I could find; not separately driven | shots/25-LEA-015-new-lead-form.png |
| LEA-016 | pass | Detail page: header actions Convert Lead / Schedule Follow-up / Log a Call / Edit, highlights, 5-stage path (display only), Details/Related/Activity/History tabs | shots/23-LEA-016-lead-detail.png |
| LEA-017 | not reachable | AI skill: no AI service in this open-source boot (ADM-015 says `ai` is deliberately not required) | — |
| LEA-018 | fail | Console import does not preselect the shipped mapping: manual auto-map inserts and rejects 2 of 3 template rows ("LinkedIn", "Google Ads"); choosing "Lead Import (CSV)" → 400 MAPPING_FORMAT_MISMATCH (#2060 item 17) | shots/30-LEA-018-import-mapped.png, shots/30-LEA-018-shipped-step1.png |
| LEA-019 | pass | Lead Inflow report (lead_metrics, month × source matrix) answered 200 with 19 rows and drew | shots/91-RPT-05-lead_inflow_by_month_source.png |
| ACC-001 | pass | Account list, cards, detail render (logo/brand, tier, health score, segment, territory); attachments tab present | shots/31-ACC-006-account-list.png |
| ACC-002 | pass | Exact duplicate name → 409 UNIQUE_VIOLATION; name_normalized folds case and spaces ("QA  Brücken   GmbH" → "qa brücken gmbh"). A case/space variant ("acme  corporation") is still accepted next to "Acme Corporation" — known, closed #655 | (REST) |
| ACC-003 | pass | billing_address.country " de " → billing_country "DE", territory "emea" | (REST) |
| ACC-004 | pass | ftp:// website → 400; negative revenue → 400 (manager; a rep gets 403 field-write on annual_revenue); delete Acme (customer with opportunities) → 409 DELETE_RESTRICTED | (REST) |
| ACC-005 | pass | See ACT-010: held event bubbled last_activity_date to the account | (see ACT-010) |
| ACC-006 | pass | 7 tabs draw; bulk bar offers Update Tier / Transfer Owner / Delete; Update Tier on 2 rows → "Succeeded 2 / 2" (bulk 405 then per-row PATCH fallback). Confirm text shows raw {{count}}/{{tier}} — finding. Map tab: no seeded coordinates (#2060 item 15) and the external tile host is blocked in this container | shots/31-ACC-006-*.png, shots/31-ACC-006-mass-tier-confirm.png |
| ACC-007 | pass | Account Workbench: curated grid with only Industry / Type / Owner quick filters | shots/32-ACC-007-workbench.png |
| ACC-008 | pass | Slotted detail: header with Log a Call / Log a Meeting / Schedule a Meeting, Details / Related (28) / Attachments | shots/33-ACC-008-account-detail.png |
| ACC-009 | pass | Contact detail renders; deleting a prospect account cascaded its contact (contact read back 0 rows) | shots/34-ACC-009-contact-detail.png |
| ACC-010 | pass | Upper-case email stored lower-case; same email again → 409 DUPLICATE_VALUE; deleting a contact on an open opportunity → 409 DELETE_RESTRICTED with a clear message | (REST) |
| ACC-011 | pass | Mark as Primary Contact (confirm dialog) → Hal primary, John demoted (#2060 item 9 now fixed) | shots/34-ACC-011-mark-primary-done.png |
| ACC-012 | pass | Send Email (subject/body) → 200 emailId + activityId; contact last_contacted_date stamped | shots/35-ACC-012-send-email-form.png |
| ACC-013 | pass | Rep-created contact → owner inbox "New contact: Hal Brook" (topic contact_welcome) | (REST) |
| ACC-014 | pass | All Contacts, People Directory (gallery), Primary Contacts draw | shots/36-ACC-014-*.png |
| ACC-015 | fail | Console import with the shipped "Account Import (CSV)" / "Contact Import (CSV)" mapping → 400 MAPPING_FORMAT_MISMATCH (console sends format json). The same CSV through REST with format csv + mappingName → dry run 200, 2/2 upsert. #2060 item 17 | shots/38-ACC-015-account-shipped-step1.png |
| ACC-016 | not reachable | AI skill; no AI service in this boot | — |
| ACC-017 | not reachable | AI skill; no AI service in this boot | — |
| ACC-018 | pass | Accounts by Industry & Type (8 rows) and Customer Churn Signals (4 panels) answered 200 and drew; account/contact datasets feed the executive and CRM dashboards | shots/91-RPT-06-accounts_by_industry_type.png, shots/91-RPT-07-customer_churn_signals.png |
| OPP-001 | pass | Opportunity list/detail, required name/account/amount/stage/close date, attachments | shots/40-OPP-010-open-deals.png |
| OPP-002 | pass | closed_won without win_reason → 400 "Win Reason is required"; closed_lost without loss_reason → 400. Backward move prospecting←qualification saved (warning-level by design) | (REST) |
| OPP-003 | pass | prospecting→qualification: probability 10→25, expected_revenue 4,200→10,500, forecast pipeline; a manual probability 99 is overridden back to the stage value | (REST) |
| OPP-004 | pass | stage_entry_date reset on stage change; days_in_stage 0; Stale tab sorts by days in stage | shots/40-OPP-010-stale.png |
| OPP-005 | pass | After win: amount/close_date edit → 409 RECORD_LOCKED "only description, next_step, notes may be edited"; description edit 200 | (REST) |
| OPP-006 | pass | eu.rep won Northwind deal in the UI (Win / Loss tab): account Northwind prospect→customer; high task "Activate new customer…" due +3 days | shots/42-OPP-006-win-form-filled.png, shots/42-OPP-006-won-record.png |
| OPP-007 | fail | Line items roll up, but a line added while the deal is approval-locked is saved and its rollup fails silently: deal 100,000 vs lines 107,000 — finding | (REST + server log) |
| OPP-008 | pass | Line with no unit_price → unit_price = list_price 50,000; negotiated 7,000 kept. (UI form's required Sales Price is #2185) | (REST) |
| OPP-009 | pass | Sales Pipeline kanban tab draws, columns per stage with amount sums, closed deals excluded | shots/40-OPP-009-pipeline-kanban.png |
| OPP-010 | pass | All 10 tabs draw (Open Deals, All, Pipeline, Forecast Calendar, Timeline, Cards, My Open, Stale, Closing This Quarter, Tender This Quarter) | shots/40-OPP-010-*.png |
| OPP-011 | pass | 2 deals selected → Update Stage → Needs Analysis → one aggregate dispatch (_selectedIds) updated 2 | shots/43-OPP-011-mass-update-stage.png |
| OPP-012 | pass | Clone → "Copy of Globex Manufacturing Suite", prospecting, amount kept, close date +90 days | shots/44-OPP-012-clone-result.png |
| OPP-013 | not reachable | Daily 07:30 schedule only. POST /api/v1/automation/opportunity_stagnation/trigger → 403 "This caller may not start this flow"; after restarting with scheduled work enabled, 07:30 did not fall inside the pass | — |
| OPP-014 | pass | Wayne 1.2M won after approvals → owner inbox "Large deal won: Wayne Enterprise License" (amount printed unformatted, 1200000) | (REST) |
| OPP-015 | pass | is_private deal: owner and admin 200; sales manager, marketing user and eu.rep 404 by id and absent from lists | (REST) |
| OPP-016 | pass | Detail header: Generate Quote / Clone / Log a Call / Edit, 7-stage path, highlights | shots/41-OPP-016-opp-detail.png |
| APR-001 | pass | ≥100K opened manager review (incl. the deal my line item pushed to 100,000); 1.2M got manager_review then director_signoff | shots/50-APR-005-mgr-inbox.png |
| APR-002 | pass | Pending deal: rep edit → 409 RECORD_LOCKED; approval_status mirrors pending/approved/rejected | (REST) |
| APR-003 | pass | Approve → approved_date + owner inbox "Deal approved"; Reject → approval_status rejected + warning "Deal rejected… Review and revise" | shots/51-APR-approve-*.png, shots/51-APR-reject-*.png |
| APR-004 | pass | sales_director has no holder → request routed to the dev admin (admin_rescue, reason recorded), admin approved | shots/52-APR-004-admin-inbox-director-rescue.png |
| APR-005 | pass | My Work → Inbox opens approvals:inbox with the manager's 3 pending requests; approve/reject from the record view | shots/50-APR-005-mgr-inbox.png |
| OPP-017 | pass | Opportunities by Stage, Won by Owner, Pipeline Coverage, Funnel by Owner → Stage all 200 and drew | shots/91-RPT-01..04-*.png |
| QUO-001 | pass | Quote list and detail (QTE-0007 auto-number, pricing block, 6-stage path) | shots/55-QUO-001-quote-detail.png |
| QUO-002 | pass | Path draft→in_review→accepted held; "Contact is required" blocks presented/accepted without a contact. Transitions are warning-level; the accepted/expired freeze is enforced by the hook (expired→draft → 409) | (REST) |
| QUO-003 | pass | Generated quote got expiration_date = quote_date + 30 days; accepted quote: discount edit → 409 "only internal_notes may be edited". (The create form's required Expiration Date is #2185) | (REST) |
| QUO-004 | pass | Generate Quote screen flow (name / valid days / discount): QTE-0007 seeded from the deal amount 150,000 −10% = 135,000; deal already at proposal. Quote Name has no default | shots/53-QUO-004-generate-quote-filled.png, shots/53-QUO-004-generate-quote-done.png |
| QUO-005 | pass | Rep accepted QTE-0007 (contact set) → draft contract CTR-0005, 195,750, 12 months, owner the rep | shots/58-CON-007-timeline.png |
| QUO-006 | pass | Same acceptance closed the deal: closed_won, win_reason quote_accepted, close_date today | (REST) |
| QUO-007 | pass | Lines 3×50,000 and 1×75,000 −10% → subtotal 217,500, quote discount 10% → 195,750; a line on the accepted quote → 409 (#2060 item 1 now fixed) | (REST) |
| QUO-008 | not reachable | Daily 01:00 schedule only; trigger API refuses schedule flows (403) | — |
| QUO-009 | pass | All Quotes, Quote Pipeline (status kanban with total_price sums), Quote Calendar draw | shots/54-QUO-009-*.png |
| QUO-010 | pass | Product list grouped by category, PRD-#### numbers | shots/56-QUO-012-product-list.png |
| QUO-011 | pass | list_price < cost → 400; sku "qa-wid-1" stored "QA-WID-1"; delete a referenced product → 409 (message still counts lines as "15 opportunity(ies) and 5 quote(s)", #2060 item 12) | (REST) |
| QUO-012 | pass | Product list by category and image gallery catalog draw | shots/56-QUO-012-product-catalog.png |
| QUO-013 | pass | product_metrics feeds the CRM Overview tile (list price by category); every query on that dashboard 200 | shots/90-DASH-05-crm_overview_dashboard.png |
| CON-001 | pass | Contract list/detail, CTR-#### numbers | shots/58-CON-007-contract-list.png |
| CON-002 | fail | Terminal states not held: expired CTR-0003 → activated saved 200 (now Activated with end date 2026-09-15); activated → draft 200. Rule is warning-level and no hook backs it — finding | shots/57-F-contract-expired-reactivated.png |
| CON-003 | pass | 12-month term with a 20-month range → 400; shrinking end_date after activation → 409 | (REST) |
| CON-004 | pass | Activation stamped signed_date 2026-10-20; account already customer | (REST) |
| CON-005 | not reachable | Daily 00:00 schedule only; trigger API 403 | — |
| CON-006 | not reachable | Daily 08:00 schedule only; trigger API 403 | — |
| CON-007 | pass | Renewal Calendar, Contract Terms (gantt), Contract Timeline grouped by account, list sorted by end date | shots/58-CON-007-*.png |
| SVC-001 | pass | Case list/detail, CASE-##### numbers (web cases got CASE-00039/40), priorities, origins, attachments | shots/60-SVC-013-agent-cases.png |
| SVC-002 | pass | Close without resolution → 400 "Resolution is required when closing a case"; escalated reachable from in_progress | (REST) |
| SVC-003 | pass | Web case high → sla_due_date +8 h; critical → +4 h; escalation to critical re-derived the SLA to +4 h from escalation (so #2073 item 4 no longer reproduces on escalation) | (REST) |
| SVC-004 | pass | priority_rank high 3, critical 4 | (REST) |
| SVC-005 | pass | /forms/support → /_console/f/support; anonymous submit 201; forged status/owner/internal_notes/resolution stripped, origin web, owner round-robined to the service agent. Form collects no submitter email — finding | shots/22-SVC-005-web-to-case-form.png, shots/22-SVC-005-web-to-case-submitted.png |
| SVC-006 | pass | Close → closed_date stamped, resolution_time_hours 0.6, is_closed true | shots/64-SVC-006-closed-case.png |
| SVC-007 | pass | Forged critical web case auto-escalated ("Auto-escalated: critical priority") and reassigned to the service manager pool (the inventory's "no reassign" wording is stale, #2060 item 16) | (REST) |
| SVC-008 | pass | After restarting with scheduled work enabled, the 03:00 sweep flagged and escalated 16 overdue cases (is_sla_violated true) and sent "SLA breached: case …" notices; newly escalating cases moved to the service-manager pool | (REST + server log) |
| SVC-009 | pass | Agent escalation → urgent task "Escalated: CASE-00039…" due next day to the account owner; Acme last_activity_date bumped on resolution. Closing the case left that task not_started — fixed by open PR #2187 | (REST) |
| SVC-010 | pass | Agent: Escalate Case (confirm + reason) → critical, escalated, owner Tomas (service manager), escalated_from Priya. Service manager: Close Case (resolution + optional article) → closed. Agent "Account required" block gone (#2060 item 4 fixed); agent kept read right after escalating but lost it once the case closed | shots/63-SVC-010-escalate-form.png, shots/63-SVC-010-escalate-after-agent.png, shots/64-SVC-010-close-form.png |
| SVC-011 | n/a | Removed (#1428) | — |
| SVC-012 | pass | A held call logged on CASE-00040 stamped first_response_date | (REST) |
| SVC-013 | pass | All 8 tabs draw for agent / service manager (All, Service Workflow kanban, SLA Calendar, Timeline, My Open, Unassigned triage, Escalated, SLA at Risk) | shots/60-SVC-013-*.png |
| SVC-014 | pass | Detail: SLA highlights, 6-stage path, Escalate / Close / Log a Call, Details / Related / Activity | shots/61-SVC-014-case-detail-agent.png |
| SVC-015 | pass | Service manager sees the 8 seeded open critical cases (Service Overview "Critical Cases 8"); agent sees only own | shots/15-NAV-svcmgr-landing.png |
| SVC-016 | pass | Activity timeline shows "Case escalated —" and "Case closed —" milestone entries | shots/64-SVC-016-case-activity-timeline.png |
| SVC-017 | not reachable | AI skill; no AI service in this boot | — |
| SVC-018 | pass | Service dashboard: 15 queries all 200, charts drew; the 3 case reports 200 | shots/90-DASH-03-service_dashboard.png, shots/91-RPT-08..10-*.png |
| KB-001 | pass | Agent created KA-0025 with category, audience public, linked source case | shots/65-KB-001-article-detail.png |
| KB-002 | pass | draft → in_review → published → archived → published all saved | (REST) |
| KB-003 | pass | Publish without body → 400 "Articles cannot be published without a body."; without summary → saved (warning) | (REST) |
| KB-004 | pass | published_at set on first publish and kept on re-publish after archive | (REST) |
| KB-005 | pass | Helpful vote by a rep → helpful_count 0→1, last_reviewed_at unchanged (#2060 item 10 fixed). No view_count field exists (inventory wording, #2060 item 16) | shots/66-KB-005-helpful-vote.png |
| KB-006 | pass | All Articles, Published, My Drafts draw | shots/65-KB-006-*.png |
| KB-007 | pass | Agent create/edit 200, delete 403; rep read 200, edit 403; anonymous GET 401 | (REST) |
| MKT-001 | pass | Campaign list/detail, CPG-#### numbers, response_rate / roi formulas compute | shots/70-MKT-001-campaign-list.png, shots/71-MKT-001-campaign-detail.png |
| MKT-002 | pass | start after end → 400; in_progress without dates → 400; actual cost over budget saved (warning). Error copy names API fields "start_date … end_date" (#2060 item 12) | (REST) |
| MKT-003 | pass | Members carry a lead or a contact; status sent → responded → unsubscribed; members of a campaign readable by the marketing user | shots/73-MKT-009-mark-responded.png |
| MKT-004 | pass | Marketing user: Enroll Members screen flow (Leads/Contacts, status, department) → 1 executive contact enrolled with added_date. The flow ends with no result message (#2060 item 8). Who may enrol is #2186 | shots/72-MKT-004-mkt-enroll-form.png, shots/72-MKT-004-mkt-enroll-filled.png |
| MKT-005 | pass | Attributing and winning a deal on CPG-0004 recomputed live: actual_revenue 120,000→213,000, won opportunities 1→2, ROI 900→1675 | (REST) |
| MKT-006 | not reachable | Daily 02:00 schedule only; trigger API 403 | — |
| MKT-007 | pass | Campaign Schedule (gantt), Launch Calendar, Marketing Timeline draw | shots/70-MKT-007-*.png |
| MKT-008 | pass | Marketing user edited an admin-owned campaign 200; a sales rep's edit → 403 | (REST) |
| MKT-009 | pass | Mark Responded (member record button) → responded + response_date + has_responded; status unsubscribed → contact email_opt_out true (#2014 F13 now holds) | shots/73-MKT-009-mark-responded.png |
| FCT-001 | pass | Forecast object: quota, four buckets, attainment / coverage / expected formulas; detail page renders | shots/74-FCT-001-forecast-detail.png |
| FCT-002 | pass | Manager created a quarterly forecast with only period + period_start 2026-10-01 → period_end 2026-12-31, label "Q4 2026", snapshot_date today; a mid-quarter start → 400 by design. (Create form requiring Period End / Snapshot Date is #2185) | (REST) |
| FCT-003 | not reachable | Daily 03:00 schedule only; trigger API 403 | — |
| FCT-004 | pass | Buckets read crm_opportunity.forecast_category, which the stage hook writes (pipeline / best_case / commit / closed / omitted seen on deals) | (REST) |
| FCT-005 | pass | This Quarter, My Forecast, All Forecasts draw. All Forecasts groups by the label text: Sep 2026, Q4 2026, Q4 2025, Q3 2026, … (#2060 item 11) | shots/74-FCT-005-all-forecasts.png |
| FCT-006 | not reachable | AI skill; no AI service in this boot | — |
| FCT-007 | pass | Sales Performance: 18 queries all 200, KPI row + Pipeline by Stage bar + trend drew | shots/90-DASH-02-sales_dashboard.png |
| FCT-008 | pass | Executive Overview (10 queries) and CRM Overview (10 queries) all 200 and drew | shots/90-DASH-01-executive_dashboard.png, shots/90-DASH-05-crm_overview_dashboard.png |
| FCT-009 | pass | forecast_metrics tiles on Sales Performance and CRM Overview answered 200 with rows | shots/90-DASH-02-sales_dashboard.png |
| FCT-010 | pass | Reports group (collapsed by default) lists all 10 reports for admin/manager/rep/marketing; agent and service manager see only the lead/account/case reports they can read | shots/10-NAV-admin-landing.png, shots/14-NAV-agent-landing.png |
| ACT-001 | pass | Task with account relation, urgent → priority_rank 4; reminder after due date → 400 | (REST) |
| ACT-002 | pass | status completed → completed_date stamped, progress_percent 100, is_completed true | (REST) |
| ACT-003 | pass | Monthly recurring task due 2026-10-31 completed → next occurrence due 2026-11-30 (month-end clamp) | shots/76-ACT-006-task-gantt.png |
| ACT-004 | pass | Hourly sweep at 04:00 (scheduled work enabled): probe task with reminder 03:10 → owner inbox "Task reminder: QA reminder probe" (topic task_reminder), reminder_date cleared and reminder_sent true | (REST) |
| ACT-005 | pass | New urgent task → owner inbox "Urgent task: …" (warning) — also fires for the generated next occurrence | (REST) |
| ACT-006 | pass | Task tabs draw: All, Task Board, Task Schedule, Execution Plan (gantt), Worklog Timeline, My Open, My Priority, overdue | shots/76-ACT-006-*.png |
| ACT-007 | pass | Logged call event: type call, status held, duration 15 | (REST) |
| ACT-008 | pass | log_call returned an attendee row id for the case contact | (REST) |
| ACT-009 | pass | Case "Log a Call" (subject, duration, attendees, notes) → event + attendee + sys_activity; lead/contact/account/opportunity headers carry Log a Call / Log a Meeting / Schedule a Meeting | shots/75-ACT-009-case-log-call-form.png |
| ACT-010 | pass | Held call on CASE-00040 stamped first_response_date; account last_activity_date moved to today on the account-related writes | (REST) |
| ACT-011 | pass | Event tabs draw: All, calendar, team timeline, My Calendar, Upcoming, Held | shots/77-ACT-011-*.png |
| ACT-012 | pass | Activity group (Events, Sales Activity); Sales Activity dashboard 14 queries all 200 and drew | shots/90-DASH-04-sales_activity_dashboard.png |
| ACT-013 | pass | event_metrics / task_metrics tiles on Sales Activity answered 200 with rows | shots/90-DASH-04-sales_activity_dashboard.png |
| PRM-001 | pass | Setup → Permission Sets lists the app's sets (guest_portal, marketing_user, sales_manager, sales_rep, service_agent, service_manager, system_admin) beside platform ones; each persona's reach matched its set in every domain above | shots/80-PRM-001-permission-sets.png |
| PRM-002 | pass | Anonymous: both form submits 201; GET /api/v1/data/crm_case 401; POST /api/v1/data/crm_lead 401; KB read 401 | (REST) |
| PRM-003 | pass | Rep: health_score write 403, case internal_notes key absent on a rep-owned case; sales manager reads internal_notes (readable by its set, not editable); service manager writes it | (REST) |
| PRM-004 | pass | Rep export: crm_lead 200 CSV, crm_campaign / crm_quote 403 EXPORT_NOT_PERMITTED; marketing user lead export 200. (No UI entry for export — see ADM-005) | (REST) |
| PRM-005 | pass | Rep owner change on lead / task → 403 "requires the transfer grant"; service agent created a task owned by the service manager → 201 | (REST) |
| PRM-006 | pass | Territory and team rules grant (na.rep 6 accounts, eu.rep 2; rule grants listed under Record Shares). demo:staff evaluated 11 rules, not 9 (#2060 item 16). Setup → Sharing Rules lists none, because packaged rules are not rows of sys_sharing_rule — console/platform observation | shots/80-PRM-006-sharing-rules-all.png, shots/80-PRM-010-record-shares.png |
| PRM-007 | pass | Setup → Positions lists the 12 app positions, flat | shots/80-PRM-007-positions.png |
| PRM-008 | pass | See OPP-015 (private deal hidden from manager and marketing) and MKT-008 (marketing edits others' campaigns) | (REST) |
| PRM-009 | pass | Products, campaigns and KB readable org-wide by every persona; leads/accounts/opportunities/cases private (rep sees own + shared only) | (REST) |
| PRM-010 | pass | pnpm demo:staff exit 0: 5 loginable users, positions assigned, 2 approval requests pending for the sales manager | (boot) |
| ADM-001 | pass | App with Home, Sales Home, Service, Sales, My Work, Activity, Marketing, Insights, Reports groups; admin / manager / marketing land on Executive Overview | shots/01-ADM-001-app-landing-admin.png |
| ADM-002 | pass | Sales Home is the reps' landing: 4 KPIs, My Leads / My Open Deals / My Open Tasks tabs, AI hint card, upcoming events. The sales manager lands on Executive Overview by design (crm.app.ts comment), not on Sales Home as this row says | shots/12-NAV-narep-landing.png |
| ADM-003 | n/a | Removed (#2118) | — |
| ADM-004 | fail | Same as LEA-018 / ACC-015: all three shipped mappings fail in the console with MAPPING_FORMAT_MISMATCH (#2060 item 17); templates under assets/import-templates are valid (REST csv import dry run 200) | shots/30-LEA-018-shipped-step1.png |
| ADM-005 | fail | No export control anywhere in the console list (toolbar, Display popover, More actions; admin and rep) although lead.view.ts declares exportOptions csv/xlsx and GET …/export answers 200 — finding | shots/81-ADM-005-admin-list-more-actions.png, shots/81-ADM-005-admin-display-popover.png |
| ADM-006 | pass | Admin uploaded a file on Acme → presign 200, PUT 200, sys_attachment 201; a rep with read-only territory access sees no Upload button; Discussion feed present | shots/81-ADM-006-admin-attachments-tab.png |
| ADM-007 | pass | Notifications seen for lead routing, lead converted, contact welcome, deal approved / rejected (warning), large deal won, urgent task (warning), SLA breach | (REST) |
| ADM-008 | pass | Language switch to 中文（中国）: nav, dashboard, list, record and approval pages translated; "活动" labels both the Activity group and the Events item (#2060 item 13) | shots/92-I18N-zh-exec-dashboard.png, shots/93-I18N-zh-*.png |
| ADM-009 | pass | Every dashboard and report query answered 200 with rows (67 dashboard queries, 28 report queries) | shots/90-DASH-*.png, shots/91-RPT-*.png |
| ADM-010 | pass | Seed landed (9 accounts, 21 leads, 23 opportunities, 38 cases, 29 events, 51 campaign members, 6 quotes) | (REST) |
| ADM-011 | n/a | Removed (#1892) | — |
| ADM-012 | not reachable | AI skill; no AI service in this boot | — |
| ADM-013 | pass | Help → "This app's docs" opens the 4 packaged docs (Overview, Sales, Service, Administration) | shots/82-ADM-013-app-docs.png |
| ADM-014 | pass | Lead History tab lists the status changes with actor and time | shots/83-ADM-014-lead-history.png |
| ADM-015 | pass | Setup → Packages lists HotCRM and HotCRM Service 5.1.2, enabled; boot binds automation, analytics, approvals, sharing | shots/84-ADM-015-packages.png |

## Findings

Seven new findings (F-01 to F-06 and the UX defect F-08) and one known item re-measured in more depth (F-07). Known items that still reproduce, and the ones that no longer do, are listed after them in one line each.

### F-01 — A lead set to "Converted" in the Edit form is locked forever with nothing converted

- **Persona / URL / steps:**
  - na.rep, `/_console/apps/app.objectstack.hotcrm/crm_lead/record/tJ104_c5yjxAzMW-`.
  - Edit → Status → Converted → Update. The Status picklist offers New, Contacted, Qualified, Unqualified and Converted.
  - Then `PATCH /api/v1/data/crm_lead/tJ104_c5yjxAzMW- {"status":"new"}`.
- **Expected:**
  - LEA-010: conversion happens through the wizard, which creates or reuses an account and contact and writes the `converted_*` fields.
  - LEA-008: a converted lead is frozen, and the user is told to "make changes on the converted records instead".
  - So a lead should not reach `converted` without conversion records.
- **Actual:**
  - The save answers "Lead updated successfully" with status `converted`, `is_converted: false`, and `converted_account`, `converted_contact` and `converted_opportunity` all null.
  - The revert answers `409 RECORD_LOCKED`: "Cannot edit converted lead Forged Guest - Citrine Finance (attempted: status). Make changes on the converted records instead." No such records exist.
  - Reproduced by the sales manager through REST on Leo Vance (`hmYZYtSC3ZTcNtMr`): `PATCH {"status":"converted"}` → 200; then `{"status":"new"}` and `{"title":…}` → 409.
- **Evidence:** `shots/24-F-lead-status-converted-by-edit.png`, `shots/24-F-lead-status-converted-by-edit-saved.png`.
- **class:** b (data integrity: an orphaned, uneditable lead). **reach:** the record Edit form; `PATCH /api/v1/data/crm_lead/:id`.
- **Suspected landing spot:**
  - `src/sales/objects/lead.object.ts`: `lead_status_progression` is `severity: 'warning'` and allows `new|contacted|qualified → converted`. `status` offers `converted` to every editor.
  - `src/sales/objects/lead.hook.ts` (`lead_automation`) then locks on `status == converted` alone.
- **Dedupe words:** `lead status converted edit form`, `is_converted false`, `RECORD_LOCKED converted lead`.
- **Known carrier:** none (searched; #2134 is the inverse, conversion leaving status at Contacted, closed).

### F-02 — Web-to-Case collects no way to reach the visitor

- **Persona / URL / steps:** anonymous visitor at `/forms/support`, which redirects to `/_console/f/support`.
- **Expected:**
  - SVC-005: a "Salesforce Web-to-Case equivalent" (`src/service/views/case.view.ts:458`).
  - A support case from an unknown visitor needs a reply address. Web-to-lead asks for email (required).
- **Actual:**
  - The form asks only Subject, Description, Case Type and Priority (`GET /api/v1/forms/support`).
  - `crm_case` has no email or name column at all. The case that lands (CASE-00039: origin web, owner the service agent) has no account, no contact and no address.
  - The agent who receives it cannot answer the customer.
- **Evidence:** `shots/22-SVC-005-web-to-case-form.png`, `shots/22-SVC-005-web-to-case-filled.png`; REST read of CASE-00039.
- **class:** a (broken business path). **reach:** the public form door, `POST /api/v1/forms/support/submit`.
- **Suspected landing spot:**
  - `src/service/views/case.view.ts` (`web_to_case` sections);
  - `src/service/objects/case.object.ts` (no supplied-email/name fields).
  - Under contract-first, the fields come first and the form follows.
- **Dedupe words:** `web-to-case email`, `supplied email`, `anonymous case contact`.
- **Known carrier:** none found. #1505 (closed) is about planted rating fields; #2014 F9 is about routing.

### F-03 — A line item added while the deal is approval-locked is saved, but the deal amount silently stops matching its lines

- **Persona / URL / steps:** na.rep, REST, on the rep's deal "Acme Corporation" (`waeGc7iGVy0RS7Lp`, 42,000, prospecting).
  1. `POST /api/v1/data/crm_opportunity_line_item {crm_opportunity, crm_product: ObjectStack Platform, quantity: 2}` → 201. The rollup sets amount 100,000, which crosses the ≥$100K threshold, so `opportunity_approval` opens and locks the deal.
  2. `POST …line_item {crm_product: Standard Support, quantity: 1, unit_price: 7000}` → 201.
- **Expected:**
  - OPP-007: the deal amount equals the sum of its lines.
  - APR-002: the record is locked during approval. The quote side refuses lines on a settled parent (`409 "…its line items can no longer be added"`).
- **Actual:**
  - The second line is stored. The deal stays at 100,000 while its lines sum to 107,000, and the approval request shows 100,000 to the manager.
  - Server log: `ERROR [hook] handler failed (onError=log; suppressing) {"hook":"opportunity_amount_rollup","object":"crm_opportunity_line_item","event":"afterInsert","error":"… RECORD_LOCKED: Opportunity 'Acme Corporation' is locked while an approval is in progress…"}`.
- **Evidence:** REST reads (deal `amount` 100,000; lines `(2, 50000, 100000), (1, 7000, 7000)`); dev log 02:30:40Z; `shots/50-APR-005-mgr-inbox.png` (request shows 100,000).
- **class:** b (data integrity). **reach:** `POST /api/v1/data/crm_opportunity_line_item`; also the deal's Related → Products list.
- **Suspected landing spot:** `src/revenue/objects/opportunity_line_item.hook.ts` (`opportunity_amount_rollup`, `onError: 'log'`). Nothing refuses a line write on an approval-locked parent.
- **Dedupe words:** `line item approval locked`, `opportunity_amount_rollup RECORD_LOCKED`, `amount does not match lines`.
- **Known carrier:** sibling of #2077 (closed: lines on a closed-won deal) and #2015 (closed: quote_generation on a locked deal). Neither covers the approval lock.

### F-04 — Contract "terminal" states are not held: an expired contract can be re-activated, and an active one sent back to draft

- **Persona / URL / steps:**
  - admin: `PATCH /api/v1/data/crm_contract/NI3Hf5HenagDQKrv {"status":"activated"}` on CTR-0003 (expired, ended 2026-09-15) → 200.
  - sales manager: `PATCH …/Th2ZaWDo0AgdrOFH {"status":"draft"}` on the activated CTR-0005 → 200.
  - Also draft → activated directly (skipping in_approval) → 200.
- **Expected:** CON-002: "`draft → in_approval → activated → expired/terminated`; two terminal states, renewal = a new contract, never reviving the old row".
- **Actual:**
  - CTR-0003 now reads Activated, with its end date in the past. The record page shows the path at Activated.
  - The rule `contract_status_progression` is warning-level. No hook backs it, unlike the quote freeze (`quote_workflow`), which refuses expired→draft with 409.
- **Evidence:** `shots/57-F-contract-expired-reactivated.png`; REST answers above.
- **class:** b (data integrity: an expired contract counts as active again, for renewal reminders, the account's customer status and billing hand-off). **reach:** `PATCH /api/v1/data/crm_contract/:id` and the record Edit form.
- **Suspected landing spot:**
  - `src/revenue/objects/contract.object.ts:266` (`severity: 'warning'`);
  - `src/revenue/objects/contract.hook.ts` (no terminal-state guard).
- **Dedupe words:** `contract expired reactivated`, `contract_status_progression`, `terminal state`.
- **Known carrier:** none found.

### F-05 — Account bulk-action confirmations show raw `{{count}}` / `{{tier}}` placeholders

- **Persona / URL / steps:** sales manager, `/_console/apps/app.objectstack.hotcrm/crm_account`. Select 2 rows → Update Tier → Enterprise → Next.
- **Expected:** "Update tier on 2 account(s) to Enterprise?", following the authored `confirmText` (`src/sales/views/account.view.ts:59`).
- **Actual:**
  - The dialog reads "Update tier on {{count}} account(s) to {{tier}}?".
  - The Run itself succeeds ("Succeeded 2 / 2"), after a `POST /api/v1/data/crm_account/updateMany` → `405 OBJECT_API_METHOD_NOT_ALLOWED` and a per-row PATCH fallback.
  - The same holes are authored for Transfer Owner and Delete (`:77`, `:85`) and in the zh-CN / es-ES / ja-JP packs.
- **Evidence:** `shots/31-ACC-006-mass-tier-confirm.png`.
- **class:** a (wrong text on a destructive-action confirmation). **reach:** the list bulk bar.
- **Suspected landing spot:**
  - The console (objectui) bulk-action confirm does not fill `{{…}}` holes in `confirmText`.
  - Or the spec does not declare such holes for `bulkActionDefs` and the app authored a capability the runtime does not honour. Per "declare = enforce", either the console fills them or `confirmText` with holes is refused at publish.
- **Dedupe words:** `confirmText {{count}}`, `bulk action placeholder`, `Update Tier`.
- **Known carrier:** none found.

### F-06 — No export control anywhere in the console list views

- **Persona / URL / steps:** admin and na.rep, `/_console/apps/app.objectstack.hotcrm/crm_lead` (All Leads). I looked in:
  - the toolbar (Filter, Display, Search);
  - the Display popover;
  - the page "More actions" menu (Add to favorites, Open in new tab, Copy link);
  - the DOM, for any "Export" text.
- **Expected:** ADM-005: CSV/XLSX export for accounts, contacts, leads, opportunities and cases. `lead.view.ts:228` declares `exportOptions: { formats: ['csv','xlsx'] }`.
- **Actual:**
  - No export entry exists for either persona; the DOM holds no "Export" string.
  - The server side works: `GET /api/v1/data/crm_lead/export?format=csv` → 200 CSV for the rep and for the marketing user, and → 403 `EXPORT_NOT_PERMITTED` for campaign/quote. The gate holds, but no door is drawn.
- **Evidence:** `shots/81-ADM-005-admin-list-more-actions.png`, `shots/81-ADM-005-admin-display-popover.png`.
- **class:** a. **reach:** the console list view.
- **Suspected landing spot:** the console (objectui) list toolbar, which does not render `exportOptions` in this console pin. Upstream, not `src/`.
- **Dedupe words:** `exportOptions`, `export button missing`, `list export`.
- **Known carrier:** none (#817, closed, was about the case view lacking `exportOptions`).

### F-07 — (known: #2060 item 17, now measured on both doors) Console import with any shipped mapping fails `MAPPING_FORMAT_MISMATCH`

- **Persona / URL / steps:**
  - Manager and admin, on the lead, account and contact lists: Import → upload the first rows of `assets/import-templates/{leads,accounts,contacts}.csv` → Saved mapping "Lead / Account / Contact Import (CSV)" → Next → Import.
  - The shipped mapping is offered but not preselected.
- **Expected:** LEA-018, ACC-015 and ADM-004: a CSV upsert through the shipped mapping, with its synonym tables.
- **Actual:**
  - The console sends `{"format":"json","rows":[…]}` and the server answers `400 {"code":"MAPPING_FORMAT_MISMATCH","error":"Mapping \"crm_lead_import\" declares sourceFormat \"csv\" but the payload is \"json\""}`. Same for the account and contact mappings: 0 imported.
  - With manual mapping instead, the import inserts rather than upserts and rejects 2 of the template's 3 rows ("LinkedIn", "Google Ads" are not options; the synonyms live only in the mapping).
  - The REST door works: `POST /api/v1/data/crm_account/import {"format":"csv","mappingName":"crm_account_import","csv":…,"dryRun":true}` → 200, upsert, 2/2.
- **Evidence:** `shots/30-LEA-018-import-mapped.png`, `shots/30-LEA-018-shipped-step1.png`, `shots/38-ACC-015-account-shipped-step1.png`, `shots/38-ACC-015-contact-shipped-step1.png`.
- **class:** a. **reach:** the console import wizard.
- **Suspected landing spot:** the console (objectui) import wizard, which parses the file client-side and sends JSON rows while naming a csv mapping. Upstream. The app's mappings and templates are valid.
- **Dedupe words:** `MAPPING_FORMAT_MISMATCH`, `crm_lead_import`, `sourceFormat csv json`.
- **Known carrier:** #2060 item 17 (it asked to "measure first"). This answers it: the console door fails, the REST door succeeds.

### F-08 — (UX defect) Notifications print money unformatted: "closed at 1200000"

- **Persona / URL / steps:** na.rep wins a deal of $100K or more (Wayne Enterprise License, 1,200,000), then opens the bell panel on any page.
- **Expected:** the amount appears the way every other surface of the app shows it: 1,200,000.00 on the record and the list, "1,200,000" on the inbox card.
- **Actual:** the inbox reads "Wayne Enterprise License closed at 1200000. Congratulations to the team." and "Acme Platform Upgrade closed at 150000." There are no thousands separators and no currency. A seven-digit number is hard to read at a glance.
- **Evidence:** `shots/96-ux-F-08-unformatted-amount-notification.png`; inbox REST row `large_deal_won`.
- **class:** a (UX defect: stable, and inconsistent with every sibling surface). **reach:** a ≥$100K win → the `opportunity_won_alert` notify → the bell panel and email.
- **Suspected landing spot:**
  - `src/sales/email-templates/en.ts:43`, which renders `{{amount}}` raw (and its locale siblings);
  - if the template language offers no number or currency formatter, the platform notify/template engine.
- **Dedupe words:** `closed at {{amount}}`, `large_deal_won`, `unformatted amount`.
- **Known carrier:** none found.

### Known items that still reproduce on this build (one line each)

- **#2073 item 7:** a lead the rep owns still sends that rep "New lead to assign: … is awaiting assignment" (eu.rep for the web lead, na.rep for its own lead). Source: `src/sales/email-templates/en.ts:67`.
- **#2073 item 8:** the conversion wizard shows only Create Opportunity? (+ name, amount, close date). There is no account preview or choice (`shots/26-LEA-010-convert-wizard-step1.png`).
- **#2073 item 5:** the Hot Leads toolbar "Add to Campaign" still opens its full dialog with nothing selected (`shots/28-LEA-013-mgr-add-to-campaign-no-selection.png`); the refusal text was not re-measured.
- **#2060 item 8:** Enroll Members ends with no result message.
- **#2060 item 11:** All Forecasts groups periods as text: Sep 2026, Q4 2026, Q4 2025, Q3 2026, Q2 2026, Q1 2026, Oct 2026, Aug 2026 (`shots/74-FCT-005-all-forecasts.png`).
- **#2060 item 12:** the copy still reads "Campaign start_date (…) must not be after end_date (…)" and "referenced by 15 opportunity(ies) and 5 quote(s)".
- **#2060 item 13:** zh-CN labels both the Activity group and the Events item 活动 (`shots/92-I18N-zh-exec-dashboard.png`).
- **#2060 item 15:** Accounts by Location: "9 records with missing or invalid coordinates excluded" (`shots/31-ACC-006-account-map.png`; the tile host is also blocked in this container).
- **#2060 item 16:** inventory drift, still true for SVC-007 (escalation does reassign), KB-005 (no `view_count`), PRM-006 (11 rules evaluated, not 9) and ADM-002 (the sales manager lands on Executive Overview).
- **#2060 item 3 family:**
  - The agent keeps read right after escalating (the escalated-from share).
  - Once the service manager closes the case, the agent's read is gone: the agent's own KB article linking it shows `GET /api/v1/data/crm_case/d9vOILiBUc1tOuu5 → 404`.
- **#655 (closed):** a case/space variant account name ("acme  corporation") is accepted next to "Acme Corporation" with the same `name_normalized`.
- **Open PR #2187:** closing escalated CASE-00039 left its "Escalated: CASE-00039…" urgent task `not_started` (task `ukp7Rj2Bq3yMxlpP`). Fixed by open PR #2187.
- **Open PRs #2185 and #2186:** not re-investigated.
  - #2185 covers the create forms' required Sales Price, Expiration Date, Period End and Snapshot Date. REST shows the server defaults working.
  - #2186 covers who may Enroll Members / Add to Campaign / Mark Responded.

### Known items that no longer reproduce

- #2060 items 1, 2, 4, 6, 7 (the lead-owner part), 9, 10 and 18.
- #2060 item 14 in part: the forms' heading is now "Lead" / "Case", the object label, not `crm_lead` / `crm_case`.
- #2073 items 1 (all 10 reports in the Reports group), 2 (Pipeline by Stage is a bar chart) and 4 (escalation re-derives the SLA to the critical window, and a plain low→high edit re-derived it to +8 h).
- #2014 F9 / F13: web leads and cases are round-robined, web duplicates flagged, and unsubscribe opts the contact out.

### Observations (not filed as defects)

- **Setup → Sharing Rules:** lists no rules (`sys_sharing_rule` total 0), though the 11 packaged rules evaluate and their grants show under Record Shares. Console/platform; the app ships rules as metadata (`shots/80-PRM-006-sharing-rules-all.png`).
- **`account_approval` flow:** opens an `account_review` approval on every new account. No inventory row names it.
- **Schedule-only flows:** `POST /api/v1/automation/:name/trigger` answers 403 for them ("This caller may not start this flow"). On a default `pnpm dev`, the 8 schedule flows are not bound at all (`OS_AUTOMATION_SCHEDULED_WORK_ENABLED` unset).
- **"Large deal won":** prints the amount unformatted ("closed at 1200000").

## Extras

- **Dashboards (5):** Executive Overview, Sales Performance, Customer Service, Sales Activity and CRM Overview.
  - Each drew; the DOM probe counted 13, 18, 15, 14 and 15 chart marks.
  - 0 "No data yet" tiles.
  - 67 `POST /api/v1/analytics/dataset/query` calls, all 200.
  - Screenshots: `shots/90-DASH-01..05-*.png`.
- **Reports (10):** all in the Reports nav group for admin.
  - Each opened, and its dataset calls (28) answered 200 with rows.
  - Charted reports drew bars; matrix reports drew tables.
  - Screenshots: `shots/91-RPT-01..10-*.png`.
- **Lead conversion wizard:** driven twice by na.rep (LEA-010). Without an amount it stops at "Please complete the required fields: Opportunity Amount". With an amount it converts into the existing Acme account.
  - Screenshots: `shots/26-LEA-010-*.png`.
- **Public forms:**
  - Slugs came from metadata: `publicLink` in `src/sales/views/lead.view.ts` (`/forms/contact-us`) and `src/service/views/case.view.ts` (`/forms/support`), confirmed by `GET /api/v1/forms/<slug>` 200.
  - Both `/forms/*` URLs 302 to `/_console/f/<slug>`.
  - Anonymous submits: `POST /api/v1/forms/contact-us/submit` → 201 and `POST /api/v1/forms/support/submit` → 201, then forged payloads to both. See LEA-006, SVC-005 and F-02.
  - The card speaks of "three public forms"; the app ships two (`web_to_lead`, `web_to_case`), and both were driven.
- **Persona landings and sidebars:**
  - Screenshots: `shots/10-NAV-admin-landing.png` … `shots/16-NAV-mkt-landing.png`.
  - **Admin and sales manager:** Executive Overview, full nav, all 10 reports.
  - **Reps:** Sales Home.
    - Their nav still lists Service Overview / Cases / My Cases and the case reports, because a rep has own-scope case read.
    - Sales Home "Open Leads 0": all seeded leads belong to the manager.
  - **Service agent:** Service Overview.
    - No opportunity, quote, contract, campaign or forecast entries; lead/account/case reports only.
    - At landing time the agent owned no case, so every tile read 0.
  - **Service manager:** Service Overview with the 8 escalated critical cases.
  - **Marketing user:** Executive Overview; Campaigns; no Cases.
- **zh-CN:** the manager switched Language → 中文（中国） in the user menu.
  - Five pages captured: Executive Overview, lead list, opportunity record, approvals inbox, Sales Performance.
  - Screenshots: `shots/92-I18N-*.png`, `shots/93-I18N-zh-*.png`.

## UI and UX suggestions

These are preferences, redesigns or new capabilities, noticed on pages the pass already visited. The one stable UX defect is F-08 under *Findings*. Sizes are rough: S under a day, M a few days, L larger.

### U-01 — Lead record: make the status path clickable
- **Page / persona:** lead record, eu.rep.
- **Now:** the 5-stage path (New … Converted, Unqualified) is display only; clicking a stage does nothing. Moving New → Contacted takes Edit → Status picker → option → Update (4 clicks and a modal) per step.
- **Suggestion:** click a stage to set it, opening the conversion wizard for Converted and the reason field for Unqualified.
- **Why:** four clicks become one per transition. Making Converted route to the wizard would also close the door behind F-01.
- **Landing spot:** console `record:path`, `src/sales/pages/lead_detail.page.ts`. **Size:** M.
- **Screenshot:** `shots/97-ux-U-01-lead-path-display-only.png`.

### U-02 — Opportunity edit: show Win/Loss Reason beside Stage when a closed stage is picked
- **Page / persona:** opportunity Edit form, na.rep / eu.rep.
- **Now:** choosing Closed Won and pressing Update fails once ("Please check the highlighted fields: Win Reason"). The form then jumps to the 6th tab "Win / Loss", which correctly marks the field. Every win costs one failed save and a tab switch.
- **Suggestion:** show the reason field (`requiredWhen`) on the Overview tab next to Stage once a closed stage is chosen.
- **Why:** removes a guaranteed error round-trip on the most common close action.
- **Landing spot:** `src/sales/objects/opportunity.object.ts` field groups, or a `visibleWhen`-driven placement on the Overview group. **Size:** S.
- **Screenshot:** `shots/95-ux-U-02-win-reason-on-last-tab.png`.

### U-03 — Generate Quote: prefill Quote Name
- **Page / persona:** opportunity → Generate Quote, na.rep.
- **Now:** Quote Name is empty and required; the first Submit fails with "Please complete the required fields: Quote Name".
- **Suggestion:** default it to "<Opportunity name> Quote", as the seeded quotes are named.
- **Why:** removes one failed submit and one typing step from every quote.
- **Landing spot:** `src/revenue/flows/quote-generation.flow.ts` (screen field default). **Size:** S.
- **Screenshot:** `shots/97-ux-U-03-quote-name-empty.png`.

### U-04 — Escalate Case / Close Case: drop the extra confirm before the form
- **Page / persona:** case record, service agent and service manager.
- **Now:** "Confirm Action — This will escalate the case… Continue?" appears first, then the form that asks for the reason, which has its own Cancel. Close Case behaves the same way. That is 2 dialogs and 3 clicks before any input.
- **Suggestion:** go straight to the form.
- **Why:** one dialog and one click less; the form already lets the user cancel.
- **Landing spot:** `src/service/actions/case.actions.ts` (`confirmText` on the screen-flow actions). **Size:** S.
- **Screenshot:** `shots/97-ux-U-04-escalate-double-confirm.png`.

### U-05 — Enroll Members: show only the criteria for the chosen source
- **Page / persona:** campaign → Enroll Members, marketing user.
- **Now:** "Enroll leads in status *" and "Enroll contacts in department *" both show, and both are required, whatever "Enroll" is set to. I enrolled contacts by department while a lead status was still required on screen.
- **Suggestion:** hide the criterion that does not apply.
- **Why:** less to read, and no required field the run ignores.
- **Landing spot:** `src/marketing/flows/campaign-enrollment.flow.ts` (screen field visibility). **Size:** S.
- **Screenshot:** `shots/97-ux-U-05-enroll-irrelevant-criteria.png`.

### U-06 — Import wizard: preselect the object's shipped mapping
- **Page / persona:** Leads / Accounts / Contacts → Import, sales manager and admin.
- **Now:** "Saved mapping: — Map columns manually —" is the default. A user who doesn't open that menu imports without the synonym tables; the repo's own template then loses 2 of 3 rows.
- **Suggestion:** preselect the mapping when the object has exactly one.
- **Why:** the shipped mapping exists precisely for these files. (Today choosing it also hits F-07, so this follows F-07's fix.)
- **Landing spot:** console import wizard. **Size:** S.
- **Screenshot:** `shots/97-ux-U-06-import-mapping-not-preselected.png`.

### U-07 — Record highlights: show the year on dates
- **Page / persona:** contract record CTR-0003, admin.
- **Now:** the header reads "Start Date Sep 15, 2025 | End Date Sep 15". The current year is dropped, so a contract that ended this September looks like it ends next month. The same compact format appears on opportunity close dates ("Close Date Nov 19").
- **Suggestion:** always show the year on contractual dates.
- **Why:** the two dates of one contract read inconsistently, and an expiry date without a year is ambiguous.
- **Landing spot:** console date formatter for highlight fields. **Size:** S.
- **Screenshot:** `shots/97-ux-U-07-date-without-year.png`.

### U-08 — Forecast record title
- **Page / persona:** forecast record, sales manager.
- **Now:** the title is "Q4 2026 (2026-10-01)"; the label already names the period, and the owner is not in the title.
- **Suggestion:** "Q4 2026 · Nina Reyes".
- **Why:** forecasts are per owner × period, so two owners' Q4 rows are indistinguishable in Recent items and lookups today.
- **Landing spot:** `src/sales/objects/forecast.object.ts` (display/title formula). **Size:** S.
- **Screenshot:** `shots/97-ux-U-08-forecast-title-redundant.png`.

### U-09 — Lead conversion: a more specific default Opportunity Name
- **Page / persona:** Convert Lead wizard, na.rep.
- **Now:** Opportunity Name defaults to the company name ("Acme Corporation"). Acme already had 3 deals, so the new one is indistinguishable in Acme's Related list and in pickers.
- **Suggestion:** "<Company> – <lead need type or date>".
- **Why:** deal names stay unique per account without manual typing.
- **Landing spot:** `src/sales/flows/lead-conversion.flow.ts` (screen default). **Size:** S.
- **Screenshot:** `shots/97-ux-U-09-opportunity-name-defaults-to-company.png`.

### U-10 — Rep sidebar: Service entries a rep cannot act on
- **Page / persona:** sidebar, na.rep / eu.rep.
- **Now:** reps see Service Overview, Cases, My Cases and three case reports. They own no case, cannot create one, and their Service Overview tiles read 0. That is 6 of the rep's 34 sidebar entries.
- **Suggestion:** gate them the way the sales entries are gated for service personas (`visible` on case-read-with-ownership, or a sales-only audience).
- **Why:** a shorter, persona-shaped nav, consistent with how the service personas' nav already hides sales entries.
- **Landing spot:** `src/sales/apps/crm.app.ts` and the service module's `navigationContributions` in `src/service/index.ts`. **Size:** S–M (it touches the audience rule shared with Home).
- **Screenshot:** `shots/97-ux-U-10-rep-nav-service-entries.png`.

## Choices made

- **Schedule-only rows.**
  - I first tried the platform's trigger door: `POST /api/v1/automation/opportunity_stagnation/trigger` → 403 "This caller may not start this flow. A flow that runs on its own trigger starts there". On the default boot, the 8 schedule flows are not bound at all.
  - I restarted the dev server with `OS_AUTOMATION_SCHEDULED_WORK_ENABLED=true`, which the boot banner names. That made the hourly SLA sweep (SVC-008) and the task-reminder sweep (ACT-004) reachable inside the pass.
  - The daily flows (00:00–08:00 fire times) were not reachable and are marked so. I did not edit any cron or product file to force them.
  - Axes: this measures the shipped behaviour (real business need) through a documented deployment knob (no workaround), and adds nothing to the product.
- **Data writes.** All testing writes went into the local dev DB only: leads, a converted lead, accounts, quotes, a contract, campaign members, cases, tasks and an attachment. Several seeded records changed state through the tests (for example the Northwind deal won, CTR-0003 re-activated by F-04), and some later screenshots and dashboard totals include them; e.g. "Closed Won (QTD) 2,152,999" includes the 99,999 I set on the Northwind deal.
- **REST beside the browser.** Where a row is a server rule (state machines, freezes, field-level security, export gate), I drove it through the same public REST door the console uses, as the persona, and kept the browser for the screens. Those rows say "(REST)" in place of a screenshot.
- **Re-measurement.** Known items in #2060 / #2073 were re-measured only where my route crossed them. Items I did not cross are not claimed either way.
- **Screenshots.** Viewport-sized everywhere except the two public-form captures (full page); the set is about 36 MB.
- **Scope addition.** The *UI and UX suggestions* section was added mid-pass, on the maintainer's instruction relayed by the seat 2 session. Its screenshots reuse captures from pages already visited, renamed `NN-ux-U-xx-*.png`; F-08 and U-02 were captured fresh.
- **Locale left behind.** The sales manager's language preference was left at zh-CN after the locale pass.

## Deviations

- **objectstack-ai/objectstack#22722 could not be read.** The repository is not attached to this session, so the GitHub tools refuse it, and `api.github.com/repos/objectstack-ai/objectstack/issues/22722` answers 403 through this container's proxy. Findings were deduped against #2060, #2073 and hotcrm issue search only. F-05, F-06 and F-07 are console-side and are the ones most likely to overlap with it.
- **Container restarts.** It restarted twice (about 02:40Z and 03:35Z) and killed the dev server each time; I relaunched with the same command and DB. No evidence was lost; every domain was pushed as it finished.
- **No AI service.** All 6 AI-skill rows are "not reachable".
