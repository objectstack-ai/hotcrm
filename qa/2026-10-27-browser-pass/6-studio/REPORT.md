# #2320 browser pass — track 6 (Studio)

- **Tested sha:** hotcrm `main` `5eb2f0d` (`@objectstack/*` 18.2.0). `main` had moved one commit past the order's `1f3f888` before this track started: #2323 moved `crm_contract` into the app package; the pins are unchanged.
- **Boot:** `pnpm install --frozen-lockfile` exit 0 · `pnpm dev` healthy on `:4001` (`/api/v1/health` → 18.2.0) · `pnpm demo:staff` exit 0.
- **Browser:** preinstalled Chromium via `require('playwright')`, desktop 1440×900, phone 390×844 (`isMobile`, touch).
- **Persona:** dev admin (`admin@objectos.ai`). Studio is an admin surface; no other persona was driven.
- **How a user reaches Studio:** console Home → **Build an app** → `/_console/studio` (App Builder). It is not in the app switcher (Back to home · All apps · Settings) or the account menu, and HotCRM's top bar has no "Edit app" button (`c-*`, `a-hotcrm-home`). Studio shows all four HotCRM packages as **Read-only** code packages.
- **DB left as seeded:** every edit was reverted and the revert measured (flow clone deleted, flow count 33 → 34 → 33; view overlay reset, `overlay: null`, served view byte-equal to its baseline).

## Coverage

