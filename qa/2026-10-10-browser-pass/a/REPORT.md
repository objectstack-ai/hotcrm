# HotCRM 4.0.1 browser pass: group A (sales: LEA · ACC · OPP)

Card: objectstack-ai/hotcrm#2058 · tester session for group A · evidence branch `claude/qa-browser-pass-a` (never merged)

## Header

| | |
| --- | --- |
| Base | `main` @ `1d7148bf2d3a9890812786d9924da1a0843f6bbe` (`chore(release): 4.0.1 (#2056)`) |
| Install / build | `pnpm install --frozen-lockfile` ✓ · `pnpm build` ✓ (artifact `dist/objectstack.json` 2343.6 KB; 14 views, 8 pages, 5 dashboards, 10 reports, 31 actions, 32 flows) |
| Server | `nohup pnpm dev > /tmp/dev.log 2>&1 &` → `objectstack dev -p 4001`, fresh DB under `.objectstack/data`; `/api/v1/health` returned 200 after ≈10 s. No `NODE_MODULE_VERSION` flood, no rebuild needed. |
| Admin login | `admin@objectos.ai` / `admin123`, signed in through the real login form |
| `pnpm demo:staff` | **exit 0**. 5 personas created (na.rep / eu.rep / sales.manager / service.agent / service.manager, all `demo1234`); 21 rule grants; na.rep sees 6 accounts, eu.rep 2, the others 9. |
| Personas used | admin (Dev Admin) · `na.rep@objectos.ai` (Nina Reyes, sales rep) · `sales.manager@objectos.ai` (Marta Quinn) · `eu.rep@objectos.ai` (Emil Roth, visibility only) · `service.agent@objectos.ai` (Priya Raman) · anonymous (web-to-lead) |
| Browser | Playwright `@playwright/test` 1.63.0 driving the preinstalled Chromium 141.0.7390.37 (`/opt/pw-browsers/chromium-1194`), headless, viewport 1440×900 |
| Start / end | 2026-10-10 17:53 UTC → 18:55 UTC |
| Data created | Everything is prefixed `QA-A ` except one account, "Skyline Media", which the sales-manager conversion of the seeded lead *Theo Park* created. |

Method: every claim below was checked twice: once with a settled screenshot (after `networkidle` plus a 2–4 s wait), and once against the server's own answer (the REST call the page made, `/api/v1/meta/...`, `/api/v1/data/...`, or the dev-server log).

## Coverage

Totals: **54 rows: 37 pass · 13 fail · 0 not reachable · 4 not tested**

