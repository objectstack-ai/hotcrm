# HotCRM Development Roadmap

> Comprehensive development plan for HotCRM — the world's first AI-Native CRM.
> Protocol: @objectstack/spec v3.0.0 | Last Updated: February 2026

## Strategic Direction

```
2025       ████████████████████████████████  Phases 1-9: Foundation → AI → Quality → Test → Integration → Schema → v3.0 → UI → DX
2026 Q1-Q2 ████████████████████████████████  Phase 10: Salesforce Feature Parity      ✅ COMPLETE
2026 Q2-Q3 ████████████████████████████████  Phase 10.5: Deep Metadata Adoption       ✅ COMPLETE
2026 Q3    ████████████████████████████████  Phase 10.6: FormView & Page Layout Enhancement  ← CURRENT
2026 Q3-Q4 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  Phase 11: Ecosystem & Connectivity       ← NEXT
2027       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  Phase 12: Vertical Solutions & Advanced AI
```

## Current State Summary

| Metric | Value |
|--------|-------|
| Protocol Version | @objectstack/spec v3.0.0 |
| Business Objects | 94 across 6 clouds |
| Hook Files | 71 across 6 packages |
| Action Files | 32 across 7 packages |
| Workflow Files | 6 across 6 packages + 6 AI agent workflows (all registered) |
| Flow Definitions | 6 across 5 packages (CRM, Finance, HR, Marketing, Support) |
| State Machines | 3 (case, lead, opportunity) |
| Permission Sets | 6 (one per business cloud) |
| Event Definitions | 6 (one per business cloud) |
| Capability Manifests | 6 (one per business cloud) |
| Studio Plugins | 6 (one per business cloud) |
| Page Layouts | 14 across 6 packages |
| List Views | 11 files (~49 individual views) |
| Dashboards | 8 across 5 packages |
| Form Views | 6 across 3 packages |
| Report Definitions | 8 across 6 packages |
| Chart Configurations | 6 across 6 packages |
| MCP Tools | 24 across 6 packages |
| MCP Resources | 8 across 2 packages |
| MCP Prompts | 10 across 3 packages |
| AI Orchestrations | 2 (sales, support) |
| Predictive Models | 3 (lead scoring, churn, deal forecast) |
| RLS Policies | 4 across 4 packages |
| Security Policies | 3 (password, session, composite) |
| Email Templates | 16 across 4 packages |
| Notification Channels | 4 (email, SMS, push, in-app) |
| Scheduled Jobs | 12 across 4 packages |
| Connector Metadata | 3 (email, payment, social) |
| UI Actions | 10 across 3 packages |
| Dashboard Widgets | 3 (pipeline, SLA, headcount) |
| Test Files | 132 files, 2271 tests (all passing) |
| TypeScript Compliance | 100% (zero type errors) |
| Protocol Compliance | 100% (all objects pass ObjectSchema.create()) |
| Spec Schema Adoption | ~55 of ~80 application-level schemas used (~69%) — see [Metadata Evaluation](#metadata-type-evaluation) |

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
> Goal: Identify high-value schemas not yet adopted and plan deep integration for Phase 10.5.

### Assessment Methodology

@objectstack/spec v3.0.0 exports **12 subpaths** with ~1,269 total schema types. Most are internal/transport schemas (API request/response envelopes, low-level configs). We focus on **~80 application-level metadata schemas** — the ones that define business configurations, UI layouts, automations, security policies, and AI capabilities.

**Current adoption: 28 of ~80 application-level schemas (35%)**

### Currently Adopted Schemas (28 types)

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

### Impact Assessment

| Metric | Current | After Phase 10.5 | After Phase 10.6 | After Phase 11 |
|--------|---------|-------------------|-------------------|----------------|
| Application Schema Adoption | 28 / ~80 (35%) | ~55 / ~80 (69%) | ~58 / ~80 (73%) | ~65 / ~80 (81%) |
| UI Metadata Types | 5 (Page, View, Form, Dashboard, App) | 10 (+Report, ListViewAdv, Chart, Action, Widget) | 10 (deepened: FormView 6 layouts, Page 4 types, 10+ component types) | 12 (+Theme, Responsive) |
| Automation Types | 4 (Workflow, StateMachine, Approval, TimeTrigger) | 7 (+Flow, Connector, ETL) | 7 (unchanged) | 8 (+DataSync) |
| Security Types | 4 (Permission, Sharing, Territory, TerritoryModel) | 8 (+RLS, Policy, Password, Session) | 8 (unchanged) | 10 (+Network, Audit) |
| AI Types | 6 (Agent, MCP, RAG, ModelRegistry, NLQ×2) | 12 (+MCPTool, MCPResource, MCPPrompt, Orchestration, Predictive, Conversation) | 12 (deepened: ai:chat_window, ai:suggestion embedded in pages) | 14 (+MultiAgent, Cost) |
| System Types | 3 (Audit, Cache, Notification) | 7 (+Email, NotifChannel, Schedule, Job) | 7 (unchanged) | 10 (+Encryption, Masking, Compliance) |

---

## Phase 10.5: Deep Metadata Adoption (2026 Q2-Q3) ← NEXT

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

- [ ] Upgrade `packages/crm/src/account.form.ts` — add collapsible address sections, helpText on key fields, placeholder on text inputs
- [ ] Upgrade `packages/crm/src/lead.form.ts` — add visibleOn for conditional fields (show company fields only when lead type is 'Business'), dependsOn for state→country cascade
- [ ] Upgrade `packages/crm/src/contact.form.ts` — add readonly on computed fields, hidden on internal fields, helpText on communication preferences
- [ ] Upgrade `packages/crm/src/opportunity.form.ts` — convert to `tabbed` layout (Deal Info | Forecast | Products | Notes), add visibleOn for forecast fields based on stage
- [ ] Upgrade `packages/support/src/case.form.ts` — add collapsible sections, widget: 'richtext' for description, placeholder on all text fields
- [ ] Upgrade `packages/hr/src/employee.form.ts` — convert to `wizard` layout (Personal → Employment → Emergency → Review), add readonly on employee_number

#### 10.6A-2: Add Form Variants (Named Multiple FormViews)

- [ ] Add `packages/crm/src/lead_quick_create.form.ts` — `modal` layout with essential fields only (name, company, email, phone, source)
- [ ] Add `packages/crm/src/opportunity_quick_create.form.ts` — `drawer` layout for quick deal creation from pipeline view
- [ ] Add `packages/support/src/case_quick_create.form.ts` — `modal` layout for quick case logging (subject, priority, description)
- [ ] Add `packages/crm/src/account_split.form.ts` — `split` layout with account info on left, address/billing on right
- [ ] Add `packages/hr/src/employee_onboarding.form.ts` — `wizard` layout for new hire onboarding (4 steps: personal → role → IT setup → review)
- [ ] Add `packages/finance/src/invoice.form.ts` — `tabbed` layout (Invoice Details | Line Items | Payment Terms)
- [ ] Validate all forms with `FormViewSchema.parse()` — 100% spec compliance

### Phase 10.6B: Page Layout Enhancement (Weeks 3-4) — P0

> Goal: Upgrade all 20 existing pages to use full PageSchema features, add new page types (home, app, utility), and embed AI components.

#### 10.6B-1: Enhance Existing Record Pages

- [ ] Upgrade all record pages to include `isDefault: true` and `template: 'record_detail'`
- [ ] Add `assignedProfiles` to key pages:
  - Account page: `['sales_rep', 'sales_manager', 'admin']`
  - Case page: `['support_agent', 'support_manager', 'admin']`
  - Employee page: `['hr_specialist', 'hr_manager', 'admin']`
- [ ] Add `visibility` rules to components:
  - Hide financial sections for non-finance profiles on Account page
  - Show escalation section only when case priority is 'Critical' on Case page
  - Hide salary details for non-HR profiles on Employee page
- [ ] Add `ai:chat_window` component (sidebar mode) to high-traffic record pages:
  - Account detail page — context-aware account insights
  - Opportunity detail page — deal coaching and next-best-action
  - Case detail page — resolution suggestions from knowledge base
- [ ] Add `ai:suggestion` component to relevant pages for proactive AI recommendations
- [ ] Add `record:activity` component to Account, Contact, Opportunity pages for activity timeline
- [ ] Add `record:path` component to Opportunity page for guided selling stages
- [ ] Add `page:card` components for visual grouping of related information

#### 10.6B-2: Add New Page Types

- [ ] Add `packages/crm/src/crm_home.page.ts` — `type: 'home'` with pipeline summary, today's activities, AI insights, top deals widgets
- [ ] Add `packages/support/src/support_home.page.ts` — `type: 'home'` with open cases queue, SLA alerts, CSAT trends, AI case routing
- [ ] Add `packages/hr/src/hr_home.page.ts` — `type: 'home'` with headcount overview, open positions, pending approvals, onboarding tracker
- [ ] Add `packages/crm/src/crm_utility.page.ts` — `type: 'utility'` with quick lookup, global search, recent records, favorites
- [ ] Add `packages/core/src/settings.page.ts` — `type: 'app'` with system settings, user preferences, notification settings

#### 10.6B-3: Component Properties Alignment

- [ ] Migrate `record:details` components to use RecordDetailsProps format: `{ columns: '2', layout: 'custom', sections: ['section_name'] }`
- [ ] Migrate `record:related_list` components to use RecordRelatedListProps format: `{ objectName, relationshipField, columns, sort?, limit }`
- [ ] Migrate `page:tabs` components to use PageTabsProps format: `{ type: 'line', position: 'top', items: [{ label, children }] }`
- [ ] Add `responsive` config to all components for mobile breakpoints
- [ ] Add `aria` accessibility props to all interactive components

### Phase 10.6C: Tests, Validation & Documentation (Weeks 5-6) — P1

#### 10.6C-1: Spec-Compliance Tests

- [ ] Add `packages/crm/__tests__/unit/schemas/formview-enhanced.test.ts` — validate all enhanced CRM forms including layout types, collapsible sections, field controls
- [ ] Add `packages/crm/__tests__/unit/schemas/page-enhanced.test.ts` — validate enhanced pages including assignedProfiles, visibility, AI components
- [ ] Add per-package enhanced UI tests for Support, HR, Finance, Products, Marketing
- [ ] Add `packages/crm/__tests__/unit/schemas/component-props.test.ts` — validate component properties match ComponentPropsMap types

#### 10.6C-2: Documentation

- [ ] Add `content/docs/guides/formview-layouts.mdx` — guide to all 6 FormView layout types with examples
- [ ] Add `content/docs/guides/page-components.mdx` — guide to all 21 component types with property reference
- [ ] Update `docs/SALESFORCE_FEATURE_COMPARISON.md` with page layout and form builder parity
- [ ] Update `README.md` and `content/docs/roadmap.mdx` with Phase 10.6 metrics

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

- [ ] Initialize `packages/analytics/` package with `package.json`, `tsconfig.json`, `plugin.ts`
- [ ] Add `packages/analytics/src/report.object.ts` — saved report definitions (name, description, object_name, filters, groupings, aggregations, columns, sort_order, report_type)
- [ ] Add `packages/analytics/src/report_schedule.object.ts` — scheduled report delivery (report_id, frequency, recipients, format, next_run, last_run, timezone)
- [ ] Add `packages/analytics/src/analytics_dashboard.object.ts` — dashboard layouts (name, description, widgets, layout_config, refresh_interval, owner, shared_with)
- [ ] Add `packages/analytics/src/kpi.object.ts` — KPI definitions (name, metric_type, target_value, current_value, period, trend, threshold_warning, threshold_critical)
- [ ] Add `packages/analytics/src/metric.object.ts` — business metric calculations (name, formula, source_object, aggregation_type, time_grain, filters)
- [ ] Add `packages/analytics/src/data_source.object.ts` — external data source connectors (name, type, connection_string, sync_status, last_sync, schema_mapping)
- [ ] Add `packages/analytics/src/saved_filter.object.ts` — reusable filter presets (name, object_name, filter_conditions, is_global, created_by)
- [ ] Validate all objects with `ObjectSchema.create()` — 100% spec compliance

#### 11A-2: Hooks & Business Logic

- [ ] Add `packages/analytics/src/report.hook.ts` — report execution, filter validation, access control, cache invalidation
- [ ] Add `packages/analytics/src/analytics_dashboard.hook.ts` — widget validation, layout constraint checks, auto-refresh scheduling
- [ ] Add `packages/analytics/src/kpi.hook.ts` — threshold alerts (trigger notifications when KPI crosses warning/critical), trend calculation, auto-refresh
- [ ] Add `packages/analytics/src/metric.hook.ts` — formula validation, circular dependency detection, aggregation computation
- [ ] Add `packages/analytics/src/report_schedule.hook.ts` — schedule validation, next run calculation, delivery execution
- [ ] Add `packages/analytics/src/data_source.hook.ts` — connection health checks, sync lifecycle, schema drift detection

#### 11A-3: Actions & AI Capabilities

- [ ] Add `packages/analytics/src/report_ai.action.ts` — natural language report generation ("Show me top 10 customers by revenue"), report suggestion, auto-filter
- [ ] Add `packages/analytics/src/dashboard_ai.action.ts` — auto-generate dashboard layouts based on user role, KPI anomaly detection, smart widget recommendations
- [ ] Add `packages/analytics/src/insight_ai.action.ts` — automatic anomaly detection, trend analysis, root cause suggestions, executive summary generation
- [ ] Add `packages/analytics/src/forecast_analytics.action.ts` — ML-powered revenue and churn predictions, confidence intervals, what-if scenarios

#### 11A-4: UI Metadata

- [ ] Add `packages/analytics/src/report.page.ts` — report builder UI with filter panels, column selector, preview, export
- [ ] Add `packages/analytics/src/report.view.ts` — report library with category filters, favorites, recent, shared
- [ ] Add `packages/analytics/src/analytics_dashboard.page.ts` — dashboard canvas with drag-and-drop widget placement
- [ ] Add `packages/analytics/src/kpi.view.ts` — KPI scorecard with trend sparklines and RAG status
- [ ] Add `packages/analytics/src/analytics.dashboard.ts` — meta-dashboard: system health, data freshness, usage analytics

#### 11A-5: Tests

- [ ] Add `packages/analytics/__tests__/unit/objects/spec-compliance.test.ts` — validate all ~8 objects against spec
- [ ] Add `packages/analytics/__tests__/unit/hooks/report.hook.test.ts` — report execution, filter validation, access control
- [ ] Add `packages/analytics/__tests__/unit/hooks/kpi.hook.test.ts` — threshold alerts, trend calculation
- [ ] Add `packages/analytics/__tests__/unit/hooks/metric.hook.test.ts` — formula validation, aggregation
- [ ] Add `packages/analytics/__tests__/unit/actions/report_ai.action.test.ts` — NL report generation
- [ ] Add `packages/analytics/__tests__/unit/actions/insight_ai.action.test.ts` — anomaly detection
- [ ] Add `packages/analytics/__tests__/integration/cross-cloud-analytics.test.ts` — analytics queries across CRM, Finance, Support data

### Phase 11B: Integration Package & Connectors (Q3 2026, Weeks 5-8) — P0

> Goal: Build the `@hotcrm/integration` iPaaS layer and deliver the first 5 high-priority connectors.

#### 11B-1: Package Scaffolding & Core Objects

- [ ] Initialize `packages/integration/` package with `package.json`, `tsconfig.json`, `plugin.ts`
- [ ] Add `packages/integration/src/connector.object.ts` — connector definitions (name, type, provider, auth_type, credentials_ref, base_url, status, version)
- [ ] Add `packages/integration/src/connection.object.ts` — active connection instances (connector_id, tenant_id, status, auth_token_ref, refresh_token_ref, expires_at, last_used)
- [ ] Add `packages/integration/src/sync_config.object.ts` — bi-directional sync configuration (connection_id, source_object, target_object, field_mapping, direction, frequency, conflict_resolution)
- [ ] Add `packages/integration/src/sync_log.object.ts` — sync execution audit log (sync_config_id, started_at, completed_at, records_processed, records_failed, error_details, status)
- [ ] Add `packages/integration/src/webhook_subscription.object.ts` — outbound webhook subscriptions (event_type, target_url, secret, status, retry_policy, filters, last_triggered)
- [ ] Add `packages/integration/src/webhook_delivery.object.ts` — webhook delivery log (subscription_id, event_payload, response_status, response_body, attempt_number, delivered_at)
- [ ] Add `packages/integration/src/api_key.object.ts` — API key management (name, key_hash, scopes, rate_limit, expires_at, last_used, created_by)
- [ ] Add `packages/integration/src/field_mapping.object.ts` — field mapping templates (name, source_object, target_object, mappings, transform_rules, default_values)
- [ ] Validate all objects with `ObjectSchema.create()` — 100% spec compliance

#### 11B-2: Hooks & Business Logic

- [ ] Add `packages/integration/src/connector.hook.ts` — connector lifecycle (activation, deactivation, health check scheduling)
- [ ] Add `packages/integration/src/connection.hook.ts` — connection validation, token refresh, expiry alerts
- [ ] Add `packages/integration/src/sync_config.hook.ts` — mapping validation, schedule management, conflict resolution
- [ ] Add `packages/integration/src/sync_log.hook.ts` — sync monitoring, failure alerts, retry logic
- [ ] Add `packages/integration/src/webhook_subscription.hook.ts` — subscription validation, secret rotation, endpoint verification
- [ ] Add `packages/integration/src/webhook_delivery.hook.ts` — delivery tracking, retry scheduling, dead-letter handling
- [ ] Add `packages/integration/src/api_key.hook.ts` — key generation, expiry alerts, usage tracking, rate limit enforcement

#### 11B-3: High-Priority Connectors (5 initial connectors)

Each connector includes: `*.action.ts` (API operations), `*.hook.ts` (event mapping), tests.

- [ ] **Stripe Connector** — `packages/integration/src/connectors/stripe.action.ts`
  - Payment intent creation, refund processing, subscription sync
  - Map Stripe webhooks → Finance package (invoice.paid, payment.failed, subscription.updated)
  - Sync: Stripe Customer ↔ Account, Stripe Invoice ↔ Invoice, Stripe Subscription ↔ Subscription
- [ ] **DocuSign Connector** — `packages/integration/src/connectors/docusign.action.ts`
  - Envelope creation from Quote/Contract, signing status tracking
  - Map DocuSign webhooks → Products/Finance (envelope.completed → contract.status = 'Signed')
  - Sync: DocuSign Envelope ↔ Contract, signing events → Activity
- [ ] **Slack Connector** — `packages/integration/src/connectors/slack.action.ts`
  - Send notifications for deal closures, case escalations, approval requests
  - Slash commands for quick CRM lookups (`/hotcrm account Acme Corp`)
  - Map Slack events → Activity (message sent, channel mention)
- [ ] **Gmail Connector** — `packages/integration/src/connectors/gmail.action.ts`
  - Email-to-Activity logging, thread tracking, attachment linking
  - Email template send via Gmail API, tracking pixels for open/click
  - Sync: Gmail threads ↔ Activity, contacts ↔ Contact
- [ ] **Microsoft Teams Connector** — `packages/integration/src/connectors/teams.action.ts`
  - Meeting scheduling from CRM, meeting notes → Activity
  - Adaptive card notifications for pipeline changes, approval requests
  - Sync: Teams meetings ↔ Activity, Teams contacts ↔ Contact

#### 11B-4: Actions & AI Capabilities

- [ ] Add `packages/integration/src/sync_ai.action.ts` — AI-powered field mapping suggestions, conflict resolution recommendations, data quality assessment for sync
- [ ] Add `packages/integration/src/connector_ai.action.ts` — natural language connector configuration ("Connect my Stripe account"), troubleshooting assistant

#### 11B-5: UI Metadata

- [ ] Add `packages/integration/src/connector.page.ts` — connector marketplace with setup wizard
- [ ] Add `packages/integration/src/connector.view.ts` — connector library with status, health, last sync
- [ ] Add `packages/integration/src/sync_config.page.ts` — sync configuration with field mapping editor
- [ ] Add `packages/integration/src/integration.dashboard.ts` — integration health: sync success rates, webhook deliveries, API usage

#### 11B-6: Tests

- [ ] Add `packages/integration/__tests__/unit/objects/spec-compliance.test.ts` — validate all ~8 objects against spec
- [ ] Add `packages/integration/__tests__/unit/hooks/connector.hook.test.ts` — lifecycle, health check
- [ ] Add `packages/integration/__tests__/unit/hooks/sync_config.hook.test.ts` — mapping validation, scheduling
- [ ] Add `packages/integration/__tests__/unit/hooks/webhook_subscription.hook.test.ts` — validation, retry
- [ ] Add `packages/integration/__tests__/unit/connectors/stripe.action.test.ts` — payment operations, webhook mapping
- [ ] Add `packages/integration/__tests__/unit/connectors/docusign.action.test.ts` — envelope operations
- [ ] Add `packages/integration/__tests__/unit/connectors/slack.action.test.ts` — notifications, slash commands
- [ ] Add `packages/integration/__tests__/integration/sync-flow.test.ts` — end-to-end sync lifecycle

### Phase 11C: Community Package (Q4 2026, Weeks 9-12) — P1

> Goal: Build the `@hotcrm/community` Customer Community Portal for self-service and engagement.

#### 11C-1: Package Scaffolding & Core Objects

- [ ] Initialize `packages/community/` package with `package.json`, `tsconfig.json`, `plugin.ts`
- [ ] Add `packages/community/src/community.object.ts` — community portal configuration (name, description, domain, theme, features_enabled, status, branding)
- [ ] Add `packages/community/src/forum_category.object.ts` — forum organization (name, description, parent_category, sort_order, icon, is_archived)
- [ ] Add `packages/community/src/topic.object.ts` — discussion topics (title, body, category_id, author_id, status, is_pinned, is_locked, view_count, reply_count)
- [ ] Add `packages/community/src/reply.object.ts` — topic replies (topic_id, body, author_id, is_accepted_answer, upvotes, is_flagged)
- [ ] Add `packages/community/src/idea.object.ts` — feature requests (title, description, category, status, vote_count, priority_score, assigned_release)
- [ ] Add `packages/community/src/user_group.object.ts` — community segmentation (name, description, type, criteria, member_count, access_level)
- [ ] Add `packages/community/src/community_event.object.ts` — community events (title, description, event_type, start_date, end_date, location, capacity, rsvp_count, recording_url)
- [ ] Add `packages/community/src/badge.object.ts` — gamification rewards (name, description, icon, criteria, points_value, is_automatic)
- [ ] Validate all objects with `ObjectSchema.create()` — 100% spec compliance

#### 11C-2: Hooks & Business Logic

- [ ] Add `packages/community/src/topic.hook.ts` — content moderation (profanity filter, spam detection), notification to subscribers, auto-tagging, view counting
- [ ] Add `packages/community/src/reply.hook.ts` — answer acceptance, upvote tracking, author reputation update, spam detection
- [ ] Add `packages/community/src/idea.hook.ts` — vote aggregation, status transitions (Submitted → Under Review → Planned → Released), notification on status change
- [ ] Add `packages/community/src/user_group.hook.ts` — membership validation, auto-assignment based on criteria, access level enforcement
- [ ] Add `packages/community/src/community_event.hook.ts` — RSVP management, capacity enforcement, reminder scheduling, recording link notification
- [ ] Add `packages/community/src/badge.hook.ts` — auto-award based on activity criteria (first post, 10 replies, accepted answer), points calculation
- [ ] Add `packages/community/src/community.hook.ts` — portal configuration validation, feature toggle enforcement, domain verification

#### 11C-3: Actions & AI Capabilities

- [ ] Add `packages/community/src/community_ai.action.ts` — AI-powered content moderation, auto-categorization, similar topic detection, answer suggestion from knowledge base
- [ ] Add `packages/community/src/community_analytics.action.ts` — engagement metrics, active contributor reports, trending topics, sentiment analysis

#### 11C-4: UI Metadata

- [ ] Add `packages/community/src/topic.page.ts` — topic detail with replies, voting, best answer
- [ ] Add `packages/community/src/topic.view.ts` — topic list with category, status, activity filters
- [ ] Add `packages/community/src/idea.page.ts` — idea detail with voting, status timeline, comments
- [ ] Add `packages/community/src/idea.view.ts` — idea board with vote ranking, status filters
- [ ] Add `packages/community/src/community.dashboard.ts` — community health: engagement rate, active users, resolution rate, top contributors

#### 11C-5: Tests

- [ ] Add `packages/community/__tests__/unit/objects/spec-compliance.test.ts` — validate all ~8 objects against spec
- [ ] Add `packages/community/__tests__/unit/hooks/topic.hook.test.ts` — moderation, notification, auto-tagging
- [ ] Add `packages/community/__tests__/unit/hooks/idea.hook.test.ts` — voting, status transitions
- [ ] Add `packages/community/__tests__/unit/hooks/badge.hook.test.ts` — auto-award criteria, points
- [ ] Add `packages/community/__tests__/unit/actions/community_ai.action.test.ts` — moderation, categorization
- [ ] Add `packages/community/__tests__/integration/community-support.test.ts` — community topic → knowledge article, community user → CRM contact linking

### Phase 11D: Cross-Ecosystem Hardening (Q4 2026, Weeks 13-16) — P1

> Goal: Integration tests, additional connectors, security, performance, and documentation for all 3 new packages.

#### 11D-1: Additional Connectors (5 more, Medium Priority)

- [ ] **PayPal Connector** — `packages/integration/src/connectors/paypal.action.ts` — payment processing, refund handling, subscription management
- [ ] **Adobe Sign Connector** — `packages/integration/src/connectors/adobe_sign.action.ts` — agreement lifecycle, signing workflow, template management
- [ ] **Outlook Connector** — `packages/integration/src/connectors/outlook.action.ts` — email-to-activity, calendar sync, contact sync
- [ ] **QuickBooks Connector** — `packages/integration/src/connectors/quickbooks.action.ts` — invoice sync, payment reconciliation, customer/vendor mapping
- [ ] **LinkedIn Connector** — `packages/integration/src/connectors/linkedin.action.ts` — lead enrichment, recruiting pipeline, company data import

#### 11D-2: Cross-Package Integration Tests

- [ ] Analytics → CRM: sales pipeline report pulling from opportunity, account, forecast data
- [ ] Analytics → Finance: revenue analytics across invoice, payment, contract objects
- [ ] Analytics → Marketing: campaign ROI reports, lead funnel analysis
- [ ] Integration → Finance: Stripe payment sync → Invoice status update → Revenue recognition trigger
- [ ] Integration → CRM: Gmail email → Activity creation → Contact timeline update
- [ ] Community → Support: forum topic flagged → case auto-creation → knowledge article suggestion
- [ ] Community → CRM: community user → contact linking, idea → product feedback loop
- [ ] End-to-end: Lead (CRM) → Campaign attribution (Marketing) → Deal close (CRM) → Invoice (Finance) → Stripe payment (Integration) → Revenue report (Analytics)

#### 11D-3: Security & Permissions

- [ ] Add `packages/analytics/src/analytics.permission.ts` — report access control, dashboard sharing, KPI visibility
- [ ] Add `packages/integration/src/integration.permission.ts` — connector management, sync configuration, API key management
- [ ] Add `packages/community/src/community.permission.ts` — content moderation, community administration, forum management
- [ ] Add credential encryption for connector auth tokens (integration with `@objectstack/runtime` secrets vault)

#### 11D-4: Performance & Scale

- [ ] Add caching configuration for analytics queries (CacheConfig for report results, KPI snapshots)
- [ ] Add bulk sync support for integration connectors (batch API for 10K+ record syncs)
- [ ] Add rate limiting configuration for connector API calls (per-connector throttle)
- [ ] Performance benchmark: analytics query response < 2s for 100K record datasets

#### 11D-5: Documentation & DX

- [ ] Add `content/docs/modules/analytics.mdx` — analytics package guide with report/dashboard examples
- [ ] Add `content/docs/modules/integration.mdx` — integration package guide with connector setup tutorials
- [ ] Add `content/docs/modules/community.mdx` — community package guide with portal configuration
- [ ] Add `content/docs/guides/building-connectors.mdx` — developer guide for building custom connectors
- [ ] Add `content/docs/guides/analytics-queries.mdx` — ObjectQL analytics patterns and aggregation guide
- [ ] Update `docs/SALESFORCE_FEATURE_COMPARISON.md` with new integration and analytics parity
- [ ] Update `README.md` and `content/docs/roadmap.mdx` with Phase 11 metrics

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

- [ ] `property.object.ts` — property details (address, type, bedrooms, bathrooms, sqft, lot_size, year_built, features, mls_number, status)
- [ ] `listing.object.ts` — active/sold listings (property_id, list_price, sold_price, list_date, sold_date, days_on_market, listing_agent, listing_type)
- [ ] `showing.object.ts` — property showings (listing_id, agent_id, buyer_contact_id, scheduled_date, feedback, rating, follow_up_status)
- [ ] `real_estate_offer.object.ts` — purchase offers (listing_id, buyer_id, offer_amount, contingencies, expiration_date, status, counter_offer_amount)
- [ ] `commission.object.ts` — commission tracking (transaction_id, agent_id, commission_rate, commission_amount, split_type, payment_status)
- [ ] `open_house.object.ts` — open house events (listing_id, date, time_start, time_end, attendee_count, leads_generated)
- [ ] `neighborhood.object.ts` — neighborhood data (name, city, state, median_price, school_rating, walk_score, amenities)

#### Hooks & Actions

- [ ] `listing.hook.ts` — MLS integration, days-on-market calculation, price change alerts, auto-comparable analysis
- [ ] `showing.hook.ts` — calendar conflict detection, auto-feedback request, lead scoring from showing activity
- [ ] `real_estate_offer.hook.ts` — offer validation, counter-offer workflow, contingency tracking, closing timeline
- [ ] `commission.hook.ts` — split calculation, cap tracking, payment scheduling
- [ ] `real_estate_ai.action.ts` — property valuation AI, market trend analysis, lead matching (buyer preferences → listings)

#### Tests

- [ ] Spec-compliance tests for all ~7 objects
- [ ] Hook tests for listing lifecycle, showing scheduling, offer workflow
- [ ] Integration test: listing → showing → offer → commission → payment flow

### Phase 12B: Healthcare CRM (`@hotcrm/healthcare`) — Q2 2027

> Goal: HIPAA-compliant CRM for clinics and healthcare providers.

#### Objects

- [ ] `patient.object.ts` — patient demographics (name, dob, gender, insurance_id, primary_physician, allergies, medical_record_number)
- [ ] `appointment.object.ts` — appointment scheduling (patient_id, provider_id, appointment_type, date_time, duration, status, notes, telehealth_link)
- [ ] `insurance.object.ts` — insurance plans (provider_name, plan_type, policy_number, group_number, coverage_start, coverage_end, copay, deductible)
- [ ] `referral.object.ts` — provider referrals (patient_id, referring_provider, receiving_provider, reason, status, urgency, referral_date)
- [ ] `hipaa_audit.object.ts` — HIPAA compliance audit log (user_id, action, record_type, record_id, timestamp, ip_address, access_reason)
- [ ] `prescription.object.ts` — prescriptions (patient_id, medication, dosage, frequency, prescriber_id, pharmacy, refills_remaining, status)
- [ ] `care_plan.object.ts` — care plans (patient_id, condition, goals, interventions, start_date, review_date, status)

#### Hooks & Actions

- [ ] `appointment.hook.ts` — scheduling conflict detection, reminder notifications, no-show tracking, telehealth link generation
- [ ] `patient.hook.ts` — data encryption for PHI fields, consent tracking, insurance eligibility verification
- [ ] `referral.hook.ts` — auto-routing to specialists, status tracking, follow-up scheduling
- [ ] `hipaa_audit.hook.ts` — automatic audit trail for all PHI access, anomaly detection for suspicious access patterns
- [ ] `healthcare_ai.action.ts` — appointment scheduling optimization, patient risk scoring, care gap identification

#### Tests

- [ ] Spec-compliance tests for all ~7 objects
- [ ] Hook tests for appointment scheduling, HIPAA audit trails, referral workflow
- [ ] Integration test: patient registration → appointment → referral → care plan → follow-up

### Phase 12C: Financial Services CRM (`@hotcrm/financial-services`) — Q3 2027

> Goal: CRM for wealth management and banking with compliance built in.

#### Objects

- [ ] `wealth_account.object.ts` — client wealth accounts (client_id, account_type, balance, risk_profile, investment_strategy, advisor_id)
- [ ] `portfolio.object.ts` — investment portfolios (account_id, assets, allocation, performance_ytd, benchmark, rebalance_date)
- [ ] `advisory.object.ts` — advisory interactions (client_id, advisor_id, meeting_type, recommendations, next_review, compliance_approved)
- [ ] `compliance_check.object.ts` — regulatory compliance (entity_id, check_type, status, findings, reviewer, review_date, regulation)
- [ ] `kyc.object.ts` — Know Your Customer verification (client_id, document_type, document_id, verification_status, verified_date, expiry_date, risk_level)
- [ ] `financial_product.object.ts` — financial products (name, type, risk_rating, min_investment, expected_return, fee_structure, maturity)
- [ ] `transaction_record.object.ts` — financial transactions (account_id, type, amount, date, counterparty, status, compliance_flag)

#### Hooks & Actions

- [ ] `wealth_account.hook.ts` — risk profile assessment, suitability checks, balance alerts
- [ ] `portfolio.hook.ts` — drift detection, auto-rebalance triggers, performance calculation
- [ ] `kyc.hook.ts` — document expiry alerts, periodic re-verification, risk level auto-classification
- [ ] `compliance_check.hook.ts` — regulation change alerts, automated screening, audit trail
- [ ] `financial_services_ai.action.ts` — portfolio optimization, client risk profiling, regulatory change impact analysis

#### Tests

- [ ] Spec-compliance tests for all ~7 objects
- [ ] Hook tests for KYC verification, compliance checks, portfolio management
- [ ] Integration test: client onboarding → KYC → account opening → portfolio creation → advisory review

### Phase 12D: Education CRM (`@hotcrm/education`) — Q4 2027

> Goal: CRM for universities and EdTech covering the full student lifecycle.

#### Objects

- [ ] `student.object.ts` — student profiles (name, email, enrollment_status, program, gpa, advisor_id, graduation_date)
- [ ] `enrollment.object.ts` — course enrollments (student_id, course_id, term, status, grade, credits)
- [ ] `course.object.ts` — course catalog (name, department, credits, instructor_id, capacity, schedule, prerequisites)
- [ ] `alumni.object.ts` — alumni network (student_id, graduation_year, degree, employer, giving_history, engagement_score)
- [ ] `scholarship.object.ts` — scholarship management (name, amount, criteria, application_deadline, recipients, fund_balance)
- [ ] `application_form.object.ts` — admissions applications (applicant_name, program, status, test_scores, gpa, essays, recommendations, decision)
- [ ] `campus_event.object.ts` — campus events (name, type, date, location, target_audience, rsvp_count, feedback_score)

#### Hooks & Actions

- [ ] `student.hook.ts` — enrollment validation, academic standing calculation, advisor assignment
- [ ] `enrollment.hook.ts` — prerequisite checks, capacity enforcement, waitlist management, grade posting
- [ ] `scholarship.hook.ts` — eligibility verification, fund balance tracking, auto-renewal
- [ ] `application_form.hook.ts` — application completeness checks, reviewer assignment, decision workflow
- [ ] `education_ai.action.ts` — student success prediction, course recommendation, enrollment forecasting, alumni engagement scoring

#### Tests

- [ ] Spec-compliance tests for all ~7 objects
- [ ] Hook tests for enrollment, scholarship, application workflow
- [ ] Integration test: application → admission → enrollment → graduation → alumni engagement

### Phase 12E: Advanced AI & Enterprise Features (2027+)

> Goal: Next-generation AI capabilities and enterprise-grade platform features.

#### Advanced AI

- [ ] **Computer Vision** — business card scanning via camera, document OCR for invoices/contracts, receipt parsing for expense reports
- [ ] **Voice AI** — meeting transcription with speaker identification, voice-to-text for call notes, sentiment analysis on call recordings
- [ ] **Anomaly Detection** — fraud detection for financial transactions, unusual login pattern alerts, data quality scoring with auto-correction suggestions
- [ ] **Predictive Forecasting** — revenue forecasting with Monte Carlo confidence intervals, customer churn prediction with explainability, demand forecasting for products
- [ ] **Multi-Modal Agents** — agents that can see (document analysis), hear (call transcription), and reason (cross-modal insights) across data types

#### Enterprise Features

- [ ] **Multi-Tenancy** — multiple organizations in a single instance with data isolation, tenant-specific customization, shared infrastructure
- [ ] **SOC 2 Compliance** — comprehensive audit logging, encryption at rest and in transit, access controls with MFA, vulnerability scanning
- [ ] **Data Residency** — regional data storage for GDPR (EU), CCPA (California), LGPD (Brazil), and local regulations; tenant-level data location config
- [ ] **White-Label** — customizable branding (logo, colors, domain), partner and reseller portal, custom login pages
- [ ] **Marketplace** — third-party app marketplace for community-built extensions, app review process, usage analytics, billing integration

---

## Version Upgrade History

| Date | From | To | Breaking Changes | Tests |
|------|------|----|-----------------|-------|
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
