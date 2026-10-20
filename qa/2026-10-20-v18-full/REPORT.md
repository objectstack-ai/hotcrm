# HotCRM full functional browser pass on ObjectStack 18.0.0 (draft, in progress)

## Coverage (so far)

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
| APR-001 | pass | ≥100K opened manager review (Initech raised to 110,000 → pending); 1.2M got manager_review then director_signoff | shots/50-APR-005-mgr-inbox.png |
| APR-002 | pass | Pending deal: rep edit of amount or next_step → 409 RECORD_LOCKED; approval_status mirrors pending / approved / rejected | (REST) |
| APR-003 | pass | Approve → approved_date + owner inbox "Deal approved"; Reject → approval_status rejected + warning "Deal rejected… Review and revise before resubmitting" | shots/51-APR-003-mgr-approve-wayne-dialog.png, shots/51-APR-003-mgr-reject-acme-done.png |
| APR-004 | pass | sales_director has no holder → the director step landed in the dev admin's inbox (admin rescue); admin approved | shots/52-APR-004-admin-inbox-director-rescue.png |
| APR-005 | pass | My Work → Inbox opens approvals:inbox with the manager's 5 pending requests (2 deals, 3 account reviews); approve/reject from the record view, which shows "Locked for approval" | shots/50-APR-005-mgr-inbox.png, shots/51-APR-003-mgr-approve-wayne-request.png |
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
| QUO-013 | pass | product_metrics feeds the CRM Overview tile; every query on that dashboard 200 — see *Extras* | shots/90-DASH-05-crm_overview_dashboard.png |
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
| SVC-009 | pass | Agent escalation → urgent task "Escalated: CASE-00001…" due next day to the account owner; closing the case completed it (open PR #2187 from last round has landed); Acme last_activity_date bumped | (REST) |
| SVC-010 | pass | Agent: Escalate Case (confirm, then reason) → critical, escalated, owner Tomas (service manager), escalated_from Priya. Service manager: Close Case (resolution + optional article) → closed. The extra confirm before each form is #2194 T1-U04, unchanged. Agent keeps read after escalating and loses it once the case closes (#2060 item 3 family, unchanged) | shots/63-SVC-010-escalate-form.png, shots/63-SVC-010-escalate-after-agent.png, shots/64-SVC-010-close-form.png |
| SVC-011 | n/a | Removed (#1428) | — |
| SVC-012 | pass | Agent's Log a Call on CASE-00039 stamped first_response_date | shots/75-ACT-009-case-log-call-form.png |
| SVC-013 | pass | All 8 tabs draw for agent / service manager (All, Service Workflow kanban, SLA Calendar, Timeline, My Open, Unassigned triage (empty), and under "2 more": Escalated, SLA at Risk) | shots/60-SVC-013-*.png |
| SVC-014 | pass | Detail: SLA highlights, 6-stage path, Escalate / Close / Log a Call, Details / Related / Activity | shots/61-SVC-014-case-detail-agent.png |
| SVC-015 | pass | Service manager reads the open critical cases through the escalation share (7 open critical); the agent sees only own | shots/60-SVC-013-svcmgr-escalated-cases.png |
| SVC-016 | pass | Activity timeline shows "Case escalated —" and "Case closed —" milestone entries | shots/64-SVC-016-case-activity-timeline.png |
| SVC-017 | not reachable | AI skill; no AI service in this boot | — |
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
| FCT-007 | pass | Sales Performance dashboard drew, every dataset query 200 — see *Extras* | shots/90-DASH-02-sales_dashboard.png |
| FCT-008 | pass | Executive Overview and CRM Overview drew, every query 200 — see *Extras* | shots/90-DASH-01-executive_dashboard.png, shots/90-DASH-05-crm_overview_dashboard.png |
| FCT-009 | pass | forecast_metrics tiles on Sales Performance / CRM Overview answered 200 | shots/90-DASH-02-sales_dashboard.png |
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
| ACT-012 | pass | Activity group (Events, Sales Activity); Sales Activity dashboard drew — see *Extras* | shots/90-DASH-04-sales_activity_dashboard.png |
| ACT-013 | pass | event_metrics / task_metrics tiles answered 200 | shots/90-DASH-04-sales_activity_dashboard.png |
