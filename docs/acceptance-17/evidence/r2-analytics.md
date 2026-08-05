# R2 — HotCRM 17.0.0-rc.2 Acceptance: Dashboards & Reports

- Date: 2026-08-05 · Executor: R2 (read-only) · Server: http://localhost:4001 (not restarted)
- Auth: POST /api/v1/auth/sign-in/email → Bearer token; Playwright authenticated via `context.request.post` (cookies shared with browser).
- Analytics REST path used by the UI (captured from network): **`POST /api/v1/analytics/dataset/query`** — every observed call returned **200**.
- Seed baseline (REST cross-checks, `GET /api/v1/data/<obj>?limit=1` → `total`): crm_case **38**, crm_opportunity **23**, crm_lead **21**, crm_account **9**, crm_contact **9**, crm_task **7**, crm_forecast **8**, crm_product **13**, **crm_event 0 (no seeds)**.
- Noise excluded from verdicts: Sentry `o4510356161757184.ingest.us.sentry.io` requests fail with `net::ERR_TUNNEL_CONNECTION_FAILED` (outbound proxy blocks them; unrelated to app) and `GET /assets/crm-favicon.ico` → 404 (cosmetic asset miss, appears on report/dashboard pages).
- Scripts & artifacts: `/tmp/claude-0/-home-user/f9de7acc-06e5-5667-b535-06e82c336458/scratchpad/r2/` (`dash.js`, `dash2.js`, `filters.js`, `reports.js`, `dash_results.json`, `dash2_results.json`, `filter_results.json`, `report_results.json`, PNGs referenced below).

Verdict legend: 通过 = pass, 失败 = fail, 阻塞 = blocked.

---

## SCOPE A — Dashboards

### 1. crm_overview_dashboard (`/_console/apps/app.objectstack.hotcrm/dashboard/crm_overview_dashboard`) — 通过
Screenshots: `dash_crm_overview_dashboard.png` (top), `dash_crm_overview_dashboard_mid.png`, `dash_crm_overview_dashboard_bottom.png` (below fold).

| Widget | Verdict | Evidence |
|---|---|---|
| Total Revenue (metric) | 通过 | 610,000 (this quarter) |
| Active Deals (metric) | 通过 | 7 |
| Won Deals (metric) | 通过 | 4 |
| Avg Deal Size (metric) | 通过 | 152,500 |
| Revenue Trends (area) | 通过 | SVG rendered, month x-axis 2026-01…2026-08, y-axis 0–600K |
| Lead Source (donut) | 通过 | Donut with 7 legend entries (Cold Call, Content/Blog, Email Campaign, Event/Trade Show, Partner, Referral, Web) |
| Pipeline by Stage (funnel) | 通过 | Funnel with Qualification / Needs Analysis / Proposal / Negotiation segments |
| Top Products (bar) | 通过 | Bars for Service/Software/Subscription/Support, y-axis 0–120K |
| Pipeline by Owner (table) | 通过 | Row: Dev Admin · 2,910,000 · 7 · 415,714 |

Console errors: only favicon 404 + Sentry tunnel noise. Failed app requests: none (all analytics queries 200).

### 2. executive_dashboard — 通过
Screenshot: `dash_executive_dashboard.png`.

| Widget | Verdict | Evidence |
|---|---|---|
| Total Revenue (YTD) | 通过 | 1,290,000 |
| Active Accounts | 通过 | 9 (matches REST total) |
| Total Contacts | 通过 | 9 (matches REST total) |
| Open Leads | 通过 | 21 (matches REST total) |
| Revenue Trend (area) | 通过 | Month buckets 2026-01…2026-08, y 0–600K |
| Revenue by Industry (donut) | 通过 | 6 industry segments |
| Pipeline by Stage (funnel) | 通过 | 4 stage segments |
| New Accounts (bar) | 通过 | 2026-08 bucket, y 0–12 |
| Accounts by Industry (table) | 通过 | 9 data rows, e.g. Technology · 30,000,000 · 2 |

Console errors: Sentry noise only. HTTP errors: none.

### 3. sales_dashboard — 通过
Screenshots: `dash_sales_dashboard.png`, `dash_sales_dashboard_mid.png`, `dash_sales_dashboard_bottom.png`.

