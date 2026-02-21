# HotCRM Development Roadmap

> Comprehensive development plan for HotCRM — the world's first AI-Native CRM.
> Protocol: @objectstack/spec v3.0.8 | Last Updated: February 21, 2027

## Strategic Direction

```
2025       ████████████████████████████████  Phases 1-9: Foundation → AI → Quality → Test → Integration → Schema → v3.0 → UI → DX
2026 Q1-Q2 ████████████████████████████████  Phase 10: Salesforce Feature Parity      ✅ COMPLETE
2026 Q2-Q3 ████████████████████████████████  Phase 10.5: Deep Metadata Adoption       ✅ COMPLETE
2026 Q3    ████████████████████████████████  Phase 10.6: FormView & Page Layout Enhancement  ✅ COMPLETE
2026 Q3-Q4 ████████████████████████████████  Phase 11: Ecosystem & Connectivity       ✅ COMPLETE
2026 Q4    ████████████████████████████████  Phase 12A-D: Vertical Solutions          ✅ COMPLETE
2027 Q1-Q2 ████████████████████████████████  Phase 13: Module Optimization & Seed Data  ✅ COMPLETE
2027 Q2-Q3 ████████████████████████████████  Phase 14: v3.0.8 Feed & Interface Builder Adoption  ✅ COMPLETE
2027+      ████████████████████████████████  Phase 12E: Advanced AI & Enterprise Features  ✅ COMPLETE
```

## Current State Summary

| Metric | Value |
|--------|-------|
| Protocol Version | @objectstack/spec v3.0.8 |
| Business Objects | ~148 across 13 packages |
| Business Packages | 13 (6 core clouds + AI + Analytics + Integration + Community + 4 verticals) |
| Hook Files | 121+ across 13 packages |
| Action Files | 49 across 13 packages |
| Workflow Files | 6 across 6 packages + 6 AI agent workflows (all registered) |
| Flow Definitions | 6 across 5 packages (CRM, Finance, HR, Marketing, Support) |
| State Machines | 13 (case, lead, opportunity, invoice, campaign, application, listing, patient, kyc, order, employee, sync, idea) |
| Permission Sets | 13 (6 core clouds + analytics + integration + community + 4 verticals) |
| Event Definitions | 9 (one per business cloud + analytics + integration + community) |
| Capability Manifests | 9 (one per business cloud + analytics + integration + community) |
| Studio Plugins | 9 (6 core clouds + analytics + integration + community) |
| Page Layouts | 59 across 13 packages (55 record/app + 4 blank/interface pages) |
| List Views | 34 files across 13 packages |
| Dashboards | 15 across 13 packages |
| Dashboard Headers | 6 (one per core cloud) |
| Global Filters | 24 across 6 core clouds |
| View Tabs | 18 across 6 core clouds |
| Form Views | 33 across 11 packages |
| Report Definitions | 36 across 13 packages |
| Chart Configurations | 30 across 13 packages |
| Feed Configurations | 6 across 6 core clouds (20+ feed-enabled objects) |
| Feed API Endpoints | 8 (CRUD + reactions + subscriptions) |
| MCP Tools | 24 across 6 packages |
| MCP Resources | 8 across 2 packages |
| MCP Prompts | 10 across 3 packages |
| AI Orchestrations | 2 (sales, support) |
| Predictive Models | 3 (lead scoring, churn, deal forecast) |
| RLS Policies | 5 across 2 packages (financial-services, healthcare) |
| Security Policies | 3 (password, session, composite) |
| Email Templates | 16 across 4 packages |
| Notification Channels | 4 (email, SMS, push, in-app) |
| Scheduled Jobs | 12 across 4 packages |
| Connector Metadata | 3 (email, payment, social) + 10 pre-built connectors |
| Integration Connectors | 10 (Stripe, DocuSign, Slack, Gmail, Teams, PayPal, Adobe Sign, Outlook, QuickBooks, LinkedIn) |
| UI Actions | 10 across 3 packages |
| Dashboard Widgets | 3 (pipeline, SLA, headcount) |
| Widget Measures | 24 across 6 core clouds |
| Vertical Solutions | 4 (Real Estate, Healthcare, Financial Services, Education) |
| Seed Data Files | 39 across 13 packages (system + per-package demo data) |
| Studio Builder Configs | 4 (Interface Builder, Page Builder, Canvas Snap, Element Palette) |
| Navigation Areas | 3 (header, sidebar, utility bar) |
| Packages Registered in Root Config | 13 of 13 (all packages registered) |
| Test Files | 192 files, 3799 tests (all passing) |
| TypeScript Compliance | 100% (zero type errors) |
| Protocol Compliance | 100% (all objects pass ObjectSchema.create()) |
| Spec Schema Adoption | ~95 of ~95 application-level schemas used (~100%) |

