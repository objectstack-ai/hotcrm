# @hotcrm/marketing

AI-Native marketing campaign management for HotCRM with intelligent content generation, optimization, and analytics.

## Overview

The Marketing package provides comprehensive campaign management capabilities with AI-powered optimization, content generation, multi-touch attribution, and ROI tracking.

**Package Stats:** 2 Objects | 3 AI Actions (21 Functions) | 3 Automation Hook Modules (8 Hooks)

## What's Included

### Business Objects (2 Total)

| Object | Label | Description |
|--------|-------|-------------|
| **campaign** | Marketing Campaign | Plan, execute, and track marketing campaigns across 9 channels (Conference, Webinar, Email, Social Media, Advertisement, Direct Mail, Partners, Trade Show, Other) with budget/revenue tracking and nested campaign support |
| **campaign_member** | Campaign Member | Many-to-many junction linking campaigns to leads/contacts with engagement tracking (sent/opened/clicked/responded), bounce handling, and source attribution |

### AI Actions (3 Modules, 21 Total Functions)

#### **content_generator.action.ts** (7 Functions)
| Function | Purpose |
|----------|---------|
| **generateEmailContent** | Generate subject lines (5 variants with open rates), preview text, HTML/plain body, CTAs, personalization tokens, A/B test suggestions |
| **generateSocialMediaPost** | Platform-specific posts (LinkedIn, Twitter, Facebook, Instagram, TikTok) with hashtag strategy, optimal timing, engagement tips |
| **generateLandingPageCopy** | Hero section, value proposition, features, social proof, CTAs, form fields, SEO optimization |
| **generateAdCopy** | Platform-specific ads (Google Search/Display, LinkedIn, Facebook, Twitter) with budget guidance and targeting |
| **personalizeContent** | Create segment-specific variants with dynamic tokens (industry, company size, job role, location) |
| **optimizeContent** | Improve existing content for clarity, conversion, engagement, SEO, readability |
| **adaptContentTone** | Adapt content to target tones (professional, casual, friendly, urgent, educational, inspirational) |

#### **campaign_ai.action.ts** (7 Functions)
| Function | Purpose |
|----------|---------|
| **optimizeCampaignPerformance** | Performance scoring (0-100), KPI analysis (open/click/conversion, ROI, engagement), benchmark comparison, quick wins |
| **segmentAudience** | AI-driven audience targeting and segmentation |
| **recommendChannels** | Best channel selection for campaign type and audience |
| **analyzeABTest** | Statistical analysis of campaign variants with significance testing |
| **optimizeBudget** | Optimal budget allocation across channels with ROI maximization |
| **optimizeSendTime** | Best times to send messages based on engagement patterns |
| **calculateCampaignHealthScore** | Overall campaign effectiveness rating (0-100) |

#### **marketing_analytics.action.ts** (7 Functions)
| Function | Purpose |
|----------|---------|
| **analyzeAttribution** | Multi-touch attribution (first/last touch, linear, time decay, position-based, data-driven), channel/campaign/revenue attribution |
| **analyzeROI** | Current ROI metrics, payback period, channel-level ROI, 6-month forecasting with confidence, optimization recommendations |
| **optimizeFunnel** | Conversion funnel analysis, bottleneck identification, drop-off rates, optimization opportunities with revenue impact |
| **scoreLead** | Predictive lead scoring (0-100), conversion probability, tier classification (hot/warm/cold), scoring factors, recommended actions |
| **analyzeCustomerJourney** | Common journey paths, touchpoint analysis, sequence effectiveness, journey length, drop-off points, optimization |
| **benchmarkCampaign** | Compare against industry standards, percentile rankings, gap analysis for open/click/conversion/ROI/cost per lead |
| **recommendBudgetAllocation** | Data-driven budget allocation, projected results (leads, revenue, ROI), scenario comparison, rebalancing schedule |

### Automation Hooks (3 Modules, 8 Total Hooks)

#### **campaign.hook.ts** (4 Hooks)
| Hook | Triggers | Purpose |
|------|----------|---------|
| **ROI Calculation** | beforeInsert, beforeUpdate | Auto-calculates ROI: (Actual Revenue - Actual Cost) / Actual Cost × 100, budget utilization % |
| **Budget Tracking** | beforeUpdate | Warns at 80% spent ⚠️, alerts at 100% ⚠ |
| **Status Change Automation** | afterUpdate | In Progress → activate members; Completed → metrics/report; Aborted → cleanup |
| **Date Validation** | beforeInsert, beforeUpdate | Enforces end_date > start_date, auto-calculates duration |

