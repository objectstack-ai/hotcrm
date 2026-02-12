# HotCRM Development Roadmap

> Comprehensive development plan for HotCRM — the world's first AI-Native CRM.
> Protocol: @objectstack/spec v3.0.0 | Last Updated: February 2026

## Strategic Direction

```
2025       ████████████████████████████████  Phases 1-9: Foundation → AI → Quality → Test → Integration → Schema → v3.0 → UI → DX
2026 Q1-Q2 ████████████████████████████████  Phase 10: Salesforce Feature Parity    ✅ COMPLETE
2026 Q3-Q4 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  Phase 11: Ecosystem & Connectivity     ← NEXT
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
| State Machines | 3 (case, lead, opportunity) |
| Permission Sets | 6 (one per business cloud) |
| Event Definitions | 6 (one per business cloud) |
| Capability Manifests | 6 (one per business cloud) |
| Studio Plugins | 6 (one per business cloud) |
| Page Layouts | 14 across 6 packages |
| List Views | 11 files (~49 individual views) |
| Dashboards | 8 across 5 packages |
| Form Views | 6 across 3 packages |
| Test Files | 118 files, 1759 tests (all passing) |
| TypeScript Compliance | 100% (zero type errors) |
| Protocol Compliance | 100% (all objects pass ObjectSchema.create()) |
| Spec Schema Adoption | ~25% (Phase 8 target met) |

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

## Phase 11: Ecosystem & Connectivity (2026 Q3-Q4) ← NEXT

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

| Metric | Before Phase 11 | After Phase 11 | Change |
|--------|---------|----------------|--------|
| Business Objects | 94 | ~120 | +~26 objects |
| Business Packages | 7 (CRM, Finance, HR, Marketing, Products, Support, AI) | 10 (+Analytics, Integration, Community) | +3 packages |
| External Connectors | 0 | 10 | +10 connectors |
| Hooks | 71 | ~90 | +~19 hooks |
| Actions | 32 | ~45 | +~13 actions |
| Test Files | 118 | ~145 | +~27 test files |
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
