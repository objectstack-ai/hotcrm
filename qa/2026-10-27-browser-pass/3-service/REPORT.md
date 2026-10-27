# #2320 browser pass — track 3 (CRM · Service: SVC, KB, web-to-case, SLAs)

- **Tested sha:** hotcrm `main` `5eb2f0d` (`@objectstack/*` 18.2.0; one commit past the order's `1f3f888`: #2323 moved `crm_contract` into the app package, which touches no service surface).
- **Boot:** `pnpm install --frozen-lockfile` exit 0 · `pnpm build` exit 0 · `pnpm dev` healthy on `:4001`, seed settled in the background · `pnpm demo:staff` exit 0 (Priya Raman = `service.agent`, Tomas Okafor = `service.manager`, plus the sales personas). For SVC-008 the server was restarted at 13:20Z with `OS_AUTOMATION_SCHEDULED_WORK_ENABLED=true` (same DB) and read after the 14:00Z run, see that row.
- **Browser:** preinstalled Chromium via `require('playwright')`, desktop 1440×900, phone 390×844 (`isMobile`, touch).
- **Personas used:** service agent (Priya), service manager (Tomas), sales rep (`na.rep`, KB read-only check), dev admin (data cross-checks), anonymous visitor (web-to-case).
- **Writes left behind (local dev DB only):** CASE-00014 and CASE-00035 escalated, CASE-00010 and CASE-00014 closed, CASE-00001 escalated by the SLA sweep, CASE-00023 moved to New (state-machine probe), CASE-00039/40/41 created (one by the agent, two by the public form), KA-0025 created and published, two article votes. Escalation stamps cannot be un-written through the product; this DB is the track's own container.

## Coverage — SVC (cases and SLAs)

| Row | Result | Evidence / reason |
| --- | --- | --- |
| SVC-001 case object | pass | `CASE-00039`… numbering, 4 priorities, 7 statuses, origin, attachments panel on every record · `svc-20-*`, `svc-50..53-*` |
| SVC-002 state machine | pass | In Progress → New saves with "Saved — with warnings / Invalid status transition" (declared `severity: warning`) · `svc-44-*`; Edit → Closed without a resolution refused "Resolution is required when closing a case" · `svc-45-*` (see D3 for the form side) |
| SVC-003 SLA stamping | pass | agent-created Medium case on Wayne (strategic) → `sla_due_date` = created + 24 h; raised to High → now + 6 h (tightened); lowered to Low → unchanged (never extends); web case with no account → smb High 8 h; manual escalation to Critical → now + 4 h |
| SVC-004 priority rank | pass | `priority_rank` 2 / 3 / 1 / 4 follows each change; All Cases sorts Critical first · `svc-43-*` |
| SVC-005 web-to-case | pass | `/forms/support` → `/_console/f/support`; empty submit lists "Required: Supplied Email, Subject, Description"; filled submit → "Thank you!", CASE-00040 `origin: web`, routed to the service agent. A forged `POST /api/v1/forms/support/submit` carrying `owner_id`, `status: closed`, `is_escalated`, `escalated_date`, `internal_notes`, `resolution`, `is_sla_violated`, `sla_due_date`, `origin: phone`, `crm_account`, `is_closed` landed as CASE-00041 with every one of them stripped or recomputed (origin `web`, owner routed, no account, no notes) · `w2c-*`. Its `priority: critical` was kept and auto-escalated (offered by the form on purpose; see S4) |
| SVC-006 close metrics | pass | Close Case on CASE-00010 → `closed_date` stamped, `resolution_time_hours: 27.1`, `is_closed: true`, `resolved_by_article` set · `svc-33..38-*` |
| SVC-007 critical auto-escalation | pass | agent edits CASE-00035 Low → Critical: status `escalated`, reason "Auto-escalated: critical priority", owner → Tomas (service_manager pool), `escalated_from` = Priya; Priya's inbox: "Case escalated: CASE-00035 … Open the case to see who owns it now." · `svc-40..43-*` |
| SVC-008 hourly SLA sweep | pass with the scheduler on; **not reachable on the default boot** | default `pnpm dev` banner: "8 flows declare a 'schedule' trigger but are NOT bound … `OS_AUTOMATION_SCHEDULED_WORK_ENABLED` is unset", `case_sla_monitor` among them; on that boot CASE-00001 (High, in progress, due 10/25) reads SLA Violated "No" two days late. Restarted on the same DB with the flag (22 flows bound); the 14:00Z run turned CASE-00001 into `is_sla_violated: true`, status `escalated`, reason "Auto-escalated: SLA due date breached", owner → Tomas (manager pool), and Priya's inbox got "SLA breached: case CASE-00001 — Case CASE-00001 (high) passed its SLA due date and has been auto-escalated." · `svc-90-*`, `svc-92-*`. Cases already flagged violated by the seed (CASE-00027, -00030) were left as they were. Whether scheduled work is on by default is the platform's deployment policy (track 5 records the Setup side: `qa-2320/5-setup/12-packaged-automation-not-running-details.png`) |
| SVC-009 escalation follow-up task | pass | escalating CASE-00014 created "Escalated: CASE-00014 · …", `urgent`, due tomorrow, owner = account owner (dev admin) · `svc-66-*`. The new case owner cannot see it (S11) · `svc-65-*`. Tomas then closed CASE-00014 → that task flipped to `completed` · `svc-67-*`. Resolution → account activity clock: not separately driven |
| SVC-010 Escalate / Close actions | pass | both open a confirm, then the screen; empty submit → "Please complete the required fields: Escalation Reason" · `svc-31-*`; Escalate sets Critical + reason + escalated stamps and hands to Tomas · `svc-32-*`; Close needs a resolution, optional article picker · `svc-36..38-*`. Claim Case on an unowned web case → owner = agent, In Progress · `svc-55..58-*` |
| SVC-011 CSAT | n/a | removed (#1428), nothing to test |
| SVC-012 first response stamp | pass | Log a Call (12 min, held) on CASE-00040 → `first_response_date` 13:15:42Z and a timeline entry · `svc-60..62-*` |
| SVC-013 case views | pass | All Cases + Service Workflow kanban (card opens a 640 px drawer) + SLA Calendar + Case Timeline + My Open Cases + Unassigned — triage + Escalated Cases + ⏰ SLA at Risk · `svc-10..19-*`. The row says 7 tabs; the app ships 8 (Unassigned — triage, #2190) — inventory wording only |
| SVC-014 case record page | pass | header actions per state (Claim / Escalate / Close / Log a Call; closed case → Log a Call / Log a Meeting / Schedule a Meeting), highlights strip, 6-step path, Details / Related / Activity with comment box · `svc-20-*`, `svc-64-*` |
| SVC-015 escalation sharing | pass (indirect) | `demo:staff` re-evaluation lists `case_escalation_sharing matched=8 holders=1`, and the manager sees all 11 critical cases. Not separable in the browser: every critical case is reassigned to the manager pool, so no critical case owned by someone else exists to look at |
| SVC-016 timeline milestones | pass | "Case escalated — …" on CASE-00014 · `svc-63-*-activity`; "Case closed — …" on CASE-00010 · `svc-64-*-activity`. Resolved milestone not driven |
| SVC-017 AI triage skill | **not reachable** | community boot: `GET /api/v1/ai/agents` → `{"agents":[]}`, `GET /api/v1/ai/skills` → 501 NOT_IMPLEMENTED; no assistant control in the console (same as track 1, D2) |
| SVC-018 service analytics | pass, with D4 | Service Overview is both personas' landing; 12 chart elements drawn (DOM probe); KPI tiles, donut, pie, bars, area, SLA gauge as a number (ADR-0021), KB deflection, two tables · `svc-01-*`, `svc-71-*`. Reports: Cases by Status and Priority, SLA Performance (closed cases only, S13), Cases Opened by Priority × Day · `svc-8x-*` |

## Coverage — KB (knowledge)

| Row | Result | Evidence / reason |
| --- | --- | --- |
| KB-001 article object | pass | KA-0025 numbering, category, tag chips, audience, language, source case lookup on the form · `kb-10-*` |
| KB-002 lifecycle | pass | draft → published (create), published → archived → published by Edit · `kb-30-*`, `kb-31-*`. No transition gate is declared, so any status is selectable (as authored) |
| KB-003 publish gates | pass | publish with no body → refused "Articles cannot be published without a body." · `kb-11-*`; no summary → "Saved — with warnings / Published articles should have a summary…" · `kb-13-*` |
| KB-004 publish / review stamps | pass | first publish stamps `published_at` and `last_reviewed_at` 13:21:48; votes leave `last_reviewed_at` alone; re-publish keeps `published_at`, refreshes `last_reviewed_at` 13:23:04; summary edit refreshes it again 13:23:10 |
| KB-005 votes | pass | sales rep "Helpful" → "Thanks — recorded as helpful.", `helpful_count 1`; agent "Not Helpful" → `not_helpful_count 1` · `kb-20-*`, `kb-21-*` |
| KB-006 views | pass | All Articles grouped by category, Published (sorted by helpful votes), My Drafts (empty state for the agent) · `kb-01-*`, `kb-02-*` |
| KB-007 permissions | pass | sales rep: no Edit, overflow menu has no delete · `kb-20-*-menu`; agent: Edit but no Delete · `kb-21-*-menu`; anonymous `GET /api/v1/data/crm_knowledge_article` → 401 |

## Phone width (390×844)

No horizontal page overflow on any screen (`scrollWidth == clientWidth == 390`). Service Overview, All Cases (cards), kanban, case record, confirm sheet and the public form all usable · `phone-01..07-*`, `w2c-phone-01-*`. Two defects: D1 (KB list) and D2 (record titles).

## Defects

### D1 — On a phone the Knowledge list stays a clipped table
- **Steps:** as the service agent at 390×844, open **Knowledge** (All Articles).
- **Expected:** the list adapts to the width as the Cases list does on the same console (each row becomes a card with its fields, `phone-02-all-cases.png`).
- **Actual:** the grouped grid keeps its desktop columns; the header reads "Arti", titles are cut mid-word ("QA 2320 — Fixing a stucl", "Your First Week with the"), every other column is off-screen behind the pinned Actions column · `phone-06-kb-list.png`.
- **Suspected landing:** the console's grid renderer: the grouped (`grouping`) grid path does not take the mobile card layout the plain grid takes. `src/service/views/knowledge_article.view.ts` only declares `grouping: { fields: [category] }`.
- **Dedupe words:** grouped grid mobile card layout, list grouping phone clipped columns, knowledge list phone.

### D2 — On a phone a record title is clipped at the right edge, with no wrap or ellipsis
- **Steps:** at 390×844 open CASE-00001, or KA-0025.
- **Expected:** the title is readable (wrapped, or ellipsised in the header as the desktop header does: "CASE-00001 · Login issues after platform …").
- **Actual:** "CASE-00001 · Login issues after platfo" and "KA-0025 - QA 2320 — Fixing a stuck i" run off the screen; the path labels are cut too ("Resolu") · `phone-04-case-record.png`, `phone-07-kb-article.png`.
- **Suspected landing:** the console's `page:header` / `record:path` at narrow widths (platform). No HotCRM metadata sets a width.
- **Dedupe words:** record header title overflow mobile, page header truncation phone, record path labels cut.

### D3 — The Edit Case form offers Status "Closed" but no Resolution field, so the save is a dead end
- **Steps:** as the service agent, open an open case → **Edit** → Status **Closed** → **Update**.
- **Expected:** the form lets the user satisfy the rule it enforces: `resolution_required_for_closed` says "Resolution is required when closing a case", so the form that offers Closed must offer Resolution (or not offer Closed and point at **Close Case**).
- **Actual:** the save is refused with that message, in a banner and a toast, and the form has no Resolution field to fill · `svc-45-sm-close-without-resolution.png`. On the record page the Resolution section is hidden while empty, so the only way out is to cancel and find **Close Case**.
- **Suspected landing:** `src/service/views/case.view.ts` `form.sections[0].fields` (no `resolution`); the same form is the create dialog, so the fix is a conditional field (`visibleWhen` status is resolved/closed) rather than an always-on one.
- **Dedupe words:** case edit form resolution missing, close case via edit refused, resolution required no field.

### D4 — "Top Resolving Articles" lists a "—" row with 0
- **Steps:** sign in as the service manager → **Service Overview** → "Top Resolving Articles" (also on the agent's view, under the one real row).
- **Expected:** the widget's own description: "Knowledge articles ranked by the closed cases they resolved" — a case with no article is not an article; with none, the widget's empty state.
- **Actual:** a row labelled "—" with **Resolved by KB 0** (manager: the only row) · `svc-71-mgr-service-overview-full.png`, `svc-01-agent-landing.png`.
- **Suspected landing:** `src/service/dashboards/service.dashboard.ts` widget `top_resolving_articles`: `filter: { is_closed: true }` groups every closed case by `resolved_article`, so the closed cases with no article form the "—" bucket (its `kb_resolved_count` is 0 by construction). Excluding a null `resolved_by_article` in that filter is the HotCRM-side reading; whether a null dimension bucket should render at all is the platform's call.
- **Dedupe words:** top resolving articles dash row, null group row dashboard table, resolved by KB zero row.

## UI / UX suggestions

Each one is for discussion with the maintainer before any card (card body rule).

| # | Where | What a user meets today | Proposed change | Who benefits | Screenshot |
| --- | --- | --- | --- | --- | --- |
| S1 | Case and article record path | the path ticks every stage left of the current one: a case that went New → In Progress → Escalated shows "Waiting on Customer ✓"; every closed case shows all five ✓; a born-published article shows "Draft ✓ In Review ✓". `waiting_support` has no step at all | tick only stages the record actually passed (history), or render non-linear statuses as a badge rather than a linear path | agents and managers reading a case's history | `svc-32-*`, `svc-38-*`, `kb-20-*` |
| S2 | Escalate / Close / Claim | a "Confirm Action … Continue?" dialog, then the screen that already has Cancel | drop the confirm in front of a screen flow (the screen is the confirmation) | agents, 1 click per case | `svc-30-escalate-confirm.png`, `svc-33-*` |
| S3 | Public form `/forms/support` | labels "Supplied Name" / "Supplied Email" (staff wording), monospace placeholder, a blue Submit unlike the app, no logo, and "Thank you!" with no case number | visitor wording ("Your name", "Your email"), the app's brand, and the case number on the thank-you page | customers; agents get fewer "did you get my ticket?" mails | `w2c-02-*`, `w2c-04-*` |
| S4 | Public form priority | an anonymous visitor can pick **Critical**; that auto-escalates and pages the service manager (CASE-00041) | decide whether guests may set Critical (cap at High, or let triage set it) | service managers | `w2c-03-*` |
| S5 | SLA Calendar | closed and resolved cases fill the SLA calendar beside live ones | filter it to live work, like My Open Cases / SLA at Risk / Escalated | agents planning the day | `svc-12-*` |
| S6 | Highlights "SLA Violated" | a not-violated case shows a red-ish "× No" pill that reads as an error | neutral "No" (or ✓ On track), red only when violated | everyone scanning the header | `svc-20-*-details.png` |
| S7 | Lookup picker (Resolved by Article, Account) | each option repeats "Article #: · Title: Releas… · Category:" under a line that already shows number and title | show only fields not in the option's title | agents closing cases | `svc-36-*` |
| S8 | Resolved / closed case | no Reopen action, though the state machine allows closed → in_progress and resolved → in_progress | a Reopen action (screen flow with a reason) | agents when a customer writes back | `svc-38-*`, `svc-64-*-header.png` |
| S9 | New / Edit Case form | no Case Type field; staff-created cases save `type: null` while the public form asks for it | add Case Type to the form | managers reading case mix | `svc-50-*`, `svc-40-*` |
| S10 | Case Related tab | the tab holds one "Open Tasks" accordion, collapsed, so the tab looks empty | open it by default, or drop the accordion for a single list | agents | `svc-63-*-related.png` |
| S11 | Escalated case, new owner | the service manager who now owns CASE-00014 sees "Open Tasks 0"; the urgent follow-up exists (admin sees it, owned by the account owner) | share the follow-up with the case owner, or show its existence | service managers | `svc-65-*`, `svc-66-*` |
| S12 | Knowledge article page | the article body sits below the metadata card; Helpful / Not Helpful show neither counts nor "you voted"; each vote adds "Updated Knowledge Article …: Helpful" to the article's discussion, naming the voter | body first for readers; show counts and the reader's vote on the buttons; keep vote recounts out of the discussion feed | every reader; article owners | `kb-20-*`, `kb-32-*` |
| S13 | SLA analytics | Service Overview shows **SLA Compliance 100%** next to **SLA Violations 4**; SLA Performance Report is closed cases only (`runtimeFilter: is_closed`) but says so nowhere, and its all-zero chart is an empty axis | say "closed cases" in both titles, and show an empty state when the bars are all 0 | service managers | `svc-71-*`, `svc-8x-report-sla-performance.png` |
| S14 | Daily Case Volume chart | the x-axis lists only days with cases, evenly spaced: Sep 28 → Oct 7 takes the same width as Oct 26 → Oct 27 | a continuous date axis (missing days as 0) | managers reading trend | `svc-71-*` |
| S15 | All Cases at 1440 px | Case Owner is cut to "Priya" behind the pinned Actions column, though the view comment says the eight columns fit (#2292) | re-measure the widths with the Actions column | agents | `svc-10-cases-all.png` |
| S16 | Case cards on a phone | each card repeats Case Number and Subject under a title that already shows both | drop fields already in the card title | agents on phones | `phone-02-all-cases.png` |

## Counts

Defects: 4 (D1, D2 platform console; D3, D4 HotCRM metadata likely). UI/UX suggestions: 16. Not reachable: SVC-017 (no AI runtime); SVC-008 only with `OS_AUTOMATION_SCHEDULED_WORK_ENABLED=true` (passes then).