#### **campaign_member.hook.ts** (4 Hooks)
| Hook | Triggers | Purpose |
|------|----------|---------|
| **Engagement Tracking** | beforeInsert, beforeUpdate | Auto-sets first_opened/clicked/responded dates, increments counters, sets has_responded flag |
| **Lead Scoring** | afterUpdate | Opens: +5 pts, Clicks: +10 pts, Responded: +20 pts, Unsubscribed: -10 pts |
| **Statistics Aggregation** | afterInsert, afterUpdate, afterDelete | Updates campaign metrics (open/click/response rates) in real-time |
| **Email Bounce Handling** | beforeUpdate | Detects hard/soft bounces, creates unsubscribe records, tracks reasons |

#### **roi.hook.ts** (1 Hook)
| Hook | Triggers | Purpose |
|------|----------|---------|
| **Campaign Revenue Calculation** | afterUpdate on Opportunity | Auto-updates campaign actual revenue when opportunities close (won/lost) |

## Business Capabilities

### 📊 Multi-Channel Campaign Management
- **9 Campaign Types**: Conference, Webinar, Email, Social Media, Advertisement, Direct Mail, Partners, Trade Show, Other
- **Campaign Lifecycle**: Planned → In Progress → Completed/Aborted
- **Budget & ROI Tracking**: Budgeted vs actual cost/revenue, auto-calculated ROI
- **Nested Campaigns**: Parent-child campaign hierarchies
- **Real-Time Metrics**: Open rate, click rate, response rate, conversion tracking

### 🤖 AI-Powered Content Creation
- **Email Generation**: 5 subject line variants with predicted open rates, personalized body content, CTA optimization
- **Social Media**: Platform-optimized posts with hashtag strategies and timing recommendations
- **Landing Pages**: Complete copy generation (hero, value prop, features, social proof, CTAs, SEO)
- **Ad Copy**: Google/LinkedIn/Facebook/Twitter ads with budget and targeting guidance
- **Personalization Engine**: Segment-specific variants with dynamic tokens
- **Tone Adaptation**: 6 tone styles (professional, casual, friendly, urgent, educational, inspirational)

### 📈 Marketing Intelligence & Analytics
- **Attribution Modeling**: 5 models (first/last touch, linear, time decay, position-based, data-driven)
- **ROI Analysis**: Current metrics, 6-month forecasting, channel-level analysis, payback period
- **Funnel Optimization**: Stage analysis, bottleneck identification, revenue impact estimates
- **Predictive Lead Scoring**: ML-based scoring (0-100), conversion probability, tier classification
- **Customer Journey**: Path analysis, touchpoint effectiveness, drop-off identification
- **Benchmarking**: Industry comparison, percentile rankings, gap analysis
- **Budget Optimization**: Data-driven allocation with projected ROI

### 🎯 Campaign Optimization
- **Performance Scoring**: 0-100 health score with KPI breakdown
- **A/B Testing**: Statistical analysis with significance testing
- **Send Time Optimization**: Best send times based on engagement patterns
- **Channel Recommendations**: Optimal channel selection for campaign type
- **Audience Segmentation**: AI-driven targeting and segmentation
- **Quick Wins**: Actionable improvement recommendations

### 🔄 Marketing Automation
- **Auto-ROI Calculation**: Real-time ROI updates from opportunity data
- **Budget Alerts**: 80% warning, 100% alert thresholds
- **Engagement Tracking**: Auto-track opens, clicks, responses with timestamps
- **Lead Scoring**: Automatic score updates (+5/+10/+20/-10 points)
- **Bounce Handling**: Hard/soft bounce detection, auto-unsubscribe creation
- **Campaign Statistics**: Real-time aggregation of member engagement
- **Status Workflows**: Automated transitions with member activation and reporting

## Usage Examples

### Creating a Campaign
```typescript
import { db } from '@hotcrm/core';

const campaign = await db.create('campaign', {
  name: 'Q1 Product Launch',
  type: 'Email',
  status: 'Planned',
  start_date: '2026-03-01',
  end_date: '2026-03-31',
  budgeted_cost: 50000,
  expected_revenue: 200000
});
```

### Adding Campaign Members
```typescript
const member = await db.create('campaign_member', {
  campaign: campaignId,
  lead: leadId,
  status: 'Sent',
  member_source: 'Automation'
});
// → Auto-triggers engagement tracking, lead scoring, statistics aggregation
```

### Using AI Actions - Content Generation
```typescript
import { 
  generateEmailContent,
  generateSocialMediaPost,
  personalizeContent
} from '@hotcrm/marketing';

// Generate email content
const emailContent = await generateEmailContent({
  purpose: 'product_launch',
  audience: 'Enterprise decision makers',
  keyMessage: 'Transform your marketing ROI with AI',
  tone: 'professional',
  cta: 'Start Free Trial'
});
console.log(emailContent.subjectLines); // 5 variants with predicted open rates
console.log(emailContent.bodyHtml); // Personalized email body
console.log(emailContent.abTestSuggestions); // A/B test recommendations

// Generate social media posts
const socialPost = await generateSocialMediaPost({
  platform: 'LinkedIn',
  content: 'Announcing our AI-powered CRM',
  tone: 'professional'
});
console.log(socialPost.post); // Platform-optimized post
console.log(socialPost.hashtags); // Recommended hashtags
console.log(socialPost.bestPostingTime); // Optimal posting time

// Personalize content by segment
const personalized = await personalizeContent({
  baseContent: emailTemplate,
  segments: ['Enterprise', 'SMB', 'Startup'],
  personalizations: ['company_size', 'industry', 'pain_points']
});
```

