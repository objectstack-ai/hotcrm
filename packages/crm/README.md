# @hotcrm/crm

CRM module for HotCRM - Complete Marketing & Sales domain with Account, Contact, Lead, and Opportunity management.

## Overview

This package contains all core CRM functionality for managing the sales pipeline and customer relationships. Following vertical slice architecture, it includes schemas, hooks, and actions all in one cohesive package.

**Package Stats:** 13 Objects | 8 AI Actions | 7 Automation Hooks

## What's Included

### Business Objects (13 Total)

| Object | Label | Description |
|--------|-------|-------------|
| **account** | 客户 | Enterprise customer & organization management with multi-level support, SLA tiers, health scoring |
| **contact** | 联系人 | Individual contact records with decision maker tracking, influence levels, relationship strength |
| **lead** | 线索 | AI-Native lead management with duplicate detection, scoring, enrichment capabilities |
| **opportunity** | 商机 | Sales pipeline management with 7-stage forecasting, win probability, revenue tracking |
| **task** | Task | Kanban boards, dependencies, time tracking, recurring tasks, checklist management |
| **activity** | Activity | Sales activity tracking (calls, emails, meetings, tasks) with geo-check-in, transcription, sentiment |
| **note** | Note | Markdown-enabled notes with @mentions, pinning, full-text search, sentiment analysis |
| **email_template** | 邮件模板 | Marketing email templates with A/B testing, personalization tokens, dynamic content blocks |
| **form** | 表单 | Drag-drop form builder with progressive profiling, lead auto-creation, spam detection |
| **landing_page** | 着陆页 | Landing page builder with A/B testing, multi-device optimization, UTM tracking, conversion metrics |
| **marketing_list** | 营销列表 | Dynamic/static segmentation with suppression rules, GDPR compliance, engagement analytics |
| **unsubscribe** | 退订记录 | Email unsubscribe & bounce management with GDPR requests, resubscribe tracking |
| **assignment_rule** | Assignment Rule | Auto-assignment rules for leads/cases with operator-based criteria |

### AI Actions (8 Total)

| Action | Purpose |
|--------|---------|
| **enhanced_lead_scoring** | ML-based lead quality prediction (0-100) with explainability, confidence scores, and impact factors |
| **account_ai** | Health scoring, churn prediction, cross-sell/upsell recommendations, territory assignment, data enrichment |
| **contact_ai** | Profile enrichment (LinkedIn, Twitter, Hunter), buying intent detection, email sentiment, optimal contact timing |
| **lead_ai** | Email signature parsing, company lookup, intelligent routing to sales reps, nurturing recommendations |
| **lead_convert** | Transactional conversion: Lead → Account + Contact + Opportunity |
| **campaign_ai** | Content generation (subjects, body, social posts), audience segmentation, send-time optimization, channel recommendations |
| **opportunity_ai** | Win probability prediction, deal risk assessment, next-step recommendations, competitive intelligence, close date forecasting |
| **ai_smart_briefing** | Customer activity analysis → executive summary, next steps, industry talking points, sentiment, engagement score |

### Automation Hooks (7 Total)

| Hook | Object | Events Triggered |
|------|--------|-------------------|
| **LeadScoringTrigger** | lead | beforeInsert, beforeUpdate → Auto-calculates lead score (0-100) & data completeness |
| **ActivityRelatedObjectUpdatesTrigger** | activity | afterInsert, afterUpdate → Updates Account/Contact/Opportunity with last activity date & counters |
| **AutoCompletePastDueActivities** | activity | Batch trigger → Auto-completes overdue activities |
| **CampaignMemberEngagementTrigger** | campaign_member | beforeInsert, beforeUpdate → Tracks opens, clicks, responses; auto-sets HasResponded flag |
| **ContactDecisionChainTrigger** | contact | beforeInsert, beforeUpdate → Auto-sets InfluenceLevel from job level; validates decision makers |
| **AccountHealthScoreTrigger** | account | beforeInsert, beforeUpdate → Calculates 0-100 health score based on activity, payment, support, contracts |
| **OpportunityStageChange** | opportunity | afterUpdate → Auto-creates contracts, updates account status on stage changes |

## Business Capabilities

### Core CRM Functions
- Lead-to-Customer journey with AI-powered lead scoring & conversion
- Multi-level account management with health tracking & churn prediction
- Sales pipeline with 7-stage opportunity forecasting
- Contact relationship mapping with decision maker identification

### Marketing Automation
- Email campaign management with templates, A/B testing, segmentation
- Landing page builder with conversion tracking
- Dynamic marketing lists with GDPR compliance
- Lead capture forms with progressive profiling

### AI/Predictive Intelligence
- ML-based lead scoring, win probability, churn prediction
- Intelligent sales rep routing & nurturing recommendations
- Email sentiment analysis, intent detection
- Auto-content generation & optimization suggestions

### Sales Enablement
- Activity tracking (calls, emails, meetings, demos)
- Task management with Kanban boards & dependencies
- Smart customer briefings with talking points
- Opportunity risk assessment & competitive intelligence

### Compliance & Data Quality
- Duplicate detection & contact deduplication
- Unsubscribe/bounce management with GDPR requests
- Email list suppression (unsubscribed, bounced, opted-out)
- Data enrichment from external sources

## Usage

### Importing Schemas
```typescript
import { 
  Account, 
  Contact, 
  Lead,
  Opportunity,
  Activity,
  Task,
  Note
} from '@hotcrm/crm';

console.log(Account.label); // "客户"
console.log(Lead.label); // "线索"
console.log(Activity.label); // "Activity"
```

### Using AI Actions
```typescript
import { 
  executeSmartBriefing,
  scoreLeadWithAI,
  predictOpportunityWin,
  enrichContactProfile
} from '@hotcrm/crm';

// Generate smart account briefing
const briefing = await executeSmartBriefing({
  accountId: 'acc_123',
  activityLimit: 10
});

// Enhanced lead scoring with explainability
const leadScore = await scoreLeadWithAI({
  leadId: 'lead_456',
  features: {
    company_size: 500,
    industry: 'Technology',
    engagement_score: 75
  }
});

// Predict opportunity win probability
const prediction = await predictOpportunityWin({
  opportunityId: 'opp_789',
  includeRecommendations: true
});

// Enrich contact from external sources
const enriched = await enrichContactProfile({
  contactId: 'cont_123',
  sources: ['linkedin', 'hunter', 'twitter']
});
```

### Hooks Auto-Trigger (No Code Required)
```typescript
// Hooks automatically trigger on data changes

// Example: Lead conversion
// When you update a lead status to "Converted":
await db.update('lead', leadId, { status: 'Converted' });
// → LeadConversionHook automatically creates Account, Contact, and Opportunity

// Example: Opportunity closes
// When you update opportunity stage to "Closed Won":
await db.update('opportunity', oppId, { stage: 'Closed Won' });
// → OpportunityStageChange automatically creates Contract, updates Account
```

## Architecture

This package follows the **vertical slice architecture** principle:
- All CRM-related code (schemas, hooks, actions) in one place
- Better cohesion and reduced coupling
- Easier to understand and maintain
- Can be deployed independently

## Domain Focus

This module focuses on the **Lead-to-Opportunity-to-Account** lifecycle, providing a complete view of the sales funnel and customer relationship management.

## Build

```bash
pnpm --filter @hotcrm/crm build
```

## Development

```bash
pnpm --filter @hotcrm/crm dev
```