---

## ✅ Completed Phases (1–14) — Summary

> All foundational development is complete. For detailed release notes, see [CHANGELOG.md](CHANGELOG.md).

| Phase | Name | Key Outcomes |
|-------|------|-------------|
| **1** | Core Foundation | 6 business clouds, initial objects, metadata engine, ObjectQL, plugin architecture |
| **2** | Deep Intelligence | 6 AI agent workflows (lead-to-close, customer 360, churn prevention, case resolution, talent acquisition, revenue optimization), MCP integration |
| **3** | Quality & Protocol Compliance | 100% ObjectSchema compliance, zero type errors, all labels in English, Chinese text translated |
| **4** | Test Coverage & Documentation | Full hook/action test coverage across all packages, technical specification directories |
| **5** | Integration & Business Features | Performance benchmarking, production deployment guides (Docker, K8s), AI agent pipelines |
| **6** | @objectstack/spec Deep Adoption | UI/Automation/Security/AI/Plugin schemas validated via spec; advanced field types (masterDetail, summary, file, image, location, address); permission sets, sharing rules, territory model |
| **7** | @objectstack/spec v3.0.0 Upgrade | All 10 packages upgraded v2.0.6→v3.0.0; Zod 4; `ObjectSchema.create()` API; 6 Studio plugins |
| **8** | UI Completeness & Cross-Cloud Integration | 14 pages, 11 views, 8 dashboards, 6 forms; cross-cloud integration tests; advanced data model validations; system & API configs |
| **9** | Developer Experience & Documentation Governance | Fixed 20+ broken links; DEVELOPMENT_WORKFLOW.md, ARCHITECTURE.md; `pnpm typecheck/test:changed/stats`; link-check CI; README badges & Mermaid diagram |
| **10** | Salesforce Feature Parity | +25 objects (94 total); ~92% Salesforce parity; territory, forecasting, orders, subscriptions, journeys, A/B testing, revenue recognition (ASC 606); cross-cloud lifecycle automation |
| **10.5** | Deep Metadata Adoption | +27 schemas (35%→69%), reports, flows, MCP tools, security, notifications |
| **10.6** | FormView & Page Layout Enhancement | 6 layout types, 21+ components, AI-embedded pages, profile assignment |
| **11** | Ecosystem & Connectivity | +3 packages (Analytics, Integration, Community), 10 connectors, iPaaS layer |
| **12A-D** | Vertical Solutions | +4 verticals (Real Estate, Healthcare, Financial Services, Education), 28 objects |
| **13** | Module Optimization & Seed Data | 39 seed files, 13/13 plugins registered, metadata equalization, 13 state machines |
| **14** | v3.0.8 Feed & Interface Builder | Activity feed, interface builder, dashboard headers/filters, Feed API, ~100% schema adoption |

### Per-Module Status

| Package | Objects | Hooks | Actions | Pages | Views | Dashboards | Forms | Tests |
|---------|---------|-------|---------|-------|-------|------------|-------|-------|
| **CRM** (Sales Cloud) | 16 | 11 | 10 | 4 | 4 | 2 | 3 | 26 |
| **Finance** (Revenue Cloud) | 9 | 8 | 5 | 2 | 1 | 1 | — | 14 |
| **HR** (Human Capital) | 18 | 18 | 4 | 2 | 1 | 1 | 1 | 21 |
| **Marketing** (Marketing Cloud) | 15 | 15 | 4 | 1 | 1 | 1 | — | 11 |
| **Products** (CPQ Cloud) | 13 | 10 | 4 | 3 | 2 | 1 | 1 | 16 |
| **Support** (Service Cloud) | 23 | 9 | 4 | 2 | 2 | 1 | 1 | 17 |
| **AI** (Intelligence Layer) | — | — | 1 | — | — | 1 | — | 13 |
| **Total** | **94** | **71** | **32** | **14** | **11** | **8** | **6** | **192 files / 3,799 tests** |