| Widget | Verdict | Evidence |
|---|---|---|
| Total Pipeline | 通过 | 2,910,000 |
| Closed Won (QTD) | 通过 | 610,000 |
| Open Opportunities | 通过 | 7 |
| Win Rate (12M) | 通过 | 62% |
| Deals Won (12M) | 通过 | 8 |
| Deals Lost (12M) | 通过 | 5 |
| Monthly Revenue Trend (area) | 通过 | Month buckets 2026-01…2026-08 |
| Pipeline by Forecast Category (h-bar) | 通过 | Axis 0–2.4M, bars rendered |
| Lead Source (donut) | 通过 | 7 segments |
| Open Pipeline by Owner (table) | 通过 | Dev Admin · 2,910,000 · 7 · 55% |
| Quota Attainment by Rep (table) | 通过* | "— · 1,500,000 · 820,000 · 55%" — values correct; owner label renders "—" (see Observations O2) |
| Win / Loss by Rep (table) | 通过 | Dev Admin · 8 · 5 · 13 · 62% · 1,290,000 |
| Win / Loss by Lead Source (table) | 通过 | 8 data rows, e.g. Web · 2 · 1 · 3 · 67% · 470,000 |
| Why We Lose (donut) | 通过 | 5 loss-reason segments |
| Pipeline by Stage × Lead Source (pivot) | 通过 | Cross-tab renders, e.g. Negotiation × Partner 1,200,000; row/col totals present |

Console errors: Sentry noise only. HTTP errors: none.

### 4. service_dashboard — 通过 (see #520 signal below)
Screenshots: `dash_service_dashboard.png`, `dash_service_dashboard_mid.png`, `dash_service_dashboard_bottom.png`.

| Widget | Verdict | Evidence |
|---|---|---|
| Open Cases (metric) | 通过 | **30** (REST: 38 cases total, 30 with `is_closed=false` — exact match) |
| Critical Cases (metric) | 通过 | **7** (REST: 9 critical, 7 open critical) |
| Avg Resolution Time (metric) | 通过 | **45.0** h |
| SLA Violations (metric) | 通过 | **3** |
| Cases by Status (donut) | 通过 | 5 segments: Escalated / In Progress / New / Resolved / Waiting on Customer |
| Cases by Priority (pie) | 通过 | 4 segments: Critical / High / Low / Medium |
| Cases by Origin (bar) | 通过 | Chat/Email/Phone/Portal/Web bars, y 0–12 |
| Daily Case Volume (area) | 通过 | Day buckets Jul 6 → Aug 4, non-empty series |
| SLA Compliance (gauge) | 通过 | Shows 0.0% SLA Violation Rate — **data-consistent, not a bug**: widget filters `is_closed: true`, and all 3 SLA-violated cases are open (Open Cases by Priority shows Critical 42.9% ≈ 3/7); closed cases have zero violations |
| Open Cases by Priority (table) | 通过 | Medium 9 · 0.0% / Critical 7 · 42.9% / High 7 · 0.0% / Low 7 · 0.0% |

Console errors: Sentry noise only. HTTP errors: none; analytics queries 200 (e.g. payload `{"datasetName":"case_metrics","selection":{"measures":["case_count"],"runtimeFilter":{"$and":[{"is_closed":false}...]}}}`).

### 5. sales_activity_dashboard — 通过 (empty event widgets are seed-consistent)
Screenshots: `dash_sales_activity_dashboard.png`, `dash_sales_activity_dashboard_mid.png`, `dash_sales_activity_dashboard_bottom.png`.

| Widget | Verdict | Evidence |
|---|---|---|
| Interactions Logged | 通过 | 0 — correct: `GET /api/v1/data/crm_event?limit=1` → `"total":0` (no event seeds) |
| Meetings Booked | 通过 | 0 (same — no crm_event seeds) |
| Customer Minutes | 通过 | 0 (same) |
| Tasks Completed | 通过 | 1 (crm_task has 7 records; 1 matches widget filter) |
| Activity by Rep (bar) | 通过 | Renders clean "No rows" empty state (correct for 0 events; no error) |
| Activity Volume by Week (area) | 通过 | "No rows" empty state |
| Activity Mix (donut) | 通过 | "No rows" empty state |
| Where the Activity Lands (bar) | 通过 | "No rows" empty state |
| Interactions on Deals | 通过 | 0 (no events) |
| Open Deals | 通过 | 10 |
| Quiet 30+/60+/90+ Days | 通过 | 0 / 0 / 0 — correct: all 9 accounts have `last_activity_date` between 2026-07-15 and 2026-08-04 (REST-verified), i.e. none quiet 30+ days |