| Surface | Result | Evidence / reason |
| --- | --- | --- |
| Studio landing | pass | four HotCRM packages, Read-only, plus Organization flows · `b-studio-root`, `c-build-an-app` |
| Object designer — open, read fields (Account) | pass | 38 fields; tabs Records / Form / Validations / Hooks (1: `account_protection`) / Actions (3) / API / Settings · `d-studio-hotcrm`, `e-obj-account-*` |
| Object designer — add then remove a field, save, see it in the app | **not reachable** | HotCRM is a code package, so Studio is read-only ("Read-only package — switch to or create a writable package to edit"), and the platform takes no overlay on a packaged object (Setup › Metadata marks Object `create-only`). The one canvas that lets you add a field cannot save it: D2 · `g-*` |
| Object designer — the module packages (Service 3, Revenue 4, Marketing 2 objects) | pass (open) | Revenue lists 4 objects with `crm_contract` gone to the app package, as #2323 intends · `s-studio-*-data` |
| Flow builder — open, inspect nodes (Account Approval) | pass | canvas; Approval node (approver = position Sales Manager); Get Record node; Variables / Runs / Problems ("structurally valid") / Debug simulator · `h-studio-automations`, `i-*` |
| Flow builder — one round-trip edit, reverted | pass (on a clone) | packaged flows are read-only, so the product's own route was used: Setup › Packaged Automation › **Clone** `schedule_followup` → `qa2320_schedule_followup` → Studio › Organization flows → node label "Create Follow-up Task" → "… QA2320" → draft (`PUT …?mode=draft` 200) → **Publish** (live label changed) → label restored → Publish → live clone's `nodes`, `edges`, `variables` byte-equal to the packaged original → clone deleted in Setup › Metadata › Flow (`DELETE` 200, `GET` 404, flow count back to 33) · `j-*`, `k-*`, `l-*` |
| Flow builder — module packages | pass (open) | Service 7, Revenue 1, Marketing 2 automations · `s-studio-*-automations` |
| Dashboard designer (Executive Overview, Sales Performance in Studio; Sales Activity in Setup) | pass (open) | Design / Run, widgets with their types, layout, filters; charts drawn · `h-studio-interfaces`, `m-iface-sales-performance`, `p-setup-dashboard-sales-activity` |
| Page designer (Sales Home in Studio; Lead Detail in Setup) | pass (open) | regions and component spans; Lead Detail previews a sample record with path, tabs and sections · `m-iface-sales-home`, `p-setup-page-lead-detail` |
| View designer (My Tasks in Studio; Hot Leads in Setup) | pass (open) | columns / filter / sort / conditional formatting · `m-iface-my-tasks`, `p-setup-view-hot-leads` |
| View — overlay round-trip, seen in the app | pass | Setup › Metadata › View › `crm_lead.hot_leads` label "🔥 Hot Leads" → "🔥 Hot Leads QA2320" (auto-saved draft) → **Publish** → the Leads list tab reads "🔥 Hot Leads QA2320" → **Reset overlay** (`DELETE` 200 "reset to artifact default") → tab reads "🔥 Hot Leads" again; `overlay: null`, served item byte-equal to baseline · `q-*`, `r-*` |
| Views, pages, dashboards outside the app navigation | **not reachable in Studio** | D3 · `o-setup-meta-*`, `s-studio-*-interfaces` |
| App navigation (Studio › Interfaces) | pass, with S9 | the tree mirrors the app's own `navigation`; module contributions are absent · `h-studio-interfaces`, `m-iface-nav-bottom` |
| Studio Access pillar | pass (open) | 7 permission sets, object grid, Explain access · `h-studio-access` (the grants themselves are track 5's) |
| Changes / Publish on a read-only package | pass | Changes says "Nothing pending"; Publish disabled · `h-studio-changes` |
| Phone width 390×844 | pass | every Studio pillar and the Setup object designer render with no horizontal scroll and a "Studio is built for a desktop screen." notice; see S11 · `t-phone-*` |

## Defects

### D1 — Metadata Diagnostics reports 10 false errors on 8 HotCRM objects ("`picklist` and `options` cannot both be declared")
- **Steps:** as the dev admin, Studio › HotCRM › any object › **Read-only · Customize with an overlay** (lands on Setup › All Metadata Types) → the Object tile carries a red issue badge → **View all issues**.
- **Expected:** a field that names a shared picklist and nothing else is valid. The diagnostic's own text says "Keep `picklist: '<name>'` and delete `options`", which is how the source is written (`src/sales/objects/account.object.ts:331`, `picklist: 'industry'`, no `options`); the built `dist/objectstack.json` carries `picklist` only.
- **Actual:** "Metadata Diagnostics — 8 issue(s) across 524 items", 10 messages: `crm_account.industry`, `crm_contact.salutation` / `lead_source`, `crm_contract.payment_terms`, `crm_event.related_to_type`, `crm_lead.salutation` / `industry` / `lead_source`, `crm_opportunity.lead_source`, `crm_task.related_to_type`, `crm_quote.payment_terms`. `GET /api/v1/meta/object/crm_account` serves both `picklist: "industry"` and the resolved `options`, so the runtime resolves the picklist into `options` and then validates its own output. The page says "Errors block features that depend on the item"; the select fields themselves work in the app · `f-metadata-issues`, `e-obj-account-overlay-click`.
- **Suspected landing:** platform — picklist resolution / load-time diagnostics in `@objectstack/metadata` (validate the authored shape, or do not flag `options` it derived itself). Not HotCRM source.
- **Dedupe words:** picklist and options cannot both be declared, metadata diagnostics false positive picklist, resolved picklist options validation.

### D2 — A locked object's canvas accepts edits it can never save
- **Steps:** Setup › All Metadata Types › Object › `crm_account` (banner "This item is locked and cannot be edited or deleted. app.objectstack.hotcrm@6.0.0") → **Add field** → **Text**.
- **Expected:** the banner's words: a locked item cannot be edited, so the add / move / remove-section controls and the Description box are disabled.
- **Actual:** the type picker opens, a field "Text" (`text`) is appended to Ungrouped and the inspector shows an **Unsaved** chip, but no Save button exists on the page and no request is sent; leaving drops the work without a word. "Add field to this section", "Move section up / down" and "Remove section" are live on every section · `g-setup-meta-crm_account`, `g-add-field-click`, `g-add-field-text-added`.
- **Suspected landing:** platform console, the Setup metadata object designer (the lock does not reach the canvas).
- **Dedupe words:** locked item editable canvas, add field locked object unsaved no save, metadata designer read-only not enforced.

### D3 — Studio cannot open most of HotCRM's interfaces: only items on the app's navigation appear
- **Steps:** Studio › HotCRM › **Interfaces**; then Studio › HotCRM Service (or Revenue, Marketing) › **Interfaces**.
- **Expected:** the Studio landing's own words for installed packages: "Code and installed packages are read-only: **browse them here**".
- **Actual:** the HotCRM pillar lists only the navigation tree (1 of its 5 pages, 4 of its 65 views, its 4 dashboards). Every other list view (e.g. 🔥 Hot Leads, Lead Pipeline), the record pages (Account / Lead / Opportunity Detail, Account Workbench) are nowhere in Studio. The module packages show "This package has no app yet. Create an app to design its navigation and interfaces." with a disabled **Create app**, so the Service package's **Service Overview** dashboard and **Case Detail** page cannot be opened in Studio at all. Setup › Metadata lists and opens all of them · `m-iface-nav-bottom`, `s-studio-service-interfaces`, `s-service-create-app-hover`, `o-setup-meta-view-list`, `o-setup-meta-page-list`.
- **Suspected landing:** platform console, Studio Interfaces pillar (navigation-driven listing).
- **Dedupe words:** studio interfaces only navigation items, module package no app yet dashboard not listed, studio browse views pages not in menu.

## UI / UX suggestions (kept apart from defects)

| # | Where | Today | Proposed | Who benefits | Screenshot |
| --- | --- | --- | --- | --- | --- |
| S1 | Reaching Studio | only Home → "Build an app" leads there; nothing in the app switcher, account menu or HotCRM's top bar | an admin-only "Open in Studio" entry in the app switcher and on an app's top bar, read-only for a code package | admins inspecting HotCRM | `c-app-switcher`, `a-hotcrm-home` |
| S2 | "Read-only · Customize with an overlay" badge | shown on objects, flows and pages (types that take no overlay); it lands on the package's All Metadata Types page, not the item | show it only for overlay-able types (view, dashboard, report) and land on that item's designer | admins | `e-obj-account-overlay-click`, `h-studio-automations` |
| S3 | Object designer | no Fields tab: fields are only grid columns or form cards; no table of API name / type / required / help | a Fields tab with those columns | admins | `d-studio-hotcrm`, `e-obj-account-form` |
| S4 | Flow node inspector | help text is engine prose (`submitter_id`, `onEmptyApprovers`) and a placeholder reads "ADR-0105 D9 — organization…" | business wording, the detail behind "learn more" | flow authors | `i-flow-node-approval` |
| S5 | Create Record node | Field values columns cut to 4–5 characters ("subj", "dueD", "owner_i") | stack field over value, or widen the inspector | flow authors | `k-clone-node-edited` |
| S6 | Publish dialog | the diff says "Also changed: ~ nodes" | name the node and property (label "A" → "B") | flow authors, reviewers | `k-clone-publish-dialog` |
| S7 | Flow clone and publish copy | the clone notice is a seven-sentence paragraph with code spans; the toast says "Published 1 package-less flow draft"; Organization flows says "Publish the package to apply them" though it is no package | one line plus a "switch the original off" button; "Published QA 2320 Schedule Follow-up" | admins | `j-clone-created`, `k-clone-published`, `k-org-flows` |
| S8 | Two designers per item | Studio edits drafts then publishes; Setup › Metadata opens a second designer for the same flow / view with auto-save on, and only Setup can delete a flow or reset an overlay | one designer; delete and reset in Studio | admins | `k-org-flows`, `l-setup-meta-clone`, `r-view-overlay-live` |
| S9 | Studio navigation tree | Service and Marketing say "No items in this package" and Reports is blank, while the app shows Service Overview, Cases, Knowledge, Quotes, Products, Campaigns, All reports there (module contributions) | show contributed items greyed, with the package they come from | admins checking the menu | `h-studio-interfaces`, `m-iface-nav-bottom`, `a-hotcrm-home` |
| S10 | Read-only flow header | the Enabled switch on a read-only package is drawn on and green like a live control (it is disabled) | a muted state with a lock, as the other read-only inputs | admins | `h-studio-automations` |
| S11 | Studio at phone width | the flow canvas opens at 100% and cuts the branch nodes off both edges; the object's record cards show the internal "Account Name (Normalized)" among their four lines | fit-to-view on open; card lines from the object's `highlightFields` | admins on a tablet / phone | `t-phone-studio-flow`, `t-phone-studio-object` |
