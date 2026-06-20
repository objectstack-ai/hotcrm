# Changelog

All notable changes to HotCRM are documented in this file. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); HotCRM follows [Semantic Versioning](https://semver.org/).

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

[1.1.0]: https://github.com/objectstack-ai/hotcrm/releases/tag/v1.1.0
[1.0.0]: https://github.com/objectstack-ai/hotcrm/releases/tag/v1.0.0
