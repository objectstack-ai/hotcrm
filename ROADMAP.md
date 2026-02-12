# HotCRM Development Roadmap

> Comprehensive improvement plan based on @objectstack/spec v2.0.6 protocol compliance scan.
> Generated: February 11, 2026 | Protocol: @objectstack/spec v2.0.6

## Current State Summary

| Metric | Value |
|--------|-------|
| Protocol Version | @objectstack/spec v2.0.6 |
| Business Objects | 69 across 6 clouds |
| Hook Files | 47 across 6 packages |
| Action Files | 27 across 7 packages |
| Workflow Files | 6 across 6 packages + 6 AI agent workflows (all registered) |
| State Machines | 3 (case, lead, opportunity) |
| Permission Sets | 6 (one per business cloud) |
| Event Definitions | 6 (one per business cloud) |
| Capability Manifests | 6 (one per business cloud) |
| Test Files | 108 files, 1604 tests (all passing) |
| TypeScript Compliance | 100% (zero type errors) |
| Protocol Compliance | 100% (all objects pass ObjectSchema.parse()) |
| Spec Schema Adoption | ~15% (Phase 6 target met) |

---

## Per-Module Improvement Plans

### 📦 CRM Package (`@hotcrm/crm`) — Sales Cloud

**Objects**: 8 (account, activity, contact, lead, opportunity, task, note, assignment_rule)
**Hooks**: 8 files | **Actions**: 8 files | **Tests**: 20 files

#### ✅ Recently Fixed
- [x] PascalCase `Field.lookup()` references fixed (activity.object.ts, task.object.ts)
- [x] All 32 spec-compliance tests passing

#### 🔴 P0 — Code Quality
- [x] Translate Chinese text in `schemas/lead.schema.ts` (30 `.describe()` fields in Chinese)
- [x] Translate Chinese text in `actions/ai_smart_briefing.action.ts` (50+ Chinese strings in industry data and AI-generated mock responses)
- [x] Resolve TODO in `hooks/lead.hook.ts:337` — lead conversion logic fully implemented

#### 🟡 P1 — Test Coverage
- [x] Add hook tests for `lead.hook.ts` (scoring, status change triggers)
- [x] Add hook tests for `account.hook.ts` (health score, hierarchy triggers)
- [x] Add hook tests for `opportunity.hook.ts` (validation, stage change)
- [x] Add hook tests for `contact.hook.ts` and `activity.hook.ts`
- [x] Add action tests for remaining 5 untested actions (lead_ai, lead_convert, opportunity_ai, enhanced_lead_scoring, ai_smart_briefing)