---

> **Note**: Detailed completed phase task lists (Metadata Type Evaluation, Phases 10.5–14) have been archived. See [CHANGELOG.md](CHANGELOG.md) and git history for full details.

### Known Remaining Items (from Phase 13) — ✅ ALL COMPLETE

These items were deferred during Phase 13 and have been completed:

**13A — Seed Data Schema & Validation:** ✅
- [x] Design seed data validation utility (`packages/core/src/seed_validation.ts`) — custom validation since `@objectstack/spec` does not provide SeedDataSchema
- [x] Add seed data validation using `validateSeedData()` with required field checks
- [x] Add seed data validation tests in `packages/core/__tests__/unit/seeds/`
- [x] Seed validation runs as part of the standard test suite (`pnpm test`)

**13B-2 — Dependency Validation:** ✅
- [x] Create dependency graph for all 14 packages (`packages/core/src/dependency_graph.ts`)
- [x] Validate plugin load order respects dependencies (topological sort)
- [x] Add circular dependency detection and health checks
- [x] Add tests for plugin registration and dependency resolution

**13E-2 — Seed Data Validation Tests:** ✅
- [x] Add seed data validation tests for all 39 `*.seed.ts` files (43 tests)
- [x] Ensure all seed data passes structure validation
- [x] Add cross-package relationship validation (dependency order, referential integrity)
- [x] Test seed data load order and idempotency
- [x] Validation runs as part of standard CI test suite

**13E-3 — Cross-Package Integration Tests:** ✅
- [x] Test seed data relationships across packages (CRM→Finance, Marketing→CRM, etc.)
- [x] Test plugin registration order respects dependencies
- [x] Test vertical package integration with core clouds
- [x] Test AI agents can access cross-package data

**13E-4 — Documentation Updates:** ✅
- [x] Update `docs/SALESFORCE_FEATURE_COMPARISON.md` with resolved gap analysis
- [x] Update `README.md` with latest metrics
- [x] Update `content/docs/roadmap.mdx` with seed validation details
- [x] Add `content/docs/guides/seed-data.mdx` — comprehensive seed data guide
- [x] Update QUICK_REFERENCE.md with `*.seed.ts` file convention

---

### Phase 12E: Advanced AI & Enterprise Features (2027+)

> Goal: Next-generation AI capabilities and enterprise-grade platform features.

#### Advanced AI

- [x] **Computer Vision** — business card scanning via camera, document OCR for invoices/contracts, receipt parsing for expense reports
- [x] **Voice AI** — meeting transcription with speaker identification, voice-to-text for call notes, sentiment analysis on call recordings
- [x] **Anomaly Detection** — fraud detection for financial transactions, unusual login pattern alerts, data quality scoring with auto-correction suggestions
- [x] **Predictive Forecasting** — revenue forecasting with Monte Carlo confidence intervals, customer churn prediction with explainability, demand forecasting for products
- [x] **Multi-Modal Agents** — agents that can see (document analysis), hear (call transcription), and reason (cross-modal insights) across data types

#### Enterprise Features

- [x] **Multi-Tenancy** — multiple organizations in a single instance with data isolation, tenant-specific customization, shared infrastructure
- [x] **SOC 2 Compliance** — comprehensive audit logging, encryption at rest and in transit, access controls with MFA, vulnerability scanning
- [x] **Data Residency** — regional data storage for GDPR (EU), CCPA (California), LGPD (Brazil), and local regulations; tenant-level data location config
- [x] **White-Label** — customizable branding (logo, colors, domain), partner and reseller portal, custom login pages
- [x] **Marketplace** — third-party app marketplace for community-built extensions, app review process, usage analytics, billing integration

---

## Version Upgrade History

