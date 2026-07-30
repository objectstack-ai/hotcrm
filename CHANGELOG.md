# Changelog

All notable changes to HotCRM are documented in this file. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); HotCRM follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

Everything merged after the 2.2.2 tag. Not yet versioned or published.

### Changed

- **ObjectStack platform → 16.1.0 stable** across all `@objectstack/*` packages (from the 16.0.0-rc.1 line pinned in 2.2.0). [#465](https://github.com/objectstack-ai/hotcrm/pull/465)
- CI: bump `actions/checkout` 4 → 7 ([#422](https://github.com/objectstack-ai/hotcrm/pull/422)) and `actions/setup-node` 4 → 6 ([#421](https://github.com/objectstack-ai/hotcrm/pull/421)).
- Docs: README hero states HotCRM's size in tokens ([#483](https://github.com/objectstack-ai/hotcrm/pull/483)); drifted README counts fixed ([#466](https://github.com/objectstack-ai/hotcrm/pull/466)).

### Added

- **Lookup/global search plus the P1 CPQ & intake surfaces.** [#468](https://github.com/objectstack-ai/hotcrm/pull/468)
- **Rep work queues**, and the "My Open Deals" view fixed along the way. [#485](https://github.com/objectstack-ai/hotcrm/pull/485)
- Navigation entry points so every shipped capability is reachable in-app. [#482](https://github.com/objectstack-ai/hotcrm/pull/482)
- Flow runtime test harnesses: `lead_conversion` ([#469](https://github.com/objectstack-ai/hotcrm/pull/469)) and `quote_generation` ([#470](https://github.com/objectstack-ai/hotcrm/pull/470)).

### Added

- **`engines.protocol` compatibility range declared ([#529](https://github.com/objectstack-ai/hotcrm/issues/529)).** The app never declared the metadata/runtime protocol range it is authored against, so a newer runtime loaded it *unchecked* — ObjectStack 17.0 warns `package 'app.objectstack.hotcrm' declares no engines.protocol range; loading under protocol 17.0.0 without a compatibility check (ADR-0087)`. The stack manifest in [`objectstack.config.ts`](objectstack.config.ts) (the manifest the ADR-0087 load-time handshake actually reads) and [`objectstack.manifest.json`](objectstack.manifest.json) now both declare `engines.protocol: "^16.0.0"`, matching the installed `@objectstack/*` 16.x line. A runtime on a different protocol major now refuses the load up front with the structured `OS_PROTOCOL_INCOMPATIBLE` diagnostic (naming the `objectstack migrate meta` replay command) instead of failing deep in a schema parse. The platform-upgrade checklist ([docs/MAINTENANCE.md](docs/MAINTENANCE.md) §3) now includes bumping this range alongside `specVersion`.

### Fixed

- **P0 core-correctness sweep.** [#467](https://github.com/objectstack-ai/hotcrm/pull/467)
- **Same-named picklists unified into one canonical value set (`src/objects/_picklists.ts`); seed data aligned with what the hooks would compute** — cross-object copies in `lead_conversion` no longer produce illegal enum values, autonumber fields are no longer hand-seeded, and case/opportunity/forecast seed rows match their hooks' derived fields. Fixes [#490](https://github.com/objectstack-ai/hotcrm/issues/490) via [#516](https://github.com/objectstack-ai/hotcrm/pull/516).
- `lead_auto_assign` now handles anonymous Web-to-Lead submissions. [#471](https://github.com/objectstack-ai/hotcrm/pull/471)
- Demo org made demonstrable ([#481](https://github.com/objectstack-ai/hotcrm/pull/481)) and dangling UI references repaired ([#480](https://github.com/objectstack-ai/hotcrm/pull/480)).
- i18n: dead option/section/widget translations re-keyed; missing zh-CN coverage added. [#498](https://github.com/objectstack-ai/hotcrm/pull/498)
- Hook catch blocks no longer call `console.*`. [#472](https://github.com/objectstack-ai/hotcrm/pull/472)
- StackBlitz demo: bootstrap under pnpm 10 in the WebContainer ([#464](https://github.com/objectstack-ai/hotcrm/pull/464)), boot with npm instead of a global pnpm install ([#484](https://github.com/objectstack-ai/hotcrm/pull/484)), and turn off the OIDC provider so the demo can log in ([#486](https://github.com/objectstack-ai/hotcrm/pull/486)).

## [2.2.2] — 2026-07-21

Patch before the ObjectStack 16 marketplace release. Fixes [#459](https://github.com/objectstack-ai/hotcrm/issues/459) — the highest-severity issue from the v2.2.1 QA dogfood.

### Fixed

- **Opportunity/quote freeze-guards no longer reject system/seed writes → 23 boot errors gone + closed-won probability corrected.** The `opportunity_lifecycle` and quote freeze-guards ran on **every** write to a closed/accepted record, so the seed re-applying rows on reboot (its `close_date: daysAgo(15)` / `quote_date` re-evaluate to a *new* date each boot) was rejected — logging 23 `BodyRunner` errors per boot and blocking the seed from setting closed-won `probability` to 100 (it fell back to the field default `10`). Both guards now fire **only for genuine user edits** (`ctx.user?.id` present); system/seed/backfill writes (no user) pass — matching this repo's system-write convention (`case`/`lead` hooks) and the guards' own stated intent. A user editing a closed opportunity or accepted quote through the UI is still blocked. Fixes [opportunity.hook.ts](src/objects/opportunity.hook.ts) + [quote.hook.ts](src/objects/quote.hook.ts).

## [2.2.1] — 2026-07-20

Follow-up patch to 2.2.0. The dashboard-filter fix in 2.2.0 only covered the built-in `dateRange` picker; the **`globalFilters[]`** have the same propagation behaviour (ObjectStack 15 / framework#2501 injects every dashboard filter into each widget's query) and were still crashing widgets on objects that lack the filtered field. Browser-verified by actually selecting the filter values, not just loading the dashboards.

### Fixed

- **Selecting the Executive dashboard's `Lead Source` filter crashed every account widget.** The `lead_source` global filter was injected into each widget's query; `crm_account` has no `lead_source` column, so `total_accounts`, `new_accounts_by_month`, and `accounts_by_industry` failed with `SqliteError: no such column: lead_source`. Added `lead_source: false` to those three widgets' [`filterBindings`](src/dashboards/executive.dashboard.ts) (they keep `dateRange: false` too). `crm_contact` and `crm_lead` *do* have `lead_source`, so `total_contacts` / `open_leads` correctly keep filtering. Verified in the browser: selecting `Lead Source = Web` now returns filtered/empty results with zero analytics errors.
- **CRM dashboard's `Owner` filter would crash `top_products`.** `crm_product` has no `owner` column, so the `owner` global filter would fail the product-category widget the same way. Added `owner: false` to its [`filterBindings`](src/dashboards/crm.dashboard.ts) (alongside the existing `dateRange: false`).
- Full field-vs-filter matrix audited across all four dashboards: Sales (all `opportunity_metrics`, which has `owner`/`type`/`close_date`) and Service (`created_date`/`owner`/`priority` all on `crm_case`) needed no change.

## [2.2.0] — 2026-07-20

Platform upgrade to ObjectStack **16.0.0-rc.1** — the 16 release-candidate line (from 14.7, skipping the entire 15.x line). Manifest `specVersion` now declares `^16.0.0-rc.1` (was `^14.0.0`); app version `2.2.0`. ObjectStack 16 finishes the ADR-0049 "enforce-or-remove" sweep (dead metadata props now fail loudly instead of parsing inert), converges the hook/action org identifier on `organizationId`, flips `.strict()` on dashboard-widget / view-form / page schemas, and — most consequentially for this app — makes the `ai` capability a **fail-fast hard requirement** resolved to the closed `@objectstack/service-ai` package. Built, validated, type-checked, unit-tested (17/17), and browser-verified against `@objectstack/* 16.0.0-rc.1` (boot → 38 plugins loaded → 17 flows / 15 trigger-bound → `/_console/` login renders at HTTP 200 with no boot or console errors).

Upgrade migration was driven from the official release notes at <https://objectstack.ai/docs/releases/v16> (and `/v15`), cross-checked against the per-package `CHANGELOG.md`, per [`AGENTS.md`](AGENTS.md).

> **Toolchain note:** install under Node **22** (the `.nvmrc` LTS pin). A transitive dep (`nanoid@6`) declares `engines.node` excluding odd-numbered releases, so `pnpm install` fails under Node 25 with `engine-strict=true`.

### Changed

- **ObjectStack platform → 16.0.0-rc.1** across all 11 `@objectstack/*` packages (from `14.7`), pinned to the exact RC version.
- **Dropped `ai` from the stack's `requires` ([objectstack.config.ts](objectstack.config.ts)).** ObjectStack 11.3.0 (ADR-0025 S2) removed `@objectstack/service-ai` from the open edition — the AI runtime ships only in the closed cloud package, whose latest open-registry version is `10.3.0`. Under 16, `requires: ['ai']` is a **fail-fast** capability: the serve command hard-aborts boot when the package is absent (the AI block runs before every other capability resolves), so `objectstack start`/`dev` for this open-edition app failed with `[AI] required but @objectstack/service-ai is not installed`. The AI **metadata is unaffected** — both agents + all skills still validate, compile into the artifact, and run wherever a runtime provides the `ai` tier (cloud's `objectos-runtime`). A local open-edition boot simply omits the AI service and hides its Console surface. (This was never caught before because the `verify` script boots nothing — `validate`/`typecheck`/`build`/`test` all resolve metadata only, not capability provider packages.)
- **Removed the dead `visibility` field from both agents** (`sales-copilot`, `service-copilot` — both agents since retired in [#512](https://github.com/objectstack-ai/hotcrm/pull/512)). ObjectStack 16 removes `AgentSchema.visibility` (ADR-0049 / ADR-0056 D8): it was never enforced — a `private`/`organization` value never restricted an agent — so a security-shaped field with no runtime consumer is a liability. `AgentSchema` is not `.strict()`, so it was being silently stripped; removed for honesty. Restrict agent access via the enforced `access`/`permissions` surfaces instead.

### Fixed

- **Dashboard date-range picker no longer crashes widgets on objects without the date field.** ObjectStack 15 (framework#2501, `GlobalFilterSchema.name` + `DashboardWidgetSchema.filterBindings`) wired dashboard-level filters — including the built-in `dateRange` picker (reserved filter name `dateRange`) — into **every widget's analytics query**. At 14.7 the picker didn't propagate; under 16 it injects its `field` into each widget's SQL. The Executive and CRM dashboards bind `dateRange` to `close_date`, which only exists on `crm_opportunity` — so every widget on `crm_account` / `crm_contact` / `crm_lead` / `crm_product` failed with `SqliteError: no such column: close_date` and rendered as an error card. Each affected widget now declares `filterBindings: { dateRange: false }` to opt out of the picker (they carry their own `created_at` / count semantics): 5 widgets on [executive.dashboard.ts](src/dashboards/executive.dashboard.ts) (`total_accounts`, `total_contacts`, `open_leads`, `new_accounts_by_month`, `accounts_by_industry`) and 1 on [crm.dashboard.ts](src/dashboards/crm.dashboard.ts) (`top_products`). The Sales dashboard (all-`opportunity_metrics`) and Service dashboard (`dateRange` bound to `created_date`, which `crm_case` has) needed no change. Browser-verified: all four dashboards load with live data and zero analytics/SQL errors. (This surfaces only when the dashboards are actually rendered against seeded data — `verify` builds the artifact but never queries it.)

### Removed

- **Dead dashboard header action buttons.** All four dashboards declared header `actions` (Export PDF, Schedule Email, Customize, New Opportunity/Deal/Lead/Case, Forecast, Reports, My Queue, SLA Report) that pointed at actions or routes which were never implemented — `export_dashboard_pdf` / `schedule_dashboard_email` / `customize_dashboard` / `create_opportunity` / `create_lead` / `create_case` are not defined actions, and the `url` targets (`/reports/forecast`, `/reports/sla`, `/reports`, `/objects/case?owner=current_user`) match no in-app view route. They rendered as buttons that did nothing when clicked. Removed the `header.actions` block from [executive](src/dashboards/executive.dashboard.ts), [sales](src/dashboards/sales.dashboard.ts), [crm](src/dashboards/crm.dashboard.ts), and [service](src/dashboards/service.dashboard.ts) dashboards (titles/descriptions kept), plus the now-orphaned action-label translations from all four locale bundles (`en`, `zh-CN`, `ja-JP`, `es-ES`). Pre-existing dead affordance, unrelated to the upgrade; re-add real, wired-up actions when those features exist.

### Verified clean (no change needed)

The rest of the 15→16 enforce-or-remove surface did not touch this app, confirmed by source scan + a clean build:

- **Hook/action `ctx.session.tenantId` → `organizationId`** — no `tenantId` reads anywhere.
- **Removed object props** (`versioning`/`softDelete`/`search`/`recordName`/`keyPrefix`/`tags`/`active`/`abstract`) and **field props** (`vectorConfig`/`fileAttachmentConfig`/`dependencies`/`columnName`/`index`/`referenceFilters`) — none authored (only historical comments).
- **Dashboard-widget `.strict()`** — the pivot's `rowField`/`columnField`/`valueField` live inside the `options: {}` escape hatch; widgets use the canonical `dataset`/`dimensions`/`values` shape.
- **Collapsed hook events** (18 → 8), **validation `events: ['delete']`**, **webhook `undelete`/`api` triggers**, **`aiStudio`/`aiSeat` capability aliases**, **feed contracts**, **formula date arithmetic** (now a build error), **`managedBy: 'system'` data-API lockdown**, **`ObjectOS*` → `Kernel*` class renames**, and the **tenancy config** removal — none present.
- **Approver types** already use the canonical `type: 'position'` (migrated in 2.1.0), not the now-removed `role` alias.

## [2.1.0] — 2026-07-14

Platform upgrade to ObjectStack **14.7** — a major line bump (from 12/13). Manifest `specVersion` now declares `^14.0.0` (was `^12.0.0`); app version `2.1.0`. ObjectStack 14 completes the ADR-0090 permission-model vocabulary convergence and turns the object `enable.*` capability flags into real runtime gates. This release migrates HotCRM's metadata off every 14.0 breaking surface and hardens the seed + opportunity-lifecycle hook so a fresh-DB boot is completely clean. Built, validated, type-checked, linted (zero warnings), unit-tested (17/17), and browser-verified against `@objectstack/* ^14.7.0` (login → HotCRM app → Executive / Sales / Service / CRM Overview dashboards with live seeded data → Accounts / Opportunities / Cases lists → account record detail with grouped field sections; no boot errors, no post-login console errors).

Upgrade migration was driven from the official release notes at <https://docs.objectstack.ai/docs/releases> (per-major page `/docs/releases/v14`), and [`AGENTS.md`](AGENTS.md) now documents that page as the required first reference for any future platform bump.

### Changed

- **ObjectStack platform → 14.7** across all `@objectstack/*` packages (from `12`/`13`).
- **Approval approvers use `type: 'position'` instead of `type: 'role'` (ADR-0090 D3, spec 14.0).** In 14 the `role` approver type resolves against the better-auth org-membership tier (`sys_member.role`: owner/admin/member) — the CRM's `sales_manager` / `sales_director` are org **positions**, not membership tiers, so under the old spelling the opportunity-approval flow routed to nobody and stalled. Both approval nodes in [`src/flows/opportunity-approval.flow.ts`](src/flows/opportunity-approval.flow.ts) now target the declared positions via `type: 'position'`.
- **FLS keys are object-qualified (spec 14.4, `security-fls-unqualified-key`).** The runtime evaluator matches field-permission keys by `<object>.<field>` prefix; the bare keys in the `sales_rep` and `service_agent` permission sets (`account.*`, `opportunity.*`, `case.*`) matched nothing and their declared masking never enforced. Requalified to `crm_account.*` / `crm_opportunity.*` / `crm_case.*` so the FLS actually applies.
- **`fieldGroups` are now referenced by their fields.** Spec 14's lint flagged `crm_case`, `crm_contract`, `crm_product` and `crm_quote` declaring field groups that no field pointed at — the groups never rendered. Every field on those four objects now carries a `group:` assignment, so record detail pages render the intended grouped sections (verified in the browser on the account/case detail layout).
- **`crm_campaign_member` declares a resolvable record title (ADR-0079).** The junction object had no title-eligible stored field, so records displayed as raw IDs. Added a `member_number` autonumber and pointed `nameField` at it explicitly.

### Fixed

- **Opportunity-lifecycle hook no longer rejects system writes to closed deals.** The `beforeUpdate` freeze-guard ran *after* the derived-field recompute injected `expected_revenue`/`probability` into the input, so the post-seed ownership backfill (and any framework re-stamp) on a closed opportunity was rejected for fields the caller never touched — surfacing as 23 `BodyRunner` errors on every fresh-DB boot. The guard now runs first and judges only the caller's actual field edits; a fresh boot is error-free.
- **Seed task with `status: 'completed'` now sets `completed_date`.** The "Send welcome package to Stark Medical" seed row tripped the `completed_date_required` validation rule (an `Insert operation failed` on every fresh boot). Added `completed_date` to satisfy the rule.

## [2.0.0] — 2026-07-07

Platform upgrade to ObjectStack **12.3** — a major line bump. Manifest `specVersion` now declares `^12.0.0` (was `^10.0.0`); app version `2.0.0`. ObjectStack 12 introduces the **metadata-liveness** gate (ADR-0049): the compiler now emits an advisory warning for any authored property that is parsed but has no runtime consumer. This release migrates HotCRM off that dead surface so `pnpm build` / `pnpm dev` compile with **zero warnings**. Built, validated, type-checked, unit-tested (17/17), and browser-verified against `@objectstack/* ^12.3.0` (login → HotCRM app → Executive / Sales / Service / CRM Overview dashboards with live seeded data and the reworked aggregated tables; no console errors).

### Changed

- **ObjectStack platform → 12.3** across all `@objectstack/*` packages (from `10.0`).
- **Field history migrated to `Field.trackHistory` (ADR-0052).** The object-level `enable.trackHistory` flag is dead in 12 (no runtime consumer); per-field history is now opt-in. Enabled on each object's key lifecycle / owner / amount fields (e.g. opportunity `stage`/`amount`/`owner`/`close_date`, case `status`/`priority`/`owner`).
- **Dead object-level `enable.*` flags removed** (`trackHistory`, `files`, `feeds`, `activities`, `trash`, `mru`, `searchable`) from all 15 objects, keeping only the live API surface (`apiEnabled`/`apiMethods`).
- **Constrained lookups use `dependsOn` instead of the dead `referenceFilters`.** On `crm_contract`, `crm_case`, `crm_quote` and `crm_opportunity` the primary-contact / opportunity pickers now actually scope their candidate query to the record's `crm_account` (the string[] `referenceFilters` form was never read by the picker).
- **Scheduled flows declare `runAs: 'system'` (ADR-0049, #1888).** A schedule-triggered run has no trigger user, so under the default `runAs:'user'` its data nodes already executed unscoped; the 8 sweep flows now state the RLS-bypassing elevation explicitly.
- **Dashboard record-listing tables reworked into aggregated breakdowns (ADR-0021).** Four `table` widgets were bound to analytics cubes but selected only a count measure with no dimension — rendering a single summary row, not the per-record list their columns implied. They are now real multi-row aggregations: *Pipeline by Owner* (CRM Overview), *Accounts by Industry* (Executive), *Open Pipeline by Owner* (Sales) and *My Open Cases by Priority* (Service), with widget ids and i18n keys updated across all four locales.

## [1.3.0] — 2026-06-22

Platform upgrade to ObjectStack **10.0** — the first major line bump. Manifest `specVersion` now declares `^10.0.0` (was `^9.11.0`); app version `1.3.0`. The 10.0 metadata surface is **additive** for HotCRM except for one newly-enforced validation (below). Built, validated, type-checked, unit-tested (17/17), and browser-verified against `@objectstack/* ^10.0.0` (login → home → Executive Dashboard with live seeded data and lazy charts → Accounts list → record detail; no console errors, no failed requests).

### Changed

- **ObjectStack platform → 10.0** across all `@objectstack/*` packages (from `9.11`). Schema-level changes are additive and required no metadata edits: new `tree` view type + `TreeConfig` (ui); optional `readScope`/`writeScope` access-depth on object permissions and a new `ObjectAccessScope` enum (security, ADR-0057); optional `currency` on `Dataset`/`DatasetMeasure`; `actor`/`currency` fields on the execution context; AI `Agent`/`Skill` gained a `surface` field (defaulted, so existing agents/skills validate unchanged). No use of these is required by HotCRM today.

### Fixed

- **Territory sharing rules referenced a non-existent `billing_country` field.** 10.0's build-time expression validator (ADR-0032) now also checks **sharing-rule** CEL conditions against the object schema, which surfaced this latent dangling reference — `crm_account` has no `billing_country`; the country lives inside the structured `billing_address` field. The `north_america_territory` and `europe_territory` rules in [`src/sharing/account.sharing.ts`](src/sharing/account.sharing.ts) now read `record.billing_address.country`. No behavioral change (the dangling field matched nothing before; the seed does not populate `billing_address`), but the metadata is now valid and the rule expresses its stated "by billing country" intent against a real field.

## [1.2.0] — 2026-06-20

Platform upgrade to ObjectStack **9.11** — the release cut that promotes the in-tree 9.9.1 work to the latest line. Manifest `specVersion` now declares `^9.11.0` (was `^9.4.0`); app version `1.2.0`. Built, validated, type-checked, unit-tested (17/17), and browser-verified against `@objectstack/* ^9.11.0`.

### Changed

- **ObjectStack platform → 9.11** across all `@objectstack/*` packages (from `9.9.1`). 9.10/9.11 are additive on the metadata surface except for the lifecycle-hook change below.
- **Minimum Node bumped to 22** (`engines.node`, `.nvmrc`, CI/release workflows). `@objectstack/driver-sql` 9.11 pulls in `kysely@0.29`, which requires Node `>=22`; with `engine-strict=true` the old Node 20 CI matrix failed `pnpm install`. The publish workflows already targeted Node 22.

### Fixed

- **Lifecycle "freeze closed record" hooks no longer block framework writes.** 9.x re-stamps ownership (`owner_id`) and audit timestamps on records via `beforeUpdate` — including the post-seed ownership assignment that now runs at boot. The `opportunity_lifecycle` and `quote_workflow` freeze guards now exempt framework-managed columns (`owner_id`, `updated_at`, `created_by`, …), so those system writes pass while user edits to business fields on closed records stay blocked (verified: `amount` write on a closed-won opp → `400`, narrative `next_step` → `200`). Without this, every closed/accepted record threw `Attempted: owner_id, updated_at` during seed.
- **`smoke.test.ts` flow-count assertion** relaxed to `>= 16` so it stays green as new flows are added (the task reminder/recurrence flows pushed the total to 17), instead of re-pinning a brittle exact count.

## [1.1.0] — 2026-06-14

Platform upgrade to ObjectStack 9.4 and in-product documentation. Built and validated against `@objectstack/* ^9.4.0`; the manifest `specVersion` now declares `^9.4.0` (was `^7.7.0`).

### Added

- **In-product documentation** (ADR-0046): four package docs served in the Console doc viewer (`/_console/docs`) — `crm_overview`, `crm_sales`, `crm_service`, `crm_admin`. They document the *invisible* business logic (the rules and thresholds baked into flows, approvals, and sharing) rather than what the UI already shows.
- **Account Workbench** (ADR-0047): an interface page with quick-filter dropdowns over accounts.
- **Docs-drift guard**: `test/docs-drift.test.ts` pins every documented threshold/schedule to its flow source, so a flow change that isn't reflected in the docs fails CI.
- **`AGENTS.md`**: single source of truth for AI-agent guidance (consolidated from `.github/copilot-instructions.md`, which now points to it).

### Changed

- **ObjectStack platform 7.7 → 9.4** across all `@objectstack/*` packages. Includes the ADR-0021 analytics dataset semantic layer (dashboard widgets / reports / charts bind a named `dataset` and select dimensions/measures by name) and ADR-0021 D2 matrix reports (rows × columns + drilldown).
- `manifest.specVersion`: `^7.7.0` → `^9.4.0`; package + manifest version → `1.1.0`.

### Fixed

- `sales_dashboard › pipeline_by_forecast_category`: chart axes were swapped (`xAxis` bound to a measure, `yAxis` to a dimension); the 9.x ADR-0021 validator now rejects this as a hard error. Corrected so `xAxis` is the dimension and `yAxis` the measure (the renderer handles the horizontal-bar flip).

## [1.0.0] — 2026-05-23

First marketplace release. HotCRM is now publishable to [cloud.objectos.app](https://cloud.objectos.app) under the manifest id `app.objectstack.hotcrm`.

### Added

- **15 business objects** with `crm_` namespace prefix: account, contact, lead, opportunity, opportunity_line_item, product, quote, quote_line_item, contract, case, knowledge_article, task, campaign, campaign_member, forecast.
- **10 actions** (server endpoints + AI tools): escalate_case, close_case, mark_primary, send_email, log_call, export_csv, convert_lead, create_campaign, clone_opportunity, mass_update_stage.
- **6 workflows**: lead_conversion, opportunity_approval, case_escalation, quote_generation, campaign_enrollment, plus 1 approval process for discount approvals.
- **2 AI copilots**: sales-copilot (lead qualification, opportunity coaching) and service-copilot (case triage, KB lookup), backed by 5 skills and 4 RAG knowledge bases.
- **4 dashboards** (executive, sales, service, crm) and 8 saved reports.
- **4 analytics cubes**: opportunity, account, contact, lead.
- **i18n bundles** for en, zh-CN, es-ES, ja-JP across all object labels, fields, and views.
- **Security model**: 6 profiles, 10-role hierarchy, 3 sharing rules (AccountTeam, OpportunitySales, CaseEscalation), territory-based sharing.
- **Documentation site** (`apps/docs`): 180+ pages covering Sales, Service, Marketing, Revenue, AI Copilot, Analytics, Administration, Customization, plus Guides and Reference sections.

### Changed

- Repositioned from "demonstration / Salesforce-clone" to **ObjectStack marketplace flagship app**. README rewritten as a marketplace listing; the previous developer-focused README is preserved as `README.legacy.md`.
- `manifest.id`: `com.example.crm` → `app.objectstack.hotcrm` (publishable reverse-domain id).
- `manifest.version`: `3.0.0` → `1.0.0` (resets semver for first marketplace release; 3.x was an internal iteration counter, not a public API version).
- `manifest.name`: `Enterprise CRM` → `HotCRM`.
- Package version in `package.json`: `0.1.0` → `1.0.0`.

### Fixed

- `case.actions.ts`: aligned escalate_case/close_case payloads with the actual schema (removed phantom `closed_by` / `closed_at` / `escalated_by` / `escalated_at` fields; use real `escalated_date` + `status: 'escalated'`; corrected priority enum `'urgent'` → `'critical'`).
- `opportunity.hook.ts`: stage-change hook now syncs `probability` alongside `expected_revenue` (previously only revenue was updated).
- `forecast.hook.ts`: hook helpers inlined into the handler body to survive the build's "Lowering inline handlers" pass.
- i18n: added en / zh-CN / es-ES / ja-JP translations for the late-added `crm_knowledge_article` and `crm_forecast` objects.

### Refactored

- All 15 business objects renamed with explicit `crm_` prefix (576 replacements across 85 files). The platform no longer relies on namespace auto-injection — see the ADR in [.github/copilot-instructions.md](.github/copilot-instructions.md).

[1.2.0]: https://github.com/objectstack-ai/hotcrm/releases/tag/v1.2.0
[1.1.0]: https://github.com/objectstack-ai/hotcrm/releases/tag/v1.1.0
[1.0.0]: https://github.com/objectstack-ai/hotcrm/releases/tag/v1.0.0
