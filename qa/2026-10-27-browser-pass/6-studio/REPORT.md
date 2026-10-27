# #2320 browser pass — track 6 (Studio)

> Work in progress: pushed after each designer. Sections marked `(in progress)` are not final.

- **Tested sha:** hotcrm `main` `5eb2f0d` (`@objectstack/*` 18.2.0). `main` moved one commit past the order's `1f3f888` before this track started: #2323 moved `crm_contract` into the app package; the pins are unchanged.
- **Boot:** `pnpm install --frozen-lockfile` exit 0 · `pnpm dev` healthy on `:4001` (`/api/v1/health` → 18.2.0) · `pnpm demo:staff` exit 0.
- **Browser:** preinstalled Chromium via `require('playwright')`, desktop 1440×900, phone 390×844.
- **Persona:** dev admin (`admin@objectos.ai`). Studio is an admin surface.
- **How a user reaches Studio:** console Home → **Build an app** → `/_console/studio` (App Builder). It is not in the app switcher (Back to home · All apps · Settings) or the account menu, and HotCRM's top bar has no "Edit app" button (`c-*`, `a-hotcrm-home`).

## Coverage (in progress)

| Surface | Result | Evidence / reason |
| --- | --- | --- |
| Studio landing | pass | lists the four HotCRM packages as **Read-only** code packages, plus Organization flows · `b-studio-root` |
| Object designer — open, read fields (Account) | pass | 38 fields; tabs Records / Form / Validations / Hooks (1: `account_protection`) / Actions (3) / API / Settings · `d-*`, `e-obj-account-*` |
| Object designer — add then remove a field, save, see it in the app | **not reachable** | HotCRM is a code package, so Studio is read-only ("Read-only package — switch to or create a writable package to edit"), and the platform accepts no overlay on a packaged object (Setup › Metadata marks Object `create-only`). The only canvas that lets you add a field (Setup › Metadata › Object › crm_account) cannot save it: D2 · `g-*` |
| Flow builder — open, inspect nodes (Account Approval) | pass | canvas, Approval node (approver = position Sales Manager), Get Record node, Variables / Runs / Problems ("structurally valid") / Debug simulator · `h-studio-automations`, `i-*` |
| Flow builder — one round-trip edit, reverted | pass (on a clone) | a packaged flow is read-only, so the route the product offers was used: Setup › Packaged Automation › **Clone** `schedule_followup` → `qa2320_schedule_followup` → Studio › Organization flows → node label "Create Follow-up Task" → "… QA2320" → draft (`PUT …?mode=draft` 200) → Publish (live label changed) → label restored → Publish → live clone's `nodes`, `edges`, `variables` byte-equal to the packaged original → clone deleted in Setup › Metadata (`DELETE` 200, GET → 404, flow count back to 33) · `j-*`, `k-*`, `l-*` |
| Dashboard designer (Executive Overview, Sales Performance) | pass (open) | Design / Run, 9 widgets listed with their types, layout and filters panels · `h-studio-interfaces`, `m-iface-sales-performance` |
| Page designer (Sales Home) | pass (open) | header / main / aside regions with each component's span · `m-iface-sales-home` |
| View designer (My Tasks) | pass (open) | runtime preview + columns / filter / sort panel ("edit fields / structure in the Data pillar") · `m-iface-my-tasks` |
| Views and pages that are not in the navigation | **not reachable in Studio** | Studio's Interfaces pillar lists only the navigation tree; HotCRM's other list views (65 in all, e.g. Hot Leads) and its record pages (account / lead / opportunity detail, account workbench) appear nowhere in Studio. They open only in Setup › Metadata · `o-setup-meta-*` |

## Defects (in progress)

### D1 — Metadata Diagnostics reports 10 false errors on 8 HotCRM objects ("`picklist` and `options` cannot both be declared")
- **Steps:** as the dev admin, Studio › HotCRM › any object › **Read-only · Customize with an overlay** (or Setup › All Metadata Types) → the Object tile carries a red issue badge → **View all issues**.
- **Expected:** a field that names a shared picklist and nothing else is valid; the diagnostic's own text says to "Keep `picklist: '<name>'` and delete `options`", which is exactly how the source is written (`src/sales/objects/account.object.ts:331` `picklist: 'industry'`, no `options`). The built artifact `dist/objectstack.json` carries `picklist` only.
- **Actual:** "Metadata Diagnostics — 8 issue(s) across 524 items", 10 messages on `crm_account.industry`, `crm_contact.salutation`/`lead_source`, `crm_contract.payment_terms`, `crm_event.related_to_type`, `crm_lead.salutation`/`industry`/`lead_source`, `crm_opportunity.lead_source`, `crm_task.related_to_type`, `crm_quote.payment_terms`. The served object (`GET /api/v1/meta/object/crm_account`) carries both `picklist: "industry"` and the resolved `options` list, so the runtime resolves the picklist into `options` and then validates its own output. The header says "Errors block features that depend on the item" · `f-metadata-issues`, `e-obj-account-overlay-click`.
- **Suspected landing:** platform — the picklist resolution / load-time diagnostics in `@objectstack/metadata` (it should validate the authored shape, or strip `options` it derived itself). Not HotCRM source.
- **Dedupe words:** picklist and options cannot both be declared, metadata diagnostics false positive picklist, resolved picklist options validation.