| Date | From | To | Breaking Changes | Tests |
|------|------|----|-----------------|-------|
| 2027-02-21 | v3.0.8 | v3.0.8 | None (Phase 14 complete: Activity Feed/Chatter across 6 clouds, 4 Interface Builder blank pages, Dashboard headers & global filters on 6 clouds, ViewTabs on 18 views, Feed API 8 endpoints, Feed service contract, System metadata, Studio builder configs, Navigation areas, 327 new tests) | 3707 ✅ |
| 2026-02-21 | v3.0.6 | v3.0.8 | None (New: Activity Feed/Chatter system, Interface Builder/Blank Pages, Dashboard headers & global filters, Feed API contracts, Studio builder configs, Oclif CLI plugin, Package conventions; Phase 14 roadmap added) | 3318 ✅ |
| 2026-02-16 | v3.0.0 | v3.0.0 | None (Phase 13 roadmap: Module-by-module deep optimization, seed data foundation, vertical package UI enhancement, core cloud metadata equalization) | 3318 ✅ |
| 2026-02-13 | v3.0.0 | v3.0.0 | None (Phase 10.6 roadmap: FormView & Page Layout Deep Enhancement — 6 form layout types, collapsible sections, field-level controls, 4 page types, AI components, assignedProfiles, component visibility, ComponentPropsMap alignment) | 2271 ✅ |
| 2026-02-13 | v3.0.0 | v3.0.0 | None (Metadata evaluation: assessed all @objectstack/spec schemas, identified 27 high-value unused types, added Phase 10.5 Deep Metadata Adoption roadmap) | 1759 ✅ |
| 2026-02-12 | v3.0.0 | v3.0.0 | None (Phase 10: Salesforce Feature Parity — +25 objects, cross-cloud lifecycle, forecast/territory/journey/subscription/order models) | 1759 ✅ |
| 2026-02-12 | v3.0.0 | v3.0.0 | None (Phase 9: DX — DEVELOPMENT_WORKFLOW.md, ARCHITECTURE.md, link-check CI, pnpm typecheck/test:changed/stats, README badges and Mermaid diagram, metrics sync) | 1629 ✅ |
| 2026-02-12 | v3.0.0 | v3.0.0 | None (Phase 9: DX audit — fixed 20+ broken README links, updated stats, CONTRIBUTING.md pnpm migration) | 1629 ✅ |
| 2026-02-12 | v3.0.0 | v3.0.0 | None (Phase 7B-8: Studio plugins, UI completeness, hooks, integration tests, system configs, docs) | 1629 ✅ |
| 2026-02-12 | v2.0.6 | v3.0.0 | Zod 3→4, removed hub/auth/driver/permission modules, new ObjectSchema.create() API | 1604 ✅ |
| 2026-02-12 | v2.0.6 | v2.0.6 | None (Phase 7 roadmap: UI completeness, cross-cloud integration, hook expansion) | 1604 ✅ |
| 2026-02-12 | v2.0.6 | v2.0.6 | None (Phase 6: spec deep adoption, Field.masterDetail, DashboardSchema, EventSchema) | 1604 ✅ |
| 2026-02-12 | v2.0.6 | v2.0.6 | None (Spec capability evaluation, Phase 6 roadmap) | 1506 ✅ |
| 2026-02-11 | v2.0.6 | v2.0.6 | None (Phase 5: AI agent workflows, benchmarking, deployment) | 1506 ✅ |
| 2026-02-11 | v2.0.6 | v2.0.6 | None (Phase 3-4 completion) | 1457 ✅ |
| 2026-02-11 | v2.0.6 | v2.0.6 | None (roadmap completion) | 1365 ✅ |
| 2026-02-11 | v2.0.3 | v2.0.6 | None | 933 ✅ |
| 2026-02-10 | v2.0.1 | v2.0.3 | None | 933 ✅ |
| 2026-02-09 | v2.0.0 | v2.0.1 | None | 496 ✅ |
| 2026-02-08 | v1.1.0 | v2.0.0 | Hook API migration | 496 ✅ |
| 2026-02-07 | v1.0.4 | v1.1.0 | None | 496 ✅ |
| 2026-02-05 | v1.0.0 | v1.0.4 | None | 378 ✅ |
| 2026-02-04 | v0.9.2 | v1.0.0 | None | 378 ✅ |

---

**Want to contribute?** See our [Contributing Guide](CONTRIBUTING.md) to get started.
