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
2027 Q2-Q3 ████████████████████████████████  Phase 14: v3.0.8 Feed & Interface Builder Adoption  ← CURRENT
2027+      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  Phase 12E: Advanced AI & Enterprise Features
```

## Current State Summary

| Metric | Value |
|--------|-------|
| Protocol Version | @objectstack/spec v3.0.8 |
| Business Objects | ~148 across 13 packages |
| Business Packages | 13 (6 core clouds + AI + Analytics + Integration + Community + 4 verticals) |
| Hook Files | 121+ across 13 packages |
| Action Files | 48 across 13 packages |
| Workflow Files | 6 across 6 packages + 6 AI agent workflows (all registered) |
| Flow Definitions | 6 across 5 packages (CRM, Finance, HR, Marketing, Support) |
| State Machines | 13 (case, lead, opportunity, invoice, campaign, application, listing, patient, kyc, order, employee, sync, idea) |
| Permission Sets | 13 (6 core clouds + analytics + integration + community + 4 verticals) |
| Event Definitions | 9 (one per business cloud + analytics + integration + community) |
| Capability Manifests | 9 (one per business cloud + analytics + integration + community) |
| Studio Plugins | 9 (6 core clouds + analytics + integration + community) |
| Page Layouts | 55 across 13 packages |
| List Views | 34 files across 13 packages |
| Dashboards | 15 across 13 packages |
| Form Views | 33 across 11 packages |
| Report Definitions | 36 across 13 packages |
| Chart Configurations | 30 across 13 packages |
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
| Vertical Solutions | 4 (Real Estate, Healthcare, Financial Services, Education) |
| Seed Data Files | 39 across 13 packages (system + per-package demo data) |
| Packages Registered in Root Config | 13 of 13 (all packages registered) |
| Test Files | 180 files, 3380 tests (all passing) |
| TypeScript Compliance | 100% (zero type errors) |
| Protocol Compliance | 100% (all objects pass ObjectSchema.create()) |
| Spec Schema Adoption | ~65 of ~95 application-level schemas used (~68%) — see [Metadata Evaluation](#metadata-type-evaluation) |

---

## ✅ Completed Phases (1–10) — Summary

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
| **Total** | **94** | **71** | **32** | **14** | **11** | **8** | **6** | **118 files / 1,759 tests** |

---

## Metadata Type Evaluation

> Comprehensive assessment of all @objectstack/spec application metadata types.
> Goal: Identify high-value schemas not yet adopted and plan deep integration.

### Assessment Methodology

@objectstack/spec v3.0.8 exports **12 subpaths** with ~1,300+ total schema types. Most are internal/transport schemas (API request/response envelopes, low-level configs). We focus on **~95 application-level metadata schemas** — the ones that define business configurations, UI layouts, automations, security policies, and AI capabilities.

**Current adoption: ~65 of ~95 application-level schemas (~68%)**

**New in v3.0.8** (released 2026-02-20): Activity Feed & Chatter system, Interface Builder / Blank Page layouts, Dashboard enhancements, Feed API contracts, Studio Interface Builder config, Oclif CLI plugin config, Package conventions & system constants.

### Currently Adopted Schemas (28 types — pre-Phase 10.5 baseline)

| Subpath | Schema | Usage | Files |
|---------|--------|-------|-------|
| `spec/data` | `ObjectSchema` | Business object definitions | 84 |
| `spec/data` | `Field` | Field type builders | 84 |
| `spec/ui` | `PageSchema` | Record page layouts | 18 |
| `spec/ui` | `ViewSchema` | List view configurations | 18 |
| `spec/ui` | `FormViewSchema` | Form-based editing views | 7 |
| `spec/ui` | `DashboardSchema` | Dashboard definitions | 11 |
| `spec/ui` | `AppSchema` | Application configurations | 5 |
| `spec/automation` | `WorkflowRuleSchema` | Workflow rule definitions | 8 |
| `spec/automation` | `StateMachineSchema` | State machine definitions | 3 |
| `spec/automation` | `ApprovalProcessSchema` | Approval workflows | 2 |
| `spec/automation` | `TimeTriggerSchema` | Time-based triggers | 2 |
| `spec/security` | `PermissionSetSchema` | Permission set definitions | 7 |
| `spec/security` | `SharingRuleSchema` | Record sharing rules | 2 |
| `spec/security` | `TerritoryModelSchema` | Territory model definitions | 2 |
| `spec/security` | `TerritorySchema` | Territory configurations | 11 |
| `spec/ai` | `AgentSchema` | AI agent definitions | 13 |
| `spec/ai` | `MCPServerConfigSchema` | MCP server configuration | 7 |
| `spec/ai` | `RAGPipelineConfigSchema` | RAG pipeline definitions | 9 |
| `spec/ai` | `ModelRegistrySchema` | AI model registry | 6 |
| `spec/ai` | `NLQRequestSchema` | Natural language query | 21 |
| `spec/ai` | `NLQFieldMappingSchema` | NLQ field mappings | 21 |
| `spec/kernel` | `PluginSchema` | Plugin definitions | 7 |
| `spec/kernel` | `PluginCapabilityManifestSchema` | Plugin capabilities | 7 |
| `spec/system` | `AuditConfigSchema` | Audit logging | 3 |
| `spec/system` | `CacheConfigSchema` | Caching configuration | 4 |
| `spec/system` | `NotificationConfigSchema` | Notification settings | 5 |
| `spec/api` | `ApiEndpointRegistrationSchema` | API endpoint registration | 13 |
| `spec/integration` | `WebhookConfigSchema` | Webhook definitions | 5 |
| `spec/studio` | `StudioPluginManifestSchema` | Studio plugin metadata | 18 |

### Gap Analysis: High-Value Unused Schemas

#### Tier 1 — Critical for Enterprise CRM (P0)

| Subpath | Schema | Business Value | CRM Justification |
|---------|--------|---------------|-------------------|
| `spec/ui` | `ReportSchema` | Reports with columns, groupings, charts | Every CRM requires saved report definitions; Salesforce's #1 feature |
| `spec/ui` | `ListViewSchema` | Advanced list views (Kanban, Calendar, Gantt, Timeline) | Beyond basic views; Kanban for pipeline, Calendar for activities |
| `spec/ui` | `ChartConfigSchema` | Standalone chart definitions | Revenue charts, pipeline funnels, trend lines |
| `spec/automation` | `FlowSchema` | Visual flow/process definitions | Salesforce Flow equivalent; complex multi-step business processes |
| `spec/automation` | `ConnectorSchema` | Connector metadata definitions | Integration connectors for Stripe, DocuSign, Slack |
| `spec/security` | `RowLevelSecurityPolicySchema` | Row-level security (RLS) | Enterprise data isolation: reps see only their records |
| `spec/security` | `PolicySchema` | Composable security policies | Unified security policy framework |
| `spec/system` | `EmailTemplateSchema` | Email template definitions | Sales outreach, case notifications, marketing emails |
| `spec/system` | `NotificationChannelSchema` | Multi-channel notification routing | Email + SMS + Push + In-app notification orchestration |
| `spec/system` | `ScheduleSchema` / `JobSchema` | Scheduled task definitions | Report scheduling, data sync jobs, reminders |
| `spec/ai` | `MCPToolSchema` | MCP tool definitions | Expose CRM actions as AI-callable tools |
| `spec/ai` | `MCPResourceSchema` | MCP resource definitions | Expose CRM data as AI-readable resources |
| `spec/ai` | `MCPPromptSchema` | MCP prompt templates | Pre-built AI prompts for sales, support, HR |

#### Tier 2 — High Value for Competitive Differentiation (P1)

| Subpath | Schema | Business Value | CRM Justification |
|---------|--------|---------------|-------------------|
| `spec/ui` | `ActionSchema` (UI) | UI action definitions with parameters | Quick actions: "Log a Call", "Convert Lead", "Send Quote" |
| `spec/ui` | `WidgetManifestSchema` | Custom dashboard widget definitions | Extensible dashboard components for each Cloud |
| `spec/ui` | `ThemeSchema` | Branding/theming configuration | White-label CRM with customer branding |
| `spec/ui` | `ResponsiveConfigSchema` | Mobile-responsive layouts | Mobile CRM for field sales |
| `spec/automation` | `ETLPipelineSchema` | ETL data pipeline definitions | Data import/export, migration, enrichment pipelines |
| `spec/automation` | `DataSyncConfigSchema` | Data synchronization configuration | Bi-directional sync with external systems |
| `spec/security` | `PasswordPolicySchema` | Password complexity rules | Enterprise security compliance |
| `spec/security` | `SessionPolicySchema` | Session management policies | Timeout, concurrent session limits |
| `spec/security` | `NetworkPolicySchema` | IP allowlist/blocklist | Enterprise network access control |
| `spec/security` | `AuditPolicySchema` | Audit trail policies | SOC 2 / compliance audit requirements |
| `spec/ai` | `AIOrchestrationSchema` | Multi-step AI task orchestration | Complex AI workflows: analyze → recommend → execute |
| `spec/ai` | `PredictiveModelSchema` | ML model definitions | Lead scoring, churn prediction, forecasting models |
| `spec/ai` | `ConversationSessionSchema` | Conversation/chat session management | AI copilot conversation context and history |
| `spec/ai` | `MultiAgentGroupSchema` | Multi-agent coordination | Collaborative AI agents for complex tasks |
| `spec/ai` | `CostAnalyticsSchema` | AI usage cost tracking | AI spend management per tenant/feature |

#### Tier 3 — Platform Maturity & Future-Proofing (P2)

| Subpath | Schema | Business Value | CRM Justification |
|---------|--------|---------------|-------------------|
| `spec/system` | `EncryptionConfigSchema` | Field-level encryption | PHI/PII protection for healthcare/finance verticals |
| `spec/system` | `MaskingConfigSchema` | Data masking rules | Demo environments, developer access to prod data |
| `spec/system` | `ComplianceConfigSchema` | GDPR/HIPAA/PCI-DSS configs | Regulatory compliance for vertical solutions |
| `spec/system` | `TenantSchema` | Multi-tenancy definitions | SaaS multi-tenant deployment |
| `spec/system` | `TracingConfigSchema` | Distributed tracing | Performance monitoring, debugging |
| `spec/system` | `MetricsConfigSchema` | Business metrics definitions | Operational KPIs, SLAs |
| `spec/kernel` | `EventSchema` | Domain event definitions | Event-driven architecture, CDC |
| `spec/kernel` | `FeatureFlagSchema` | Feature flag management | Gradual rollouts, A/B testing |
| `spec/integration` | `ConnectorSchema` (integration) | External connector definitions | Structured connector metadata |
| `spec/integration` | `RateLimitConfigSchema` | Rate limiting configuration | API abuse prevention |
| `spec/integration` | `CircuitBreakerConfigSchema` | Circuit breaker patterns | Resilient external integrations |
| `spec/ui` | `DndConfigSchema` | Drag-and-drop configuration | Pipeline drag-and-drop, dashboard layout editing |
| `spec/ui` | `OfflineConfigSchema` | Offline-first configuration | Field sales offline CRM |
| `spec/ui` | `NotificationSchema` (UI) | In-app notification definitions | Real-time in-app alerts and toasts |

#### Tier 4 — New in v3.0.8: Feed, Interface Builder & Enhanced UI (P0-P1)

> These schemas were introduced in @objectstack/spec v3.0.8 (2026-02-20) and are not yet adopted.

| Subpath | Schema | Business Value | CRM Justification |
|---------|--------|---------------|-------------------|
| `spec/data` | `FeedItemSchema` | Activity feed items (posts, comments, field changes) | Salesforce Chatter equivalent; record-level activity stream |
| `spec/data` | `FeedActorSchema` | Feed actor identity (user/system/automation) | Attribute feed activity to users, bots, or automated processes |
| `spec/data` | `ReactionSchema` | Emoji/like reactions on feed items | Social CRM engagement; quick feedback on updates |
| `spec/data` | `MentionSchema` | @-mention support in feed content | Notify colleagues in record discussions; cross-team collaboration |
| `spec/data` | `RecordSubscriptionSchema` | Record-level subscription/follow | Users follow records for change notifications |
| `spec/data` | `FieldChangeEntrySchema` | Structured field change tracking | Audit trail for record changes; "what changed" in activity feed |
| `spec/ui` | `BlankPageLayoutSchema` | Drag-and-drop blank page canvas | Custom landing pages, dashboards, portals without predefined layout |
| `spec/ui` | `InterfacePageConfigSchema` | Interface builder page configuration | Low-code page builder for admin-created custom pages |
| `spec/ui` | `ElementDataSourceSchema` | Data source binding for page elements | Connect page elements to object records, queries, or APIs |
| `spec/ui` | `Element*PropsSchema` (6 types) | Element property schemas (Button, Filter, Form, Image, Number, Text, RecordPicker) | Fine-grained configuration for interface builder components |
| `spec/ui` | `DashboardHeaderSchema` | Dashboard header with actions | Dashboard title bar with action buttons and context |
| `spec/ui` | `GlobalFilterSchema` | Cross-widget dashboard filters | Filter all dashboard widgets from a single control |
| `spec/ui` | `ViewTabSchema` | Tabbed list view configurations | Multiple related views in tabs (e.g., Active/Closed/All) |
| `spec/ui` | `RecordChatterProps` | Record page chatter/feed component | Embed activity feed directly on record detail pages |
| `spec/ui` | `RecordReviewConfigSchema` | Record review/approval UI config | Inline approval workflows on record pages |
| `spec/ui` | `NavigationAreaSchema` | Named navigation regions | Header, sidebar, utility bar navigation areas |
| `spec/ui` | `PageTypeSchema` | Page type classification (record, list, app, home, blank) | Type-safe page routing and layout selection |
| `spec/ui` | `SharingConfigSchema` | View/dashboard sharing configuration | Share saved views and dashboards with teams/roles |
| `spec/ui` | `AppearanceConfigSchema` | View appearance settings | Visual customization (density, colors, icons) per view |
| `spec/ui` | `AddRecordConfigSchema` | Quick-add record configuration | Inline record creation from list views |
| `spec/ui` | `UserActionsConfigSchema` | User-facing action bar configuration | Configure which actions appear in record/list toolbars |
| `spec/ui` | `WidgetMeasureSchema` | Dashboard widget KPI measures | Define what metrics a widget displays |
| `spec/ui` | `WidgetActionTypeSchema` | Widget interaction action types | Define clickable actions within dashboard widgets |
| `spec/ui` | `WidgetColorVariantSchema` | Widget color/status variants | Color-code widgets by status (success, warning, danger) |
| `spec/ui` | `ActionNavItemSchema` / `ReportNavItemSchema` | Navigation item types for actions & reports | Typed navigation entries in app nav bars |
| `spec/ui` | `VisualizationTypeSchema` | Chart/visualization type enumeration | Type-safe chart type selection in dashboards |
| `spec/api` | `FeedApiContracts` (12 types) | Complete Feed CRUD API | Create/read/update/delete feed items, reactions, subscriptions |
| `spec/contracts` | `IFeedService` | Feed service interface contract | Standard feed service for all packages |
| `spec/kernel` | `OclifPluginConfigSchema` | Oclif CLI plugin configuration | CLI extensibility for custom CRM commands |
| `spec/studio` | `InterfaceBuilderConfigSchema` | Studio interface builder config | Visual page builder settings in Studio |
| `spec/studio` | `PageBuilderConfigSchema` | Studio page builder config | Page builder canvas and toolbox settings |
| `spec/studio` | `CanvasSnapSettingsSchema` | Canvas grid snap settings | Pixel-perfect layout alignment in page builder |
| `spec/studio` | `ElementPaletteItemSchema` | Element palette for page builder | Draggable component palette in Studio |
| `spec/system` | `PKG_CONVENTIONS` | Package naming conventions | Standardized package structure validation |
| `spec/system` | `SystemFieldName` / `SystemObjectName` | System field/object name enumerations | Type-safe references to built-in fields and objects |
| `spec/shared` | `SortItemSchema` | Standardized sort specification | Reusable sort order for queries, views, and APIs |

### Impact Assessment

| Metric | Current | After Phase 10.5 | After Phase 10.6 | After Phase 11 | After Phase 14 (v3.0.8) |
|--------|---------|-------------------|-------------------|----------------|-------------------------|
| Application Schema Adoption | 28 / ~80 (35%) | ~55 / ~80 (69%) | ~58 / ~80 (73%) | ~65 / ~80 (81%) | ~95 / ~95 (100%) |
| UI Metadata Types | 5 (Page, View, Form, Dashboard, App) | 10 (+Report, ListViewAdv, Chart, Action, Widget) | 10 (deepened: FormView 6 layouts, Page 4 types, 10+ component types) | 12 (+Theme, Responsive) | 25+ (+BlankPageLayout, InterfacePage, ElementDataSource, DashboardHeader, GlobalFilter, ViewTab, RecordChatter, RecordReview, NavigationArea, PageType, SharingConfig, AppearanceConfig, AddRecordConfig, UserActionsConfig, WidgetMeasure/Action/Color, ActionNavItem, ReportNavItem, VisualizationType) |
| Data Types | ObjectSchema, Field | ObjectSchema, Field | ObjectSchema, Field | ObjectSchema, Field | +FeedItem, FeedActor, Reaction, Mention, RecordSubscription, FieldChangeEntry |
| Automation Types | 4 (Workflow, StateMachine, Approval, TimeTrigger) | 7 (+Flow, Connector, ETL) | 7 (unchanged) | 8 (+DataSync) | 8 (unchanged) |
| Security Types | 4 (Permission, Sharing, Territory, TerritoryModel) | 8 (+RLS, Policy, Password, Session) | 8 (unchanged) | 10 (+Network, Audit) | 10 (unchanged) |
| AI Types | 6 (Agent, MCP, RAG, ModelRegistry, NLQ×2) | 12 (+MCPTool, MCPResource, MCPPrompt, Orchestration, Predictive, Conversation) | 12 (deepened: ai:chat_window, ai:suggestion embedded in pages) | 14 (+MultiAgent, Cost) | 14 (unchanged) |
| API Types | 1 (ApiEndpointRegistration) | 1 | 1 | 1 | 13 (+Feed API: Create/Get/Update/Delete FeedItem, Subscribe/Unsubscribe, Add/Remove Reaction) |
| Studio Types | 1 (StudioPluginManifest) | 1 | 1 | 1 | 5 (+InterfaceBuilderConfig, PageBuilderConfig, CanvasSnapSettings, ElementPaletteItem) |
| System Types | 3 (Audit, Cache, Notification) | 7 (+Email, NotifChannel, Schedule, Job) | 7 (unchanged) | 10 (+Encryption, Masking, Compliance) | 13 (+PKG_CONVENTIONS, SystemFieldName, SystemObjectName) |

---

## Phase 10.5: Deep Metadata Adoption (2026 Q2-Q3) ✅ COMPLETE

> Maximize adoption of @objectstack/spec application-level metadata types before building new packages.
> This phase deepens the metadata foundation across existing 6 business clouds, making each cloud richer and more enterprise-ready without adding new objects.
>
> **Goal**: Raise spec schema adoption from 35% → 69% by adopting 27 additional high-value schemas.

### Phase 10.5 Timeline

```
Q2 2026 Week 1-3   ████████  Phase 10.5A: Reports, Advanced Views & Charts   (UI depth)
Q2 2026 Week 4-6   ████████  Phase 10.5B: Flows, MCP Tools & AI Orchestration (Automation + AI depth)
Q3 2026 Week 7-9   ████████  Phase 10.5C: Enterprise Security & Notifications (Security + System depth)
Q3 2026 Week 10-12 ████████  Phase 10.5D: Validation, Tests & Documentation   (Hardening)
```

### Phase 10.5A: Reports, Advanced Views & Charts (Weeks 1-3) — P0

> Goal: Add ReportSchema, advanced ListViewSchema, ChartConfigSchema, UI ActionSchema, and WidgetManifestSchema across all 6 clouds.

#### 10.5A-1: Report Definitions (ReportSchema)

- [x] Add `packages/crm/src/pipeline_report.report.ts` — Sales pipeline report (stage breakdown, win rate, average deal size)
- [x] Add `packages/crm/src/forecast_report.report.ts` — Revenue forecast report (by period, rep, territory)
- [x] Add `packages/finance/src/revenue_report.report.ts` — Revenue recognition report (ASC 606 compliance, deferred/recognized)
- [x] Add `packages/finance/src/ar_aging_report.report.ts` — Accounts receivable aging report
- [x] Add `packages/hr/src/headcount_report.report.ts` — Headcount analytics (by department, location, tenure)
- [x] Add `packages/marketing/src/campaign_roi_report.report.ts` — Campaign ROI report (spend vs revenue, attribution)
- [x] Add `packages/products/src/product_mix_report.report.ts` — Product mix analysis (revenue by product, discount analysis)
- [x] Add `packages/support/src/case_volume_report.report.ts` — Case volume report (by priority, category, SLA compliance)
- [x] Validate all reports with `ReportSchema.parse()` — 100% spec compliance

#### 10.5A-2: Advanced List Views (ListViewSchema with Kanban, Calendar, Gantt, Timeline)

- [x] Add `packages/crm/src/opportunity_kanban.view.ts` — Kanban view for opportunity pipeline (drag across stages)
- [x] Add `packages/crm/src/activity_calendar.view.ts` — Calendar view for tasks and events
- [x] Add `packages/hr/src/recruitment_kanban.view.ts` — Kanban view for candidate pipeline
- [x] Add `packages/support/src/case_kanban.view.ts` — Kanban view for case triage (by priority/status)
- [x] Add `packages/marketing/src/campaign_timeline.view.ts` — Timeline view for campaign schedules
- [x] Add `packages/products/src/quote_gantt.view.ts` — Gantt view for quote approval workflow timeline
- [x] Validate all views with `ListViewSchema.parse()` or `ViewSchema.parse()` — 100% spec compliance

#### 10.5A-3: Chart Configurations (ChartConfigSchema)

- [x] Add `packages/crm/src/pipeline_funnel.chart.ts` — Sales funnel chart (Lead → Qualified → Proposal → Closed)
- [x] Add `packages/crm/src/revenue_trend.chart.ts` — Monthly revenue trend line chart
- [x] Add `packages/finance/src/cash_flow.chart.ts` — Cash flow waterfall chart
- [x] Add `packages/support/src/case_resolution.chart.ts` — Case resolution time distribution chart
- [x] Add `packages/marketing/src/channel_performance.chart.ts` — Marketing channel performance bar chart
- [x] Add `packages/hr/src/attrition_trend.chart.ts` — Employee attrition trend chart
- [x] Validate all charts with `ChartConfigSchema.parse()` — 100% spec compliance

#### 10.5A-4: UI Actions & Widgets (ActionSchema, WidgetManifestSchema)

- [x] Add `packages/crm/src/crm_actions.action_ui.ts` — Quick actions: "Log a Call", "Convert Lead", "Create Follow-up Task", "Send Quote"
- [x] Add `packages/finance/src/finance_actions.action_ui.ts` — Quick actions: "Create Invoice", "Record Payment", "Send Reminder"
- [x] Add `packages/support/src/support_actions.action_ui.ts` — Quick actions: "Escalate Case", "Merge Cases", "Create Knowledge Article"
- [x] Add `packages/crm/src/pipeline_widget.widget.ts` — Pipeline summary widget (total value, count by stage, trend)
- [x] Add `packages/support/src/sla_widget.widget.ts` — SLA compliance widget (met/breached/at-risk counts)
- [x] Add `packages/hr/src/headcount_widget.widget.ts` — Headcount widget (total, new hires, departures this month)
- [x] Validate all actions with `ActionSchema.parse()` and widgets with `WidgetManifestSchema.parse()` — 100% spec compliance

### Phase 10.5B: Flows, MCP Tools & AI Orchestration (Weeks 4-6) — P0

> Goal: Add FlowSchema for visual process automation, full MCP tool/resource/prompt definitions, and AIOrchestrationSchema.

#### 10.5B-1: Flow Definitions (FlowSchema)

- [x] Add `packages/crm/src/lead_qualification.flow.ts` — Lead qualification flow (score → route → assign → notify)
- [x] Add `packages/crm/src/deal_close.flow.ts` — Deal close flow (approval → contract → invoice → handoff to support)
- [x] Add `packages/finance/src/invoice_collection.flow.ts` — Invoice collection flow (send → remind → escalate → write-off)
- [x] Add `packages/hr/src/onboarding.flow.ts` — Employee onboarding flow (offer → docs → IT setup → training → 30-day check-in)
- [x] Add `packages/support/src/case_escalation.flow.ts` — Case escalation flow (SLA breach → notify manager → reassign → exec alert)
- [x] Add `packages/marketing/src/lead_nurture.flow.ts` — Lead nurture flow (subscribe → drip emails → score → MQL handoff)
- [x] Validate all flows with `FlowSchema.parse()` — 100% spec compliance

#### 10.5B-2: MCP Tool Definitions (MCPToolSchema)

- [x] Add `packages/crm/src/crm_mcp_tools.mcp.ts` — MCP tools: search_accounts, get_opportunity, update_deal_stage, create_activity
- [x] Add `packages/finance/src/finance_mcp_tools.mcp.ts` — MCP tools: get_invoice, record_payment, calculate_revenue, get_ar_aging
- [x] Add `packages/support/src/support_mcp_tools.mcp.ts` — MCP tools: search_cases, escalate_case, get_knowledge_article, suggest_resolution
- [x] Add `packages/hr/src/hr_mcp_tools.mcp.ts` — MCP tools: search_employees, get_org_chart, check_pto_balance, submit_request
- [x] Add `packages/marketing/src/marketing_mcp_tools.mcp.ts` — MCP tools: get_campaign_metrics, search_leads, get_engagement_data
- [x] Add `packages/products/src/products_mcp_tools.mcp.ts` — MCP tools: search_products, get_pricing, configure_bundle, calculate_quote
- [x] Validate all MCP tools with `MCPToolSchema.parse()` — 100% spec compliance

#### 10.5B-3: MCP Resources & Prompts (MCPResourceSchema, MCPPromptSchema)

- [x] Add `packages/crm/src/crm_mcp_resources.mcp.ts` — MCP resources: account_list, pipeline_summary, forecast_data, territory_map
- [x] Add `packages/finance/src/finance_mcp_resources.mcp.ts` — MCP resources: invoice_aging_summary
- [x] Add `packages/support/src/support_mcp_resources.mcp.ts` — MCP resources: knowledge_base, case_queue, sla_dashboard
- [x] Add `packages/ai/src/crm_prompts.mcp.ts` — MCP prompts: deal_analysis, customer_360_summary, next_best_action, win_loss_analysis
- [x] Add `packages/ai/src/support_prompts.mcp.ts` — MCP prompts: case_resolution_suggestion, customer_sentiment, escalation_assessment
- [x] Add `packages/ai/src/hr_prompts.mcp.ts` — MCP prompts: candidate_assessment, performance_review_draft, succession_analysis
- [x] Validate with `MCPResourceSchema.parse()` and `MCPPromptSchema.parse()` — 100% spec compliance

#### 10.5B-4: AI Orchestration & Predictive Models (AIOrchestrationSchema, PredictiveModelSchema)

- [x] Add `packages/ai/src/sales_orchestration.orchestration.ts` — Multi-step AI: analyze pipeline → identify risks → generate recommendations → draft outreach
- [x] Add `packages/ai/src/support_orchestration.orchestration.ts` — Multi-step AI: classify case → search KB → suggest resolution → draft response
- [x] Add `packages/ai/src/lead_scoring.predictive.ts` — Predictive lead scoring model definition (features, weights, threshold, training config)
- [x] Add `packages/ai/src/churn_prediction.predictive.ts` — Churn prediction model definition (engagement signals, usage patterns, health score)
- [x] Add `packages/ai/src/deal_forecast.predictive.ts` — Deal win probability model definition (stage, activity, engagement, historical patterns)
- [x] Validate with `AIOrchestrationSchema.parse()` and `PredictiveModelSchema.parse()` — 100% spec compliance

#### 10.5B-5: Connector Metadata (ConnectorSchema from automation)

- [x] Add `packages/crm/src/email_connector.connector.ts` — Email connector metadata (Gmail, Outlook) for activity logging
- [x] Add `packages/finance/src/payment_connector.connector.ts` — Payment connector metadata (Stripe, PayPal) for invoice sync
- [x] Add `packages/marketing/src/social_connector.connector.ts` — Social media connector metadata (LinkedIn, Twitter) for campaign tracking
- [x] Validate with `ConnectorSchema.parse()` — 100% spec compliance

### Phase 10.5C: Enterprise Security & Notifications (Weeks 7-9) — P1

> Goal: Add row-level security, security policies, email templates, notification channels, and scheduled jobs.

#### 10.5C-1: Row-Level Security (RowLevelSecurityPolicySchema, RLSConfigSchema)

- [x] Add `packages/crm/src/crm_rls.security.ts` — CRM RLS: reps see own accounts/opportunities; managers see team; execs see all
- [x] Add `packages/finance/src/finance_rls.security.ts` — Finance RLS: accountants see assigned invoices; controllers see all; auditors read-only
- [x] Add `packages/support/src/support_rls.security.ts` — Support RLS: agents see assigned cases; supervisors see queue; admins see all
- [x] Add `packages/hr/src/hr_rls.security.ts` — HR RLS: employees see own records; managers see direct reports; HR sees all; payroll restricted
- [x] Validate with `RowLevelSecurityPolicySchema.parse()` — 100% spec compliance

#### 10.5C-2: Security Policies (PolicySchema, PasswordPolicySchema, SessionPolicySchema)

- [x] Add `packages/core/src/password_policy.security.ts` — Password policy: min 12 chars, complexity rules, rotation every 90 days, no reuse of last 5
- [x] Add `packages/core/src/session_policy.security.ts` — Session policy: 8-hour timeout, max 3 concurrent sessions, re-auth for sensitive ops
- [x] Add `packages/core/src/security_policy.security.ts` — Composite security policy combining password, session, and audit policies
- [x] Validate with `PasswordPolicySchema.parse()`, `SessionPolicySchema.parse()`, `PolicySchema.parse()` — 100% spec compliance

#### 10.5C-3: Email & Notification Templates (EmailTemplateSchema, NotificationChannelSchema)

- [x] Add `packages/crm/src/crm_email_templates.notification.ts` — Templates: welcome email, deal won notification, quote approval request, meeting reminder
- [x] Add `packages/finance/src/finance_email_templates.notification.ts` — Templates: invoice sent, payment received, payment overdue reminder, statement
- [x] Add `packages/support/src/support_email_templates.notification.ts` — Templates: case created confirmation, case resolved, CSAT survey, SLA warning
- [x] Add `packages/hr/src/hr_email_templates.notification.ts` — Templates: offer letter, onboarding welcome, PTO approved, performance review reminder
- [x] Add `packages/core/src/notification_channels.notification.ts` — Channel configuration: email (SMTP), SMS (Twilio), push (FCM/APNs), in-app (WebSocket)
- [x] Validate with `EmailTemplateSchema.parse()` and `NotificationChannelSchema.parse()` — 100% spec compliance

#### 10.5C-4: Scheduled Jobs (ScheduleSchema, JobSchema)

- [x] Add `packages/crm/src/crm_jobs.schedule.ts` — Scheduled jobs: daily forecast recalc, weekly pipeline digest, monthly territory rebalance
- [x] Add `packages/finance/src/finance_jobs.schedule.ts` — Scheduled jobs: daily revenue recognition, weekly AR aging update, monthly close tasks
- [x] Add `packages/support/src/support_jobs.schedule.ts` — Scheduled jobs: hourly SLA check, daily case assignment rebalance, weekly CSAT digest
- [x] Add `packages/marketing/src/marketing_jobs.schedule.ts` — Scheduled jobs: daily lead scoring refresh, weekly campaign report, hourly email queue processing
- [x] Validate with `ScheduleSchema.parse()` and `JobSchema.parse()` — 100% spec compliance

### Phase 10.5D: Validation, Tests & Documentation (Weeks 10-12) — P1

> Goal: Comprehensive test coverage, spec-compliance validation, and documentation for all new metadata.

#### 10.5D-1: Spec-Compliance Tests

- [x] Add `packages/crm/__tests__/unit/metadata/reports.test.ts` — validate all CRM reports against ReportSchema
- [x] Add `packages/crm/__tests__/unit/metadata/advanced-views.test.ts` — validate Kanban, Calendar views against ListViewSchema
- [x] Add `packages/crm/__tests__/unit/metadata/charts.test.ts` — validate chart configs against ChartConfigSchema
- [x] Add `packages/crm/__tests__/unit/metadata/mcp-tools.test.ts` — validate MCP tools against MCPToolSchema
- [x] Add `packages/crm/__tests__/unit/metadata/flows.test.ts` — validate flows against FlowSchema
- [x] Add `packages/crm/__tests__/unit/metadata/rls.test.ts` — validate RLS policies against RowLevelSecurityPolicySchema
- [x] Add per-package spec-compliance tests for Finance, HR, Marketing, Products, Support metadata
- [x] Add `packages/core/__tests__/unit/metadata/security-policies.test.ts` — validate password/session/security policies
- [x] Add `packages/ai/__tests__/unit/metadata/orchestration.test.ts` — validate AI orchestrations and predictive models
- [x] Add `packages/ai/__tests__/unit/metadata/mcp-prompts.test.ts` — validate MCP prompts and resources

#### 10.5D-2: Cross-Cloud Metadata Integration Tests

- [x] Test: CRM report → references Finance invoice data → validates cross-cloud report columns
- [x] Test: Support case escalation flow → triggers CRM notification → sends email template
- [x] Test: MCP tools across clouds → AI orchestration chains CRM + Finance + Support tools
- [x] Test: RLS policies → ensure permission sets + sharing rules + RLS compose correctly

#### 10.5D-3: Documentation

- [x] Update `docs/SALESFORCE_FEATURE_COMPARISON.md` with new metadata coverage (reports, flows, RLS, MCP)
- [x] Add `content/docs/guides/metadata-types.mdx` — complete guide to all metadata types used in HotCRM
- [x] Add `content/docs/guides/mcp-integration.mdx` — MCP tools, resources, and prompts guide
- [x] Update `README.md` and `content/docs/roadmap.mdx` with Phase 10.5 metrics

### Phase 10.5 Expected Outcomes

| Metric | Before Phase 10.5 | After Phase 10.5 | Change |
|--------|-------------------|-------------------|--------|
| Application Schema Adoption | 28 / ~80 (35%) | ~55 / ~80 (69%) | +27 schemas (+34%) |
| Report Definitions | 0 | 8 (one per cloud + cross-cloud) | +8 reports |
| Advanced Views (Kanban/Calendar/Gantt) | 0 | 6 | +6 advanced views |
| Chart Configurations | 0 | 6 | +6 charts |
| Flow Definitions | 0 | 6 (one per cloud) | +6 flows |
| MCP Tools | 0 | ~24 tools across 6 clouds | +24 tools |
| MCP Resources | 0 | ~8 resources | +8 resources |
| MCP Prompts | 0 | ~10 prompts | +10 prompts |
| AI Orchestrations | 0 | 2 (sales, support) | +2 orchestrations |
| Predictive Models | 0 | 3 (lead scoring, churn, deal forecast) | +3 models |
| RLS Policies | 0 | 4 (one per major cloud) | +4 policies |
| Security Policies | 0 | 3 (password, session, composite) | +3 policies |
| Email Templates | 0 | ~16 (4 per cloud) | +16 templates |
| Notification Channels | 0 | 4 (email, SMS, push, in-app) | +4 channels |
| Scheduled Jobs | 0 | ~12 (3 per cloud) | +12 jobs |
| UI Actions | 0 | ~10 quick actions | +10 actions |
| Dashboard Widgets | 0 | 3 custom widgets | +3 widgets |
| Connector Metadata | 0 | 3 (email, payment, social) | +3 connectors |
| Test Files | 118 | ~135 | +~17 test files |

---

## Phase 10.6: FormView & Page Layout Deep Enhancement (2026 Q3)

> Fully leverage `@objectstack/spec/ui` platform capabilities for FormView, PageSchema, and Component properties.
> Current forms use only `type: 'simple'` with basic fields; current pages use minimal component types. This phase upgrades all existing UI metadata to exploit the full feature set of the spec schemas.
>
> **Goal**: Transform basic UI metadata into enterprise-grade, Salesforce-equivalent page layouts with conditional visibility, multi-layout forms, AI-embedded pages, and profile-based page assignment.

### Platform Capability Gap Analysis

#### FormView (view.zod.ts) — Current vs. Available

| Feature | Spec Support | Current Usage | Gap |
|---------|-------------|---------------|-----|
| **Layout Types** | `simple`, `tabbed`, `wizard`, `split`, `drawer`, `modal` | `simple` only | 5 layout types unused |
| **Section Collapsible** | `collapsible: true/false`, `collapsed: true/false` | Not used (defaults to false) | Address/detail sections should be collapsible |
| **Section Columns** | `'1'`, `'2'`, `'3'`, `'4'` | `'2'` only | 3 column options unused |
| **Field readonly** | `readonly: boolean` | Not used | Computed/system fields should be read-only |
| **Field hidden** | `hidden: boolean` | Not used | Internal fields should be hidden |
| **Field visibleOn** | `visibleOn: string` (expression) | Not used | Conditional visibility needed for dynamic forms |
| **Field dependsOn** | `dependsOn: string` (field dependency) | Not used | Cascade picklists not configured |
| **Field widget** | `widget: string` (custom widget) | Not used | Rating, rich-text, color-picker widgets available |
| **Field placeholder** | `placeholder: string` | Not used | Input hints missing |
| **Field helpText** | `helpText: string` | Not used | Field-level guidance missing |
| **Named FormViews** | Multiple exports per object | 1 form per object | No create/edit/quick-create variants |

#### PageSchema (page.zod.ts) — Current vs. Available

| Feature | Spec Support | Current Usage | Gap |
|---------|-------------|---------------|-----|
| **Page Types** | `record`, `home`, `app`, `utility` | `record` only | 3 page types unused |
| **Template** | `template: string` (default: 'default') | Not set | Template system not leveraged |
| **isDefault** | `isDefault: boolean` | Not set | Default page not declared |
| **assignedProfiles** | `assignedProfiles: string[]` | Not used | No profile-based page assignment |
| **Component visibility** | `visibility: string` (expression) | Not used | No conditional component display |
| **Component responsive** | `responsive: { breakpoint, hiddenOn, columns, order }` | Not used | No mobile-responsive layouts |
| **Region width** | `width: 'small' \| 'medium' \| 'large' \| 'full'` | Not used | No region sizing |
| **Component events** | `events: Record<string, string>` | Not used | No event bindings |
| **Component style** | `style: Record<string, string>` | Not used | No inline styles |
| **PageVariable** | `variables: [{ name, type, defaultValue }]` | Not used | No page-level state |
| **ai:chat_window** | `mode: 'float' \| 'inline' \| 'sidebar'` | Not used | No embedded AI assistant |
| **ai:suggestion** | `context: string` | Not used | No AI suggestions |
| **page:accordion** | Supported | Not used | No collapsible component groups |
| **page:card** | `title, bordered, actions, body, footer` | Not used | No card-based layouts |
| **record:activity** | Supported | Not used | No activity timeline |
| **record:chatter** | Supported | Not used | No collaboration feed |
| **record:path** | Supported | Not used | No guided selling path |

#### Component Properties (component.zod.ts) — Current vs. Available

| Component | Spec Props | Current Props | Gap |
|-----------|-----------|---------------|-----|
| **RecordDetailsProps** | `columns: '1'-'4'`, `layout: 'auto'\|'custom'`, `sections: string[]` | `fields: string[]`, `columns: number` | Using non-standard `fields` prop; missing `layout` and `sections` |
| **RecordHighlightsProps** | `fields: string[]` | `fields: string[]` | ✅ Aligned |
| **RecordRelatedListProps** | `objectName`, `relationshipField`, `columns`, `sort?`, `limit` | `object`, `columns`, `filters`, `sort` (array), `actions` | Using non-standard prop names |
| **PageTabsProps** | `type: 'line'\|'card'\|'pill'`, `position: 'left'\|'top'`, `items: [{label, icon?, children}]` | `tabs: string[]` | Using simplified `tabs` array instead of structured `items` |

### Phase 10.6 Timeline

```
Q3 2026 Week 1-2  ████████  Phase 10.6A: FormView Enhancement          (6 form upgrades + 6 new variant forms)
Q3 2026 Week 3-4  ████████  Phase 10.6B: Page Layout Enhancement        (20 page upgrades + 3 new page types)
Q3 2026 Week 5-6  ████████  Phase 10.6C: Tests, Validation & Docs       (hardening)
```

### Phase 10.6A: FormView Enhancement (Weeks 1-2) — P0

> Goal: Upgrade all 6 existing forms to use advanced FormView features and add scenario-specific form variants.

#### 10.6A-1: Enhance Existing Forms with Advanced Features

- [x] Upgrade `packages/crm/src/account.form.ts` — add collapsible address sections, helpText on key fields, placeholder on text inputs
- [x] Upgrade `packages/crm/src/lead.form.ts` — add visibleOn for conditional fields (show company fields only when lead type is 'Business'), dependsOn for state→country cascade
- [x] Upgrade `packages/crm/src/contact.form.ts` — add readonly on computed fields, hidden on internal fields, helpText on communication preferences
- [x] Upgrade `packages/crm/src/opportunity.form.ts` — convert to `tabbed` layout (Deal Info | Forecast | Products | Notes), add visibleOn for forecast fields based on stage
- [x] Upgrade `packages/support/src/case.form.ts` — add collapsible sections, widget: 'richtext' for description, placeholder on all text fields
- [x] Upgrade `packages/hr/src/employee.form.ts` — convert to `wizard` layout (Personal → Employment → Emergency → Review), add readonly on employee_number

#### 10.6A-2: Add Form Variants (Named Multiple FormViews)

- [x] Add `packages/crm/src/lead_quick_create.form.ts` — `modal` layout with essential fields only (name, company, email, phone, source)
- [x] Add `packages/crm/src/opportunity_quick_create.form.ts` — `drawer` layout for quick deal creation from pipeline view
- [x] Add `packages/support/src/case_quick_create.form.ts` — `modal` layout for quick case logging (subject, priority, description)
- [x] Add `packages/crm/src/account_split.form.ts` — `split` layout with account info on left, address/billing on right
- [x] Add `packages/hr/src/employee_onboarding.form.ts` — `wizard` layout for new hire onboarding (4 steps: personal → role → IT setup → review)
- [x] Add `packages/finance/src/invoice.form.ts` — `tabbed` layout (Invoice Details | Line Items | Payment Terms)
- [x] Validate all forms with `FormViewSchema.parse()` — 100% spec compliance

### Phase 10.6B: Page Layout Enhancement (Weeks 3-4) — P0

> Goal: Upgrade all 20 existing pages to use full PageSchema features, add new page types (home, app, utility), and embed AI components.

#### 10.6B-1: Enhance Existing Record Pages

- [x] Upgrade all record pages to include `isDefault: true` and `template: 'record_detail'`
- [x] Add `assignedProfiles` to key pages:
  - Account page: `['sales_rep', 'sales_manager', 'admin']`
  - Case page: `['support_agent', 'support_manager', 'admin']`
  - Employee page: `['hr_specialist', 'hr_manager', 'admin']`
- [x] Add `visibility` rules to components:
  - Hide financial sections for non-finance profiles on Account page
  - Show escalation section only when case priority is 'Critical' on Case page
  - Hide salary details for non-HR profiles on Employee page
- [x] Add `ai:chat_window` component (sidebar mode) to high-traffic record pages:
  - Account detail page — context-aware account insights
  - Opportunity detail page — deal coaching and next-best-action
  - Case detail page — resolution suggestions from knowledge base
- [x] Add `ai:suggestion` component to relevant pages for proactive AI recommendations
- [x] Add `record:activity` component to Account, Contact, Opportunity pages for activity timeline
- [x] Add `record:path` component to Opportunity page for guided selling stages
- [x] Add `page:card` components for visual grouping of related information

#### 10.6B-2: Add New Page Types

- [x] Add `packages/crm/src/crm_home.page.ts` — `type: 'home'` with pipeline summary, today's activities, AI insights, top deals widgets
- [x] Add `packages/support/src/support_home.page.ts` — `type: 'home'` with open cases queue, SLA alerts, CSAT trends, AI case routing
- [x] Add `packages/hr/src/hr_home.page.ts` — `type: 'home'` with headcount overview, open positions, pending approvals, onboarding tracker
- [x] Add `packages/crm/src/crm_utility.page.ts` — `type: 'utility'` with quick lookup, global search, recent records, favorites
- [x] Add `packages/core/src/settings.page.ts` — `type: 'app'` with system settings, user preferences, notification settings

#### 10.6B-3: Component Properties Alignment

- [x] Migrate `record:details` components to use RecordDetailsProps format: `{ columns: '2', layout: 'custom', sections: ['section_name'] }`
- [x] Migrate `record:related_list` components to use RecordRelatedListProps format: `{ objectName, relationshipField, columns, sort?, limit }`
- [x] Migrate `page:tabs` components to use PageTabsProps format: `{ type: 'line', position: 'top', items: [{ label, children }] }`
- [x] Add `responsive` config to all components for mobile breakpoints
- [x] Add `aria` accessibility props to all interactive components

### Phase 10.6C: Tests, Validation & Documentation (Weeks 5-6) — P1

#### 10.6C-1: Spec-Compliance Tests

- [x] Add `packages/crm/__tests__/unit/schemas/formview-enhanced.test.ts` — validate all enhanced CRM forms including layout types, collapsible sections, field controls
- [x] Add `packages/crm/__tests__/unit/schemas/page-enhanced.test.ts` — validate enhanced pages including assignedProfiles, visibility, AI components
- [x] Add per-package enhanced UI tests for Support, HR, Finance, Products, Marketing
- [x] Add `packages/crm/__tests__/unit/schemas/component-props.test.ts` — validate component properties match ComponentPropsMap types

#### 10.6C-2: Documentation

- [x] Add `content/docs/guides/formview-layouts.mdx` — guide to all 6 FormView layout types with examples
- [x] Add `content/docs/guides/page-components.mdx` — guide to all 21 component types with property reference
- [x] Update `docs/SALESFORCE_FEATURE_COMPARISON.md` with page layout and form builder parity
- [x] Update `README.md` and `content/docs/roadmap.mdx` with Phase 10.6 metrics

### Phase 10.6 Expected Outcomes

| Metric | Before Phase 10.6 | After Phase 10.6 | Change |
|--------|-------------------|-------------------|--------|
| FormView Layout Types Used | 1 (`simple`) | 6 (`simple`, `tabbed`, `wizard`, `split`, `drawer`, `modal`) | +5 layout types |
| Form Definitions | 6 | 12 (+ quick-create, onboarding, split variants) | +6 form variants |
| FormView Features Used | 3 (field, required, colSpan) | 10 (+ readonly, hidden, visibleOn, dependsOn, widget, placeholder, helpText) | +7 field-level features |
| Collapsible Sections | 0 | ~15 sections across 12 forms | +15 collapsible sections |
| Page Types Used | 1 (`record`) | 4 (`record`, `home`, `app`, `utility`) | +3 page types |
| Pages with assignedProfiles | 0 | ~10 | +10 profile-assigned pages |
| Pages with AI Components | 0 | ~6 (ai:chat_window + ai:suggestion) | +6 AI-embedded pages |
| Component Types Used | 4 (highlights, details, tabs, related_list) | 10 (+ activity, path, card, accordion, ai:chat_window, ai:suggestion) | +6 component types |
| Components with Visibility Rules | 0 | ~12 | +12 conditional components |
| ComponentPropsMap-Aligned Components | 0 | ~60 (all existing + new) | Full alignment |
| Test Files | ~135 | ~142 | +~7 test files |

---

## Phase 11: Ecosystem & Connectivity (2026 Q3-Q4)

> Connecting HotCRM to external tools, building new business packages, and establishing the integration layer. This phase adds 3 new packages and 10+ external connectors.
>
> **Note**: Platform-level enhancements (Webhook Framework, API Rate Limiting, Bulk Data API, Real-time Events) are developed in `@objectstack/runtime`.

### Phase 11 Timeline

```
Q3 2026 Week 1-4   ████████  Phase 11A: Analytics Package               (+~10 objects)
Q3 2026 Week 5-8   ████████  Phase 11B: Integration Package & Connectors (+~8 objects)
Q4 2026 Week 9-12  ████████  Phase 11C: Community Package               (+~8 objects)
Q4 2026 Week 13-16 ████████  Phase 11D: Cross-Ecosystem Tests & DX      (hardening)
```

### Phase 11A: Analytics Package (Q3 2026, Weeks 1-4) — P0

> Goal: Build the `@hotcrm/analytics` Business Intelligence Cloud from scratch.

#### 11A-1: Package Scaffolding & Core Objects

- [x] Initialize `packages/analytics/` package with `package.json`, `tsconfig.json`, `plugin.ts`
- [x] Add `packages/analytics/src/report.object.ts` — saved report definitions (name, description, object_name, filters, groupings, aggregations, columns, sort_order, report_type)
- [x] Add `packages/analytics/src/report_schedule.object.ts` — scheduled report delivery (report_id, frequency, recipients, format, next_run, last_run, timezone)
- [x] Add `packages/analytics/src/analytics_dashboard.object.ts` — dashboard layouts (name, description, widgets, layout_config, refresh_interval, owner, shared_with)
- [x] Add `packages/analytics/src/kpi.object.ts` — KPI definitions (name, metric_type, target_value, current_value, period, trend, threshold_warning, threshold_critical)
- [x] Add `packages/analytics/src/metric.object.ts` — business metric calculations (name, formula, source_object, aggregation_type, time_grain, filters)
- [x] Add `packages/analytics/src/data_source.object.ts` — external data source connectors (name, type, connection_string, sync_status, last_sync, schema_mapping)
- [x] Add `packages/analytics/src/saved_filter.object.ts` — reusable filter presets (name, object_name, filter_conditions, is_global, created_by)
- [x] Validate all objects with `ObjectSchema.create()` — 100% spec compliance

#### 11A-2: Hooks & Business Logic

- [x] Add `packages/analytics/src/report.hook.ts` — report execution, filter validation, access control, cache invalidation
- [x] Add `packages/analytics/src/analytics_dashboard.hook.ts` — widget validation, layout constraint checks, auto-refresh scheduling
- [x] Add `packages/analytics/src/kpi.hook.ts` — threshold alerts (trigger notifications when KPI crosses warning/critical), trend calculation, auto-refresh
- [x] Add `packages/analytics/src/metric.hook.ts` — formula validation, circular dependency detection, aggregation computation
- [x] Add `packages/analytics/src/report_schedule.hook.ts` — schedule validation, next run calculation, delivery execution
- [x] Add `packages/analytics/src/data_source.hook.ts` — connection health checks, sync lifecycle, schema drift detection

#### 11A-3: Actions & AI Capabilities

- [x] Add `packages/analytics/src/report_ai.action.ts` — natural language report generation ("Show me top 10 customers by revenue"), report suggestion, auto-filter
- [x] Add `packages/analytics/src/dashboard_ai.action.ts` — auto-generate dashboard layouts based on user role, KPI anomaly detection, smart widget recommendations
- [x] Add `packages/analytics/src/insight_ai.action.ts` — automatic anomaly detection, trend analysis, root cause suggestions, executive summary generation
- [x] Add `packages/analytics/src/forecast_analytics.action.ts` — ML-powered revenue and churn predictions, confidence intervals, what-if scenarios

#### 11A-4: UI Metadata

- [x] Add `packages/analytics/src/report.page.ts` — report builder UI with filter panels, column selector, preview, export
- [x] Add `packages/analytics/src/report.view.ts` — report library with category filters, favorites, recent, shared
- [x] Add `packages/analytics/src/analytics_dashboard.page.ts` — dashboard canvas with drag-and-drop widget placement
- [x] Add `packages/analytics/src/kpi.view.ts` — KPI scorecard with trend sparklines and RAG status
- [x] Add `packages/analytics/src/analytics.dashboard.ts` — meta-dashboard: system health, data freshness, usage analytics

#### 11A-5: Tests

- [x] Add `packages/analytics/__tests__/unit/objects/spec-compliance.test.ts` — validate all ~8 objects against spec
- [x] Add `packages/analytics/__tests__/unit/hooks/report.hook.test.ts` — report execution, filter validation, access control
- [x] Add `packages/analytics/__tests__/unit/hooks/kpi.hook.test.ts` — threshold alerts, trend calculation
- [x] Add `packages/analytics/__tests__/unit/hooks/metric.hook.test.ts` — formula validation, aggregation
- [x] Add `packages/analytics/__tests__/unit/actions/report_ai.action.test.ts` — NL report generation
- [x] Add `packages/analytics/__tests__/unit/actions/insight_ai.action.test.ts` — anomaly detection
- [x] Add `packages/analytics/__tests__/integration/cross-cloud-analytics.test.ts` — analytics queries across CRM, Finance, Support data

### Phase 11B: Integration Package & Connectors (Q3 2026, Weeks 5-8) — P0

> Goal: Build the `@hotcrm/integration` iPaaS layer and deliver the first 5 high-priority connectors.

#### 11B-1: Package Scaffolding & Core Objects

- [x] Initialize `packages/integration/` package with `package.json`, `tsconfig.json`, `plugin.ts`
- [x] Add `packages/integration/src/connector.object.ts` — connector definitions (name, type, provider, auth_type, credentials_ref, base_url, status, version)
- [x] Add `packages/integration/src/connection.object.ts` — active connection instances (connector_id, tenant_id, status, auth_token_ref, refresh_token_ref, expires_at, last_used)
- [x] Add `packages/integration/src/sync_config.object.ts` — bi-directional sync configuration (connection_id, source_object, target_object, field_mapping, direction, frequency, conflict_resolution)
- [x] Add `packages/integration/src/sync_log.object.ts` — sync execution audit log (sync_config_id, started_at, completed_at, records_processed, records_failed, error_details, status)
- [x] Add `packages/integration/src/webhook_subscription.object.ts` — outbound webhook subscriptions (event_type, target_url, secret, status, retry_policy, filters, last_triggered)
- [x] Add `packages/integration/src/webhook_delivery.object.ts` — webhook delivery log (subscription_id, event_payload, response_status, response_body, attempt_number, delivered_at)
- [x] Add `packages/integration/src/api_key.object.ts` — API key management (name, key_hash, scopes, rate_limit, expires_at, last_used, created_by)
- [x] Add `packages/integration/src/field_mapping.object.ts` — field mapping templates (name, source_object, target_object, mappings, transform_rules, default_values)
- [x] Validate all objects with `ObjectSchema.create()` — 100% spec compliance

#### 11B-2: Hooks & Business Logic

- [x] Add `packages/integration/src/connector.hook.ts` — connector lifecycle (activation, deactivation, health check scheduling)
- [x] Add `packages/integration/src/connection.hook.ts` — connection validation, token refresh, expiry alerts
- [x] Add `packages/integration/src/sync_config.hook.ts` — mapping validation, schedule management, conflict resolution
- [x] Add `packages/integration/src/sync_log.hook.ts` — sync monitoring, failure alerts, retry logic
- [x] Add `packages/integration/src/webhook_subscription.hook.ts` — subscription validation, secret rotation, endpoint verification
- [x] Add `packages/integration/src/webhook_delivery.hook.ts` — delivery tracking, retry scheduling, dead-letter handling
- [x] Add `packages/integration/src/api_key.hook.ts` — key generation, expiry alerts, usage tracking, rate limit enforcement

#### 11B-3: High-Priority Connectors (5 initial connectors)

Each connector includes: `*.action.ts` (API operations), `*.hook.ts` (event mapping), tests.

- [x] **Stripe Connector** — `packages/integration/src/connectors/stripe.action.ts`
  - Payment intent creation, refund processing, subscription sync
  - Map Stripe webhooks → Finance package (invoice.paid, payment.failed, subscription.updated)
  - Sync: Stripe Customer ↔ Account, Stripe Invoice ↔ Invoice, Stripe Subscription ↔ Subscription
- [x] **DocuSign Connector** — `packages/integration/src/connectors/docusign.action.ts`
  - Envelope creation from Quote/Contract, signing status tracking
  - Map DocuSign webhooks → Products/Finance (envelope.completed → contract.status = 'Signed')
  - Sync: DocuSign Envelope ↔ Contract, signing events → Activity
- [x] **Slack Connector** — `packages/integration/src/connectors/slack.action.ts`
  - Send notifications for deal closures, case escalations, approval requests
  - Slash commands for quick CRM lookups (`/hotcrm account Acme Corp`)
  - Map Slack events → Activity (message sent, channel mention)
- [x] **Gmail Connector** — `packages/integration/src/connectors/gmail.action.ts`
  - Email-to-Activity logging, thread tracking, attachment linking
  - Email template send via Gmail API, tracking pixels for open/click
  - Sync: Gmail threads ↔ Activity, contacts ↔ Contact
- [x] **Microsoft Teams Connector** — `packages/integration/src/connectors/teams.action.ts`
  - Meeting scheduling from CRM, meeting notes → Activity
  - Adaptive card notifications for pipeline changes, approval requests
  - Sync: Teams meetings ↔ Activity, Teams contacts ↔ Contact

#### 11B-4: Actions & AI Capabilities

- [x] Add `packages/integration/src/sync_ai.action.ts` — AI-powered field mapping suggestions, conflict resolution recommendations, data quality assessment for sync
- [x] Add `packages/integration/src/connector_ai.action.ts` — natural language connector configuration ("Connect my Stripe account"), troubleshooting assistant

#### 11B-5: UI Metadata

- [x] Add `packages/integration/src/connector.page.ts` — connector marketplace with setup wizard
- [x] Add `packages/integration/src/connector.view.ts` — connector library with status, health, last sync
- [x] Add `packages/integration/src/sync_config.page.ts` — sync configuration with field mapping editor
- [x] Add `packages/integration/src/integration.dashboard.ts` — integration health: sync success rates, webhook deliveries, API usage

#### 11B-6: Tests

- [x] Add `packages/integration/__tests__/unit/objects/spec-compliance.test.ts` — validate all ~8 objects against spec
- [x] Add `packages/integration/__tests__/unit/hooks/connector.hook.test.ts` — lifecycle, health check
- [x] Add `packages/integration/__tests__/unit/hooks/sync_config.hook.test.ts` — mapping validation, scheduling
- [x] Add `packages/integration/__tests__/unit/hooks/webhook_subscription.hook.test.ts` — validation, retry
- [x] Add `packages/integration/__tests__/unit/connectors/stripe.action.test.ts` — payment operations, webhook mapping
- [x] Add `packages/integration/__tests__/unit/connectors/docusign.action.test.ts` — envelope operations
- [x] Add `packages/integration/__tests__/unit/connectors/slack.action.test.ts` — notifications, slash commands
- [x] Add `packages/integration/__tests__/integration/sync-flow.test.ts` — end-to-end sync lifecycle

### Phase 11C: Community Package (Q4 2026, Weeks 9-12) — P1

> Goal: Build the `@hotcrm/community` Customer Community Portal for self-service and engagement.

#### 11C-1: Package Scaffolding & Core Objects

- [x] Initialize `packages/community/` package with `package.json`, `tsconfig.json`, `plugin.ts`
- [x] Add `packages/community/src/community.object.ts` — community portal configuration (name, description, domain, theme, features_enabled, status, branding)
- [x] Add `packages/community/src/forum_category.object.ts` — forum organization (name, description, parent_category, sort_order, icon, is_archived)
- [x] Add `packages/community/src/topic.object.ts` — discussion topics (title, body, category_id, author_id, status, is_pinned, is_locked, view_count, reply_count)
- [x] Add `packages/community/src/reply.object.ts` — topic replies (topic_id, body, author_id, is_accepted_answer, upvotes, is_flagged)
- [x] Add `packages/community/src/idea.object.ts` — feature requests (title, description, category, status, vote_count, priority_score, assigned_release)
- [x] Add `packages/community/src/user_group.object.ts` — community segmentation (name, description, type, criteria, member_count, access_level)
- [x] Add `packages/community/src/community_event.object.ts` — community events (title, description, event_type, start_date, end_date, location, capacity, rsvp_count, recording_url)
- [x] Add `packages/community/src/badge.object.ts` — gamification rewards (name, description, icon, criteria, points_value, is_automatic)
- [x] Validate all objects with `ObjectSchema.create()` — 100% spec compliance

#### 11C-2: Hooks & Business Logic

- [x] Add `packages/community/src/topic.hook.ts` — content moderation (profanity filter, spam detection), notification to subscribers, auto-tagging, view counting
- [x] Add `packages/community/src/reply.hook.ts` — answer acceptance, upvote tracking, author reputation update, spam detection
- [x] Add `packages/community/src/idea.hook.ts` — vote aggregation, status transitions (Submitted → Under Review → Planned → Released), notification on status change
- [x] Add `packages/community/src/user_group.hook.ts` — membership validation, auto-assignment based on criteria, access level enforcement
- [x] Add `packages/community/src/community_event.hook.ts` — RSVP management, capacity enforcement, reminder scheduling, recording link notification
- [x] Add `packages/community/src/badge.hook.ts` — auto-award based on activity criteria (first post, 10 replies, accepted answer), points calculation
- [x] Add `packages/community/src/community.hook.ts` — portal configuration validation, feature toggle enforcement, domain verification

#### 11C-3: Actions & AI Capabilities

- [x] Add `packages/community/src/community_ai.action.ts` — AI-powered content moderation, auto-categorization, similar topic detection, answer suggestion from knowledge base
- [x] Add `packages/community/src/community_analytics.action.ts` — engagement metrics, active contributor reports, trending topics, sentiment analysis

#### 11C-4: UI Metadata

- [x] Add `packages/community/src/topic.page.ts` — topic detail with replies, voting, best answer
- [x] Add `packages/community/src/topic.view.ts` — topic list with category, status, activity filters
- [x] Add `packages/community/src/idea.page.ts` — idea detail with voting, status timeline, comments
- [x] Add `packages/community/src/idea.view.ts` — idea board with vote ranking, status filters
- [x] Add `packages/community/src/community.dashboard.ts` — community health: engagement rate, active users, resolution rate, top contributors

#### 11C-5: Tests

- [x] Add `packages/community/__tests__/unit/objects/spec-compliance.test.ts` — validate all ~8 objects against spec
- [x] Add `packages/community/__tests__/unit/hooks/topic.hook.test.ts` — moderation, notification, auto-tagging
- [x] Add `packages/community/__tests__/unit/hooks/idea.hook.test.ts` — voting, status transitions
- [x] Add `packages/community/__tests__/unit/hooks/badge.hook.test.ts` — auto-award criteria, points
- [x] Add `packages/community/__tests__/unit/actions/community_ai.action.test.ts` — moderation, categorization
- [x] Add `packages/community/__tests__/integration/community-support.test.ts` — community topic → knowledge article, community user → CRM contact linking

### Phase 11D: Cross-Ecosystem Hardening (Q4 2026, Weeks 13-16) — P1

> Goal: Integration tests, additional connectors, security, performance, and documentation for all 3 new packages.

#### 11D-1: Additional Connectors (5 more, Medium Priority)

- [x] **PayPal Connector** — `packages/integration/src/connectors/paypal.action.ts` — payment processing, refund handling, subscription management
- [x] **Adobe Sign Connector** — `packages/integration/src/connectors/adobe_sign.action.ts` — agreement lifecycle, signing workflow, template management
- [x] **Outlook Connector** — `packages/integration/src/connectors/outlook.action.ts` — email-to-activity, calendar sync, contact sync
- [x] **QuickBooks Connector** — `packages/integration/src/connectors/quickbooks.action.ts` — invoice sync, payment reconciliation, customer/vendor mapping
- [x] **LinkedIn Connector** — `packages/integration/src/connectors/linkedin.action.ts` — lead enrichment, recruiting pipeline, company data import

#### 11D-2: Cross-Package Integration Tests

- [x] Analytics → CRM: sales pipeline report pulling from opportunity, account, forecast data
- [x] Analytics → Finance: revenue analytics across invoice, payment, contract objects
- [x] Analytics → Marketing: campaign ROI reports, lead funnel analysis
- [x] Integration → Finance: Stripe payment sync → Invoice status update → Revenue recognition trigger
- [x] Integration → CRM: Gmail email → Activity creation → Contact timeline update
- [x] Community → Support: forum topic flagged → case auto-creation → knowledge article suggestion
- [x] Community → CRM: community user → contact linking, idea → product feedback loop
- [x] End-to-end: Lead (CRM) → Campaign attribution (Marketing) → Deal close (CRM) → Invoice (Finance) → Stripe payment (Integration) → Revenue report (Analytics)

#### 11D-3: Security & Permissions

- [x] Add `packages/analytics/src/analytics.permission.ts` — report access control, dashboard sharing, KPI visibility
- [x] Add `packages/integration/src/integration.permission.ts` — connector management, sync configuration, API key management
- [x] Add `packages/community/src/community.permission.ts` — content moderation, community administration, forum management
- [x] Add credential encryption for connector auth tokens (integration with `@objectstack/runtime` secrets vault)

#### 11D-4: Performance & Scale

- [x] Add caching configuration for analytics queries (CacheConfig for report results, KPI snapshots)
- [x] Add bulk sync support for integration connectors (batch API for 10K+ record syncs)
- [x] Add rate limiting configuration for connector API calls (per-connector throttle)
- [x] Performance benchmark: analytics query response < 2s for 100K record datasets

#### 11D-5: Documentation & DX

- [x] Add `content/docs/modules/analytics.mdx` — analytics package guide with report/dashboard examples
- [x] Add `content/docs/modules/integration.mdx` — integration package guide with connector setup tutorials
- [x] Add `content/docs/modules/community.mdx` — community package guide with portal configuration
- [x] Add `content/docs/guides/building-connectors.mdx` — developer guide for building custom connectors
- [x] Add `content/docs/guides/analytics-queries.mdx` — ObjectQL analytics patterns and aggregation guide
- [x] Update `docs/SALESFORCE_FEATURE_COMPARISON.md` with new integration and analytics parity
- [x] Update `README.md` and `content/docs/roadmap.mdx` with Phase 11 metrics

### Phase 11 Expected Outcomes

| Metric | Before Phase 11 (after 10.5) | After Phase 11 | Change |
|--------|---------|----------------|--------|
| Business Objects | 94 | ~120 | +~26 objects |
| Business Packages | 7 (CRM, Finance, HR, Marketing, Products, Support, AI) | 10 (+Analytics, Integration, Community) | +3 packages |
| Application Schema Adoption | ~55 / ~80 (69%) | ~65 / ~80 (81%) | +10 schemas |
| External Connectors | 3 (from 10.5) | 13 | +10 connectors |
| Hooks | 71 | ~90 | +~19 hooks |
| Actions | 32 | ~45 | +~13 actions |
| Test Files | ~135 | ~162 | +~27 test files |
| Salesforce Parity | ~92% | ~95% | +3% (reporting, integration) |

---

## Phase 12: Vertical Solutions & Advanced AI (2027+)

> Industry-specific editions and next-generation AI capabilities built on the HotCRM platform.

### Phase 12 Timeline

```
2027 Q1   ████████  Phase 12A: Real Estate CRM Vertical
2027 Q2   ████████  Phase 12B: Healthcare CRM Vertical
2027 Q3   ████████  Phase 12C: Financial Services Vertical
2027 Q4   ████████  Phase 12D: Education CRM Vertical
2027+     ░░░░░░░░  Phase 12E: Advanced AI & Enterprise Features
```

### Phase 12A: Real Estate CRM (`@hotcrm/real-estate`) — Q1 2027

> Goal: Purpose-built CRM for brokerages and agents, covering the complete property transaction lifecycle.

#### Objects

- [x] `property.object.ts` — property details (address, type, bedrooms, bathrooms, sqft, lot_size, year_built, features, mls_number, status)
- [x] `listing.object.ts` — active/sold listings (property_id, list_price, sold_price, list_date, sold_date, days_on_market, listing_agent, listing_type)
- [x] `showing.object.ts` — property showings (listing_id, agent_id, buyer_contact_id, scheduled_date, feedback, rating, follow_up_status)
- [x] `real_estate_offer.object.ts` — purchase offers (listing_id, buyer_id, offer_amount, contingencies, expiration_date, status, counter_offer_amount)
- [x] `commission.object.ts` — commission tracking (transaction_id, agent_id, commission_rate, commission_amount, split_type, payment_status)
- [x] `open_house.object.ts` — open house events (listing_id, date, time_start, time_end, attendee_count, leads_generated)
- [x] `neighborhood.object.ts` — neighborhood data (name, city, state, median_price, school_rating, walk_score, amenities)

#### Hooks & Actions

- [x] `listing.hook.ts` — MLS integration, days-on-market calculation, price change alerts, auto-comparable analysis
- [x] `showing.hook.ts` — calendar conflict detection, auto-feedback request, lead scoring from showing activity
- [x] `real_estate_offer.hook.ts` — offer validation, counter-offer workflow, contingency tracking, closing timeline
- [x] `commission.hook.ts` — split calculation, cap tracking, payment scheduling
- [x] `real_estate_ai.action.ts` — property valuation AI, market trend analysis, lead matching (buyer preferences → listings)

#### Tests

- [x] Spec-compliance tests for all ~7 objects
- [x] Hook tests for listing lifecycle, showing scheduling, offer workflow
- [x] Integration test: listing → showing → offer → commission → payment flow

### Phase 12B: Healthcare CRM (`@hotcrm/healthcare`) — Q2 2027

> Goal: HIPAA-compliant CRM for clinics and healthcare providers.

#### Objects

- [x] `patient.object.ts` — patient demographics (name, dob, gender, insurance_id, primary_physician, allergies, medical_record_number)
- [x] `appointment.object.ts` — appointment scheduling (patient_id, provider_id, appointment_type, date_time, duration, status, notes, telehealth_link)
- [x] `insurance.object.ts` — insurance plans (provider_name, plan_type, policy_number, group_number, coverage_start, coverage_end, copay, deductible)
- [x] `referral.object.ts` — provider referrals (patient_id, referring_provider, receiving_provider, reason, status, urgency, referral_date)
- [x] `hipaa_audit.object.ts` — HIPAA compliance audit log (user_id, action, record_type, record_id, timestamp, ip_address, access_reason)
- [x] `prescription.object.ts` — prescriptions (patient_id, medication, dosage, frequency, prescriber_id, pharmacy, refills_remaining, status)
- [x] `care_plan.object.ts` — care plans (patient_id, condition, goals, interventions, start_date, review_date, status)

#### Hooks & Actions

- [x] `appointment.hook.ts` — scheduling conflict detection, reminder notifications, no-show tracking, telehealth link generation
- [x] `patient.hook.ts` — data encryption for PHI fields, consent tracking, insurance eligibility verification
- [x] `referral.hook.ts` — auto-routing to specialists, status tracking, follow-up scheduling
- [x] `hipaa_audit.hook.ts` — automatic audit trail for all PHI access, anomaly detection for suspicious access patterns
- [x] `healthcare_ai.action.ts` — appointment scheduling optimization, patient risk scoring, care gap identification

#### Tests

- [x] Spec-compliance tests for all ~7 objects
- [x] Hook tests for appointment scheduling, HIPAA audit trails, referral workflow
- [x] Integration test: patient registration → appointment → referral → care plan → follow-up

### Phase 12C: Financial Services CRM (`@hotcrm/financial-services`) — Q3 2027

> Goal: CRM for wealth management and banking with compliance built in.

#### Objects

- [x] `wealth_account.object.ts` — client wealth accounts (client_id, account_type, balance, risk_profile, investment_strategy, advisor_id)
- [x] `portfolio.object.ts` — investment portfolios (account_id, assets, allocation, performance_ytd, benchmark, rebalance_date)
- [x] `advisory.object.ts` — advisory interactions (client_id, advisor_id, meeting_type, recommendations, next_review, compliance_approved)
- [x] `compliance_check.object.ts` — regulatory compliance (entity_id, check_type, status, findings, reviewer, review_date, regulation)
- [x] `kyc.object.ts` — Know Your Customer verification (client_id, document_type, document_id, verification_status, verified_date, expiry_date, risk_level)
- [x] `financial_product.object.ts` — financial products (name, type, risk_rating, min_investment, expected_return, fee_structure, maturity)
- [x] `transaction_record.object.ts` — financial transactions (account_id, type, amount, date, counterparty, status, compliance_flag)

#### Hooks & Actions

- [x] `wealth_account.hook.ts` — risk profile assessment, suitability checks, balance alerts
- [x] `portfolio.hook.ts` — drift detection, auto-rebalance triggers, performance calculation
- [x] `kyc.hook.ts` — document expiry alerts, periodic re-verification, risk level auto-classification
- [x] `compliance_check.hook.ts` — regulation change alerts, automated screening, audit trail
- [x] `financial_services_ai.action.ts` — portfolio optimization, client risk profiling, regulatory change impact analysis

#### Tests

- [x] Spec-compliance tests for all ~7 objects
- [x] Hook tests for KYC verification, compliance checks, portfolio management
- [x] Integration test: client onboarding → KYC → account opening → portfolio creation → advisory review

### Phase 12D: Education CRM (`@hotcrm/education`) — Q4 2027

> Goal: CRM for universities and EdTech covering the full student lifecycle.

#### Objects

- [x] `student.object.ts` — student profiles (name, email, enrollment_status, program, gpa, advisor_id, graduation_date)
- [x] `enrollment.object.ts` — course enrollments (student_id, course_id, term, status, grade, credits)
- [x] `course.object.ts` — course catalog (name, department, credits, instructor_id, capacity, schedule, prerequisites)
- [x] `alumni.object.ts` — alumni network (student_id, graduation_year, degree, employer, giving_history, engagement_score)
- [x] `scholarship.object.ts` — scholarship management (name, amount, criteria, application_deadline, recipients, fund_balance)
- [x] `application_form.object.ts` — admissions applications (applicant_name, program, status, test_scores, gpa, essays, recommendations, decision)
- [x] `campus_event.object.ts` — campus events (name, type, date, location, target_audience, rsvp_count, feedback_score)

#### Hooks & Actions

- [x] `student.hook.ts` — enrollment validation, academic standing calculation, advisor assignment
- [x] `enrollment.hook.ts` — prerequisite checks, capacity enforcement, waitlist management, grade posting
- [x] `scholarship.hook.ts` — eligibility verification, fund balance tracking, auto-renewal
- [x] `application_form.hook.ts` — application completeness checks, reviewer assignment, decision workflow
- [x] `education_ai.action.ts` — student success prediction, course recommendation, enrollment forecasting, alumni engagement scoring

#### Tests

- [x] Spec-compliance tests for all ~7 objects
- [x] Hook tests for enrollment, scholarship, application workflow
- [x] Integration test: application → admission → enrollment → graduation → alumni engagement

---

## Phase 13: Module-by-Module Deep Optimization & Seed Data Foundation (2027 Q1-Q2)

> Goal: Address metadata richness imbalance, establish seed data foundation, and complete plugin registration for all 13 packages.

### Phase 13 Timeline

```
2027 Q1 Week 1-3   ████████  Phase 13A: Seed Data Foundation
2027 Q1 Week 4     ████████  Phase 13B: Root Config & Plugin Registration
2027 Q1-Q2 Week 5-10 ████████  Phase 13C: Vertical Industry Packages Deep Enhancement
2027 Q2 Week 11-14 ████████  Phase 13D: Core Cloud Metadata Equalization
2027 Q2 Week 15-16 ████████  Phase 13E: Validation, Tests & Documentation
```

### Phase 13 Gaps Addressed

**Gap 1: Extreme Metadata Richness Imbalance** — CRM package has 22+ metadata file types, but other packages lag significantly. Phase 13D will bring all core clouds (finance, marketing, products, support, hr, analytics, integration, community) to CRM-level richness, and Phase 13C will enhance vertical packages with complete UI metadata.

**Gap 2: Zero Seed/Initial Data** — No `*.seed.ts` files, no `defaultRecords`, no demo data exists. Phase 13A establishes the seed data foundation with system reference data and per-package demo data for all 13 packages.

**Gap 3: Incomplete Plugin Registration** — Only 6 of 13 packages are registered in root `objectstack.config.ts`. Phase 13B will register all packages with dependency validation.

### Phase 13A: Seed Data Foundation (Weeks 1-3)

> Design and implement seed data conventions, system reference data, and per-package demo data.

#### 13A-1: Seed Data Convention Design

- [x] Define `*.seed.ts` file convention in custom instructions and QUICK_REFERENCE.md
- [ ] Design seed data schema using `@objectstack/spec/data` (if SeedDataSchema exists)
- [x] Establish naming convention: `system.seed.ts` for reference data, `{object}.seed.ts` for object-specific data
- [x] Define seed data lifecycle: load order, dependency resolution, idempotency
- [ ] Add seed data validation using ObjectSchema.parse()

#### 13A-2: System Reference Data Seeds

- [x] Create `packages/core/src/system.seed.ts` — currencies, countries, industries, timezones, languages
- [x] Create `packages/crm/src/industry.seed.ts` — standard industry codes (NAICS, SIC)
- [x] Create `packages/finance/src/currency.seed.ts` — major currencies with exchange rates
- [x] Create `packages/hr/src/department.seed.ts` — standard department types
- [x] Create `packages/marketing/src/campaign_type.seed.ts` — standard campaign types

#### 13A-3: Per-Package Demo Data Seeds

**CRM Package:**
- [x] `packages/crm/src/account.seed.ts` — 10 sample accounts (mix of industries)
- [x] `packages/crm/src/contact.seed.ts` — 30 sample contacts (linked to accounts)
- [x] `packages/crm/src/lead.seed.ts` — 20 sample leads (various stages)
- [x] `packages/crm/src/opportunity.seed.ts` — 15 sample opportunities (different stages, amounts)

**Finance Package:**
- [x] `packages/finance/src/invoice.seed.ts` — 10 sample invoices (paid, pending, overdue)
- [x] `packages/finance/src/payment.seed.ts` — 8 sample payments (linked to invoices)

**Marketing Package:**
- [x] `packages/marketing/src/campaign.seed.ts` — 5 sample campaigns (email, social, event)
- [x] `packages/marketing/src/email_template.seed.ts` — 3 sample email templates

**Products Package:**
- [x] `packages/products/src/product.seed.ts` — 15 sample products (various categories)
- [x] `packages/products/src/price_book.seed.ts` — 2 sample price books (standard, enterprise)

**Support Package:**
- [x] `packages/support/src/case.seed.ts` — 10 sample cases (various priorities, statuses)
- [x] `packages/support/src/kb_article.seed.ts` — 5 sample knowledge base articles

**HR Package:**
- [x] `packages/hr/src/employee.seed.ts` — 12 sample employees (various departments)
- [x] `packages/hr/src/job_posting.seed.ts` — 5 sample job postings

**Analytics Package:**
- [x] `packages/analytics/src/report.seed.ts` — 3 sample reports (sales, finance, support)

**Integration Package:**
- [x] `packages/integration/src/connection.seed.ts` — 2 sample connections (Stripe, Slack)

**Community Package:**
- [x] `packages/community/src/topic.seed.ts` — 5 sample forum topics
- [x] `packages/community/src/idea.seed.ts` — 3 sample ideas

**Vertical Packages:**
- [x] `packages/healthcare/src/patient.seed.ts` — 5 sample patients
- [x] `packages/real-estate/src/property.seed.ts` — 5 sample properties
- [x] `packages/education/src/student.seed.ts` — 5 sample students
- [x] `packages/financial-services/src/wealth_account.seed.ts` — 5 sample wealth accounts

#### 13A-4: Seed Data Tooling & CI

- [x] Create `scripts/seed.ts` — seed data loader with dependency resolution
- [x] Add `pnpm seed` command to root package.json
- [x] Add `pnpm seed:reset` command for clean re-seeding
- [ ] Add seed data validation tests in `packages/*/src/__tests__/seeds.test.ts`
- [ ] Add CI check to validate all seed data passes ObjectSchema validation

### Phase 13B: Root Config & Plugin Registration (Week 4)

> Register all 13 packages in root objectstack.config.ts with dependency validation.

#### 13B-1: Plugin Registration

- [x] Update `objectstack.config.ts` to register analytics package
- [x] Update `objectstack.config.ts` to register integration package
- [x] Update `objectstack.config.ts` to register community package
- [x] Update `objectstack.config.ts` to register healthcare package
- [x] Update `objectstack.config.ts` to register real-estate package
- [x] Update `objectstack.config.ts` to register education package
- [x] Update `objectstack.config.ts` to register financial-services package

#### 13B-2: Dependency Validation

- [ ] Create dependency graph for all 13 packages
- [ ] Validate plugin load order respects dependencies (e.g., integration depends on finance for Stripe→Invoice)
- [ ] Add plugin health check on kernel bootstrap (verify all plugins loaded successfully)
- [ ] Add tests for plugin registration and dependency resolution

### Phase 13C: Vertical Industry Packages Deep Enhancement (Weeks 5-10)

> Bring healthcare, real-estate, education, and financial-services packages to production readiness with complete UI metadata.

#### Phase 13C-1: Healthcare Package Enhancement (Weeks 5-6)

**Page Layouts (4 pages):**
- [x] `packages/healthcare/src/patient.page.ts` — patient record page with HIPAA-aware sections, appointment calendar view
- [x] `packages/healthcare/src/appointment.page.ts` — appointment detail page with telehealth link
- [x] `packages/healthcare/src/referral.page.ts` — referral tracking page
- [x] `packages/healthcare/src/healthcare_home.page.ts` — healthcare home page with key widgets

**List Views (3 views):**
- [x] `packages/healthcare/src/patient.view.ts` — patient list with demographics, insurance status
- [x] `packages/healthcare/src/appointment.view.ts` — appointment calendar view, list view by status
- [x] `packages/healthcare/src/referral.view.ts` — referral pipeline view

**Form Layouts (2 forms):**
- [x] `packages/healthcare/src/appointment_schedule.form.ts` — appointment scheduling form (wizard layout)
- [x] `packages/healthcare/src/referral_request.form.ts` — referral request form

**Dashboard:**
- [x] `packages/healthcare/src/healthcare.dashboard.ts` — clinical dashboard (appointments today, pending referrals, compliance status)

**Workflow & State Machine:**
- [x] `packages/healthcare/src/patient_lifecycle.statemachine.ts` — patient lifecycle (registered → active → discharged)
- [x] `packages/healthcare/src/appointment.workflow.ts` — appointment workflow (scheduled → confirmed → completed)

**Security:**
- [x] `packages/healthcare/src/hipaa.permission.ts` — HIPAA permission set for healthcare staff
- [x] `packages/healthcare/src/patient.rls.ts` — patient data RLS (restrict to assigned provider)

**Reports & Charts:**
- [x] `packages/healthcare/src/appointment_volume.report.ts` — appointment volume report
- [x] `packages/healthcare/src/referral_pipeline.report.ts` — referral pipeline report
- [x] `packages/healthcare/src/compliance_audit.report.ts` — HIPAA compliance audit report
- [x] `packages/healthcare/src/appointment_trend.chart.ts` — appointment trend chart
- [x] `packages/healthcare/src/referral_status.chart.ts` — referral status chart

**Seed Data:**
- [x] `packages/healthcare/src/appointment.seed.ts` — sample appointments
- [x] `packages/healthcare/src/insurance.seed.ts` — sample insurance plans
- [x] `packages/healthcare/src/prescription.seed.ts` — sample prescriptions

**Tests:**
- [x] Spec-compliance tests for all new metadata (pages, views, forms, dashboard, workflow, state machine, permissions, RLS, reports, charts)
- [x] Seed data validation tests

#### Phase 13C-2: Real Estate Package Enhancement (Week 7)

**Page Layouts (4 pages):**
- [x] `packages/real-estate/src/property.page.ts` — property detail page with photos section
- [x] `packages/real-estate/src/listing.page.ts` — listing page with MLS info
- [x] `packages/real-estate/src/showing.page.ts` — showing detail page
- [x] `packages/real-estate/src/real_estate_home.page.ts` — brokerage home page

**List Views (3 views):**
- [x] `packages/real-estate/src/listing.view.ts` — listing list with photos, price, DOM
- [x] `packages/real-estate/src/showing.view.ts` — showing calendar view
- [x] `packages/real-estate/src/real_estate_offer.view.ts` — offer Kanban view

**Form Layouts (2 forms):**
- [x] `packages/real-estate/src/listing.form.ts` — listing form (tabbed: property details | pricing | photos | agent info)
- [x] `packages/real-estate/src/real_estate_offer.form.ts` — offer form

**Dashboard:**
- [x] `packages/real-estate/src/brokerage.dashboard.ts` — brokerage dashboard (active listings, showings this week, pending offers, commission YTD)

**Workflow & State Machine:**
- [x] `packages/real-estate/src/listing_lifecycle.statemachine.ts` — listing lifecycle (draft → active → pending → sold/expired)
- [x] `packages/real-estate/src/commission_calculation.workflow.ts` — commission calculation workflow

**Security:**
- [x] `packages/real-estate/src/real_estate.permission.ts` — permission set for agents/brokers/admins

**Reports & Charts:**
- [x] `packages/real-estate/src/listing_performance.report.ts` — listing performance report
- [x] `packages/real-estate/src/agent_productivity.report.ts` — agent productivity report
- [x] `packages/real-estate/src/market_analysis.report.ts` — market analysis report
- [x] `packages/real-estate/src/listing_trend.chart.ts` — listing trend chart
- [x] `packages/real-estate/src/commission_breakdown.chart.ts` — commission breakdown chart

**Seed Data:**
- [x] `packages/real-estate/src/listing.seed.ts` — sample listings
- [x] `packages/real-estate/src/showing.seed.ts` — sample showings
- [x] `packages/real-estate/src/real_estate_offer.seed.ts` — sample offers

**Tests:**
- [x] Spec-compliance tests for all new metadata
- [x] Seed data validation tests

#### Phase 13C-3: Education Package Enhancement (Weeks 8-9)

**Page Layouts (4 pages):**
- [x] `packages/education/src/student.page.ts` — student detail page with academic history
- [x] `packages/education/src/course.page.ts` — course catalog view
- [x] `packages/education/src/enrollment.page.ts` — enrollment detail page
- [x] `packages/education/src/education_home.page.ts` — admissions home page

**List Views (3 views):**
- [x] `packages/education/src/student.view.ts` — student list with GPA, enrollment status
- [x] `packages/education/src/course.view.ts` — course catalog view
- [x] `packages/education/src/application_form.view.ts` — application pipeline view

**Form Layouts (2 forms):**
- [x] `packages/education/src/enrollment.form.ts` — enrollment form (wizard: course selection → prerequisites check → confirm)
- [x] `packages/education/src/application.form.ts` — application form

**Dashboard:**
- [x] `packages/education/src/admissions.dashboard.ts` — admissions dashboard (applications by stage, enrollment trends, scholarship allocation)

**Workflow & State Machine:**
- [x] `packages/education/src/application.statemachine.ts` — application state machine (submitted → under review → accepted/rejected)
- [x] `packages/education/src/enrollment.workflow.ts` — enrollment workflow (registered → enrolled → graded → completed)

**Security:**
- [x] `packages/education/src/education.permission.ts` — permission sets for students/faculty/registrar/admin

**Reports & Charts:**
- [x] `packages/education/src/enrollment_by_program.report.ts` — enrollment by program report
- [x] `packages/education/src/gpa_distribution.report.ts` — GPA distribution report
- [x] `packages/education/src/retention_rate.report.ts` — retention rate report
- [x] `packages/education/src/enrollment_trend.chart.ts` — enrollment trend chart
- [x] `packages/education/src/graduation_rate.chart.ts` — graduation rate chart

**Seed Data:**
- [x] `packages/education/src/enrollment.seed.ts` — sample enrollments
- [x] `packages/education/src/course.seed.ts` — sample courses
- [x] `packages/education/src/scholarship.seed.ts` — sample scholarships

**Tests:**
- [x] Spec-compliance tests for all new metadata
- [x] Seed data validation tests

#### Phase 13C-4: Financial Services Package Enhancement (Week 10)

**Page Layouts (4 pages):**
- [x] `packages/financial-services/src/wealth_account.page.ts` — client wealth account page with portfolio view, KYC status
- [x] `packages/financial-services/src/portfolio.page.ts` — portfolio detail page
- [x] `packages/financial-services/src/advisory.page.ts` — advisory meeting page
- [x] `packages/financial-services/src/financial_services_home.page.ts` — wealth management home page

**List Views (3 views):**
- [x] `packages/financial-services/src/wealth_account.view.ts` — account list with balance, risk profile
- [x] `packages/financial-services/src/portfolio.view.ts` — portfolio performance view
- [x] `packages/financial-services/src/kyc.view.ts` — KYC status view

**Form Layouts (2 forms):**
- [x] `packages/financial-services/src/advisory_meeting.form.ts` — advisory meeting form
- [x] `packages/financial-services/src/kyc_verification.form.ts` — KYC verification form

**Dashboard:**
- [x] `packages/financial-services/src/wealth_management.dashboard.ts` — wealth management dashboard (AUM, portfolio performance, compliance alerts)

**Workflow & State Machine:**
- [x] `packages/financial-services/src/kyc_lifecycle.statemachine.ts` — KYC state machine (pending → verified → expired → re-verification)
- [x] `packages/financial-services/src/portfolio_rebalance.workflow.ts` — portfolio rebalance workflow

**Security:**
- [x] `packages/financial-services/src/compliance.permission.ts` — compliance permission set
- [x] `packages/financial-services/src/client_data.rls.ts` — client data RLS

**Reports & Charts:**
- [x] `packages/financial-services/src/portfolio_performance.report.ts` — portfolio performance report
- [x] `packages/financial-services/src/compliance_status.report.ts` — compliance status report
- [x] `packages/financial-services/src/advisory_activity.report.ts` — advisory activity report
- [x] `packages/financial-services/src/aum_trend.chart.ts` — AUM trend chart
- [x] `packages/financial-services/src/risk_distribution.chart.ts` — risk distribution chart

**Seed Data:**
- [x] `packages/financial-services/src/portfolio.seed.ts` — sample portfolios
- [x] `packages/financial-services/src/kyc.seed.ts` — sample KYC records
- [x] `packages/financial-services/src/advisory.seed.ts` — sample advisory meetings

**Tests:**
- [x] Spec-compliance tests for all new metadata
- [x] Seed data validation tests

### Phase 13D: Core Cloud Metadata Equalization (Weeks 11-14)

> Bring finance, marketing, products, support, hr, analytics, integration, community to CRM-level metadata richness.

#### Phase 13D-1: Finance Package Metadata

**State Machine:**
- [x] `packages/finance/src/invoice_lifecycle.statemachine.ts` — invoice lifecycle (draft → sent → paid → overdue → cancelled)

**AI Agent:**
- [x] `packages/finance/src/finance_copilot.agent.ts` — finance copilot agent for AR/AP assistance

**Events:**
- [x] `packages/finance/src/finance.events.ts` — domain events (invoice_sent, payment_received, subscription_renewed, revenue_recognized)

**Capabilities:**
- [x] `packages/finance/src/finance.capabilities.ts` — finance package capability manifest

**Studio Plugin:**
- [x] `packages/finance/src/finance.studio.ts` — finance studio plugin config

**Additional Forms:**
- [x] `packages/finance/src/payment.form.ts` — payment form
- [x] `packages/finance/src/credit_note.form.ts` — credit note form

**Additional Pages:**
- [x] `packages/finance/src/revenue_home.page.ts` — revenue cloud home page
- [x] `packages/finance/src/ar_aging.page.ts` — AR aging page

**Additional Reports:**
- [x] `packages/finance/src/pl_statement.report.ts` — P&L statement report
- [x] `packages/finance/src/cash_position.report.ts` — cash position report

**Additional Charts:**
- [x] `packages/finance/src/revenue_waterfall.chart.ts` — revenue waterfall chart
- [x] `packages/finance/src/ar_aging.chart.ts` — AR aging chart

#### Phase 13D-2: Marketing Package Metadata

**State Machine:**
- [x] `packages/marketing/src/campaign_lifecycle.statemachine.ts` — campaign lifecycle (draft → planned → active → completed → analyzed)

**AI Agent:**
- [x] `packages/marketing/src/marketing_copilot.agent.ts` — marketing copilot for campaign optimization

**Events:**
- [x] `packages/marketing/src/marketing.events.ts` — domain events (campaign_launched, email_sent, lead_captured, journey_completed)

**Capabilities:**
- [x] `packages/marketing/src/marketing.capabilities.ts` — marketing package capability manifest

**Studio Plugin:**
- [x] `packages/marketing/src/marketing.studio.ts` — marketing studio plugin config

**Additional Forms:**
- [x] `packages/marketing/src/campaign.form.ts` — campaign form
- [x] `packages/marketing/src/email_template_editor.form.ts` — email template editor form

**Additional Pages:**
- [x] `packages/marketing/src/campaign_home.page.ts` — campaign home page
- [x] `packages/marketing/src/email_analytics.page.ts` — email analytics page

**Additional Reports:**
- [x] `packages/marketing/src/funnel_analysis.report.ts` — funnel analysis report
- [x] `packages/marketing/src/email_deliverability.report.ts` — email deliverability report

**Additional Charts:**
- [x] `packages/marketing/src/funnel.chart.ts` — funnel chart
- [x] `packages/marketing/src/email_open_rates.chart.ts` — email open rates chart

#### Phase 13D-3: Products Package Metadata

**State Machine:**
- [x] `packages/products/src/order_lifecycle.statemachine.ts` — order lifecycle (draft → submitted → approved → fulfilled → invoiced)

**AI Agent:**
- [x] `packages/products/src/cpq_assistant.agent.ts` — CPQ assistant for quote configuration

**Events:**
- [x] `packages/products/src/products.events.ts` — domain events (quote_generated, order_submitted, bundle_configured, discount_applied)

**Capabilities:**
- [x] `packages/products/src/products.capabilities.ts` — products package capability manifest

**Studio Plugin:**
- [x] `packages/products/src/products.studio.ts` — products studio plugin config

**Additional Forms:**
- [x] `packages/products/src/order.form.ts` — order form
- [x] `packages/products/src/bundle_config.form.ts` — bundle configuration form

**Additional Pages:**
- [x] `packages/products/src/cpq_home.page.ts` — CPQ home page
- [x] `packages/products/src/order_detail.page.ts` — order detail page

**Additional Reports:**
- [x] `packages/products/src/quote_conversion.report.ts` — quote conversion report
- [x] `packages/products/src/discount_analysis.report.ts` — discount analysis report

**Additional Charts:**
- [x] `packages/products/src/pricing_distribution.chart.ts` — pricing distribution chart
- [x] `packages/products/src/order_trend.chart.ts` — order trend chart

#### Phase 13D-4: Support Package Metadata

**AI Agent:**
- [x] `packages/support/src/support_copilot.agent.ts` — support copilot for case resolution assistance

**Events:**
- [x] `packages/support/src/support.events.ts` — domain events (case_created, case_escalated, case_resolved, sla_breached)

**Capabilities:**
- [x] `packages/support/src/support.capabilities.ts` — support package capability manifest

**Studio Plugin:**
- [x] `packages/support/src/support.studio.ts` — support studio plugin config

**Additional Forms:**
- [x] `packages/support/src/escalation.form.ts` — case escalation form

**Additional Pages:**
- [x] `packages/support/src/support_home.page.ts` — support home page
- [x] `packages/support/src/kb_article.page.ts` — knowledge base article page

**Additional Reports:**
- [x] `packages/support/src/first_response_time.report.ts` — first response time report
- [x] `packages/support/src/agent_performance.report.ts` — agent performance report

**Additional Charts:**
- [x] `packages/support/src/resolution_time_histogram.chart.ts` — resolution time histogram
- [x] `packages/support/src/sla_gauge.chart.ts` — SLA compliance gauge chart

#### Phase 13D-5: HR Package Metadata

**State Machine:**
- [x] `packages/hr/src/employee_lifecycle.statemachine.ts` — employee lifecycle (candidate → hired → active → terminated)

**AI Agent:**
- [x] `packages/hr/src/hr_copilot.agent.ts` — HR copilot for talent management

**Events:**
- [x] `packages/hr/src/hr.events.ts` — domain events (employee_hired, performance_reviewed, benefit_enrolled, employee_terminated)

**Capabilities:**
- [x] `packages/hr/src/hr.capabilities.ts` — HR package capability manifest

**Studio Plugin:**
- [x] `packages/hr/src/hr.studio.ts` — HR studio plugin config

**Additional Forms:**
- [x] `packages/hr/src/pto_request.form.ts` — PTO request form

**Additional Pages:**
- [x] `packages/hr/src/hr_home.page.ts` — HR home page
- [x] `packages/hr/src/org_chart.page.ts` — org chart page

**Additional Reports:**
- [x] `packages/hr/src/turnover_analysis.report.ts` — turnover analysis report
- [x] `packages/hr/src/comp_benchmark.report.ts` — compensation benchmark report

**Additional Charts:**
- [x] `packages/hr/src/headcount_trend.chart.ts` — headcount trend chart
- [x] `packages/hr/src/attrition_by_dept.chart.ts` — attrition by department chart

#### Phase 13D-6: Analytics Package Metadata

**AI Agent:**
- [x] `packages/analytics/src/analytics_copilot.agent.ts` — analytics copilot for natural language queries

**Events:**
- [x] `packages/analytics/src/analytics.events.ts` — domain events (report_executed, dashboard_viewed, insight_generated, anomaly_detected)

**Capabilities:**
- [x] `packages/analytics/src/analytics.capabilities.ts` — analytics package capability manifest

**Studio Plugin:**
- [x] `packages/analytics/src/analytics.studio.ts` — analytics studio plugin config

**Additional Forms:**
- [x] `packages/analytics/src/report_builder.form.ts` — report builder form (wizard)

**Additional Pages:**
- [x] `packages/analytics/src/analytics_home.page.ts` — analytics home page
- [x] `packages/analytics/src/report_builder.page.ts` — report builder page

**Additional Reports:**
- [x] `packages/analytics/src/query_performance.report.ts` — query performance report
- [x] `packages/analytics/src/data_freshness.report.ts` — data freshness report

**Additional Charts:**
- [x] `packages/analytics/src/query_latency.chart.ts` — query latency chart
- [x] `packages/analytics/src/data_volume_growth.chart.ts` — data volume growth chart

#### Phase 13D-7: Integration Package Metadata

**State Machine:**
- [x] `packages/integration/src/sync_lifecycle.statemachine.ts` — sync lifecycle (pending → running → completed → failed)

**AI Agent:**
- [x] `packages/integration/src/integration_assistant.agent.ts` — integration assistant for connector setup

**Events:**
- [x] `packages/integration/src/integration.events.ts` — domain events (connection_established, sync_started, sync_completed, webhook_received)

**Capabilities:**
- [x] `packages/integration/src/integration.capabilities.ts` — integration package capability manifest

**Studio Plugin:**
- [x] `packages/integration/src/integration.studio.ts` — integration studio plugin config

**Additional Forms:**
- [x] `packages/integration/src/connector_setup.form.ts` — connector setup form (wizard)
- [x] `packages/integration/src/field_mapping.form.ts` — field mapping form

**Additional Pages:**
- [x] `packages/integration/src/integration_home.page.ts` — integration home page
- [x] `packages/integration/src/connector_detail.page.ts` — connector detail page

**Additional Reports:**
- [x] `packages/integration/src/sync_success_rates.report.ts` — sync success rates report
- [x] `packages/integration/src/api_usage.report.ts` — API usage report

**Additional Charts:**
- [x] `packages/integration/src/sync_volume.chart.ts` — sync volume chart
- [x] `packages/integration/src/error_rates.chart.ts` — integration error rates chart

#### Phase 13D-8: Community Package Metadata

**State Machine:**
- [x] `packages/community/src/idea_lifecycle.statemachine.ts` — idea lifecycle (submitted → under review → planned → implemented → rejected)

**AI Agent:**
- [x] `packages/community/src/community_moderator.agent.ts` — community moderator for content moderation

**Events:**
- [x] `packages/community/src/community.events.ts` — domain events (topic_created, reply_posted, idea_voted, badge_awarded)

**Capabilities:**
- [x] `packages/community/src/community.capabilities.ts` — community package capability manifest

**Studio Plugin:**
- [x] `packages/community/src/community.studio.ts` — community studio plugin config

**Additional Forms:**
- [x] `packages/community/src/topic.form.ts` — topic creation form
- [x] `packages/community/src/event.form.ts` — community event form

**Additional Pages:**
- [x] `packages/community/src/community_home.page.ts` — community home page
- [x] `packages/community/src/moderation_queue.page.ts` — moderation queue page

**Additional Reports:**
- [x] `packages/community/src/engagement_metrics.report.ts` — engagement metrics report
- [x] `packages/community/src/content_quality.report.ts` — content quality report

**Additional Charts:**
- [x] `packages/community/src/post_activity.chart.ts` — post activity chart
- [x] `packages/community/src/user_growth.chart.ts` — user growth chart

### Phase 13E: Validation, Tests & Documentation (Weeks 15-16)

> Comprehensive testing, documentation updates, and final validation.

#### 13E-1: Spec-Compliance Tests

- [x] Add spec-compliance tests for all new metadata files across all 13 packages
- [x] Validate all pages use PageSchema from @objectstack/spec/ui
- [x] Validate all views use ViewSchema from @objectstack/spec/ui
- [x] Validate all forms use FormViewSchema from @objectstack/spec/ui
- [x] Validate all dashboards use DashboardSchema from @objectstack/spec/ui
- [x] Validate all state machines use StateMachineSchema from @objectstack/spec/automation
- [x] Validate all workflows use WorkflowRuleSchema from @objectstack/spec/automation
- [x] Validate all permissions use PermissionSetSchema from @objectstack/spec/security
- [x] Validate all RLS use RowLevelSecurityPolicySchema from @objectstack/spec/security
- [x] Validate all agents use AgentSchema from @objectstack/spec/ai
- [x] Validate all events use EventSchema from @objectstack/spec/kernel
- [x] Validate all capabilities use PluginCapabilityManifestSchema from @objectstack/spec/kernel

#### 13E-2: Seed Data Validation Tests

- [ ] Add seed data validation tests for all `*.seed.ts` files
- [ ] Ensure all seed data passes ObjectSchema.parse() validation
- [ ] Add cross-package relationship validation (e.g., invoice seeds reference valid account IDs)
- [ ] Test seed data load order and idempotency
- [ ] Add CI check for seed data validation

#### 13E-3: Cross-Package Integration Tests

- [ ] Test seed data relationships across packages (CRM→Finance, Marketing→CRM, etc.)
- [ ] Test plugin registration order respects dependencies
- [ ] Test vertical package integration with core clouds
- [ ] Test AI agents can access cross-package data

#### 13E-4: Documentation Updates

- [ ] Update `docs/SALESFORCE_FEATURE_COMPARISON.md` with new metadata counts
- [ ] Update `README.md` with Phase 13 metrics (seed data files, packages registered, metadata counts)
- [ ] Update `content/docs/roadmap.mdx` with Phase 13 summary
- [ ] Add `content/docs/guides/seed-data.mdx` — comprehensive seed data guide
- [ ] Add seed data examples to package guides (analytics, integration, community, vertical packages)
- [ ] Update QUICK_REFERENCE.md with `*.seed.ts` file convention

### Phase 13 Actual Outcomes ✅

| Metric | Before Phase 13 | After Phase 13 | Change |
|--------|----------------|----------------|--------|
| Seed Data Files | 0 | 39 | +39 |
| Packages Registered in Root Config | 6 | 13 | +7 |
| Vertical Packages with UI Metadata | 0 of 4 | 4 of 4 | +4 |
| State Machines | 3 | 13 | +10 |
| AI Agents (total) | 2 | 13 | +11 |
| Domain Events | 1 | 9 | +8 |
| Studio Plugins | 6 | 9 | +3 |
| Capability Manifests | 6 | 9 | +3 |
| Permission Sets | 9 | 13 | +4 |
| RLS Policies | 1 | 2 | +1 |
| Reports | 8 | 36 | +28 |
| Charts | 6 | 30 | +24 |
| Page Layouts | 19 | 55 | +36 |
| List Views | 11 files | 34 files | +23 |
| Form Views | 12 | 33 | +21 |
| Dashboards | 11 | 15 | +4 |
| Test Files | 173 | 180 | +7 |
| Tests Passing | 3318 | 3380 | +62 |

---

## Phase 14: v3.0.8 Feed System, Interface Builder & Enhanced UI Adoption (2027 Q2-Q3)

> Goal: Adopt all new metadata types introduced in @objectstack/spec v3.0.8, including the Chatter/Feed system, Interface Builder pages, enhanced dashboard features, and Feed API contracts across all business packages.

### Phase 14 Timeline

```
2027 Q2 Week 1-3   ████████  Phase 14A: Activity Feed & Chatter (FeedItem, Reactions, Subscriptions)
2027 Q2 Week 4-6   ████████  Phase 14B: Interface Builder & Blank Pages (BlankPageLayout, InterfacePage, ElementDataSource)
2027 Q3 Week 7-9   ████████  Phase 14C: Enhanced Dashboard & List View Features (DashboardHeader, GlobalFilter, ViewTab)
2027 Q3 Week 10-11 ████████  Phase 14D: Feed API Integration & Service Contracts (FeedApiContracts, IFeedService)
2027 Q3 Week 12    ████████  Phase 14E: Validation, Tests & Documentation
```

### Phase 14 New Capabilities from v3.0.8

**Capability 1: Activity Feed / Chatter System** — Salesforce Chatter equivalent. Every business object gets a record-level activity stream with posts, comments, @mentions, reactions, field change tracking, and subscription/follow functionality.

**Capability 2: Interface Builder / Blank Pages** — Low-code page builder with drag-and-drop blank canvas layouts. Admin-created custom pages with data-bound elements (buttons, filters, forms, images, text, record pickers).

**Capability 3: Enhanced Dashboard & List Views** — Dashboards gain headers with action buttons, cross-widget global filters, and widget KPI measures. List views support tabbed configurations, sharing settings, and appearance customization.

**Capability 4: Feed API & Service Contracts** — Complete REST API contracts for feed CRUD operations, reaction management, and record subscription/unsubscription. Standardized `IFeedService` contract for all packages.

**Capability 5: Studio Interface Builder** — Visual page builder in Studio with canvas snap/zoom settings and element palette for drag-and-drop page composition.

### Phase 14A: Activity Feed & Chatter System (Weeks 1-3) — P0

> Implement the Salesforce Chatter equivalent across all 6 core business clouds.

#### 14A-1: Feed Data Model & Configuration

- [ ] **CRM**: Add `*.feed.ts` — configure feed on Account, Opportunity, Contact, Lead, Case (FeedItemSchema, FeedActorSchema)
- [ ] **Finance**: Add `*.feed.ts` — configure feed on Contract, Invoice, Quote (FeedItemSchema)
- [ ] **HR**: Add `*.feed.ts` — configure feed on Employee, Job Application, Performance Review (FeedItemSchema)
- [ ] **Marketing**: Add `*.feed.ts` — configure feed on Campaign, Lead, Journey (FeedItemSchema)
- [ ] **Support**: Add `*.feed.ts` — configure feed on Case, Knowledge Article, SLA (FeedItemSchema)
- [ ] **Products**: Add `*.feed.ts` — configure feed on Product, Price Book, Quote Line (FeedItemSchema)

#### 14A-2: Reactions, Mentions & Subscriptions

- [ ] Configure `ReactionSchema` — define allowed reaction types per object (like, celebrate, support, insightful)
- [ ] Configure `MentionSchema` — @mention resolution and notification triggers
- [ ] Configure `RecordSubscriptionSchema` — auto-subscribe rules (record owner, last modifier, team members)
- [ ] Configure `FieldChangeEntrySchema` — define which field changes appear in feed (amount, stage, status, owner)

#### 14A-3: Record Page Chatter Component

- [ ] Add `RecordChatterProps` component to all record detail pages (embed feed on record pages)
- [ ] Configure feed visibility rules per object (FeedVisibility, FeedFilterMode)
- [ ] Add feed-related hooks for real-time notification on new feed items

### Phase 14B: Interface Builder & Blank Pages (Weeks 4-6) — P0

> Enable admin-created custom pages using the new Interface Builder metadata.

#### 14B-1: Blank Page Layouts

- [ ] **CRM**: Create `sales_dashboard.blank_page.ts` — custom sales command center (BlankPageLayoutSchema)
- [ ] **Finance**: Create `revenue_overview.blank_page.ts` — revenue recognition dashboard
- [ ] **HR**: Create `hr_portal.blank_page.ts` — employee self-service portal
- [ ] **Support**: Create `service_console.blank_page.ts` — agent workspace with multi-panel layout
- [ ] Define `BlankPageLayoutItemSchema` elements with `ElementDataSourceSchema` data bindings

#### 14B-2: Interface Page Configurations

- [ ] Configure `InterfacePageConfigSchema` for each blank page (permissions, data sources, filters)
- [ ] Implement element property schemas: `ElementButtonPropsSchema`, `ElementFilterPropsSchema`, `ElementFormPropsSchema`, `ElementImagePropsSchema`, `ElementNumberPropsSchema`, `ElementTextPropsSchema`, `ElementRecordPickerPropsSchema`
- [ ] Add `PageTypeSchema` classification to all existing and new pages (record, list, app, home, blank)

#### 14B-3: Studio Integration

- [ ] Configure `InterfaceBuilderConfigSchema` for Studio page builder experience
- [ ] Define `PageBuilderConfigSchema` with canvas and toolbox settings
- [ ] Configure `CanvasSnapSettingsSchema` for grid alignment
- [ ] Define `ElementPaletteItemSchema` entries for all available page elements

### Phase 14C: Enhanced Dashboard & List View Features (Weeks 7-9) — P1

> Upgrade existing dashboards and list views with new v3.0.8 capabilities.

#### 14C-1: Dashboard Enhancements

- [ ] Add `DashboardHeaderSchema` to all 11 dashboards (title, subtitle, action buttons)
- [ ] Add `DashboardHeaderActionSchema` — define header actions (refresh, export, share, filter)
- [ ] Implement `GlobalFilterSchema` on cross-cloud dashboards (date range, owner, region filters)
- [ ] Add `GlobalFilterOptionsFromSchema` — define filter option sources (object fields, picklists)
- [ ] Upgrade widgets with `WidgetMeasureSchema` (KPI values), `WidgetActionTypeSchema` (drill-down), `WidgetColorVariantSchema` (status colors)
- [ ] Add `VisualizationTypeSchema` to chart widgets for type-safe chart selection

#### 14C-2: List View Enhancements

- [ ] Add `ViewTabSchema` to key list views (e.g., Opportunities: Pipeline / Won / Lost / All)
- [ ] Configure `SharingConfigSchema` on views and dashboards (share with teams, roles, public)
- [ ] Add `AppearanceConfigSchema` to views (density mode, row height, color coding)
- [ ] Implement `AddRecordConfigSchema` for inline record creation from list views
- [ ] Configure `UserActionsConfigSchema` for toolbar action menus on record/list pages

#### 14C-3: Navigation Enhancements

- [ ] Add `NavigationAreaSchema` definitions (header, sidebar, utility bar)
- [ ] Implement `ActionNavItemSchema` for quick-action navigation entries
- [ ] Implement `ReportNavItemSchema` for report shortcuts in navigation

### Phase 14D: Feed API Integration & Service Contracts (Weeks 10-11) — P1

> Implement Feed API endpoints and service contracts.

#### 14D-1: Feed API Actions

- [ ] Create `feed.action.ts` in CRM package — CRUD operations using `CreateFeedItemRequestSchema`, `UpdateFeedItemRequestSchema`, `DeleteFeedItemRequestSchema`, `GetFeedRequestSchema`
- [ ] Implement reaction API — `AddReactionRequestSchema`, `RemoveReactionRequestSchema`
- [ ] Implement subscription API — `SubscribeRequestSchema`, `FeedUnsubscribeRequestSchema`
- [ ] Define Feed API error codes using `FeedApiErrorCode`

#### 14D-2: Feed Service Contract

- [ ] Implement `IFeedService` contract in packages/core
- [ ] Define `ListFeedOptions`, `CreateFeedItemInput`, `UpdateFeedItemInput`, `SubscribeInput` types
- [ ] Register Feed endpoints using `FeedPathParamsSchema`, `FeedItemPathParamsSchema`

#### 14D-3: System & Kernel Metadata

- [ ] Adopt `PKG_CONVENTIONS` for standardized package structure validation
- [ ] Use `SystemFieldName` and `SystemObjectName` enumerations in core package
- [ ] Configure `OclifPluginConfigSchema` for CLI command extensions
- [ ] Adopt `SortItemSchema` from `spec/shared` for standardized sort specifications

### Phase 14E: Validation, Tests & Documentation (Week 12) — P1

#### 14E-1: Spec-Compliance Tests

- [ ] Feed metadata validation tests (FeedItemSchema, ReactionSchema, RecordSubscriptionSchema)
- [ ] BlankPageLayout validation tests (BlankPageLayoutSchema, InterfacePageConfigSchema, ElementDataSourceSchema)
- [ ] Dashboard enhancement tests (DashboardHeaderSchema, GlobalFilterSchema, WidgetMeasureSchema)
- [ ] Feed API contract tests (all 12 Feed API request/response schemas)
- [ ] Studio builder config tests (InterfaceBuilderConfigSchema, PageBuilderConfigSchema)

#### 14E-2: Cross-Package Integration Tests

- [ ] Feed system integration: create feed item → add reaction → subscribe → verify notification
- [ ] Interface builder: create blank page → bind data source → verify rendering
- [ ] Dashboard filters: set global filter → verify all widgets update

#### 14E-3: Documentation

- [ ] Update ARCHITECTURE.md with Feed system design
- [ ] Add Interface Builder developer guide
- [ ] Update per-package README with feed configuration examples
- [ ] Document Feed API endpoints

### Phase 14 Expected Outcomes

| Metric | Before Phase 14 | After Phase 14 |
|--------|-----------------|----------------|
| Protocol Version | v3.0.6 | v3.0.8 |
| Application Schema Adoption | ~65 / ~95 (68%) | ~95 / ~95 (100%) |
| Feed-Enabled Objects | 0 | 20+ across 6 clouds |
| Blank/Interface Pages | 0 | 4+ custom portal pages |
| Dashboards with Headers | 0 | 11 (all existing dashboards) |
| Dashboards with Global Filters | 0 | 6+ cross-cloud dashboards |
| Views with Tabs | 0 | 10+ key list views |
| Feed API Endpoints | 0 | 8 (CRUD + reactions + subscriptions) |
| Studio Builder Configs | 0 | 4 (Interface, Page, Canvas, Palette) |
| New Data Types Adopted | 0 | 6 (FeedItem, FeedActor, Reaction, Mention, RecordSubscription, FieldChangeEntry) |
| New UI Types Adopted | 0 | 20+ (BlankPageLayout, InterfacePage, DashboardHeader, GlobalFilter, ViewTab, etc.) |

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
