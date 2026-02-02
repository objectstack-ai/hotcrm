# Marketing Package

AI-Native marketing campaign management for HotCRM.

## Overview

The Marketing package provides comprehensive campaign management capabilities with AI-powered optimization, content generation, and analytics.

## Features

### 📊 Campaign Management
- Multi-channel campaign orchestration (Email, Social Media, Webinars, Events, etc.)
- Campaign member tracking and engagement analytics
- ROI calculation and budget monitoring
- A/B testing and optimization

### 🤖 AI-Powered Capabilities

#### Campaign Optimization (7 functions)
- Performance analysis and recommendations
- Audience segmentation
- Channel selection and budget allocation
- A/B test statistical analysis
- Send time optimization
- Campaign health scoring

#### Content Generation (7 functions)
- Email content (subject lines, body, CTAs)
- Social media posts (LinkedIn, Twitter, Facebook, Instagram, TikTok)
- Landing page copy
- Ad copy (Google, LinkedIn, Facebook, Twitter)
- Content personalization by segment
- Content optimization
- Tone and style adaptation

#### Marketing Analytics (7 functions)
- Multi-touch attribution modeling
- ROI analysis and forecasting
- Conversion funnel optimization
- Predictive lead scoring
- Customer journey analytics
- Performance benchmarking
- Budget allocation recommendations

### 🔧 Business Logic Automation

#### Campaign Hooks
- Automatic ROI calculation from won opportunities
- Budget tracking with 80%/100% alerts
- Status change workflow automation
- Date validation and duration tracking

#### Campaign Member Hooks
- Engagement tracking (opens, clicks, responses)
- Lead scoring based on engagement (+5/+10/+20 points)
- Statistics aggregation for campaigns
- Email bounce detection and handling

## Data Model

### Objects

#### `campaign`
Core campaign object with fields for budget, revenue, dates, and performance metrics.

#### `campaign_member`
Junction object linking campaigns to leads/contacts with engagement tracking.

## Usage Examples

### Creating a Campaign

```typescript
const campaign = await ctx.ql.create('campaign', {
  name: 'Q1 Product Launch',
  type: 'Email',
  status: 'Planned',
  start_date: '2024-03-01',
  end_date: '2024-03-31',
  budgeted_cost: 50000,
  expected_revenue: 200000
});
```

### Adding Campaign Members

```typescript
const member = await ctx.ql.create('campaign_member', {
  campaign: campaignId,
  lead: leadId,
  status: 'Sent',
  member_source: 'Automation'
});
```

### Using AI Actions

#### Optimize Campaign Performance

```typescript
import { optimizeCampaignPerformance } from './actions/campaign_ai.action';

const analysis = await optimizeCampaignPerformance({
  campaignId: 'camp_123'
});

console.log('Performance Score:', analysis.performanceScore);
console.log('Recommendations:', analysis.recommendations);
```

#### Generate Email Content

```typescript
import { generateEmailContent } from './actions/content_generator.action';

const content = await generateEmailContent({
  purpose: 'product_launch',
  audience: 'Enterprise decision makers',
  keyMessage: 'Transform your marketing ROI with AI',
  tone: 'professional',
  cta: 'Start Free Trial'
});

console.log('Subject Lines:', content.subjectLines);
console.log('Email Body:', content.bodyHtml);
```

#### Analyze Attribution

```typescript
import { analyzeAttribution } from './actions/marketing_analytics.action';

const attribution = await analyzeAttribution({
  startDate: '2024-01-01',
  endDate: '2024-03-31',
  model: 'linear'
});

console.log('Channel Attribution:', attribution.channelAttribution);
console.log('Insights:', attribution.insights);
```

## Business Logic Hooks

Hooks are automatically triggered on data changes:

### Campaign Hooks
- `CampaignROICalculationTrigger` - Calculates ROI on insert/update
- `CampaignBudgetTrackingTrigger` - Monitors spending and alerts
- `CampaignStatusChangeTrigger` - Automates workflows on status change
- `CampaignDateValidationTrigger` - Validates date ranges

### Campaign Member Hooks
- `CampaignMemberEngagementTrigger` - Tracks engagement metrics
- `CampaignMemberLeadScoringTrigger` - Updates lead scores
- `CampaignMemberStatsTrigger` - Aggregates campaign statistics
- `CampaignMemberBounceHandlerTrigger` - Handles email bounces

## Integration

The Marketing package integrates with:
- **CRM Package**: Leads, Contacts, Accounts, Opportunities
- **Finance Package**: Revenue tracking and forecasting
- **Support Package**: Customer feedback and satisfaction

## AI Model Configuration

AI actions use mock implementations by default. In production:

1. Configure your LLM provider (OpenAI, Anthropic, etc.)
2. Update `callLLM()` functions in action files
3. Set API keys in environment variables
4. Adjust prompts for your specific use cases

## Metrics and KPIs

The package tracks:
- Open Rate, Click Rate, Response Rate
- ROI and Budget Utilization
- Cost per Lead/Contact/Conversion
- Campaign Health Score
- Attribution across channels
- Funnel conversion rates

## Best Practices

1. **Campaign Setup**: Always set realistic budgets and expected revenue
2. **Segmentation**: Use AI segmentation for better targeting
3. **Testing**: Run A/B tests before full rollout
4. **Monitoring**: Review campaign health scores regularly
5. **Attribution**: Use linear or data-driven models for accuracy
6. **Content**: Personalize content by segment for higher engagement

## Development

### Running Tests

```bash
npm test
```

### Type Checking

```bash
npm run typecheck
```

## License

Part of the HotCRM project. See LICENSE for details.