| inventory id | result | note |
| --- | --- | --- |
| LEA-001 | pass | List, record and form work. Rating renders as a plain number, see A-03. Default grid ignores the view's column labels, see A-02. |
| LEA-002 | **fail** (A-05) | `new→qualified` allowed. `qualified→new` saved with "Lead updated successfully". The warning-level `lead_status_progression` violation only reaches the server log. |
| LEA-003 | pass | The form blocks Unqualified without a reason. Duplicate without survivor is refused by the form and by `PATCH` (`VALIDATION_FAILED`, rule text verbatim). |
| LEA-004 | pass | Unrated corp-email + phone + "VP" title lead scored 3, matching the hook's weights. An explicit 5 was kept. A spoofed 5 on the public form was recomputed to 1. |
| LEA-005 | **fail** (A-08) | Ownerless web-to-lead submission stayed `owner_id: null` with 2 `sales_rep` holders staffed. UI-created leads correctly keep their creator. |
| LEA-006 | **fail** (A-07, A-09) | The documented `/forms/contact-us` is a 404. The form works at `/_console/f/contact-us`: submit gives "Thank you!" and the lead lands `status=new, lead_source=web`. Spoofed `owner_id / is_converted / status / duplicate_status / rating` were all stripped. |
| LEA-007 | pass | `QA-A.DUPE@Example.COM` stored lowercased. A lead re-using a contact's email got `duplicate_status=suspected`, `duplicate_of_contact=<Olivia Chen>`, and the "Suspected duplicate" banner. |
| LEA-008 | pass | Editing Company on a converted lead → toast "Cannot edit converted lead … (attempted: company)", `409 RECORD_LOCKED`. |
| LEA-009 | pass | Qualifying a lead created the task "Follow up with qualified lead: …", priority high, due +2 d, assigned to the owner. |
| LEA-010 | **fail** (A-01, A-06) | Admin and manager conversions work: account/contact reused by name/email, deal created, inbox "Lead converted". Blank amount → partial conversion (A-01). The sales rep cannot convert into a new account (A-06, p1). |
| LEA-011 | pass | Rating 3 → follow-up +3 d plus "New lead to assign". Rating 5 → +1 d plus "Hot lead — assign within 24h". The flow errors only for ownerless leads (A-08). |
| LEA-012 | pass | Created a task with my subject and due date 2026-10-20, and set the lead's `next_followup_date=2026-10-20`. No success toast (see "worth knowing"). |
| LEA-013 | **fail** (A-10) | The single-row path offers a record picker. The selection-bar bulk path renders Campaign as a raw-ID text box; with a pasted ID it inserted 2 members. |
| LEA-014 | pass | All 8 views render. Hot Leads / High Priority = 5, which matches the server (rating≥4 ∧ status∈{new,contacted}). Kanban, calendar, gallery and Suspected Duplicates (with empty state) all work. |
| LEA-015 | pass | All 7 named forms render (tabbed/wizard/split/drawer/modal/public/conditional), but only via `/_console/forms/crm_lead.<name>`, with no in-app navigation (comment in `lead.view.ts` says so). |
| LEA-016 | pass | Header: Convert, Schedule Follow-up, Log a Call, plus Log/Schedule a Meeting under "…". Highlights strip, 5-stage path, and Details/Related/Activity/History tabs. |
| LEA-017 | not tested | No LLM provider or agent in this environment: `GET /api/v1/ai/agents` → `{"agents":[]}`. The skill `lead_qualification` is registered (`/api/v1/meta/skill`). |
| LEA-018 | **fail** (A-11) | Choosing the shipped "Lead Import (CSV)" mapping fails every row with `MAPPING_FORMAT_MISMATCH`. Manual mapping loses the synonym table ("Working"/"Open" rejected). |
| LEA-019 | pass | "Lead Engagement by Month × Source" matrix renders: 20 contacted leads, 6 sources × 7 months. |
| ACC-001 | pass | List, record, 5-tab form, attachments tab and logo upload control all present. |
| ACC-002 | pass | Creating "Acme Corporation" again → `409 UNIQUE_VIOLATION`, toast "A record with this value already exists". `name_normalized` = `qa-a pending account ltd`. |
| ACC-003 | pass | Country `US` on a new account → `billing_country=US`, `territory=na` ("North America"). |
| ACC-004 | pass | Bad URL and negative revenue blocked in the form and by the API (`VALIDATION_FAILED`, the hook's messages). Deleting customer Vertex → `409 DELETE_RESTRICTED`. The inventory wording is stale (A-12). |
| ACC-005 | pass | Log a Call on an account moved `last_activity_date` from `null` to `2026-10-10`. |
| ACC-006 | **fail** (A-12, A-13) | 6 tabs work: All, Cards, Map, Enterprise (4 = rev ≥10M), My, At-Risk (2 = customer ∧ at_risk/churning). The 7th, a renewals tab, is promised by the inventory but was removed in #1181. The map shows 0 markers. |
| ACC-007 | pass | `/page/account_workbench`: only Industry/Type/Account Owner quick filters, no New, no view tabs. |
| ACC-008 | pass | Header has the 3 activity actions. Discussion: comment posted, the `@` mention picker offered "Marta Quinn", and the feed shows system changes. |
| ACC-009 | **fail** (A-16) | Object works, but email "tenant-unique" is not enforced against seeded contacts. |
| ACC-010 | **fail** (A-16) | Lowercasing works. Global dedupe missed a seeded contact's email. The delete guard works (`409 DELETE_RESTRICTED`, copy nit A-17). |
| ACC-011 | pass | "Mark as Primary Contact" → confirm → "Contact marked as primary!"; the action then disappears. Multiple primaries remain possible (A-15). |
| ACC-012 | pass | Send Email wrote `sys_email` (status `sent`, to the contact, subject/body as typed), a `sys_activity` row, and `last_contacted_date`. |
| ACC-013 | pass | Creating a contact raised the "New contact: … Reach out to welcome them." toast and inbox item for the owner. |
| ACC-014 | pass | Grouped-by-account default list, People Directory gallery, Primary Contacts view. The view currently equals all 11 contacts (A-15). |
| ACC-015 | **fail** (A-11) | "Account Import (CSV)" mapping fails the same way (`crm_account_import` declares csv, payload json). |
| ACC-016 | not tested | No LLM/agent in this environment (see LEA-017). Skill `customer_360` registered. |
| ACC-017 | not tested | No LLM/agent in this environment. Skill `email_drafting` registered. |
| ACC-018 | pass | "Accounts by Industry and Type" matrix and the 4-panel "Customer Churn Signals" render with data. |
| OPP-001 | pass | Created "QA-A Big Deal" via the form. Stage is not preselected (A-20). |
| OPP-002 | pass | Closed Won without Win Reason → "Please check the highlighted fields: Win Reason". Kanban drop on Closed Lost asks for Loss Reason. |
| OPP-003 | pass | Kanban move to Qualification → probability 25, expected 6,250 (25,000×0.25), forecast `pipeline`. Closed Won → 100 / `closed`. |
| OPP-004 | pass | `stage_entry_date` reset to today on every stage change. The Stale view shows "Days in Current Stage". |
| OPP-005 | pass | Editing the amount of a won deal → "… is closed (closed_won); only description, next_step, notes may be edited", `409 RECORD_LOCKED`. |
| OPP-006 | pass | Winning "Northwind Grid Modernization" promoted Northwind Energy `prospect→customer` and created "Activate new customer…", due +3 d, for the deal owner. |
| OPP-007 | pass | Adding 2 lines changed amount 25,000 → 44,000 → 47,000 (2×22,000 + 3×1,000). |
| OPP-008 | **fail** (A-21) | Server side works: `list_price` stamped 22,000, empty `unit_price` defaulted on API insert, negotiated 1,000 kept. The UI form makes Sales Price required with no prefill, so the default is unreachable from the console. |
| OPP-009 | **fail** (A-19) | Drag works as admin and as na.rep (stage saved, derived fields follow). Column headers show a count but no amount total despite `summarizeField: 'amount'`. |
| OPP-010 | **fail** (A-18) | 10 tabs render with plausible counts (Open 12, All 25, Closing This Quarter 6…). Deal Timeline shows the header "[OBJECT OBJECT] 25" and no per-owner grouping. |
| OPP-011 | pass | Selection-bar "Update Stage" on 2 deals → confirmation lists names → "Succeeded 2 / 2". All-or-nothing not exercised: the All Opportunities selection bar offers only Delete. |
| OPP-012 | pass | Clone → "Copy of QA-A Rocket Deal", `prospecting`, same account/contact/amount, close date 2027-01-08 (+90 d). |
| OPP-013 | not tested | Scheduled daily 07:30 sweep; the session ran 17:53–18:55 UTC and there is no user-facing "run now". |
| OPP-014 | pass | Winning the $150K "QA-A Big Deal" → owner inbox "Large deal won: QA-A Big Deal". |
| OPP-015 | pass | The rep set Private via Edit. The sales manager and eu.rep then get the list without it, "Record not found" on the page, and API `404 RECORD_NOT_FOUND`. The admin (platform admin) still sees it. |
| OPP-016 | pass | Header: Generate Quote / Clone / Log a Call (+ meetings). 7-stage path. Related: Quotes / Products / Open Tasks plus the reference rail. The approval panel shows the 2-step chain. |
| OPP-017 | pass | All 4 reports render: by stage (excludes closed_lost by design), won by owner, coverage matrix, funnel. |

End-to-end extras:

- **Lead conversion wizard as admin**: pass once an amount is entered (A-01 otherwise). **As sales rep**: blocked for any new company (A-06); works when the account already exists (Acme). **As sales manager**: pass (new account "Skyline Media").
- **Anonymous web-to-lead** (`/_console/f/contact-us`, logged out): submit works. URL, title and assignment defects are A-07, A-09 and A-08.
- **Opportunity kanban drag**: pass for admin and na.rep; header totals missing (A-19).
- **Account approval (REQ-0003)**: pass. Account created by na.rep was born `approval_status=pending` with "In approval · editable" and a Recall button. The sales manager saw Approve/Reject/Reassign/Send back/Request info; Approve → "Approved." → `approved`, and the feed shows "Approval Status: Pending → Approved". A $150K deal likewise opened "Large Deal Approval (on create)" and was locked until the manager approved.

## Findings

### A-01 — Lead conversion: "Opportunity Amount" is optional on the screen but required on the deal, so a blank amount leaves a half-converted lead
- Inventory: LEA-010 · Persona: admin · URL: `/_console/apps/app.objectstack.hotcrm/crm_lead/record/wN40vsd8d1mW_oXe`
- **Steps**
  1. Open lead "QA-A HotLead" (no Estimated Amount), click **Convert Lead**.
  2. Tick **Create Opportunity?**. Name and Close Date are prefilled; **Opportunity Amount** has no `*` and is empty.
  3. Click **Submit**.
- **Expected**: either the screen requires the amount (as it does Close Date, for the same reason; see the comment at `lead-conversion.flow.ts:150-164`) or the conversion is all-or-nothing (LEA-010: "回写转化字段").
- **Actual**: the dialog shows "Node 'create_opportunity' failed: create_record(crm_opportunity) failed: Amount is required". By then account "QA-A Rocket Corp" and contact "QA-A HotLead" were already created, and the "New contact" toast fired. The lead stays `status=new, is_converted=false, converted_account=null`. Re-running with an amount succeeded and reused both records, so it is recoverable, but a user who closes the dialog is left with orphan records.
- **Evidence**: `A-01-convert-screen-amount-optional.png`, `A-01-convert-opp-amount-not-required.png`. Server log: `WARN Insert operation failed {"object":"crm_opportunity","error":{"message":"Amount is required"…`. The data API afterwards showed the new account `O1HsK9vfgxVatRwD` and contact `7SbQDFldsnUqbMZH` with the lead unchanged.
- **Owner**: `hotcrm src/sales/flows/lead-conversion.flow.ts:133`. `opportunityAmount` lacks `required: true` while `crm_opportunity.amount` is required. The non-transactional node chain belongs to the platform flow engine (`@objectstack/automation`), worth a note.
- **Severity guess**: p2
- **Dedupe words**: `create_opportunity`, `Amount is required`, `opportunityAmount`, `lead_conversion`, `Create Opportunity?`

### A-02 — Lead default grid ignores the view's column labels
- Inventory: LEA-001, LEA-014 · Persona: admin · URL: `/_console/apps/app.objectstack.hotcrm/crm_lead`
- **Steps**: open Leads (All Leads).
- **Expected**: the headers the view declares: Name, Score, Source, Est. Amount, Owner (`src/sales/views/lead.view.ts:142-198`). The server ships them: `GET /api/v1/meta/view?object=crm_lead` → `crm_lead.all_leads.columns[0] = {"field":"full_name","label":"Name",…}`.
- **Actual**: the field labels are shown instead: Full Name, Lead Score, Lead Source, Estimated Amount, Lead Owner.
- **Evidence**: `A-02-lead-grid-column-labels.png`. The meta excerpt is above; the en-US i18n bundle has `_views.all_leads.label` but no column entries.
- **Owner**: console (objectui). The server sends the labels and the grid renders the field/i18n label over the view's explicit column label.
- **Severity guess**: p3
- **Dedupe words**: `all_leads`, `Est. Amount`, `column label`, `Lead Score`

### A-03 — `rating` (star) fields render as a bare number and edit as a plain text box
- Inventory: LEA-001 ("1–5 整星评分") · Persona: admin · URLs: lead list, lead record, lead create form
- **Steps**: open any lead; open **New** lead.
- **Expected**: star display/input. The field is `type: "rating", max: 5` (meta) and the form asks for `widget: 'star_rating'` (`lead.view.ts:288-290`).
- **Actual**: grid, highlights strip and Details show "4". The create/edit form shows an empty text input under "Lead quality score (1-5 stars)". The drawer form shows a 0–5 slider.
- **Evidence**: `A-03-rating-plain-number.png`, `A-04-lead-owner-required.png` (same dialog, Lead Score box). `GET /api/v1/meta/object/crm_lead` → `rating: {"type":"rating","max":5,…}`.
- **Owner**: console (objectui). Correct type and widget hint are sent but not rendered.
- **Severity guess**: p3
- **Dedupe words**: `star_rating`, `rating`, `Lead Score`, `1-5 stars`

### A-04 — Create Lead form forces a manual Lead Owner pick (required, no default)
- Inventory: LEA-001 / LEA-005 · Persona: admin, na.rep · URL: `/_console/apps/app.objectstack.hotcrm/crm_lead?form=new`
- **Steps**: New lead, fill name/company/email, click **Create**.
- **Expected**: the creator becomes owner. `lead.hook.ts:41-43`: "UI-created leads already carry `owner_id` = creator (the middleware's insert-time stamp)". The object field is `required: false`.
- **Actual**: "Please check the highlighted fields: Lead Owner" / "Lead Owner is required"; the user must search for themselves.
- **Evidence**: `A-04-lead-owner-required.png`.
- **Owner**: `hotcrm src/sales/views/lead.view.ts:293-296`. `{ field: 'owner_id', required: true }` in the default form overrides the stamp-on-insert design.
- **Severity guess**: p3
- **Dedupe words**: `Lead Owner is required`, `owner_id`, `Create Lead`

### A-05 — Warning-level state-machine violations never reach the user
- Inventory: LEA-002 (and OPP-002's `opportunity_stage_progression`, same mechanism) · Persona: admin · URL: lead record `wN40vsd8d1mW_oXe`
- **Steps**: lead at **Qualified** → Edit → Status **New** → Save.
- **Expected**: the declared warning "Invalid lead status transition" is shown (`lead.object.ts:611-628`; inventory LEA-002 "转换表(warning 级)").
- **Actual**: toast "Lead updated successfully". `PATCH /api/v1/data/crm_lead/:id` → 200 with keys `object,id,record` and no warnings. The only trace is the server log: `WARN Validation rule 'lead_status_progression' (warning): Invalid lead status transition`.
- **Evidence**: `A-05-invalid-transition-silent.png`, the API response keys above, `/tmp/dev.log` lines 90-91.
- **Owner**: platform (`@objectstack/objectql` validation → REST response). Warning-severity results are logged but not returned, so no client can show them.
- **Severity guess**: p3
- **Dedupe words**: `lead_status_progression`, `Invalid lead status transition`, `warning`, `state_machine`

### A-06 — A sales rep cannot convert a lead into a new account: `annual_revenue` field-write denied
- Inventory: LEA-010 · Persona: **na.rep** (Nina Reyes) · URL: `/_console/apps/app.objectstack.hotcrm/crm_lead/record/z0dHSA53CAOk3C7b`
- **Steps**
  1. As na.rep, create lead "QA-A RepLead / QA-A Rep Widgets" (owner Nina).
  2. **Convert Lead**, tick Create Opportunity (amount prefilled 42000), **Submit**.
- **Expected**: account + contact + deal created (LEA-010; the rep is the converting persona per REQ-0005 and the action's own comments).
- **Actual**: "Node 'create_account' failed: create_record(crm_account) failed: [Security] Field write denied: not permitted to edit [annual_revenue] on 'crm_account'". Nothing is created; the lead stays New. The same rep converting a lead whose company already exists (Acme Corporation) succeeds, because that path skips `create_account`. Admin and sales manager convert new companies fine.
- **Evidence**: `A-06-rep-convert-annual-revenue-denied.png`. The flow's `POST` returned 400 with the error above.
- **Owner**: `hotcrm src/sales/flows/lead-conversion.flow.ts:430`. `create_account` always writes `annual_revenue: '{leadRecord.annual_revenue}'` (even null), while `src/sales/profiles/sales-rep.profile.ts:109` makes `crm_account.annual_revenue` non-editable for reps.
- **Severity guess**: **p1** (core flow blocked for the primary persona; workaround is asking an admin or manager)
- **Dedupe words**: `Field write denied`, `annual_revenue`, `create_account`, `crm_account.annual_revenue`, `sales_rep`

### A-07 — The documented public form URL `/forms/contact-us` is dead; the working one is `/_console/f/contact-us`
- Inventory: LEA-006 · Persona: anonymous · URLs: `/forms/contact-us`, `/_console/forms/contact-us`
- **Steps**: logged out, open `http://localhost:4001/forms/contact-us`, then `/_console/forms/contact-us`.
- **Expected**: the anonymous form at `/forms/contact-us` (`docs/feature-inventory.md:49`; `src/sales/views/lead.view.ts:886` "hosted at `/forms/contact-us`", `:941` `publicLink: '/forms/contact-us'`).
- **Actual**: `/forms/contact-us` → `{"success":false,"error":{"code":"ENDPOINT_NOT_FOUND","message":"Not found"}}`. `/_console/forms/contact-us` → redirect to `/_console/login?redirect=%2Fforms%2Fcontact-us`. The real anonymous route is `/_console/f/contact-us` (console route `/f/:slug`, data from `GET /api/v1/forms/contact-us` → 200).
- **Evidence**: `A-07-forms-contact-us-404.png`, `A-07-console-forms-contact-us-login.png`, `overview-w2l-public-form.png`.
- **Owner**: `hotcrm src/sales/views/lead.view.ts:941` + `docs/feature-inventory.md:49` (publish the real path), or platform/console if `publicLink` is meant to be served as-is.
- **Severity guess**: p2 (a website embedding the documented link gets a 404)
- **Dedupe words**: `/forms/contact-us`, `publicLink`, `ENDPOINT_NOT_FOUND`, `/f/contact-us`, `web_to_lead`

### A-08 — Web-to-lead submissions are never auto-assigned, and the routing flow then errors
- Inventory: LEA-005, LEA-011 · Persona: anonymous submitter; admin to inspect · URL: lead `Q0CR3GdQ6SaM_U3N` ("QA-A WebVisitor")
- **Steps**: after `pnpm demo:staff` (2 holders of `sales_rep`), submit `/_console/f/contact-us` logged out.
- **Expected**: owner = the least-loaded sales rep, then a hot-lead alert to that rep (`lead.hook.ts` `lead_auto_assign`: anonymous web-to-lead is "the exact case this hook exists for").
- **Actual**: the lead is saved with `owner_id: null` (record page has no Lead Owner in highlights). Server log: `ERROR Trigger-fired run of flow 'lead_assignment' failed … Node 'notify_hot' failed: notify: at least one recipient is required, but every recipient template resolved to nothing: {record.owner_id}`. The same happened for a second submission (log line 259). The hook's `catch {}` (lead.hook.ts:72-110) swallows the anonymous context's denied `sys_user_position` read, and the comment's "a manager / the lead_assignment flow routes it" fallback does not exist.
- **Evidence**: `A-08-web-lead-no-owner.png`. `GET /api/v1/data/crm_lead?sort=-created_at&top=1` → `"owner_id":null,"rating":4,"lead_source":"web"`. `/tmp/dev.log` lines 257, 259.
- **Owner**: `hotcrm src/sales/objects/lead.hook.ts:72-110` (the pool lookup needs a system-context read on the public-form path) and `src/sales/flows/lead-assignment.flow.ts:68` (`notify_hot` has no fallback recipient for ownerless leads). It may need a platform hook API for elevated reads.
- **Severity guess**: p2
- **Dedupe words**: `lead_auto_assign`, `notify_hot`, `at least one recipient is required`, `owner_id: null`, `lead_assignment`

### A-09 — The public lead form is titled with the raw API name "crm_lead" and shows editor hints to visitors
- Inventory: LEA-006 · Persona: anonymous · URL: `/_console/f/contact-us`
- **Steps**: open the public form.
- **Expected**: a human title ("Contact us" / the object label "Lead"). Visitors should not see developer annotations.
- **Actual**: the page heading is `crm_lead`. The Description field shows "Format: markdown" and "Rich text editor (basic)". The standalone named forms are likewise titled `crm_lead.split_edit` etc.
- **Evidence**: `A-09-w2l-title-crm_lead.png`. `GET /api/v1/forms/contact-us` → `{"slug":"contact-us","object":"crm_lead","form":{…}}` with no label/title.
- **Owner**: console (objectui) falls back to the object API name rather than its label. hotcrm `src/sales/views/lead.view.ts:893` could also give `web_to_lead` a `label`.
- **Severity guess**: p3
- **Dedupe words**: `crm_lead`, `contact-us`, `Format: markdown`, `Rich text editor (basic)`

### A-10 — Bulk "Add to Campaign" (selection bar) asks for a raw campaign ID instead of a record picker
- Inventory: LEA-013 ("记录选择器选活动") · Persona: admin · URL: `/_console/apps/app.objectstack.hotcrm/crm_lead`
- **Steps**: tick 2 leads → selection bar **Add to Campaign**.
- **Expected**: the record picker the action declares (`src/sales/actions/lead.actions.ts:241-251`, field-backed param `crm_campaign` on `crm_campaign_member`). The single-row/header path does render it, listing "CPG-0007 - Developer Content Marketing Push …".
- **Actual**: `<input id="bulk-param-crm_campaign" type="text">` with Next disabled until something is typed. Pasting a campaign id (`QP62T83yjE5x9l5G`) worked: the confirm page listed "Affected records (2): • 3v5Ow… • KfkSC…" (raw ids) and 2 `crm_campaign_member` rows were inserted. No success toast.
- **Evidence**: `A-10-bulk-campaign-textbox.png`, `A-10-bulk-campaign-confirm-raw-ids.png`.
- **Owner**: console (objectui). The bulk-param renderer ignores `field` + `objectOverride` that the single-record renderer honours.
- **Severity guess**: p2
- **Dedupe words**: `bulk-param-crm_campaign`, `Add to Campaign`, `create_campaign`, `objectOverride`

### A-11 — Import wizard + shipped mappings: every row fails with `MAPPING_FORMAT_MISMATCH`
- Inventory: LEA-018, ACC-015 · Persona: admin · URL: Leads → **Import**, Accounts → **Import**
- **Steps**: upload a 2-row CSV → in "Saved mapping" choose **Lead Import (CSV)** → Next → **Import 2 Rows**.
- **Expected**: rows mapped by `crm_lead_import` (upsert on email, "Working"→contacted, etc., `src/sales/mappings/lead_import.mapping.ts`).
- **Actual**: "Import Complete · 0 imported · 2 skipped · Mapping "crm_lead_import" declares sourceFormat "csv" but the payload is "json"". The request was `POST /api/v1/data/crm_lead/import {"format":"json","rows":[{"First Name":"QA-A",…}],…}` → **400** `MAPPING_FORMAT_MISMATCH`. Identical for `crm_account_import`. Without the mapping (manual mapping, the default), the synonyms are lost: "Status: "Working" is not one of the allowed options", and the match mode defaults to "Always create new", not upsert.
- **Evidence**: `A-11-import-mapping-selected.png`, `A-11-import-mapping-format-mismatch.png`, `acc-import-step1.png`. The network excerpt is above.
- **Owner**: platform/console contract. The console wizard parses the CSV client-side and posts json, while `@objectstack` import enforces the mapping's `sourceFormat`. A repo workaround would change `sourceFormat` in `src/sales/mappings/*_import.mapping.ts`.
- **Severity guess**: p2
- **Dedupe words**: `MAPPING_FORMAT_MISMATCH`, `declares sourceFormat "csv" but the payload is "json"`, `crm_lead_import`, `crm_account_import`

### A-12 — Feature inventory is stale for ACC-004 and ACC-006
- Inventory: ACC-004, ACC-006 · Persona: admin
- **Expected vs actual**
  - `docs/feature-inventory.md:73` (ACC-006) promises "卡片/地图/大客户/我的/续约/风险 7 个 tab". There is no renewals tab: `src/sales/views/account.view.ts:185-189` says `renewals_due` was removed with its fields (#1181) and renewals now live on `crm_contract`. The UI shows 6 views.
  - `docs/feature-inventory.md:71` (ACC-004) says "有开放商机的 customer 禁止删除". The hook (since #2019) refuses on **any** opportunity, open or closed: "Cannot delete customer account: 3 opportunities, open or closed, still reference it."
- **Evidence**: `overview-accounts-list.png`, `acc-delete-customer-open-opps.png`.
- **Owner**: `hotcrm docs/feature-inventory.md:71,73`
- **Severity guess**: p3
- **Dedupe words**: `renewals_due`, `续约`, `ACC-006`, `open or closed`

### A-13 — "Accounts by Location" map has nothing to plot on the demo book
- Inventory: ACC-006 · Persona: admin · URL: `/crm_account/view/crm_account.account_map`
- **Actual**: "10 records with missing or invalid coordinates excluded from the map." Every seeded account has `office_location: null` (`GET /api/v1/data/crm_account?select=name,office_location` → all null) although `billing_address` is set. The base-map tile fetch also failed (`demotiles.maplibre.org` blocked by this sandbox's proxy; not counted as a defect).
- **Evidence**: `A-13-account-map-no-coordinates.png`.
- **Owner**: `hotcrm src/sales/data/sales.seed.ts` (seed no `office_location`) or a geocode-from-address step. The view binds `locationField: 'office_location'`.
- **Severity guess**: p3
- **Dedupe words**: `office_location`, `account_map`, `missing or invalid coordinates`

### A-14 — An approval decision leaves `updated_by` as the submitter
- Inventory: (REQ-0003 account approval) · Persona: sales.manager approving na.rep's account · URL: account `9Fe_5bAIDs0yHaG5`
- **Actual**: after Marta Quinn approved, the record footer says "Updated by Nina Reyes · just now" and the API has `updated_by = wjrqTjzS…` (Nina). `sys_activity` correctly records `actor_id=rEf70kQf…` (Marta) for "Approval Status: Pending → Approved", but the Discussion feed renders that actor as "System".
- **Evidence**: `A-14-approval-updated-by.png`, the API/`sys_activity` excerpt above.
- **Owner**: platform (approvals engine write path). The decision write does not stamp `updated_by` with the approver.
- **Severity guess**: p3
- **Dedupe words**: `updated_by`, `Approval Status: Pending → Approved`, `approval_status`

### A-15 — Several "primary" contacts per account; Primary Contacts view = everyone
- Inventory: ACC-011, ACC-014 · Persona: na.rep / admin
- **Actual**: converting a lead into existing account Acme Corporation added "QA-A AcmeBuyer" with `is_primary: true` next to John Smith (also primary). `mark_primary` sets the flag without clearing others. All 11 contacts are primary, so the "Primary Contacts" view lists 11 of 11.
- **Evidence**: `A-15-primary-contacts-all.png`. `GET /api/v1/data/crm_contact?select=full_name,is_primary` → 11/11 true.
- **Owner**: `hotcrm src/sales/flows/lead-conversion.flow.ts:473` (stamps `is_primary: true` even when reusing an account) and `src/sales/actions/contact.actions.ts:26` (no demotion).
- **Severity guess**: p3
- **Dedupe words**: `is_primary`, `Primary Contacts`, `mark_primary`

### A-16 — Contact email dedupe/uniqueness does not see the seeded contacts (they have `organization_id = null`)
- Inventory: ACC-009, ACC-010 · Persona: admin · URL: `/crm_contact?form=new`
- **Steps**: New contact, email `OLIVIA.CHEN@northwind.example.com` (seeded contact Olivia Chen's address), account QA-A Pending Account Ltd → **Create**.
- **Expected**: refusal "Another contact (Olivia Chen) with email … already exists." (`contact.hook.ts:97-125`, field `unique: true`).
- **Actual**: "Contact created successfully". Two contacts now hold `olivia.chen@northwind.example.com`. Root cause: every seeded `crm_contact` (and 21/21 seeded `crm_lead`, 23/23 seeded `crm_opportunity`) has `organization_id: null`, while seeded accounts carry the org. The hook's guard is scoped `{organization_id: <org>, email}`, and the composite unique index treats NULL as distinct. The lead dedupe (LEA-007) is not org-scoped and did match Olivia.
- **Evidence**: `A-16-duplicate-contact-email.png`. `GET /api/v1/data/crm_contact?select=full_name,email,organization_id` → `Olivia Chen … null` and `QA-A DupeContact … org_mv2p1w636e28so3x`.
- **Owner**: platform seed loader / seed-ownership claim (stamps owner but not `organization_id` on these objects) for the data. Also `hotcrm src/sales/objects/contact.hook.ts:97-99` if the guard should also match org-less rows.
- **Severity guess**: p2
- **Dedupe words**: `organization_id`, `Another contact`, `already exists`, `contact_integrity`, `olivia.chen@northwind.example.com`

### A-17 — Copy: "open opportunity(ies), 0 active quote(s)"
- Inventory: ACC-010 · Persona: admin · Delete contact Ethan Brooks
- **Actual**: toast "Contact Ethan Brooks is still referenced by 2 open opportunity(ies), 0 active quote(s), 0 active contract(s), so it cannot be deleted …". The repo's own rule (#721, quoted in `account.hook.ts:223-229`) is whole sentences per count, not parenthetical plurals.
- **Evidence**: `A-17-opportunity-ies-copy.png`.
- **Owner**: `hotcrm src/sales/objects/contact.hook.ts:191` (same pattern in `src/revenue/objects/product.hook.ts:70`)
- **Severity guess**: p3
- **Dedupe words**: `opportunity(ies)`, `quote(s)`, `contact_integrity`

### A-18 — Deal Timeline groups by a lookup and prints "[OBJECT OBJECT]"
- Inventory: OPP-010 · Persona: admin · URL: `/crm_opportunity/view/crm_opportunity.deal_timeline`
- **Actual**: a single group header "[OBJECT OBJECT] 25" and no per-owner groups. The view is `timeline.groupByField: "owner_id"` (`opportunity.view.ts:199`), a `sys_user` lookup. Seeded closed deals also draw backwards (start `created_at` 10/10/2026 → end 9/25/2026).
- **Evidence**: `A-18-deal-timeline-object-object.png`. `GET /api/v1/meta/view?object=crm_opportunity` → `"timeline":{"startDateField":"created_at","endDateField":"close_date",…,"groupByField":"owner_id"}`.
- **Owner**: console (objectui). The timeline group key stringifies the populated lookup object.
- **Severity guess**: p3
- **Dedupe words**: `[object Object]`, `deal_timeline`, `groupByField`, `owner_id`

### A-19 — Pipeline kanban column headers show no amount total
- Inventory: OPP-009 ("列头按金额汇总") · Persona: admin, na.rep · URL: `/crm_opportunity/view/crm_opportunity.pipeline_kanban`
- **Actual**: headers read "PROSPECTING 3", "QUALIFICATION 3", … (counts only). The server sends `"kanban":{"groupByField":"stage","summarizeField":"amount",…}`.
- **Evidence**: `A-19-kanban-no-amount-sum.png` (after the drag; `overview-pipeline-kanban.png` before), plus the meta excerpt.
- **Owner**: console (objectui). `summarizeField` is not rendered.
- **Severity guess**: p3
- **Dedupe words**: `summarizeField`, `pipeline_kanban`, `column total`, `Sales Pipeline`

### A-20 — New Opportunity form: Stage not preselected
- Inventory: OPP-001 · Persona: admin · URL: `/crm_opportunity?form=new`
- **Actual**: Stage shows "Select an option"; Create → "Please check the highlighted fields: Stage". Meta: `stage.options[0] = prospecting` with `default: true`, no field-level `defaultValue` (Lead Status, which has one, is prefilled "New").
- **Evidence**: `A-20-opp-new-stage-not-preselected.png`.
- **Owner**: `hotcrm src/sales/objects/opportunity.object.ts:227` (add `defaultValue: 'prospecting'`). Also console (objectui): the option-level `default` is ignored although `account.object.ts:546-548` relies on it "preselect[ing] in a UI form".
- **Severity guess**: p3
- **Dedupe words**: `Please check the highlighted fields: Stage`, `prospecting`, `defaultValue`

### A-21 — Line item form: Sales Price required and not filled from the product
- Inventory: OPP-008 · Persona: admin · URL: opp `WasmkRCuPEL7wROD` → Related → Products → New
- **Steps**: pick product PRD-0006 (list price 22,000), leave Sales Price empty, Create.
- **Expected**: "插入时空 `unit_price` 默认为目录价" (`_line-item-price-fill.ts`); at least the list price shown after picking a product.
- **Actual**: "Please check the highlighted fields: Sales Price". Nothing prefilled, and list price is not on the form. The default works only via the API: `POST /api/v1/data/crm_opportunity_line_item` without `unit_price` → 200, `unit_price=22000, list_price=22000`.
- **Evidence**: `A-21-lineitem-sales-price-required.png`, the API result above.
- **Owner**: `hotcrm src/revenue/objects/opportunity_line_item.object.ts:145` (`unit_price` `required: true` makes the hook's default unreachable from any form).
- **Severity guess**: p3
- **Dedupe words**: `Sales Price`, `unit_price`, `list_price`, `crm_opportunity_line_item`

### A-22 — Service agent is shown Opportunities nav/actions it has no access to
- Inventory: (persona check; PRM-adjacent) · Persona: service.agent · URL: `/crm_opportunity`
- **Actual**: the sidebar shows Opportunities and My Deals, and the list page shows **Update Stage**. Opening it → "You don't have access", with `GET /api/v1/data/crm_opportunity?top=0` → 403 `PERMISSION_DENIED` (`service-agent.profile.ts:19` `allowRead: false`). Leads show **Add to Campaign** to an agent with read-only leads.
- **Evidence**: `A-22-agent-opps-nav-no-access.png`, `agent-crm_lead.png`.
- **Owner**: console (objectui). Nav items and list actions are not filtered by the `/auth/me/permissions` object grants.
- **Severity guess**: p3
- **Dedupe words**: `You don't have access`, `PERMISSION_DENIED`, `crm_opportunity`, `service_agent`

## Not defects but worth knowing

- **Edit is correctly disabled on locked deals.** Seeded ≥$100K deals (Wayne Enterprise License, Acme Platform Upgrade) sit in a pending large-deal approval, so Edit is disabled ("Locked for approval"). The approval flow sends only to Sales Manager Review; after the manager approved, `approval_status=approved` without a director step, though the panel lists "2 Sales Director Sign-off".
- **Closing a deal won always stamps today as the close date.** `close_date` is set to today on `closed_won` unless the same PATCH carries a close date (Northwind went from Dec 21 to today). That matches `opportunity.hook.ts:15`; the inventory's "未给关闭日时" reads narrower.
- **Business refusals are logged at ERROR with stack traces.** `[BodyRunner] sandboxed hook threw …`, 8 times this run. That is noise for anyone watching the log.
- **No success feedback on some actions.** Schedule Follow-up and the bulk campaign add close silently with no toast. Clone shows a toast but stays on the source record with no link to the copy.
- **Private deals stay visible to the admin.** Expected for a platform admin; the RLS is declared on the sales-manager / marketing-user profiles only.
- **High Priority and Hot Leads use the same filter.** Both are rating ≥4 ∧ new/contacted, so they show identical rows.
- **Lead ownership after staffing.** The seeded lead book is owned by the sales manager after `demo:staff`, so reps start with 0 leads (`demo-staffing.ts`, by design).
- **Lead path doesn't reflect skipped stages.** The path marks every earlier step done (✓ Contacted) even when the lead jumped New → Qualified.
- **Lookup pickers show an empty value.** They render "Email Verified:" with nothing after it for every user.
- **Timings.** First console load ≈2–3 s; list/record pages settled in ≈1.5–2.5 s; reports ≈2–4 s; the conversion flow ≈2–3 s. Nothing over 5 s.
- **Flakiness.** No flaky behaviour seen. One kanban drag landed on Closed Lost because the board auto-scrolled under my synthetic mouse path; this was test-harness behaviour, not reproduced by a normal drop, and I cancelled it.

## Open questions (decisions I made)

1. **LEA-006 / web-to-lead URL.** I tested the anonymous form at `/_console/f/contact-us` (the console's public route) after the documented URL failed, and filed the URL as A-07 rather than a blocker.
2. **AI rows (LEA-017, ACC-016, ACC-017).** Marked "not tested", not "not reachable": no LLM provider or agent is configured in a fresh dev box.
3. **OPP-013.** Marked "not tested". It is a 07:30 daily schedule and I did not run the flow through an admin back door.
4. **Rows that work but carry a doc or rendering defect.** ACC-006 and OPP-010 are failed on A-12/A-18; LEA-001 and LEA-014 are passed with A-02/A-03 noted.
5. **Severity of A-01.** p2, not p1, because re-running the wizard recovers (it reuses the orphaned account and contact).
6. **Severity of A-06.** p1, because sales reps cannot convert any lead for a company that has no account yet.
7. **Seeded data touched by the tests.** I changed seeded records while testing: Northwind Grid Modernization won, Initech/Acme deals moved by kanban, Vertex Analytics Expansion set Private, Northwind Energy promoted to customer, lead Theo Park converted. This is a throwaway container DB.
8. **Owner calls.** Where both hotcrm metadata and the platform could fix a finding (A-07, A-09, A-11, A-16, A-20), I named both and put first the one I think is primary.
