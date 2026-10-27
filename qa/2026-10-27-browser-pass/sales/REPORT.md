# #2320 browser pass — track 1 (CRM · Sales)

> Work in progress: pushed after each inventory prefix. Sections still marked `(in progress)` are not final.

- **Tested sha:** hotcrm `main` `1f3f888` (`@objectstack/*` 18.2.0), checked again after the 09:36Z worker restart: `origin/main` still `1f3f888`.
- **Boot:** `pnpm install --frozen-lockfile` exit 0 · `pnpm dev` healthy on `:4001` (44 plugins, seed settled in background) · `pnpm demo:staff` exit 0 (na.rep, eu.rep, sales.manager, service.agent, service.manager).
- **Browser:** preinstalled Chromium via `require('playwright')`, desktop 1440×900, phone 390×844 (`isMobile`, touch).
- **Personas used:** dev admin (`admin@objectos.ai`), sales rep Nina Reyes (`na.rep`), anonymous visitor (web-to-lead). Sales manager / eu.rep where a row names them.
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
