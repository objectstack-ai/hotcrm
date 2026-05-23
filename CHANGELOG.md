# Changelog

All notable changes to HotCRM are documented in this file. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); HotCRM follows [Semantic Versioning](https://semver.org/).

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

[1.0.0]: https://github.com/objectstack-ai/hotcrm/releases/tag/v1.0.0
