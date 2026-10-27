# #2320 · Track 4 — CRM · Marketing, activities and analytics

- **Tested sha:** hotcrm `main` `5eb2f0d` (`@objectstack/*` 18.2.0; includes #2323, contracts moved into the app package)
- **Install:** `pnpm install --frozen-lockfile`, `pnpm dev` on a fresh `.objectstack` DB, `pnpm demo:staff` (exit 0, 28 then 34 rule grants)
- **Browser:** Playwright on the preinstalled Chromium, 1440×900 desktop and 390×844 phone (`isMobile`)
- **Personas:** dev admin (`admin@objectos.ai`), `na.rep` (Nina Reyes), `eu.rep` (Emil Roth), `sales.manager` (Marta Quinn), `service.agent` (Priya Raman), plus two QA users created for this track through the auth admin API (Track 5 already covered creating one through Setup): `qa.marketing@objectos.ai` holding position `marketing_user` and `qa.mktmgr@objectos.ai` holding `marketing_manager`. Both had their position removed and were banned at the end (Setup offers no user delete).
- **Screenshot naming:** `an-<persona>-<surface>` analytics, `mkt-*` marketing, `act-*` activities, `p-<persona>-*` phone width. In file names `mgr` = sales manager, `mktmgr` = marketing manager, `mkt` = marketing user.

## Coverage

| Row / surface | Result | How, and where it is evidenced |
|---|---|---|
| MKT-001 Campaign object | **pass, with a doc defect** | CPG-{0000} code, type/channel, the 4 budget fields, `response_rate`/`roi` formulas (CPG-0004: (120000−12000)/12000 = 900 % ✓), readable by every persona (7 rows for admin, rep, agent, sales manager, marketing user, marketing manager). The inventory's "父活动层级" does not exist: **D7**. `mkt-01`, `mkt-03-*`, `mkt-12-*` |
| MKT-002 Campaign validations | pass | End = Start refused in the form ("End Date must be after Start Date", banner + toast, PATCH 400). Actual > Budget saved "with warnings". `mkt-08-*`, `mkt-09-*` |
| MKT-003 Campaign member junction | **fail** | Neither lead nor contact → refused ✓; **both** lead and contact → saved: **D2**. 4-status lifecycle ✓ (`sent` → `responded` → `unsubscribed`). Person delete cascades the membership (UI delete of a QA lead, member 404 afterwards) ✓. `mkt-10-*`, `mkt-11-*` |
| MKT-004 Bulk enrolment + single add | **fail (single add)** | Enroll Members, leads branch, status New: exactly the 4 expected leads added (Alice already a member, Leo opted out — both skipped), `added_date` stamped. Re-run adds 0 (dedupe ✓). Contacts branch, department Engineering: the 2 expected contacts added. Marketing user ran it too (4 Operations contacts). Single add from the lead row menu: **adds to a completed campaign and adds an opted-out lead as `sent`: D1**. The refusal path ("无成员创建权者逐人被拒", two counts) is **not reachable**: every persona that sees Enroll Members can create members. `mkt-04-*`, `mkt-05-*` |
| MKT-005 Live metric recompute | pass | Member change (num_sent 6→10, num_leads 4→8), Mark Responded (num_responses 0→1, rate 8.33), opportunity attribution (num_opportunities 0→1), status transition (a hand-typed num_sent 999 put back to 12). Lead-conversion trigger **not tested**: conversion is Track 1's wizard and has account/contact/opportunity side effects. `mkt-15-*`, `mkt-16-*`, `mkt-17-*` |
| MKT-006 Daily auto-complete | **not reachable** | Scheduled flow; scheduled work is off in dev (`OS_AUTOMATION_SCHEDULED_WORK_ENABLED`), same finding as Track 5 |
| MKT-007 Gantt/calendar/timeline | pass | All 4 campaign views open and draw (Campaign Schedule, Launch Calendar, Marketing Timeline grouped by channel). UX notes S5, S6. `mkt-02-*` |
| MKT-008 Marketing collaboration permissions | **fail (manager/director)** | Marketing user: Edit + Enroll on others' campaigns, Mark Responded on a system-created member ✓. Marketing **manager**: 403 on a live campaign, no Edit: **D3**. Rep and agent: read only ✓; agent cannot read members and the Related tab hides the list ✓. `mkt-12-*`, `mkt-13-*`, `mkt-14-*` |
| MKT-009 Unsubscribe loop | pass, with **D4** | Mark Responded writes only status; the hook stamps `has_responded` + `response_date` ✓; the button hides once responded ✓. Member → Unsubscribed sets the lead's `email_opt_out` ✓. Unsubscribing a responder wipes its response: D4. `mkt-06-*`, `mkt-07-*` |
| ACT-001 Task object | pass | Create form with 5 related lookups, collapsed Recurrence & Effort, `priority_rank` 4 for Urgent. `act-03-*` |
| ACT-002 Completion semantics | pass, with **D6** | Complete button: status completed, `completed_date`, progress 100, `is_completed` ✓. Reopening keeps the Completed Date: D6. `act-02-*` |
| ACT-003 Recurring generator | pass | Weekly task due 10/30 completed → next one created, due 11/06 |
| ACT-004 Hourly reminder | **not reachable** | Scheduled flow, off in dev (as MKT-006) |
| ACT-005 Urgent alert | pass | New Urgent task → rep's inbox "Urgent task: …" within seconds. `act-04-*` |
| ACT-006 Task view family | pass | 8 views: All Tasks, Task Board, Task Schedule, Execution Plan (gantt + progress), Worklog Timeline, My Open Tasks, My Priority Tasks, Most Overdue First (2 behind "2 more"). S8. `act-01-*` |
| ACT-007 Event object | pass | Type/status, start + duration → end derived (11/03 15:00 + 45 → 15:45). `act-13-*` |
| ACT-008 Attendee junction | **fail (display)** | Rows are written (organizer user + contact), but the related list shows no names: **D5**. `act-13-event-record-tab-related2` |
| ACT-009 Activity action family | pass | Log a Call on contact, lead, case; Log a Meeting on opportunity and account; Schedule a Meeting on opportunity: event + attendee rows + `sys_activity` "completed" timeline row ✓. 6 of the 15 driven, covering all 3 kinds and all 5 hosts. S9, S10. `act-07`…`act-12` |
| ACT-010 Recency bubble | pass | Completed task → account `last_activity_date` (Globex 10-19 → 10-27); held call → contact and lead `last_contacted_date`; meeting on an opportunity → parent account (Initech 08-16 → 10-27); meeting on account (Northwind 09-16 → 10-27). Case path: event written; its account was already dated today, so the bubble could not be told apart |
| ACT-011 Event calendars | pass | All Events, Event Calendar, Team Schedule (per-owner lanes), My Calendar, Upcoming, Interaction History. `act-06-*` |
| ACT-012 Activity nav + dashboard | pass, with **D12** | Activity group = Events + Sales Activity, My Calendar in My Work ✓; 13 widgets incl. Quiet 30/60/90 ✓ (3/2/1, matching Churn Signals' 60+ = 2 and 90+ = 1). D12 for audiences |
| ACT-013 Activity datasets | pass | `event_metrics` week buckets + Customer Minutes, `task_metrics` Tasks Completed draw; every dataset query 200 for admin |
| Campaign members related list | pass | Lead/Contact/Added/Status/Response columns, paging, Mark Responded |
| Executive Overview | pass, with **D11** | 12 chart nodes, every query 200. Track 5's "NeedsAnalysis" axis label: **not reproduced** (1440: "Needs Analysis", 390: "Needs An…") |
| Sales Performance | pass, with **D11** | 19 chart nodes; Quota Attainment empty by design in dev (S13). Marketing user: 403 tiles (Track 5 D2, not refiled) |
| Service Overview (Customer Service) | pass, with **D9**, **D11** | 14 chart nodes. Marketing user: all tiles no-access (Track 5 D1, not refiled). S15 |
| CRM Overview | pass | 16 chart nodes; totals agree with Sales Performance and the reports (open pipeline 1,878,000; won 1,290,000) |
| Sales Activity | pass, with **D12** | see ACT-012 |
| Sales Home page | pass | KPIs, My Leads/Deals/Tasks tabs, Upcoming Events. AI card = Track 5 D9 (not refiled). S18 |
| All reports index | **fail (platform)** | **D10** |
| 10 reports | pass, with **D8** | Opportunities by Stage, Won by Owner, Pipeline Coverage, Funnel by Owner, Lead Engagement, Accounts by Industry & Type, Customer Churn Signals, Cases by Status & Priority, SLA Performance, Cases Opened by Day: each opens from the nav, queries return 200, totals cross-check. S15, S16 |
| Personas × analytics | done | rep, sales manager, service agent, marketing user each visited all 5 dashboards, Sales Home, the index and 10 reports (`an-<persona>-*`) |
| Phone 390×844 | pass | 14 screens, no page-level horizontal overflow: campaign list/record/gantt/calendar, Sales Activity, Executive, reports index, 2 reports, My Tasks, Task Board, My Calendar, event record, Sales Home (`p-*`). S19 |

## Defects

**D1 · HotCRM · Add to Campaign ignores the two gates Enroll Members enforces (closed campaign, email opt-out)**
- Steps (admin, `/_console/apps/app.objectstack.hotcrm/crm_lead`): row menu of *Theo Park* → Add to Campaign → pick *CPG-0007 Developer Content Marketing Push* (status **Completed**) → Confirm. Then row menu of *Leo Vance* (`email_opt_out = true`) → Add to Campaign → *SaaSCon 2026* → Confirm.
- Expected, from `src/marketing/flows/campaign-enrollment.flow.ts` (e4 comment): "Only enroll into campaigns that are actually running (or planned): topping up a completed/aborted campaign would corrupt its recorded metrics", and inventory MKT-009 "使入组流与发信动作既有的退订尊重形成闭环".
- Actual: both succeed with the toast "Leads added to campaign!". The completed campaign's recorded metrics moved: num_sent 11→12, num_leads 6→7, response_rate 36.36→33.33. The opted-out lead got a `sent` membership. The picker lists the completed campaign.
- Evidence: `mkt-05b-lead-add-to-completed-campaign-*`, `mkt-05c-lead-optedout-add-*`.
- Landing spot: `src/marketing/flows/campaign-member-enroll.flow.ts` (its header says these flows "decide nothing about WHO is eligible") and `src/sales/actions/lead.actions.ts` `create_campaign`; the contact twin `add_contact_to_campaign` shares the subflow and was not driven.
- Dedupe words: add to campaign, completed campaign, opt-out, campaign_lead_member_enroll.

**D2 · HotCRM · A campaign member can carry both a Lead and a Contact**
- Steps (admin): open member CM-00056 (a contact member) → Edit → Lead = *Kai Watanabe* → Update.
- Expected: inventory MKT-003 "挂 Lead 或 Contact(二选一强制)"; the form's own help text says "Set when the member was a Lead at enrollment time" / "Set when the member is an existing Contact".
- Actual: saved, the row holds both. The only rule is `lead_or_contact_required` (at least one); clearing both is refused (400) ✓.
- Evidence: `mkt-10-member-both-person-*`. Landing: `src/marketing/objects/campaign_member.object.ts:279`. Dedupe words: campaign member, lead or contact, exclusive.

**D3 · HotCRM · Marketing Manager and Marketing Director positions cannot edit live campaigns**
- Steps: user holding only `marketing_manager` (after `pnpm demo:staff` re-evaluated the rules: 34 grants) opens CPG-0003 (planning, active) → no Edit / Enroll buttons; PATCH answers 403 "You do not have permission to perform this action".
- Expected: `src/sales/sharing/positions.ts` "Manages marketing campaigns and edits every live campaign, whoever owns it"; inventory MKT-008 "planning/in_progress 活动共享给营销经理/总监(可编辑)".
- Actual: both positions declare no `permissionSets`, so the object-level gate refuses before the `campaign_leadership_*` edit share can apply.
- Evidence: `mkt-12-mktmgr-*`. Landing: `src/sales/sharing/positions.ts:94-101`. Dedupe words: marketing manager, marketing director, campaign_leadership, permission set.

**D4 · HotCRM · Unsubscribing a member who responded erases the response**
- Steps (admin): member CM-00052 → Mark Responded (campaign num_responses 0→1) → Edit → Status Unsubscribed.
- Expected: `campaign_member.hook.ts` header "`has_responded` is the 'did this person ever engage' flag the response surfaces filter on".
- Actual: `has_responded` false, `response_date` null, campaign num_responses back to 0 and response_rate 8.33→0. The lead's opt-out sync works.
- Evidence: `mkt-07-unsubscribe-edit-*`. Landing: `src/marketing/objects/campaign_member.hook.ts:86-96` (the "moving back out of a responded state" branch also fires on `unsubscribed`). **Needs a ruling:** it may be intended that an unsubscribe is not a response.

**D5 · HotCRM · Event Attendees related list shows no attendee names**
- Steps (rep): open any event → Related → Event Attendees.
- Expected: inventory ACT-008 "异构参与者(联系人/线索/内部用户/外部客人)"; the curated list in `src/sales/views/event_attendee.view.ts` names `crm_contact`, `crm_lead`, `sys_user`, `external_name`.
- Actual: three columns only (Attendee Type, Response, Organizer), so a meeting's attendee list cannot tell who attends. The view file's own header explains the related list reads `crm_event_attendee.highlightFields` (or a `relatedListColumns` this app authors nowhere), never that list.
- Evidence: `act-13-event-record-tab-related2`. Landing: `src/sales/objects/event_attendee.object.ts` `highlightFields`, or `relatedListColumns` on the `crm_event` lookup. Dedupe words: event attendee, related list, highlightFields.

**D6 · HotCRM · A reopened task keeps its Completed Date**
- Steps (rep then admin): complete *Schedule demo for Globex team*, then set status back to In Progress.
- Expected: inventory ACT-002 pairs `completed_date` with entering completed; the member lifecycle hook clears its stamp when moving back out of a state (same pattern).
- Actual: status in_progress, `is_completed` false, `completed_date` still 2026-10-27T13:45:13Z. The field is `readonly`, so a user cannot clear it either (PATCH null is stripped).
- Landing: `src/sales/objects/task.hook.ts` `task_completion`. **Residue:** this one seeded task keeps that stamp on this local DB.

**D7 · HotCRM docs · Inventory MKT-001 promises a parent-campaign hierarchy that the object removed**
- `docs/feature-inventory.md:178` "父活动层级"; `src/marketing/objects/campaign.object.ts:258` "No `parent_campaign`". No such field in the form, record or API.

**D8 · HotCRM · Sidebar "Lead Inflow" opens a report about lead engagement**
- Reports → Lead Inflow opens "Lead Engagement by Month × Source", which counts **contacted** leads by `last_contacted_date` (its description: "Contacted-lead volume per month"). Logging a call on a May lead moved it to October. "Inflow" promises new leads per month.
- Landing: `src/sales/apps/crm.app.ts:451` label (or the report's name `lead_inflow_by_month_source`). Evidence: `an-admin-report-lead_inflow_by_month_source`.

**D9 · HotCRM · Top Resolving Articles lists a "—" row with 0**
- Customer Service dashboard → Top Resolving Articles: "API Rate Limits 1" then "— 0". Description: "Knowledge articles ranked by the closed cases they resolved"; closed cases without an article form the blank bucket.
- Landing: `src/service/dashboards/service.dashboard.ts:293` (filter `resolved_article` not null). Evidence: `an-admin-dashboard-service_dashboard`. Track 3 may also report it.

**D10 · platform (console) · "All reports" index lists reports the app's navigation hides from the persona**
- Rep: sidebar Reports group shows 7, the index lists all 10; the three case reports open to "The dataset returned no rows for this report's scope". Agent: the index lists the 4 opportunity reports (`visible: OPPORTUNITY_AUDIENCE` hides them in the nav) and Opportunities by Stage opens empty. The marketing user's index does drop the case reports, so some filter exists, but it is not the nav's.
- Evidence: `an-rep-reports`, `an-rep-report-cases_by_status_priority`, `an-agent-reports`, `an-agent-report-opportunities_by_stage`. Landing: console report index (`<app>/reports`, `/api/v1/meta/report`). Dedupe words: report index, All reports, visible.

**D11 · platform (analytics/charts) · Time-series charts drop empty buckets and draw through them**
- Executive "Revenue Trend: Closed-won revenue over the last 12 months" plots 5 evenly spaced points (2026-04, 06, 07, 09, 10); May and August had 0 closed-won (API read of the 8 closed-won deals) and are absent, so the smoothed area shows revenue in them. Same chart on Sales Performance and CRM Overview. Customer Service "Daily Case Volume, last 30 days" skips zero days (Sep 30, Oct 1, …) and its line reads 1 on them.
- Evidence: `an-admin-dashboard-executive_dashboard`, `an-admin-dashboard-service_dashboard`. Landing: platform date-dimension bucketing / chart renderer (zero-fill or a true time axis). Dedupe words: zero-fill, empty month, time axis.

**D12 · HotCRM · Sales Activity dashboard has no audience: a marketing user sees zeros**
- Marketing user → Activity → Sales Activity: Interactions 0, Meetings 0, Minutes 0, four "No data yet" charts, next to "Open Deals 10". Its description "Who is talking to customers, how often…" reads as "nobody is". Same family as Track 5 D1 (Service Overview for the marketing user).
- Landing: `src/sales/apps/crm.app.ts:379` `nav_activity_dashboard` (no `visible`). Evidence: `an-mkt-dashboard-sales_activity_dashboard`.

## UI / UX suggestions (kept apart from defects)

| # | Where | What a user meets today | Proposed change | Who benefits | Screenshot |
|---|---|---|---|---|---|
| S1 | Enroll Members result | Always "Eligible members enrolled in campaign.", also when nobody was added (re-run) | Say the counts: enrolled, already members, skipped (opted out / converted) | marketing user | `mkt-04b-enroll-rerun-3-after-submit` |
| S2 | Add to Campaign picker | Offers completed campaigns; toast says "Leads added" for one lead | List planning / in-progress only (pairs with D1); singular copy | rep, marketing | `mkt-05b-lead-add-to-completed-campaign-2-picked` |
| S3 | Campaign edit → Performance tab | Hook-owned counts (Number Sent, Responses, Leads, …) are editable; a typed 999 stayed until the next event | Show them read-only in the form (they must stay writable for the hooks) | marketing user, managers reading ROI | `mkt-09-over-budget-tab-performance`, `mkt-16-*` |
| S4 | Campaigns list | Columns stop at budget/expected revenue | Add members, response rate, ROI | marketing manager | `mkt-01-campaigns-list` |
| S5 | Campaign Schedule (gantt) | Opens at Day zoom (one week) for multi-week campaigns; left header says "Task Name" | Default to Month; label "Campaign" | marketing | `mkt-02-view-campaign-schedule` |
| S6 | Launch Calendar footer | "6 records" with 7 campaigns and 5 visible this month (it counts the fetch window) | Count what the period shows, or say "in range" | everyone | `mkt-02-view-launch-calendar` |
| S7 | Campaign member record | Status path draws Unsubscribed as a fourth step after Converted; form offers Has Responded / Response Date that the hook owns | Show Unsubscribed as an exit state; make the two fields read-only | marketing user | `mkt-06-mark-responded-9-after`, `mkt-07-unsubscribe-edit-2-filled` |
| S8 | Task Board | A "Completed" lane that is always empty (the view filters completed out) | Drop the lane or show recently completed | rep | `act-01-rep-tasks-02-task-board` |
| S9 | Schedule a Meeting | Start Date (UTC) and Start Time (UTC) | One local datetime field once platform #5061 lands (the code already names the revert) | every seller | `act-08-opp-schedule-meeting-1-dialog` |
| S10 | Log a Call / Meeting dialogs | On a contact the contact is added silently while the picker shows empty; on a case or opportunity the customer contact is not offered | Pre-fill the record's own person and the case / primary contact | rep, service agent | `act-07-contact-log-call-2-filled`, `act-12-case-log-call-1-dialog` |
| S11 | Dashboards | The same Revenue Trend appears on Executive, Sales Performance and CRM Overview; metric tiles show the measure name ("Total Amount") instead of the widget description ("Closed-won revenue this year") | Keep one trend per audience; show the description under KPI tiles | leadership | `an-admin-dashboard-executive_dashboard` |
| S12 | Sales Activity layout | "Interactions on Deals" and "Open Deals" tiles stretch to chart height, mostly empty | Put them in the KPI row or give them h:1 | managers | `an-admin-dashboard-sales_activity_dashboard` |
| S13 | Sales Performance → Quota Attainment | Empty on every dev/demo install ("Source: forecast_metrics" empty state), because only the scheduled sweep writes the current quarter | Explain "filled by the forecast snapshot" or let the demo show a quarter | demo audiences, admins | `an-admin-dashboard-sales_dashboard` |
| S14 | Sales Performance / CRM Overview widgets | Win/Loss by Rep cuts "Won Revenue" inside its card at 1440 px; bar labels unformatted (174000 next to a 400K axis); Top Products' tallest bar loses its label | Fit or wrap columns; format data labels; keep the label inside the plot | managers | `an-admin-dashboard-sales_dashboard`, `an-admin-dashboard-crm_overview_dashboard` |
| S15 | SLA surfaces | Dashboard: "SLA Violations 7" beside "SLA Compliance 100 %"; SLA Performance Report counts closed cases only and its chart is empty | Label "Open cases past SLA" vs "Closed within SLA"; give the report an empty-chart message or include open breaches | service manager | `an-admin-dashboard-service_dashboard`, `an-admin-report-sla_performance` |
| S16 | Reports | Nav labels differ from titles (Lead Inflow / Lead Engagement…, Pipeline Coverage / …by Forecast × Quarter); the funnel repeats the owner per row with no subtotal and its chart ignores owner; wide matrices clip with no scroll cue | Align labels; group with subtotals; show a scroll shadow | managers | `an-admin-reports`, `an-admin-report-opportunity_funnel_owner_stage`, `an-admin-report-accounts_by_industry_type` |
| S17 | Sales Home | KPIs show 1,290,000.00 while dashboards show 1,290,000 | One currency format | everyone | `an-admin-page-sales_home_page` |
| S18 | Delete lead dialog | Does not say that campaign memberships go with it | Name the cascade ("also removes 1 campaign membership") | admins, GDPR requests | `mkt-11-cascade-delete-dialog` |
| S19 | Phone 390 px | Campaign title clipped with no ellipsis; gantt bars carry no labels | Wrap or ellipsize the title; fall back to a list under a width | mobile users | `p-admin-crm_campaign-record-qzhN2NgWgy9rqfbN`, `p-admin-crm_campaign-view-crm_campaign-campaign_gantt` |
| S20 | Service agent on a campaign | Related tab offers Update Stage and New on Opportunities | Hide actions the persona cannot run there | service agent | `mkt-14-agent-campaign-tab-related` |

## Data left as seeded

Reverted through the admin data API and verified: 13 test memberships deleted (campaign metrics re-read identical to the seed on all 7 campaigns, 51 members), the member Mark-Responded as the marketing user set back to `sent`, Marco Ricci's opt-out cleared, CPG-0003 actual cost / target size / status and CPG-0007 target size restored, the Globex opportunity's campaign cleared, 2 QA tasks and 6 QA events (with their attendee rows) deleted, 3 accounts' `last_activity_date` and Emily Davis / Kai Watanabe `last_contacted_date` restored, the two QA users' positions removed and both users banned. Left behind: `sys_activity` timeline rows and inbox notifications from the test actions, the deleted QA lead's audit rows, and D6's `completed_date` on one seeded task (readonly).