Console errors: Sentry noise only. HTTP errors: none. Verdict note: every widget renders and the zeros/empties are provably data-driven (REST cross-check), not query failures — no failing request or console error on this page.

### Global-filter tests (2 dashboards, before/after)

**crm_overview_dashboard — date range** (`filter_crm_before.png` → `filter_crm_after_year.png`):
"This quarter" → "This year" changed every dateRange-bound KPI:
- Total Revenue 610,000 → **1,290,000**
- Active Deals 7 → **10**
- Won Deals 4 → **8**
- Avg Deal Size 152,500 → **161,250**

**crm_overview_dashboard — Owner filter** (`filter_crm_after_owner.png`):
Owner: All → Dev Admin. Numbers unchanged — expected, since REST shows a single owner (`6pQQ0XGw…`) owns all 23 opportunities. The filter is provably applied server-side: captured query payload
`{"datasetName":"opportunity_metrics","selection":{"measures":["total_amount"],"runtimeFilter":{"$and":[{"stage":"closed_won"},{"$and":[{"close_date":{"$gte":"2026-01-01","$lte":"2026-12-31"}},{"owner":"6pQQ0XGw6t294Qme6cbucdEM8giap4ew"}]}]}}}` → 200.

**service_dashboard — Priority filter** (`filter_svc_before.png` → `filter_svc_after_priority.png`):
Priority: All → Critical changed the numbers:
- Open Cases 30 → **7**
- Avg Resolution Time 45.0 → **48.0** h
- SLA Violations 3 → 3 (all violated cases are critical — consistent with Critical row's 42.9% rate)
Captured payload: `{"datasetName":"case_metrics","selection":{"measures":["case_count"],"runtimeFilter":{"$and":[{"is_closed":false},{"priority":"critical"}]}}}` → 200.

### #520 signal (service_dashboard datetime window filter — acceptance)
**PASS.** In rc.0 every service_dashboard widget was empty (hotcrm#520 / upstream objectstack#3912: SQLite datetime filter values coerced to epoch-ms INTEGER against ISO-TEXT columns, so the injected date window matched nothing). On rc.2 every widget shows real numbers from the 38 seeded cases: **Open Cases 30, Critical Cases 7, Avg Resolution 45.0 h, SLA Violations 3**, plus fully populated status/priority/origin charts, a 30-day Daily Case Volume series with day buckets Jul 6–Aug 4, and the Open Cases by Priority table (Medium 9 / Critical 7 / High 7 / Low 7). These exactly match the REST ground truth (38 total, 30 open, 8 closed; 9 critical). All `POST /api/v1/analytics/dataset/query` calls returned 200 with no console errors. Note the shipped design in `src/dashboards/service.dashboard.ts` deliberately omits the dashboard `dateRange` (per the in-file #460/#3912 analysis) — the read-side acceptance signal here is the widgets computing over datetime-stamped case data and returning correct non-zero numbers, which they do; additionally the `created_date`-bucketed Daily Case Volume window (last 30 days) populates correctly, showing the datetime day-bucketing path works.

---

## SCOPE B — Reports (all at `/_console/apps/app.objectstack.hotcrm/report/<name>`)

| Report | Type | Verdict | Evidence (screenshot `report_<name>.png`) |
|---|---|---|---|
| accounts_by_industry_type | matrix | 通过 | 9 rows × Customer/Prospect/Partner column groups, both measures populated (Total 9 accounts / 109,800,000); grand totals correct |
| cases_by_status_priority | summary + bar | 通过 | 22 rows (status × priority), both measures (Cases, Avg Resolution (h)) resolve; bar chart renders with populated axes |
| sla_performance | summary + column | 通过 | 4 priority rows + total, measures Cases / SLA Violation Rate / Avg Resolution (h) all resolve (closed-only scope → 0.0% rates, consistent with gauge); chart renders |
| cases_opened_by_day_priority | **matrix (day)** | 通过 | See #523 below — 30 day columns `2026-07-06`…`2026-08-04`, chronological, Total 38 = seeded case count |
| lead_inflow_by_month_source | **matrix (month)** | 通过 | See #523 below — month columns `2026-02`…`2026-08`, chronological; Total 20 (21 leads minus 1 never-contacted, excluded by `last_contacted_date ≠ null` filter — correct) |
| opportunities_by_stage | summary + bar | 通过 | 6 stage rows + total (5,065,000 · 68%); bar chart with labeled stage x-axis and 0–2M y-axis, no blank axes |
| won_opportunities_by_owner | summary + column | 通过 | Dev Admin · 1,290,000 + total row; column chart renders |
| pipeline_coverage_by_quarter | **matrix (quarter)** | 通过 | See #523 below — quarter columns `2026-Q3`, `2026-Q4`, ordered; per-cell amount+count, totals row 2,910,000+865,000=3,775,000 · 10 opps |
| opportunity_funnel_owner_stage | summary (2-level) + funnel | 通过 | 6 owner→stage rows + total; multi-level grouping works; funnel chart renders |
| customer_churn_signals | joined (3 blocks) | 通过 | Block 3 (Recently Lost) has data: Dev Admin · 75,000 · 1. Blocks 1–2 show explicit empty state "The dataset returned no rows for this report's scope" — **data-correct, not a failure**: REST shows all 9 accounts have `last_activity_date` ≥ 2026-07-15 (< 60 days ago), so the 60+/90+-day quiet populations are genuinely empty |

Console/network per report: zero failing app requests and zero app console errors on all 10 (only the favicon-404 + Sentry tunnel noise documented above); all analytics queries 200.

### #523 signal (matrix date-column granularity & ordering — acceptance)
**PASS.** All three date-columned matrix reports bucket properly and order chronologically — no "one column per raw date/timestamp" symptom:
- **lead_inflow_by_month_source**: columns are calendar months `2026-02, 2026-03, 2026-04, 2026-05, 2026-06, 2026-07, 2026-08` — exactly 7 columns for 20 contacted leads whose raw `last_contacted_date` values are distinct datetimes; multiple leads aggregate into shared month cells (e.g. 2026-05 total = 4). Screenshot `report_lead_inflow_by_month_source.png`.
- **pipeline_coverage_by_quarter**: columns are quarters `2026-Q3, 2026-Q4` (ordered), each carrying both measures; 10 open opportunities with distinct close dates collapse into 2 quarter columns. Screenshot `report_pipeline_coverage_by_quarter.png`.
- **cases_opened_by_day_priority**: columns are day buckets `2026-07-06` … `2026-08-04`, strictly chronological, with same-day cases aggregating into one column (grand-total row sums per day incl. 2/3-per-day cells; overall Total 38 = all seeded cases). Screenshot `report_cases_opened_by_day_priority.png`.

---

## Observations (non-blocking)
- **O1**: `GET /assets/crm-favicon.ico` → 404 on app pages (console error noise; cosmetic).
- **O2**: Quota Attainment by Rep (sales_dashboard, `forecast_metrics`) shows owner as "—": seeded `crm_forecast` records have `owner_id` set but the `owner` field itself `null` (REST-verified), so the dimension label is empty. Data/seed modeling quirk, not a render failure; numbers are correct.
- **O3**: opportunities_by_stage chart shows the raw measure id `total_amount` as x-axis footer label instead of the friendly label — cosmetic.
- **O4**: crm_event has zero seeded records, leaving 7 of 13 sales_activity_dashboard widgets at 0/"No rows". If a populated activity dashboard is wanted for the demo, event seeds would need to be added (out of scope for this read-only run).

## Summary
- Scope A: 5/5 dashboards 通过 (56 widgets checked; every widget renders; all zeros/empties REST-verified as data-correct). Global filters verified on 2 dashboards with before/after screenshots and captured query payloads.
- Scope B: 10/10 reports 通过; measures resolve, charts render with populated axes.
- **#520: PASS** — service_dashboard fully populated (30/7/45.0/3 over 38 seeded cases).
- **#523: PASS** — month/quarter/day matrix buckets proper and chronologically ordered.
