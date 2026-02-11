# HotCRM Development Roadmap

> Comprehensive improvement plan based on @objectstack/spec v2.0.6 protocol compliance scan.
> Generated: February 11, 2026 | Protocol: @objectstack/spec v2.0.6

## Current State Summary

| Metric | Value |
|--------|-------|
| Protocol Version | @objectstack/spec v2.0.6 |
| Business Objects | 65 across 6 clouds |
| Hook Files | 19 across 6 packages |
| Action Files | 27 across 7 packages |
| Test Files | 48 files, 933 tests (all passing) |
| TypeScript Compliance | 100% (zero type errors) |
| Protocol Compliance | 100% (all objects pass ObjectSchema.parse()) |

---

## Per-Module Improvement Plans

### 📦 CRM Package (`@hotcrm/crm`) — Sales Cloud

**Objects**: 8 (account, activity, contact, lead, opportunity, task, note, assignment_rule)
**Hooks**: 5 files | **Actions**: 8 files | **Tests**: 7 files

#### ✅ Recently Fixed
- [x] PascalCase `Field.lookup()` references fixed (activity.object.ts, task.object.ts)
- [x] All 32 spec-compliance tests passing

#### 🔴 P0 — Code Quality
- [ ] Translate Chinese text in `schemas/lead.schema.ts` (30 `.describe()` fields in Chinese)
- [ ] Translate Chinese text in `actions/ai_smart_briefing.action.ts` (50+ Chinese strings in industry data and AI-generated mock responses)
- [ ] Resolve TODO in `hooks/lead.hook.ts:337` — implement full lead conversion logic

#### 🟡 P1 — Test Coverage
- [ ] Add hook tests for `lead.hook.ts` (scoring, status change triggers)
- [ ] Add hook tests for `account.hook.ts` (health score, hierarchy triggers)
- [ ] Add hook tests for `opportunity.hook.ts` (validation, stage change)
- [ ] Add hook tests for `contact.hook.ts` and `activity.hook.ts`
- [ ] Add action tests for remaining 5 untested actions (lead_ai, lead_convert, opportunity_ai, enhanced_lead_scoring, ai_smart_briefing)