### D2 — A locked object's canvas accepts edits it can never save
- **Steps:** Setup › All Metadata Types › Object › `crm_account` (banner "This item is locked and cannot be edited or deleted. app.objectstack.hotcrm@6.0.0") → **Add field** → **Text**.
- **Expected:** the banner's own words: a locked item cannot be edited, so the add / move / remove-section controls and the Description box are disabled.
- **Actual:** the type picker opens, a field "Text" (`text`) is appended to Ungrouped and the inspector shows an **Unsaved** chip, but no Save button exists anywhere on the page and no request is sent. Leaving the page drops the work without a word. "Add field to this section", "Move section up/down" and "Remove section" are live on every section · `g-setup-meta-crm_account`, `g-add-field-click`, `g-add-field-text-added`.
- **Suspected landing:** platform console, the Setup metadata object designer (the locked state is not passed to the canvas).
- **Dedupe words:** locked item editable canvas, add field locked object unsaved no save, metadata designer read-only not enforced.

## UI / UX suggestions (in progress)

| # | Where | Today | Proposed | Who benefits | Screenshot |
| --- | --- | --- | --- | --- | --- |
| S1 | Reaching Studio | only Home → "Build an app" leads there; nothing in the app switcher, the account menu or HotCRM's top bar | an admin-only "Open in Studio" entry in the app switcher and on an app's top bar, read-only for a code package | admins inspecting HotCRM | `c-app-switcher`, `a-hotcrm-home` |
| S2 | "Read-only · Customize with an overlay" badge | shown on objects and flows (types that take no overlay) and leads to the package's All Metadata Types page, not the item | show it only for overlay-able types (view, dashboard, report) and land on the item itself | admins | `e-obj-account-overlay-click`, `h-studio-automations` |
| S3 | Object designer | no Fields tab: fields are only grid columns or form cards; no table of API name, type, required, help | a Fields tab listing name / API name / type / required / group | admins | `d-studio-hotcrm`, `e-obj-account-form` |
| S4 | Flow node inspector | help text is engine prose (`submitter_id`, `onEmptyApprovers`, "ADR-0105 D9" as a placeholder) | business wording, the detail behind a "learn more" | flow authors | `i-flow-node-approval` |
| S5 | Create Record node | Field values columns are cut to 4–5 characters ("subj", "dueD", "owner_i") | stack field and value, or widen the inspector | flow authors | `k-clone-node-edited` |
| S6 | Publish dialog | the diff says "Also changed: ~ nodes" | name the node and the property (label "A" → "B") | flow authors, reviewers | `k-clone-publish-dialog` |
| S7 | Flow clone and publish copy | the clone notice is a seven-sentence paragraph with code spans; the toast says "Published 1 package-less flow draft" | one line plus a "switch the original off" button; "Published QA 2320 Schedule Follow-up" | admins | `j-clone-created`, `k-clone-published` |
| S8 | Two flow designers | Studio edits drafts and publishes; Setup › Metadata › Flow opens a second designer with auto-save on, and only that one can delete a flow | one designer; delete in Studio | admins | `k-org-flows`, `l-setup-meta-clone` |
| S9 | Studio Interfaces navigation | Service and Marketing groups say "No items in this package" and Reports is blank, while the app shows Service Overview, Cases, Knowledge, Quotes, Products, Campaigns, All reports there (module contributions) | show contributed items greyed with the package they come from | admins checking the menu | `h-studio-interfaces`, `a-hotcrm-home` |
| S10 | Studio Interfaces | only navigation items are listed, so most views and every record page cannot be opened | a "Views" and "Pages" list per object, as Setup › Metadata has | admins | `o-setup-meta-view-list`, `o-setup-meta-page-list` |
