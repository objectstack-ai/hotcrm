# #2320 browser pass — track 1 (CRM · Sales)


- **Tested sha:** hotcrm `main` `1f3f888` (`@objectstack/*` 18.2.0), checked again after the 09:36Z worker restart: `origin/main` still `1f3f888`. By the end of the pass `origin/main` had moved to `afdf9a0` (#2323 contract move, #2324 price books); neither touches a file this report names as a landing spot for D1–D6.
- **Boot:** `pnpm install --frozen-lockfile` exit 0 · `pnpm dev` healthy on `:4001` (44 plugins, seed settled in background) · `pnpm demo:staff` exit 0 (na.rep, eu.rep, sales.manager, service.agent, service.manager).
- **Browser:** preinstalled Chromium via `require('playwright')`, desktop 1440×900, phone 390×844 (`isMobile`, touch).
- **Personas used:** dev admin (`admin@objectos.ai`), sales rep Nina Reyes (`na.rep`), anonymous visitor (web-to-lead). Sales manager (`sales.manager`), eu.rep and service.manager where a row names them.
- **Environment note:** the container has no egress to `demotiles.maplibre.org`, so the account map's tiles cannot load here (the view shows its own fallback message). That is the sandbox, not the product.

## Coverage — LEA (leads)

| Row | Result | Evidence / reason |
| --- | --- | --- |
| LEA-001 lead object | pass | record page shows the field groups (Identity, Company, Contact, Communication Preferences, Qualification, Address, Conversion, Additional Info), star rating · `lea-03-*` |
| LEA-002 status state machine | pass | qualified → contacted saves with the toast "Saved — with warnings / Invalid lead status transition" (warning level, as declared) · `lea-13-*`; Status=Converted by Edit refused with the `converted_only_by_conversion` text · `lea-11-*` |
| LEA-003 disqualification reason | pass (partial) | Unqualified without a reason: inline "Disqualification Reason is required" · `lea-10-*`. The duplicate-survivor rule was not driven (not tested: needs a confirmed duplicate pair) |
| LEA-004 auto rating | pass | rep-created lead with no score saved `rating: 3` · `lea-05-*` |
| LEA-005 round-robin assignment | pass | both anonymous web leads landed on eu.rep (fewest unconverted leads; na.rep held 3) |
| LEA-006 web-to-lead | pass | `/forms/contact-us` → `/_console/f/contact-us`; empty submit lists the required fields; filled submit → "Thank you!"; lead `lead_source: web`. A forged POST to `/api/v1/forms/contact-us/submit` carrying `owner_id`, `status: qualified`, `is_converted`, `duplicate_status`, `rating`, `lead_source` landed as `new`/unconverted/no duplicate flag/`web`/routed owner · `lea-19-*` |
| LEA-007 normalisation + soft dedupe | pass | `Quinn.Tester@BluepeakRobotics…` stored lower-case, `company_normalized: "bluepeak robotics inc"`; re-captured `Theo.Park@SkylineMedia…` flagged `suspected` → `crm_lead`, with the "Suspected duplicate — compare before you convert" banner · `lea-07-*` |
| LEA-008 converted-lead lock | pass | editing Title on a converted lead → 409 `RECORD_LOCKED` "Cannot edit converted lead … Make changes on the converted records instead." · `lea-09-*` |
| LEA-009 qualified → task | pass | new → qualified created "Follow up with qualified lead: …", `high`, due +2 days |
| LEA-010 conversion wizard | pass | as na.rep with "Create Opportunity?" ticked, amount 45000: account ACC-000010, contact, opportunity (prospecting, prefilled name "‹company› – 2026-10-27", close date +90 d) created; lead converted with all four `converted_*` fields; "Lead converted" notification · `lea-08-*`. Reuse path: admin converting Owen Becker (company Northwind Energy) — the wizard says "Northwind Energy is the existing account this lead will join."; the lead's `converted_account` is the existing Northwind Energy row, a new contact, `converted_opportunity` null with the box unticked · `lea-25-*` |
| LEA-011 routing SLA | pass | normal lead → follow-up +3 d; 5-star lead → +1 d and the notification "Hot lead — follow up within 24h: Hollis Fivestar" · `lea-06-*` |
| LEA-012 schedule follow-up | pass, with defect D1 | filled screen creates the task (type call, high, due 2026-11-03) and moves `next_followup_date`; toast "Follow-up scheduled." · `lea-14-*`. Submit with a required field empty does nothing and says nothing (D1) · `lea-15-*` |
| LEA-013 bulk add to campaign | pass | admin: select 2 → Add to Campaign → picker → confirm list → "Succeeded 2 / 2", members CM-00052/53; a rerun added no twins; na.rep (no campaign-member create) sees no such action · `lea-16-*`, `lea-17-*`, `lea-18-*` |
| LEA-014 lead list views | pass | All Leads (21 seeded) + My Leads (empty state for admin) + Hot Leads (5) + High Priority (5) + Suspected Duplicates (empty state) + Lead Pipeline kanban (status columns with revenue sums) + Lead Calendar (3 dated, 18 unscheduled) + Lead Cards · `lea-01-*`, `lea-02-*` |
| LEA-015 named form views | **not reachable** | no navigation, button or menu offers any of the six named layouts (`detail_form`, `lead_conversion_wizard`, `split_edit`, `quick_edit_drawer`, `status_update_modal`, `advanced_conditional`); `?form=NAME` opens a blank "Edit Lead" dialog with the default layout · `lea-23-*`. Only `web_to_lead` is reachable (LEA-006) |
| LEA-016 lead record page | pass | header Convert Lead / Schedule Follow-up / Log a Call (+ Log a Meeting, Schedule a Meeting in the overflow), highlights strip, 5-step path, Details / Related / Activity / History tabs · `lea-03-*` |
| LEA-017 AI lead-qualification skill | **not reachable** | this community-edition boot runs no agent (`GET /api/v1/ai/agents` → `[]`, `GET /api/v1/ai/skills` → 501 NOT_IMPLEMENTED); no assistant control exists in the console. See D2 for the copy that still points users at one |
| LEA-018 lead import | pass | Import → upload CSV → saved mapping "Lead Import (CSV)" → preview → "Import Complete, 2 created"; `Working` → contacted, `Web` → web, `Software` → software, owner by e-mail lookup (na.rep), blank owner → importer · `lea-20-*` |
| LEA-019 lead analytics | pass | Reports → "Lead Engagement by Month × Source" renders the month × source matrix (total 20) · `rpt-lead-engagement-*` |

## Coverage — ACC (accounts and contacts)

| Row | Result | Evidence / reason |
| --- | --- | --- |
| ACC-001 account object | pass | create form tabs Profile / Financials / Customer Success / Locations / Description; record page sections · `acc-03-*`, `acc-02-*` |
| ACC-002 unique name + match key | pass | duplicate "Acme Corporation" refused ("A record with this value already exists", see S11) · `acc-04-*`; converted account carries `name_normalized` |
| ACC-003 territory derivation | pass | billing country `de` → `billing_country: DE`, `territory: emea` · `acc-07-*`, `acc-08-*` |
| ACC-004 account protection | pass | website `www…` → "Please enter a URL." · `acc-05-*`; revenue `-5` → "Value must be greater than or equal to 0." (admin; for na.rep the field is read-only) · `acc-06-*`; deleting Acme (customer, 3 opportunities) → 409 "Cannot delete customer account: 3 opportunities, open or closed, still reference it. Delete the opportunities first, or mark the account inactive to retire it instead." · `acc-09-*` |
| ACC-005 activity clock | pass (owner-change leg) | Transfer Owner stamped `last_activity_date` today. The event / task / case bubble legs belong to track 4 (activities) and were not driven here |
| ACC-006 account list views + bulk | pass | All Accounts (10), Account Cards, Accounts by Location (tiles blocked by the sandbox, fallback list shown), Enterprise (4), My Accounts (overflow, see S10), ⚠️ At-Risk (2) · `acc-01-*`. Bulk Update Tier → SMB on 2 (`acc-10-*`), Transfer Owner → Emil Roth (`acc-11-*`), Delete (`acc-12-*`), each with an affected-records confirm and "Succeeded n / n" |
| ACC-007 account workbench | pass | `…/page/account_workbench` as na.rep: 3 quick filters (Industry, Type, Account Owner), 7 visible accounts, column sums; not in the sidebar, as the row says · `acc-13-*` |
| ACC-008 account record page | pass | header Log a Call / Log a Meeting / Schedule a Meeting; Discussion: na.rep posted "@Marta Quinn" from the mention picker and sales.manager got "Nina Reyes mentioned you" · `acc-02-*`, `acc-14-*`, `acc-15-*`. Reactions were not driven |
| ACC-009 contact object | pass | create form tabs Identity / Buying Centre / Contact Info / Mailing Address / Preferences; Account required · `con-08-*` |
| ACC-010 contact integrity | pass | `John.Smith@ACME…` refused: "Another contact (John Smith) with email john.smith@acme.example.com already exists."; deleting John Smith → 409 naming the active contract and how to free the contact · `con-08-*`, `con-09-*` |
| ACC-011 mark primary | pass, with defect D3 | from the list row menu: confirm → "Contact marked as primary!"; Owen Becker became primary and Olivia Chen (same account) was demoted · `con-06-*`. Not offered on the record page (D3) |
| ACC-012 send email | pass, with defect D3 | from the row menu: Subject + Body → Confirm → "Email queued to this contact."; `sys_email` row to the contact, `last_contacted_date` stamped · `con-07-*`. Not offered on the record page (D3) |
| ACC-013 contact welcome notification | pass | converting Quinn Tester notified the owner "New contact: Quinn Tester" |
| ACC-014 contact list views | pass | All Contacts grouped by account, People Directory (11), Primary Contacts (10) · `con-01-*` |
| ACC-015 account / contact import | pass | accounts CSV with a parent named in the same file: child's `parent_account` = the parent row; contact CSV resolves "Account Name" to the account; Department `Sales` → `sales` · `acc-16-*`, `con-10-*` |
| ACC-016 AI Customer 360 skill | **not reachable** | no agent on this boot (as LEA-017) |
| ACC-017 AI email drafting skill | **not reachable** | no agent on this boot (as LEA-017) |
| ACC-018 account analytics | pass | Reports → Accounts by Industry and Type (matrix, 10 accounts), Customer Churn Signals (four panels) · `rpt-accounts-*`, `rpt-customer-churn-*` |

## Coverage — CON (contracts)

Seat ruling: contracts are track 2 (Revenue). Not driven here.

| Row | Result | Evidence / reason |
| --- | --- | --- |
| CON-001 contract object | track 2 | moved to track 2 by the seat ruling |
| CON-002 contract state machine | track 2 | moved to track 2 by the seat ruling |
| CON-003 term consistency | track 2 | moved to track 2 by the seat ruling |
| CON-004 activation follow-ups | track 2 | moved to track 2 by the seat ruling |
| CON-005 auto-expiry | track 2 | moved to track 2 by the seat ruling |
| CON-006 renewal reminder and auto-renew | track 2 | moved to track 2 by the seat ruling |
| CON-007 contract views | track 2 | moved to track 2 by the seat ruling |

## Coverage — OPP (opportunities)

| Row | Result | Evidence / reason |
| --- | --- | --- |
| OPP-001 opportunity object | pass | Create with nothing filled: "Opportunity Name / Account / Amount / Close Date is required" inline (4 `aria-invalid`); Primary Contact reads "Select Account first", and after Globex Industries offers only Globex's contact (Sarah Johnson) · `opp-18-*` |
| OPP-002 stage state machine | pass | Closed Won without a win reason → "Win Reason is required"; with a reason it closes · `opp-08-*`, `opp-09-*`. Jumping from an early stage saves with the "Invalid opportunity stage transition" warning toast (warning level, see S22) |
| OPP-003 stage-driven fields | pass | prospecting → needs_analysis: probability 40, expected revenue 48,000 (120,000 × 40 %), forecast `best_case` · `opp-03-*` |
| OPP-004 stage age clock | pass | the same save stamped `stage_entry_date` today, `days_in_stage` 0 |
| OPP-005 closed-deal freeze | pass | won without a close date → `close_date` today; editing Amount on the closed deal → 409 "closed_won; only description, next_step, notes may be edited. Attempted: amount." (raw values, S21) · `opp-10-*` |
| OPP-006 won → account promotion | pass | Globex Industries `type` prospect → customer; task "Activate new customer…" (high, +3 days) |
| OPP-007 line items roll up | pass | Northwind Grid Modernization: Related → Products → New, Standard Support × 3 → amount 86,500 → 113,500 · `opp-15-*` |
| OPP-008 price fill | pass | picking the product left Sales Price empty in the form (list price not shown, S26); on insert `unit_price` defaulted to the catalogue 9,000 |
| OPP-009 pipeline kanban | pass | Sales Pipeline tab: stage columns with amount sums, closed deals excluded · `opp-01-02-*` |
| OPP-010 opportunity views | pass, with defect D4 | Open Deals (default) + All Opportunities, Sales Pipeline, Forecast Calendar, Deal Timeline (D4), Deal Cards, My Open Deals (overflow, S27), ⚠️ Stale Opportunities · Longest in Stage First, Tender This Quarter (empty state), Closing This Quarter · `opp-01-*` |
| OPP-011 mass update stage | pass in Open Deals, defect D6 elsewhere | Open Deals → select 2 → bulk bar Update Stage → confirm → "Succeeded 2 / 2", then reverted · `opp-14-*`, `opp-14r-*`. The header-toolbar copy of the action refuses 2 rows and opens on 0 rows (D6) · `opp-13-*` |
| OPP-012 clone | pass | "Copy of Globex Manufacturing Suite", prospecting, close date +90 days, same amount, account, source; no confirmation or toast (S28) · `opp-07-*` |
| OPP-013 stagnation daily scan | **not reachable** | the boot log says "8 flows declare a 'schedule' trigger but are NOT bound — disabled by deployment policy … (OS_AUTOMATION_SCHEDULED_WORK_ENABLED is unset or not truthy)", `opportunity_stagnation` among them. The Stale view (OPP-010) is the reachable part |
| OPP-014 large-deal won alert | pass, with defect D5 | Bluepeak Robotics 120,000 went to Large Deal Approval; Marta approved it in the Approvals Inbox; na.rep won it → "Large deal won" notification · `opp-11-*`, `opp-12-*`. Recall re-submits at once (D5) · `opp-05-*`, `opp-06-*` |
| OPP-015 private deal | pass | na.rep ticked Private on Initech Cloud Migration: sales.manager, eu.rep and service.manager read `total 0` over REST; sales.manager's record URL shows "Record not found" and the deal is gone from All Opportunities; sales.manager's Opportunities by Stage counts Needs Analysis 93,000 (the private 80,000 left out). Admin still sees it. Unticked again and verified · `opp-16-*` |
| OPP-016 record page | pass | header Generate Quote / Clone Opportunity / Log a Call / Edit, 7-step path with Closed Won and Closed Lost apart, Details / Related / Activity, reference rail · `opp-02-*` |
| OPP-017 opportunity analytics | pass | as sales.manager: Opportunities by Stage (6 stages, total 3,442,500), Won Opportunities by Owner (Nina 1,435,000 · Emil 70,000), Pipeline Coverage by Forecast × Quarter (matrix 2026-Q4 / 2027-Q1, total 2,017,500), Opportunity Funnel by Owner → Stage (S13) · `opp-17-*`. No report shows the dataset's `win_rate` |

## Phone width (390×844, touch) — as na.rep

| Screen | Result | Screenshot |
| --- | --- | --- |
| Sales Home | usable; no horizontal page scroll. The four KPI tiles stack one per row and fill the first screen; the My Leads / My Open Deals / My Open Tasks tabs run off the right edge (S29) | `phone-01-sales-home.png`, `phone-01-sales-home-full.png` |
| Lead list | cards (name – company, status chip, email); floating + button | `phone-02-lead-list.png` |
| Lead record | header Convert Lead / Edit / … fit; path fits; the History tab is cut at the right edge | `phone-03-lead-record.png` |
| Conversion wizard | opens as a centred sheet; text, checkbox, Submit / Cancel all reachable | `phone-04-convert-wizard.png` |
| Web-to-lead form | single column, labels and required marks readable | `lea-19-webform-phone-1-blank.png` |
| Account list / record | cards; record header Log a Call / Edit / … fit; the + button covers the Type chip of the card under it | `phone-05-account-list.png`, `phone-06-account-record.png` |
| Contact list | **stays a wide table** (grouped by account): the first visible columns are an empty Profile Picture and Actions, the name shows as "John" with the rest cut; reading a contact needs a sideways scroll inside the grid (S30) | `phone-07-contact-list.png` |
| Opportunity list | cards (name, amount, stage chip, probability, account); views move into a "Switch view" menu with all 10 views | `phone-08-opp-list.png`, `phone-09a-opp-view-switcher.png` |
| Opportunity kanban | one stage column per screen with page dots; na.rep's first column (Prospecting) is empty, so the board opens on "No cards" (S31) | `phone-09-opp-kanban.png` |
| Opportunity record | header fits; the 7-step path runs off the right edge ("Proposal  N…") with no cue to scroll (S32) | `phone-10-opp-record.png` |

No page on the list had a horizontal page scroll (`scrollWidth` 390 everywhere); no API error on any phone screen.

## Defects

### D1 — A screen flow's Submit with an empty required field is a silent no-op
- **Steps:** as na.rep, open a lead you own → **Schedule Follow-up** → type the next step, leave **Due Date** (required, marked `*`) empty → **Submit**.
- **Expected:** the screen says which required field is missing, as the record form does ("Disqualification Reason is required", `lea-10-*`) and as the public form does ("Required: …", `lea-19-2-*`).
- **Actual:** nothing happens. No inline message, no toast, `aria-invalid` on no field, the browser's `validationMessage` on the date input is empty, no request is sent. A user cannot tell why the button does not work · `lea-15-followup-submit-empty.png`.
- **Suspected landing:** the console's screen-flow runner (objectui / `@objectstack` console), not HotCRM metadata — the field is declared `required: true` in `src/sales/flows/schedule-followup.flow.ts`. Every screen flow inherits it (conversion wizard, generate quote …).
- **Dedupe words:** screen flow required silent submit, flow screen validation message, Schedule Follow-up submit nothing.

### D2 — Sales Home tells every user to open an AI assistant panel that this deployment does not have
- **Steps:** sign in as na.rep → HotCRM lands on **Sales Home** → right column card **"Ask the AI Assistant"**.
- **Expected:** a home-page instruction names something the user can find. `content/docs/ai-copilot` places the assistant on the cloud side; this boot has none (`GET /api/v1/ai/agents` → `[]`, skills → 501).
- **Actual:** "Open the assistant panel from the right edge of the page and ask 'what should I focus on today?' — it sees your live pipeline, schema, and accounts." There is no panel and no control; clicking the card does nothing · `lea-04-na-rep-landing.png`, `lea-22-*`.
- **Suspected landing:** `src/sales/pages/home.page.ts` (`ai_briefing` card) for the copy; showing it only where an assistant exists needs a platform way to make a page component conditional on a service being present (upstream).
- **Dedupe words:** Ask the AI Assistant card, assistant panel right edge, sales home AI card community edition.

### D3 — Contact record page offers neither "Mark as Primary Contact" nor "Send Email", though both are declared for the record header
- **Steps:** as admin, Contacts → open Owen Becker (not primary, not opted out) → look at the header buttons and the "…" menu.
- **Expected:** `src/sales/actions/contact.actions.ts` declares `mark_primary` and `send_email` with `locations: ['record_header', 'list_item']`, visible for this record (`is_primary == false`, `email_opt_out == false`); inventory ACC-011 says "记录/行菜单".
- **Actual:** the header shows Log a Call / Log a Meeting / Schedule a Meeting / Edit; the "…" menu shows Add to favorites / Open in new tab / Copy link. Both actions appear only in the list row menu, where they work · `con-05-nonprimary-header.png`, `con-06-rowmenu-nonprimary-1-rowmenu.png`.
- **Suspected landing:** the console's synthesized record header (crm_contact has no authored page; the lead and opportunity pages pass their actions explicitly) — platform/console; if the synthesized header is meant to show only the activity actions, then the app needs a contact page.
- **Dedupe words:** record_header action missing synthesized header, contact send email record page, mark primary record header.

### D4 — Deal Timeline draws every deal from its created date, so closed deals show backwards bars
- **Steps:** Opportunities → **Deal Timeline** tab.
- **Expected:** each bar spans the deal's life (open → close).
- **Actual:** every bar starts at `created_at`, which for the seeded deals is the seed boot date (today), so a deal closed in September reads "10/27/2026 → 9/7/2026" and every open deal starts today · `opp-01-04-deal-timeline.png`.
- **Suspected landing:** `src/sales/views/opportunity.view.ts` `deal_timeline` (`startDateField: 'created_at'`, `endDateField: 'close_date'`); a deal needs a stored open date (seeded too), or the timeline should start at `stage_entry_date` and skip closed deals.
- **Dedupe words:** deal timeline created_at reversed range, opportunity timeline start date.

### D5 — Recalling a large-deal approval re-submits it in the same second
- **Steps:** as na.rep, raise Bluepeak Robotics Inc – 2026-10-27 to 120,000 (the deal goes to Large Deal Approval and locks) → **Recall** above the title → confirm.
- **Expected:** the dialog's own words: "Approvers can no longer act on it and the record is unlocked."
- **Actual:** request `areq_f168…` is recalled at 13:15:42.407 and a new pending request `areq_407e…` is created at 13:15:42.477; the page stays "Locked for approval" with Edit disabled. The rep can never take a large deal back to edit it · `opp-05-locked-header.png`, `opp-06-recall-dialog.png`, `opp-06-after-recall-page.png`.
- **Suspected landing:** `src/sales/flows/opportunity-approval.flow.ts` start condition — its comment says it gates on crossing the threshold, but the condition only checks `amount >= 100000` and `approval_status` not_required/null, so the recall's own write (status back to not_required) re-fires it. Either the flow needs a previous-value check, or the platform's recall write should not re-trigger record flows.
- **Dedupe words:** recall approval resubmits, opportunity_approval crossing, locked for approval after recall.

### D6 — The "Update Stage" button in the opportunity header fails on every selection
- **Steps:** Opportunities → any tab → tick 2 rows → **Update Stage** in the header toolbar; then with no rows ticked.
- **Expected:** `mass_update_stage` is the one aggregate bulk action: the whole selection in one dispatch.
- **Actual:** with 2 rows: "This action runs on a single record — select exactly one row."; with 0 rows: the dialog opens and targets nothing. Only the bulk-bar copy in Open Deals works (OPP-011) · `opp-13-mass-stage-two-open.png`, `opp-13-mass-stage-none.png`.
- **Suspected landing:** `src/sales/actions/opportunity.actions.ts` (`locations: ['list_toolbar']`) together with how the console dispatches a `list_toolbar` action (as single-record); dropping the toolbar location may be enough, since the view's `bulkActionDefs` already carries it.
- **Dedupe words:** mass update stage toolbar single record, list_toolbar aggregate action.

## UI / UX suggestions (kept apart from defects)

| # | Where | Today | Proposed | Who benefits | Screenshot |
| --- | --- | --- | --- | --- | --- |
| S1 | Lead record path | Unqualified is drawn as a fifth step *after* Converted, so the bar reads New → … → Converted → Unqualified; the steps are not clickable | Show Unqualified as an alternative end (split last step or badge), and let a click on a step propose that status | reps reading where a lead stands | `lea-03-record-qualified-details.png`, `lea-08-convert-new-3-after.png` |
| S2 | Converted lead | Edit stays offered; a rep fills the whole form, then gets "Cannot edit converted lead", shown twice (toast and banner) | Replace Edit on a converted lead with links to the account / contact / opportunity it became; show the error once | reps | `lea-09-converted-lock-result.png` |
| S3 | After Convert Lead | the dialog closes back onto the lead; the created account, contact and opportunity are only in the collapsed "Conversion" section further down | End the wizard on a result panel with three cards linking to the created records | reps | `lea-08-convert-new-3-after.png`, `lea-08-convert-new-5-*` |
| S4 | Create Lead form | Salutation takes the first half-row so Last Name sits alone at full width; Lead Score shows "0 / 5" with no hint that blank means auto-score | Put Salutation / First / Last on one row; hint "leave empty to score automatically" | anyone entering leads | `lea-04-new-form.png` |
| S5 | Add to Campaign | a rerun on leads already in the campaign still says "Succeeded 2 / 2"; picker options repeat the code ("CPG-0006 - …" and "Campaign Code: CPG-0006") | Report "0 added, 2 already members"; drop the repeated code line | marketing / sales ops | `lea-18-campaign-rerun-5-after.png`, `lea-17-campaign-2-options.png` |
| S6 | Public Contact Us form | unbranded page with a blue Submit (console brand is orange); Description placeholder in a monospace font; errors as a toast plus a banner but no field highlighted; Annual Revenue shows "0.00" that looks like a value | Brand header/colour, normal font, per-field error highlight, empty placeholder | prospects, marketing | `lea-19-webform-2-empty-submit.png` |
| S7 | Lead company → account / opportunity names | a company typed with extra spaces ("Bluepeak   Robotics  Inc") is copied verbatim into the account name and the opportunity name | Collapse whitespace on the company before it becomes a name (the match key already does) | data quality | `lea-08-convert-new-2-wizard-opp.png` |
| S8 | App navigation | for the admin, the Service group sits above Sales in a sales-first app; for a sales rep the Service group holds only "Knowledge" | Put Sales first; fold a lone Knowledge link into another group | everyone | `00-hotcrm-landing.png`, `lea-04-na-rep-landing.png` |
| S9 | KPI number formats | Executive Overview shows "1,290,000" (no currency, no decimals); Sales Home shows "1,220,000.00" (decimals, no currency) | One currency format with a symbol, no cents on KPI tiles | managers | `00-hotcrm-landing.png`, `lea-04-na-rep-landing.png` |
| S10 | Accounts list tabs | "My Accounts" — a rep's working queue — is pushed into the "1 more" overflow behind Account Cards and Accounts by Location (the ordering `lead.view.ts` already corrected for leads) | Put My Accounts and At-Risk before the presentation views | reps, CSMs | `acc-01-05-my-accounts.png` |
| S11 | Duplicate account name | "A record with this value already exists" does not say which field or link the existing account | "An account named Acme Corporation already exists" with a link | anyone creating accounts | `acc-04-dup-name-result.png` |
| S12 | Account highlights | the strip repeats Account Name under the title; tier, health, revenue are further down | Use the strip for Customer Tier, Health Score, Annual Revenue, open pipeline | account managers | `acc-02-record-acme-details.png` |
| S13 | Opportunity Funnel by Owner → Stage | the chart is one bar per stage for all owners together, so the "per-rep" funnel is only in the table, where the owner name repeats on each row | Group or colour bars by owner; group table rows | sales managers | `rpt-opportunity-funnel-by-owner-stage.png` |
| S14 | Account record page | Delete exists only in the list row menu; the record "…" menu has only favourites / new tab / copy link | Offer Delete (with the same guard) on the record page too | admins | `acc-02-*`, `acc-09-delete-acme-1-rowmenu.png` |
| S15 | Contacts list | first column "Profile Picture" is "—" on every row; the Account column repeats the group header and is truncated as "ACC-000001 - Acme Corp…" | Drop the empty avatar column (or show initials); show the account name without its number | everyone browsing contacts | `con-01-01-all-contacts.png` |
| S16 | Create Contact form | the required Email sits on the third tab (Contact Info); Create jumps there with "Email is required" | Put Email (and Phone) on the first tab | anyone creating contacts | `con-08-new-form.png`, `con-08-missing-email-other-tab.png` |
| S17 | Send Email action | dialog says "Please provide the required information to continue.", button "Confirm", and the recipient is not shown | Title "Email Owen Becker", show To:, button "Send" | reps | `con-07-send-email-form.png` |
| S18 | Discussion / history | system entries read "Account Owner: ∅ → Dev Admin" | Plain words: "Account owner set to Dev Admin" | everyone | `acc-14-discussion-posted.png` |
| S19 | Opportunity under approval | the lock shows as orphan "Recall" / "Reply" buttons above the title and a small "Locked for approval" badge with no reason; nothing told the rep that the save (or a line item that pushed the amount past 100K) sent the deal to approval | On the save that submits, toast "Sent to Sales Manager for approval (over 100,000)"; one banner naming the process, approver and what Recall does | reps | `opp-05-locked-header.png`, `opp-06-after-recall-page.png` |
| S20 | Opportunity rail and Related tab | the rail reads "+3 empty (Quotes · Opportunity Line Items …)"; Related accordions close each other, and the line-item New is hidden in the collapsed "Products" accordion | Name it "Products" consistently, keep one accordion open by default, put "Add product" in the header | reps | `opp-02-record-tab-related-5.png`, `opp-15-related-tab.png` |
| S21 | Closed-deal edit error | "closed_won; only description, next_step, notes may be edited. Attempted: amount." | "This deal is Closed Won. Only Description, Next Step and Notes can change." | reps | `opp-10-closed-freeze-result.png` |
| S22 | Closing from an early stage | three toasts stack (updated, the stage-transition warning, the account promotion) | One toast; skip the transition warning when the target is a closed stage the rules allow | reps | `opp-09-won-result.png` |
| S23 | Line items | Quantity "1.00", Total "50,000" (no decimals), Sales Price "9,000.00" side by side | Quantity as an integer, all money with one format | reps, finance | `opp-15-line-created.png` |
| S24 | Lookups everywhere | every lookup shows the record number first ("ACC-000002 - Globex Industries"), which truncates the name in lists | Show the name, keep the number as secondary text in the picker | everyone | `opp-01-01-all-opportunities.png` |
| S25 | Private record denied | sales.manager opening a private deal's link sees "The record you are looking for does not exist or may have been deleted." | "You don't have access to this record" (if leaking existence is acceptable) | managers | `opp-16-private-mgr-record.png` |
| S26 | Line item form | picking a product shows no list price; the price appears only after save | Fill List Price / Sales Price in the form on pick | reps | `opp-15-line-after-product.png` |
| S27 | Opportunity tabs | "My Open Deals" sits in the overflow for the admin, behind presentation views | Put My Open Deals right after Open Deals | reps | `opp-01-06-my-open-deals.png` |
| S28 | Clone Opportunity | no confirm and no toast; the user lands on the copy without being told | Toast "Copied — this is the new deal" with a link back | reps | `opp-07-clone-after.png` |
| S29 | Sales Home on a phone | four KPI tiles one per row fill the whole first screen; the tab strip below runs off the edge | Two tiles per row on phones; scroll cue or wrap on the tab strip | reps on the move | `phone-01-sales-home.png` |
| S30 | Contact list on a phone | the grouped table is kept, so the name is cut and an empty Profile Picture column comes first | Use the card layout the lead / account / opportunity lists already switch to | reps on the move | `phone-07-contact-list.png` |
| S31 | Pipeline kanban on a phone | opens on the first stage even when it is empty | Open on the first stage with cards, or show counts in the page dots | reps | `phone-09-opp-kanban.png` |
| S32 | Opportunity path on a phone | 7 steps run off the right edge with no scroll cue (the lead's 5 steps fit) | Show current step ± 1 with arrows, or a compact "Needs Analysis · 3 of 7" | reps | `phone-10-opp-record.png` |

## Test data: reverts and what is left

- Reverted and re-read: seeded opportunity stages put back to prospecting after the bulk Update Stage; "Territory Probe na" account deleted; Initech Cloud Migration un-ticked Private (`is_private: false` read back as sales.manager); Northwind Grid Modernization — the approval its line item triggered was rejected by sales.manager, the line item deleted, amount read back 86,500.
- Left in place (this local SQLite only, nothing shared): test leads, imported leads / accounts / contacts and the records conversions created; Bluepeak Robotics Inc – 2026-10-27 approved and Closed Won; "Copy of Globex Manufacturing Suite"; Northwind Grid's `approval_status` stays `rejected` (a PATCH to `not_required` is accepted with 200 and silently ignored — the field is system-owned).
- Observation, not a defect: every bulk update logs `405 POST /api/v1/data/<object>/updateMany` before the console falls back to per-record writes; the result is right.