#### 🟢 P2 — Feature Gaps
- [x] Register Contact and Activity triggers in `plugin.ts` (functions exist but aren't exported)
- [x] Add hooks for task, note, and assignment_rule objects
- [x] Add workflow definitions for lead assignment and opportunity pipeline automation
- [x] Migrate `db.ts` shim to direct `@objectstack/runtime` broker API

---

### 📦 Finance Package (`@hotcrm/finance`) — Revenue Cloud

**Objects**: 4 (contract, invoice, invoice_line, payment)
**Hooks**: 5 files | **Actions**: 4 files | **Tests**: 11 files

#### ✅ Recently Fixed
- [x] All 16 spec-compliance tests passing
- [x] All labels in English

#### 🟡 P1 — Test Coverage
- [x] Add hook tests for `contract.hook.ts` (billing, renewal, expiration hooks)
- [x] Add hook tests for `contract_renewal.hook.ts`
- [x] Add action tests for `revenue_dashboard.action.ts` and `revenue_forecast.action.ts`

#### 🟢 P2 — Feature Gaps
- [x] Add hooks for `invoice` object (invoice status change, due date validation, overdue detection)
- [x] Add hooks for `payment` object (payment matching, overpayment handling, receipt generation)
- [x] Add hooks for `invoice_line` object (line item calculations, tax computation)
- [x] Register actions in `plugin.ts` (4 action files exist but aren't exported)
- [x] Implement payment reminder workflow logic (workflow file exists but may need hooks)
- [x] Migrate `db.ts` shim to direct `@objectstack/runtime` broker API

#### 🔵 P3 — Architecture
- [x] Consider splitting large action files (`revenue_forecast.action.ts`, `revenue_dashboard.action.ts`) — evaluated: files are well-organized with clear section boundaries; splitting deferred to avoid unnecessary import churn

---

### 📦 HR Package (`@hotcrm/hr`) — Human Capital Management

**Objects**: 16 (employee, candidate, application, interview, offer, onboarding, recruitment, position, department, goal, performance_review, training, certification, attendance, time_off, payroll)
**Hooks**: 12 files | **Actions**: 4 files | **Tests**: 20 files

#### ✅ Recently Fixed
- [x] All 64 spec-compliance tests passing
- [x] All labels in English
- [x] Zero TODO/FIXME comments

#### 🟡 P1 — Test Coverage
- [x] Add hook tests for `candidate.hook.ts` (scoring, status change)
- [x] Add hook tests for `employee.hook.ts` (onboarding, status, data validation)
- [x] Add hook tests for `offer.hook.ts` (creation, status, approval)
- [x] Add action tests for `hr_analytics.action.ts`

#### 🟢 P2 — Feature Gaps
- [x] Export hooks and actions in `plugin.ts` (currently only objects are registered)
- [x] Add hooks for `application` and `interview` objects (application status workflow, interview scheduling)
- [x] Add hooks for `onboarding` object (checklist automation, task assignment)
- [x] Add hooks for `recruitment` object (pipeline stage validation)
- [x] Add hooks for `payroll` object (calculation validation, approval)
- [x] Add hooks for `time_off` object (balance validation, manager approval)
- [x] Add hooks for `attendance` object (clock-in/out validation)
- [x] Add hooks for `goal` object (progress tracking, alignment)
- [x] Migrate `db.ts` shim to direct `@objectstack/runtime` broker API

#### 🔵 P3 — Documentation
- [x] Create `developers/specs/hr/` technical specification directory
- [x] Document recruitment pipeline stages and lifecycle
- [x] Document payroll calculation logic and tax rules

---

### 📦 Marketing Package (`@hotcrm/marketing`) — Marketing Cloud

**Objects**: 11 (campaign, campaign_member, email_template, form, landing_page, marketing_list, unsubscribe, automation_workflow, email_send, lead_nurture_program, touchpoint)
**Hooks**: 8 files | **Actions**: 3 files | **Tests**: 9 files

#### ✅ Recently Fixed
- [x] All 28 spec-compliance tests passing
- [x] All labels in English
- [x] Zero TODO/FIXME comments

#### 🔴 P0 — Code Quality
- [x] Add try-catch error handling to `roi.hook.ts` (currently has no error handling)

#### 🟡 P1 — Test Coverage
- [x] Add action tests for `campaign_ai.action.ts`
- [x] Add action tests for `content_generator.action.ts`
- [x] Add action tests for `marketing_analytics.action.ts`

#### 🟢 P2 — Feature Gaps
- [x] Register actions in `plugin.ts` (3 action files exist but aren't exported)
- [x] Add hooks for `email_template` object (content validation, personalization)
- [x] Add hooks for `form` object (submission handling, lead creation)
- [x] Add hooks for `landing_page` object (publish/unpublish lifecycle)
- [x] Add hooks for `marketing_list` object (membership validation, deduplication)
- [x] Add hooks for `unsubscribe` object (compliance enforcement, global suppression)
- [x] Implement campaign automation workflow
- [x] Migrate `db.ts` shim to direct `@objectstack/runtime` broker API

---

### 📦 Products Package (`@hotcrm/products`) — CPQ Cloud

**Objects**: 9 (product, pricebook, quote, quote_line_item, product_bundle, product_bundle_component, price_rule, approval_request, discount_schedule)
**Hooks**: 8 files | **Actions**: 3 files | **Tests**: 13 files

#### ✅ Recently Fixed
- [x] All 36 spec-compliance tests passing
- [x] All labels in English
- [x] Zero TODO/FIXME comments

#### 🟡 P1 — Test Coverage
- [x] Add hook tests for `product.hook.ts` (config validation, stock, price changes)
- [x] Add hook tests for `pricebook.hook.ts` (date validation, currency, status)
- [x] Add hook tests for `quote.hook.ts` (pricing calculation, approval routing)

#### 🟢 P2 — Feature Gaps
- [x] Register actions in `plugin.ts` (3 action files exist but aren't exported)
- [x] Add hooks for `quote_line_item` object (line calculations, quantity validation)
- [x] Add hooks for `product_bundle` object (bundle validation, component completeness)
- [x] Add hooks for `price_rule` object (rule validation, conflict detection)
- [x] Add hooks for `approval_request` object (workflow triggers, escalation)
- [x] Add hooks for `discount_schedule` object (schedule activation, overlap detection)
- [x] Migrate `db.ts` shim to direct `@objectstack/runtime` broker API

---

### 📦 Support Package (`@hotcrm/support`) — Service Cloud

**Objects**: 21 (case, case_comment, knowledge_article, sla_policy, sla_template, sla_milestone, business_hours, holiday_calendar, holiday, queue, queue_member, routing_rule, escalation_rule, skill, agent_skill, email_to_case, web_to_case, social_media_case, portal_user, forum_topic, forum_post)
**Hooks**: 6 files | **Actions**: 4 files | **Tests**: 14 files

#### ✅ Recently Fixed
- [x] All 84 spec-compliance tests passing
- [x] Zero TODO/FIXME comments
- [x] Chinese text in language labels (`简体中文`, `繁體中文`, `日本語`) intentionally kept in native script

#### 🟡 P1 — Test Coverage
- [x] Add hook tests for `knowledge.hook.ts` (5 hooks exist but not exported in plugin.ts)
- [x] Add action tests for `case_ai.action.ts`
- [x] Add integration tests for case escalation workflow

#### 🟢 P2 — Feature Gaps
- [x] Export knowledge hooks in `plugin.ts` (knowledge.hook.ts has 5 hooks but only case hook is registered)
- [x] Add hooks for SLA enforcement (`sla_policy`, `sla_milestone` — automated tracking)
- [x] Add hooks for case routing (`routing_rule`, `escalation_rule` — auto-assignment)
- [x] Add hooks for queue management (`queue`, `queue_member` — load balancing)
- [x] Add hooks for community (`forum_topic`, `forum_post` — moderation, notification)
- [x] Implement case escalation workflow
- [x] Migrate `db.ts` shim to direct `@objectstack/runtime` broker API

---

### 📦 AI Package (`@hotcrm/ai`) — Intelligence Layer

**Source Files**: 12 | **Tests**: 9 files

#### ✅ Current State
- [x] Comprehensive AI service layer with ML model integration
- [x] Provider factory supporting OpenAI, AWS SageMaker, Azure ML
- [x] Cache manager, performance monitor, and explainability service
- [x] All labels in English, zero TODO/FIXME comments

#### 🟢 P2 — Feature Gaps
- [x] Create `developers/specs/ai/` technical specification directory
- [x] Add MCP (Model Context Protocol) server configuration (new `@objectstack/spec/ai` feature)
- [x] Add integration tests for provider factory end-to-end flow
- [x] Document model registry usage patterns and AI agent architecture
- [x] Add advanced AI agent workflows (6 cross-package orchestration pipelines)
- [x] Add performance benchmarking utilities (Benchmark, BenchmarkSuite, formatBenchmarkResults)

---

## Cross-Cutting Improvement Areas

### 🔴 P0 — Protocol Compliance

| Area | Status | Action |
|------|--------|--------|
| @objectstack/spec version | ✅ v2.0.6 | Upgrade complete |
| ObjectSchema.parse() compliance | ✅ 100% | All 69 objects pass |
| snake_case field naming | ✅ 100% | All field names compliant |
| snake_case lookup references | ✅ 100% | Last 4 PascalCase references fixed |
| Enable config properties | ✅ Compliant | Only using spec-supported properties |

### 🟡 P1 — Internationalization

| Package | Chinese Text | Action |
|---------|-------------|--------|
| CRM | `lead.schema.ts` (30 fields), `ai_smart_briefing.action.ts` (50+ strings) | ✅ Translated to English |
| Support | Language labels in `portal_user.object.ts`, `knowledge_article.object.ts` | Keep as-is (native script names) |
| HR | Test data in `employee.hook.test.ts` | Keep as-is (valid test data) |
| Others | None | ✅ Clean |

### 🟢 P2 — Architecture & Tooling

| Area | Status | Action |
|------|--------|--------|
| `db.ts` shim files | ✅ Migrated | All 6 packages migrated to `broker` API |
| Plugin action registration | ✅ All registered | Actions registered in all plugin.ts exports |
| Plugin workflow registration | ✅ All registered | Workflows registered in all 6 plugin.ts exports |
| Hook coverage | 47 hooks / 69 objects (68%) | Continue adding hooks for remaining objects |
| Test coverage | 1604 tests / 108 files | Continue expanding coverage |
| `defineStack()` config pattern | ✅ Consistent | All packages use correct pattern |
| State machine definitions | ✅ 3 defined | Case, Lead, Opportunity lifecycles |
| Event definitions | ✅ 6 defined | All business packages have event contracts |
| Capability manifests | ✅ 6 defined | All business packages declare capabilities |
| Permission sets | ✅ 6 defined | All business packages have permission sets |

### 🔵 P3 — @objectstack/spec Adoption (see [Evaluation Report](/docs/architecture/spec-capability-evaluation))

| Area | Status | Action |
|------|--------|--------|
| Spec schema adoption rate | ✅ ~15% | Phase 6 target met |
| UI schema typing | ✅ Typed | Page/View/Dashboard/Form/App files use spec schemas |
| Workflow schema validation | ✅ Validated | All 6 workflow files use `WorkflowRuleSchema.parse()` |
| Plugin type safety | ✅ `PluginDefinition` | All plugins typed and validated with `PluginSchema.parse()` |
| State machine definitions | ✅ Defined | Case, Lead, Opportunity lifecycles formalized |
| Approval process schema | ✅ `ApprovalProcessSchema` | Products approval uses spec schema |
| Agent schema adoption | ✅ `AgentSchema` | 6 AI agents use spec schema |
| Security metadata | ✅ Defined | Permission sets, sharing rules, territory model |
| Advanced field types | ✅ 20+/44 used | masterDetail, summary, select({multiple}), file, image, location, address |
| Advanced validations | ❌ Not used | Cross-field, conditional, async validations — deferred |

---

## Phased Execution Plan

### Phase 1: Quality & Compliance (Week 1-2)
- [x] Translate remaining Chinese text in CRM package
- [x] Add error handling to `marketing/roi.hook.ts`
- [x] Register missing hooks and actions in all `plugin.ts` files
- [x] Resolve TODO in `crm/hooks/lead.hook.ts`

### Phase 2: Test Coverage (Week 3-5)
- [x] Add hook tests for CRM (8 hook files × ~10 tests each)
- [x] Add hook tests for Products (8 hook files × ~10 tests each)
- [x] Add hook tests for Finance (5 hook files × ~10 tests each)
- [x] Add hook tests for HR (11 hook files × ~10 tests each)
- [x] Add missing action tests across all packages
- [x] Target: 80%+ test coverage across all 6 business packages

### Phase 3: Feature Completeness (Week 6-8)
- [x] Implement hooks for Support SLA, routing, queue management
- [x] Implement hooks for HR application, interview, onboarding, time-off
- [x] Implement hooks for Finance invoice, payment
- [x] Implement hooks for Products quote_line_item, approval_request
- [x] Implement hooks for Marketing email_send, automation_workflow, lead_nurture, attribution
- [x] Add new Marketing objects (automation_workflow, email_send, lead_nurture_program, touchpoint)
- [x] Migrate all 6 `db.ts` shim files to runtime broker
- [x] Add workflow definitions for marketing automation, case escalation, payment reminders
- [x] Add MCP server configuration for AI agent integration

### Phase 4: Documentation & DX (Week 9-10)
- [x] Create HR and AI technical specification directories
- [x] Generate per-object field API reference documentation
- [x] Add code examples for hooks, actions, and workflows
- [x] Update developer guides with latest patterns

### Phase 5: Integration & Business Features (Week 11+)
- [x] Advanced AI Agent workflows (6 cross-package agent pipelines: lead-to-close, customer 360, churn prevention, case resolution, talent acquisition, revenue optimization)
- [x] Performance benchmarking and optimization (Benchmark/BenchmarkSuite utilities with percentile tracking)
- [x] Production deployment guides (Docker, Kubernetes — Dockerfile, docker-compose.yml, K8s manifests, DEPLOYMENT.md)
- [ ] Integration connectors (Stripe, DocuSign, Slack) — deferred to 2027 roadmap
- [ ] Business Intelligence & Analytics package — deferred to 2027 roadmap

### Phase 6: @objectstack/spec Deep Adoption (Week 12-16)

> Based on the [Spec Capability Evaluation](/docs/architecture/spec-capability-evaluation) — only ~3.4% of available spec schemas are currently used. This phase aims to increase adoption to ~15% by targeting high-impact gaps.

#### 6A: UI Schema Typing (P0 — Type Safety)
- [x] Convert page layouts to use `PageSchema` from `@objectstack/spec/ui` (4 files: account, invoice, campaign, product_bundle)
- [x] Convert list views to use `ViewSchema` from `@objectstack/spec/ui` (1 file: account.view.ts)
- [x] Add `AppSchema` definition for navigation and branding configuration
- [x] Add `DashboardSchema` definitions for CRM pipeline, sales, support metrics, and HR dashboards
- [x] Add `FormViewSchema` definitions for key data entry forms (account.form.ts)

#### 6B: Automation Schema Adoption (P0 — Correctness)
- [x] Validate all 6 workflow files against `WorkflowRuleSchema.parse()`
- [x] Define `StateMachineSchema` for case status lifecycle
- [x] Define `StateMachineSchema` for lead qualification lifecycle
- [x] Define `StateMachineSchema` for opportunity pipeline stages
- [x] Convert products approval workflow to use `ApprovalProcessSchema` (quote_approval.process.ts)
- [x] Add `TimeTriggerSchema` for scheduled workflow configurations (case_sla.timetrigger.ts)

#### 6C: Plugin & Kernel Typing (P0 — Type Safety)
- [x] Replace `any` type on all plugin definitions with proper `PluginSchema` typing
- [x] Add `PluginCapabilityManifest` declarations to each business package
- [x] Define `EventSchema` for cross-package event communication (all 6 packages)

#### 6D: Advanced Field Types (P1 — Data Model Completeness)
- [x] Adopt `Field.masterDetail()` for parent-child relationships (invoice→invoice_line, quote→quote_line_item, product_bundle→component, case→case_comment)
- [x] Adopt `Field.summary()` for rollup/aggregate fields (e.g., account→total contract value)
- [x] Adopt `Field.select({ multiple: true })` where multiple selections are needed
- [x] Adopt `Field.file()` and `Field.image()` for attachment fields
- [x] Adopt `Field.location()` and `Field.address()` for geographic data

#### 6E: AI Schema Formalization (P1 — Agent Architecture)
- [x] Convert 6 AI agent workflows to use `AgentSchema` from `@objectstack/spec/ai`
- [x] Define `RAGPipelineConfig` for knowledge base AI integration
- [x] Adopt `ModelConfig` / `ModelRegistry` schemas for model management
- [x] Add `NLQRequest`/`NLQResponse` schemas for natural language query interface

#### 6F: Security Metadata (P2 — Enterprise Readiness)
- [x] Define `PermissionSet` for each business cloud (CRM, Finance, HR, Marketing, Products, Support)
- [x] Define `ObjectPermission` and `FieldPermission` for sensitive objects
- [x] Define `SharingRule` configurations for account/opportunity sharing
- [x] Add `TerritoryModel` for CRM territory-based access control

#### 6G: Prompt & Instruction Updates
- [x] Update `.github/copilot-instructions.md` with schema validation requirements for UI/workflow/plugin files
- [x] Add expanded field type guidance to coding conventions
- [x] Add new file suffix conventions: `*.dashboard.ts`, `*.form.ts`, `*.permission.ts`, `*.statemachine.ts`, `*.capabilities.ts`, `*.events.ts`

**Note**: Visual Workflow Builder and other low-code platform features are out of scope for HotCRM. These are platform-level capabilities provided by `@objectstack/runtime`.

### Phase 7: UI Completeness & Cross-Cloud Integration (Week 17-24)

> Currently only 4 page layouts, 1 list view, 4 dashboards, and 1 form view exist for 69 objects. This phase aims to provide UI metadata coverage for all primary business objects and establish cross-cloud data flow patterns.

#### 7A: Page Layout Expansion (P0 — UI Completeness)
- [ ] Add `opportunity.page.ts` — Deal details, amount, stage, close date, related contacts and activities
- [ ] Add `contact.page.ts` — Contact details, related accounts, opportunities, and activities
- [ ] Add `lead.page.ts` — Lead details, scoring, conversion history, and related activities
- [ ] Add `case.page.ts` — Case details, SLA status, comments, knowledge suggestions
- [ ] Add `employee.page.ts` — Employee profile, department, manager, training, certifications
- [ ] Add `candidate.page.ts` — Candidate profile, applications, interviews, offer history
- [ ] Add `contract.page.ts` — Contract terms, line items, renewal timeline, related invoices
- [ ] Add `quote.page.ts` — Quote details, line items, pricing, discount schedule, approval status
- [ ] Add `product.page.ts` — Product catalog detail, pricing, bundles, availability
- [ ] Add `knowledge_article.page.ts` — Article content, version history, categories, related cases

#### 7B: List View Expansion (P0 — Navigation)
- [ ] Add `opportunity.view.ts` — Pipeline board, filters by stage/owner/amount/close date
- [ ] Add `contact.view.ts` — Contact directory with account grouping, last activity
- [ ] Add `lead.view.ts` — Lead queue with score, status, source filters
- [ ] Add `case.view.ts` — Case queue with priority, SLA countdown, assignment
- [ ] Add `employee.view.ts` — Organization directory with department/role filters
- [ ] Add `campaign.view.ts` — Campaign list with status, budget, ROI metrics
- [ ] Add `contract.view.ts` — Contract list with renewal dates, value, status
- [ ] Add `quote.view.ts` — Quote pipeline with approval status, value, expiry
- [ ] Add `product.view.ts` — Product catalog with category, price, availability filters
- [ ] Add `knowledge_article.view.ts` — Knowledge base with search, categories, popularity

#### 7C: Dashboard Expansion (P1 — Analytics)
- [ ] Add `marketing.dashboard.ts` — Campaign Performance, Email Metrics, Lead Funnel, ROI Trends
- [ ] Add `finance.dashboard.ts` — Revenue Pipeline, Collections Aging, Cash Flow, Contract Renewals
- [ ] Add `cpq.dashboard.ts` — Quote Pipeline, Win/Loss Analysis, Discount Usage, Approval Cycle Time
- [ ] Add `executive.dashboard.ts` — Cross-cloud executive summary combining Sales, Service, Revenue, and HR KPIs

#### 7D: Form View Expansion (P1 — Data Entry)
- [ ] Add `opportunity.form.ts` — Deal creation wizard with stage-driven required fields
- [ ] Add `contact.form.ts` — Contact creation with account auto-link and duplicate detection UI
- [ ] Add `lead.form.ts` — Lead capture form with source tracking and assignment preview
- [ ] Add `case.form.ts` — Case submission form with category-driven field visibility
- [ ] Add `employee.form.ts` — Employee onboarding form with department/manager lookup

#### 7E: Hook Coverage Expansion (P1 — Business Logic)
- [ ] Add hooks for Marketing: `email_template`, `form`, `landing_page`, `marketing_list`, `touchpoint`
- [ ] Add hooks for HR: `certification`, `department`, `position`, `training`
- [ ] Add hooks for Support: `agent_skill`, `portal_user`, `social_media_case`
- [ ] Target: 80%+ object hook coverage (currently ~68%, 47 hooks / 69 objects)

#### 7F: Cross-Cloud Integration Tests (P1 — Reliability)
- [ ] Lead-to-Opportunity conversion flow (CRM cross-object)
- [ ] Quote-to-Contract-to-Invoice conversion flow (Products → Finance)
- [ ] Campaign-to-Lead attribution flow (Marketing → CRM)
- [ ] Case-to-Knowledge self-service flow (Support cross-object)
- [ ] Employee-Onboarding-to-Training flow (HR cross-object)
- [ ] AI agent end-to-end pipeline tests (AI → CRM/Support/HR)

#### 7G: Advanced Data Model (P2 — Data Quality)
- [ ] Cross-field validations (e.g., close_date required when stage = 'Closed Won')
- [ ] Conditional required fields using spec `ConditionalValidation` schema
- [ ] Async validation patterns (duplicate detection for leads, contacts)
- [ ] `DataQualityRules` for email format, phone normalization, address standardization

#### 7H: System & API Configuration (P2 — Enterprise Readiness)
- [ ] Define `AuditConfig` for sensitive objects using `@objectstack/spec/system`
- [ ] Define `NotificationChannel` configurations for workflow email alerts
- [ ] Define `ApiEndpoint` declarations for external API surface using `@objectstack/spec/api`
- [ ] Define `WebhookConfig` for outbound event notifications using `@objectstack/spec/integration`
- [ ] Define `CacheConfig` for high-read objects (product catalog, knowledge articles)

#### 7I: Documentation Refresh (P2 — DX)
- [ ] Update `docs/roadmap.mdx` with current metrics (69 objects, 1604 tests, 47 hooks)
- [ ] Update `docs/modules/index.mdx` with accurate object counts per cloud
- [ ] Add cross-cloud integration pattern guides
- [ ] Add UI metadata authoring guide (page, view, dashboard, form patterns)
- [ ] Add field type selection guide with decision tree

---

## Future Business Packages (2027+)

These independent business packages are planned for future development:

### 📦 Analytics Package (`@hotcrm/analytics`) — Business Intelligence Cloud

**Planned for:** Q1 2027  
**Dependencies:** All business packages (CRM, Finance, HR, Marketing, Products, Support)

#### Scope
- **Reporting Engine**: Custom report builder with aggregations, grouping, and filtering
- **Dashboard Framework**: KPI cards, charts, and widgets
- **Predictive Analytics**: Forecasting models for revenue, churn, and growth
- **Data Visualization**: Charts, graphs, heatmaps, funnels
- **Cross-Object Analytics**: Join data across multiple business objects

#### Planned Objects
- `report` - Saved report definitions with filters and groupings
- `dashboard` - Dashboard layouts with widget configurations
- `kpi` - Key Performance Indicator definitions
- `metric` - Business metric calculations
- `forecast` - Predictive forecast models and results
- `data_source` - External data source connectors

#### AI Capabilities
- **Report AI**: Natural language report generation ("Show me top 10 customers by revenue")
- **Dashboard AI**: Auto-generate dashboard layouts based on role
- **Insight AI**: Automatic anomaly detection and trend alerts
- **Forecast AI**: ML-powered revenue and churn predictions

#### Integration Points
- Pull data from CRM (Accounts, Opportunities, Leads)
- Pull data from Finance (Revenue, Invoices, Contracts)
- Pull data from HR (Headcount, Performance, Turnover)
- Pull data from Marketing (Campaigns, ROI, Attribution)
- Pull data from Products (Sales, Quotes, Product Mix)
- Pull data from Support (Case Volume, Resolution Time, CSAT)

### 📦 Integration Package (`@hotcrm/integration`) — iPaaS Connectors

**Planned for:** Q2 2027  
**Dependencies:** Core business packages

#### Scope
- **External System Connectors**: Pre-built integrations for popular SaaS
- **Webhook Management**: Outbound webhooks for real-time events
- **Data Sync**: Bi-directional sync with external systems
- **API Middleware**: Transform and route data between systems

#### Planned Connectors
- Stripe (Payments)
- DocuSign (E-Signatures)
- Slack (Notifications)
- Gmail/Outlook (Email)
- Zoom (Video Calls)
- LinkedIn (Lead Enrichment)
- HubSpot (Marketing Data)
- Salesforce (Migration)

### 📦 Community Package (`@hotcrm/community`) — Customer Community Portal

**Planned for:** Q3 2027  
**Dependencies:** Support, CRM packages

#### Scope
- **Community Forums**: Discussion boards and Q&A
- **Idea Management**: Customer feature requests and voting
- **User Groups**: Customer communities by region, industry, etc.
- **Events Calendar**: User group meetings and webinars
- **Reputation System**: Badges, points, and leaderboards

#### Planned Objects
- `community` - Community portal configuration
- `forum_category` - Forum organization
- `idea` - Customer feature requests
- `user_group` - Community segmentation
- `event` - Community events
- `badge` - Gamification rewards

---

## Version Upgrade History

| Date | From | To | Breaking Changes | Tests |
|------|------|----|-----------------|-------|
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