#### 🟢 P2 — Feature Gaps
- [ ] Register Contact and Activity triggers in `plugin.ts` (functions exist but aren't exported)
- [ ] Add hooks for task, note, and assignment_rule objects
- [ ] Add workflow definitions for lead assignment and opportunity pipeline automation
- [ ] Migrate `db.ts` shim to direct `@objectstack/runtime` broker API

---

### 📦 Finance Package (`@hotcrm/finance`) — Revenue Cloud

**Objects**: 4 (contract, invoice, invoice_line, payment)
**Hooks**: 2 files | **Actions**: 4 files | **Tests**: 5 files

#### ✅ Recently Fixed
- [x] All 16 spec-compliance tests passing
- [x] All labels in English

#### 🟡 P1 — Test Coverage
- [ ] Add hook tests for `contract.hook.ts` (billing, renewal, expiration hooks)
- [ ] Add hook tests for `contract_renewal.hook.ts`
- [ ] Add action tests for `revenue_dashboard.action.ts` and `revenue_forecast.action.ts`

#### 🟢 P2 — Feature Gaps
- [ ] Add hooks for `invoice` object (invoice status change, due date validation, overdue detection)
- [ ] Add hooks for `payment` object (payment matching, overpayment handling, receipt generation)
- [ ] Add hooks for `invoice_line` object (line item calculations, tax computation)
- [ ] Register actions in `plugin.ts` (4 action files exist but aren't exported)
- [ ] Implement payment reminder workflow logic (workflow file exists but may need hooks)
- [ ] Migrate `db.ts` shim to direct `@objectstack/runtime` broker API

#### 🔵 P3 — Architecture
- [ ] Consider splitting large action files (`revenue_forecast.action.ts`, `revenue_dashboard.action.ts`) into smaller modules

---

### 📦 HR Package (`@hotcrm/hr`) — Human Capital Management

**Objects**: 16 (employee, candidate, application, interview, offer, onboarding, recruitment, position, department, goal, performance_review, training, certification, attendance, time_off, payroll)
**Hooks**: 4 files | **Actions**: 3 files | **Tests**: 10 files

#### ✅ Recently Fixed
- [x] All 64 spec-compliance tests passing
- [x] All labels in English
- [x] Zero TODO/FIXME comments

#### 🟡 P1 — Test Coverage
- [ ] Add hook tests for `candidate.hook.ts` (scoring, status change)
- [ ] Add hook tests for `employee.hook.ts` (onboarding, status, data validation)
- [ ] Add hook tests for `offer.hook.ts` (creation, status, approval)
- [ ] Add action tests for `hr_analytics.action.ts`

#### 🟢 P2 — Feature Gaps
- [ ] Export hooks and actions in `plugin.ts` (currently only objects are registered)
- [ ] Add hooks for `application` and `interview` objects (application status workflow, interview scheduling)
- [ ] Add hooks for `onboarding` object (checklist automation, task assignment)
- [ ] Add hooks for `recruitment` object (pipeline stage validation)
- [ ] Add hooks for `payroll` object (calculation validation, approval)
- [ ] Add hooks for `time_off` object (balance validation, manager approval)
- [ ] Add hooks for `attendance` object (clock-in/out validation)
- [ ] Add hooks for `goal` object (progress tracking, alignment)
- [ ] Migrate `db.ts` shim to direct `@objectstack/runtime` broker API

#### 🔵 P3 — Documentation
- [ ] Create `developers/specs/hr/` technical specification directory
- [ ] Document recruitment pipeline stages and lifecycle
- [ ] Document payroll calculation logic and tax rules

---

### 📦 Marketing Package (`@hotcrm/marketing`) — Marketing Cloud

**Objects**: 7 (campaign, campaign_member, email_template, form, landing_page, marketing_list, unsubscribe)
**Hooks**: 3 files | **Actions**: 3 files | **Tests**: 4 files

#### ✅ Recently Fixed
- [x] All 28 spec-compliance tests passing
- [x] All labels in English
- [x] Zero TODO/FIXME comments

#### 🔴 P0 — Code Quality
- [ ] Add try-catch error handling to `roi.hook.ts` (currently has no error handling)

#### 🟡 P1 — Test Coverage
- [ ] Add action tests for `campaign_ai.action.ts`
- [ ] Add action tests for `content_generator.action.ts`
- [ ] Add action tests for `marketing_analytics.action.ts`

#### 🟢 P2 — Feature Gaps
- [ ] Register actions in `plugin.ts` (3 action files exist but aren't exported)
- [ ] Add hooks for `email_template` object (content validation, personalization)
- [ ] Add hooks for `form` object (submission handling, lead creation)
- [ ] Add hooks for `landing_page` object (publish/unpublish lifecycle)
- [ ] Add hooks for `marketing_list` object (membership validation, deduplication)
- [ ] Add hooks for `unsubscribe` object (compliance enforcement, global suppression)
- [ ] Implement campaign automation workflow
- [ ] Migrate `db.ts` shim to direct `@objectstack/runtime` broker API

---

### 📦 Products Package (`@hotcrm/products`) — CPQ Cloud

**Objects**: 9 (product, pricebook, quote, quote_line_item, product_bundle, product_bundle_component, price_rule, approval_request, discount_schedule)
**Hooks**: 3 files | **Actions**: 3 files | **Tests**: 7 files

#### ✅ Recently Fixed
- [x] All 36 spec-compliance tests passing
- [x] All labels in English
- [x] Zero TODO/FIXME comments

#### 🟡 P1 — Test Coverage
- [ ] Add hook tests for `product.hook.ts` (config validation, stock, price changes)
- [ ] Add hook tests for `pricebook.hook.ts` (date validation, currency, status)
- [ ] Add hook tests for `quote.hook.ts` (pricing calculation, approval routing)

#### 🟢 P2 — Feature Gaps
- [ ] Register actions in `plugin.ts` (3 action files exist but aren't exported)
- [ ] Add hooks for `quote_line_item` object (line calculations, quantity validation)
- [ ] Add hooks for `product_bundle` object (bundle validation, component completeness)
- [ ] Add hooks for `price_rule` object (rule validation, conflict detection)
- [ ] Add hooks for `approval_request` object (workflow triggers, escalation)
- [ ] Add hooks for `discount_schedule` object (schedule activation, overlap detection)
- [ ] Migrate `db.ts` shim to direct `@objectstack/runtime` broker API

---

### 📦 Support Package (`@hotcrm/support`) — Service Cloud

**Objects**: 21 (case, case_comment, knowledge_article, sla_policy, sla_template, sla_milestone, business_hours, holiday_calendar, holiday, queue, queue_member, routing_rule, escalation_rule, skill, agent_skill, email_to_case, web_to_case, social_media_case, portal_user, forum_topic, forum_post)
**Hooks**: 2 files | **Actions**: 4 files | **Tests**: 8 files

#### ✅ Recently Fixed
- [x] All 84 spec-compliance tests passing
- [x] Zero TODO/FIXME comments
- [x] Chinese text in language labels (`简体中文`, `繁體中文`, `日本語`) intentionally kept in native script

#### 🟡 P1 — Test Coverage
- [ ] Add hook tests for `knowledge.hook.ts` (5 hooks exist but not exported in plugin.ts)
- [ ] Add action tests for `case_ai.action.ts`
- [ ] Add integration tests for case escalation workflow

#### 🟢 P2 — Feature Gaps
- [ ] Export knowledge hooks in `plugin.ts` (knowledge.hook.ts has 5 hooks but only case hook is registered)
- [ ] Add hooks for SLA enforcement (`sla_policy`, `sla_milestone` — automated tracking)
- [ ] Add hooks for case routing (`routing_rule`, `escalation_rule` — auto-assignment)
- [ ] Add hooks for queue management (`queue`, `queue_member` — load balancing)
- [ ] Add hooks for community (`forum_topic`, `forum_post` — moderation, notification)
- [ ] Implement case escalation workflow
- [ ] Migrate `db.ts` shim to direct `@objectstack/runtime` broker API

---

### 📦 AI Package (`@hotcrm/ai`) — Intelligence Layer

**Source Files**: 11 | **Tests**: 7 files

#### ✅ Current State
- [x] Comprehensive AI service layer with ML model integration
- [x] Provider factory supporting OpenAI, AWS SageMaker, Azure ML
- [x] Cache manager, performance monitor, and explainability service
- [x] All labels in English, zero TODO/FIXME comments

#### 🟢 P2 — Feature Gaps
- [ ] Create `developers/specs/ai/` technical specification directory
- [ ] Add MCP (Model Context Protocol) server configuration (new `@objectstack/spec/ai` feature)
- [ ] Add integration tests for provider factory end-to-end flow
- [ ] Document model registry usage patterns and AI agent architecture

---

## Cross-Cutting Improvement Areas

### 🔴 P0 — Protocol Compliance

| Area | Status | Action |
|------|--------|--------|
| @objectstack/spec version | ✅ v2.0.6 | Upgrade complete |
| ObjectSchema.parse() compliance | ✅ 100% | All 65 objects pass |
| snake_case field naming | ✅ 100% | All field names compliant |
| snake_case lookup references | ✅ 100% | Last 4 PascalCase references fixed |
| Enable config properties | ✅ Compliant | Only using spec-supported properties |

### 🟡 P1 — Internationalization

| Package | Chinese Text | Action |
|---------|-------------|--------|
| CRM | `lead.schema.ts` (30 fields), `ai_smart_briefing.action.ts` (50+ strings) | Translate to English |
| Support | Language labels in `portal_user.object.ts`, `knowledge_article.object.ts` | Keep as-is (native script names) |
| HR | Test data in `employee.hook.test.ts` | Keep as-is (valid test data) |
| Others | None | ✅ Clean |

### 🟢 P2 — Architecture & Tooling

| Area | Status | Action |
|------|--------|--------|
| `db.ts` shim files | 6 packages | Migrate all to direct `@objectstack/runtime` broker |
| Plugin action registration | 4 packages missing | Register actions in plugin.ts exports |
| Hook coverage | 19 hooks / 65 objects (29%) | Add hooks for critical business objects |
| Test coverage | 933 tests / 48 files | Target 80%+ coverage with missing hook and action tests |
| `defineStack()` config pattern | ✅ Consistent | All packages use correct pattern |

---

## Phased Execution Plan

### Phase 1: Quality & Compliance (Week 1-2)
- [ ] Translate remaining Chinese text in CRM package
- [ ] Add error handling to `marketing/roi.hook.ts`
- [ ] Register missing hooks and actions in all `plugin.ts` files
- [ ] Resolve TODO in `crm/hooks/lead.hook.ts`

### Phase 2: Test Coverage (Week 3-5)
- [ ] Add hook tests for CRM (5 hook files × ~10 tests each)
- [ ] Add hook tests for Products (3 hook files × ~10 tests each)
- [ ] Add hook tests for Finance (2 hook files × ~10 tests each)
- [ ] Add hook tests for HR (4 hook files × ~10 tests each)
- [ ] Add missing action tests across all packages
- [ ] Target: 80%+ test coverage across all 6 business packages

### Phase 3: Feature Completeness (Week 6-8)
- [ ] Implement hooks for 40+ unhook-ed business objects (prioritize high-value objects)
- [ ] Migrate all 6 `db.ts` shim files to runtime broker
- [ ] Add workflow definitions for marketing automation, case escalation, payment reminders
- [ ] Add MCP server configuration for AI agent integration

### Phase 4: Documentation & DX (Week 9-10)
- [ ] Create HR and AI technical specification directories
- [ ] Generate per-object field API reference documentation
- [ ] Add code examples for hooks, actions, and workflows
- [ ] Update developer guides with latest patterns

### Phase 5: Integration & Business Features (Week 11+)
- [ ] Integration connectors (Stripe, DocuSign, Slack)
- [ ] Business Intelligence & Analytics package (2027 roadmap)
- [ ] Advanced AI Agent workflows
- [ ] Performance benchmarking and optimization
- [ ] Production deployment guides (Docker, Kubernetes)

**Note**: Visual Workflow Builder and other low-code platform features are out of scope for HotCRM. These are platform-level capabilities provided by `@objectstack/runtime`.

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
| 2026-02-11 | v2.0.3 | v2.0.6 | None | 933 ✅ |
| 2026-02-10 | v2.0.1 | v2.0.3 | None | 933 ✅ |
| 2026-02-09 | v2.0.0 | v2.0.1 | None | 496 ✅ |
| 2026-02-08 | v1.1.0 | v2.0.0 | Hook API migration | 496 ✅ |
| 2026-02-07 | v1.0.4 | v1.1.0 | None | 496 ✅ |
| 2026-02-05 | v1.0.0 | v1.0.4 | None | 378 ✅ |
| 2026-02-04 | v0.9.2 | v1.0.0 | None | 378 ✅ |

---

**Want to contribute?** See our [Contributing Guide](CONTRIBUTING.md) to get started.