### Using AI Actions - Campaign Optimization
```typescript
import { 
  optimizeCampaignPerformance,
  analyzeABTest,
  recommendChannels
} from '@hotcrm/marketing';

// Optimize campaign performance
const optimization = await optimizeCampaignPerformance({
  campaignId: 'camp_123'
});
console.log(optimization.performanceScore); // 0-100
console.log(optimization.kpis); // Open/click/conversion rates
console.log(optimization.recommendations); // Actionable improvements
console.log(optimization.quickWins); // High-impact, low-effort wins

// Analyze A/B test results
const abTest = await analyzeABTest({
  variantA: { opens: 1000, clicks: 100 },
  variantB: { opens: 1000, clicks: 120 }
});
console.log(abTest.winner); // 'B'
console.log(abTest.confidence); // 95%
console.log(abTest.recommendation); // 'Use variant B'

// Get channel recommendations
const channels = await recommendChannels({
  campaignType: 'product_launch',
  targetAudience: 'Enterprise IT',
  budget: 50000
});
console.log(channels.recommended); // ['Email', 'LinkedIn', 'Webinar']
console.log(channels.budgetAllocation); // Optimal budget split
```

### Using AI Actions - Marketing Analytics
```typescript
import { 
  analyzeAttribution,
  analyzeROI,
  optimizeFunnel,
  scoreLead
} from '@hotcrm/marketing';

// Multi-touch attribution analysis
const attribution = await analyzeAttribution({
  startDate: '2026-01-01',
  endDate: '2026-03-31',
  model: 'linear' // or 'first_touch', 'last_touch', 'time_decay', 'position_based', 'data_driven'
});
console.log(attribution.channelAttribution); // Revenue by channel
console.log(attribution.campaignAttribution); // Revenue by campaign
console.log(attribution.insights); // Key insights

// ROI analysis and forecasting
const roiAnalysis = await analyzeROI({
  period: 'Q1 2026',
  includeForecast: true
});
console.log(roiAnalysis.currentROI); // Current ROI metrics
console.log(roiAnalysis.forecast); // 6-month forecast
console.log(roiAnalysis.channelROI); // ROI by channel
console.log(roiAnalysis.recommendations); // Optimization suggestions

// Conversion funnel optimization
const funnel = await optimizeFunnel({
  funnelStages: ['Awareness', 'Interest', 'Consideration', 'Decision'],
  period: 'Q1 2026'
});
console.log(funnel.stageConversions); // Conversion rates by stage
console.log(funnel.bottlenecks); // Identified bottlenecks
console.log(funnel.optimizations); // Optimization opportunities
console.log(funnel.revenueImpact); // Estimated revenue impact

// Predictive lead scoring
const leadScore = await scoreLead({
  leadId: 'lead_456'
});
console.log(leadScore.score); // 0-100
console.log(leadScore.conversionProbability); // 0-100%
console.log(leadScore.tier); // 'hot', 'warm', 'cold'
console.log(leadScore.scoringFactors); // Contributing factors
console.log(leadScore.recommendedActions); // Next steps
```

### Hooks Auto-Trigger (No Code Required)
```typescript
// Campaign hooks automatically trigger on data changes

// ROI auto-calculation
await db.update('campaign', campaignId, {
  actual_cost: 45000,
  actual_revenue: 180000
});
// → ROI Calculation hook: ROI = (180000 - 45000) / 45000 × 100 = 300%

// Budget tracking alerts
await db.update('campaign', campaignId, {
  actual_cost: 42000 // 84% of 50000 budget
});
// → Budget Tracking hook: Sends 80% warning

// Status change automation
await db.update('campaign', campaignId, {
  status: 'Completed'
});
// → Status Change hook: Calculates final metrics, generates report, archives

// Member engagement tracking
await db.update('campaign_member', memberId, {
  status: 'Clicked',
  number_of_clicks: 2
});
// → Engagement Tracking hook: Updates first_clicked_date, increments counter
// → Lead Scoring hook: Adds +10 points to lead score
// → Statistics Aggregation hook: Updates campaign click rate

// Revenue from opportunities
await db.update('opportunity', oppId, {
  stage: 'Closed Won',
  amount: 100000,
  campaign: campaignId
});
// → ROI hook: Updates campaign actual_revenue, recalculates ROI
```
