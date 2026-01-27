# @hotcrm/crm

CRM module for HotCRM - Account, Contact, Lead, and Opportunity management with integrated hooks and actions.

## Overview

This package contains all core CRM functionality for managing the sales pipeline and customer relationships. Following vertical slice architecture, it includes schemas, hooks, and actions all in one cohesive package.

## What's Included

### Business Objects (Schemas)
- **Account**: Customer account management including company information, industry, revenue, and relationship status
- **Contact**: Contact information and relationships with accounts, including communication preferences and roles
- **Lead**: Lead management and qualification tracking from initial inquiry to conversion
- **Opportunity**: Sales opportunity and pipeline management with stage tracking, forecasting, and win/loss analysis
- **Campaign**: Marketing campaign tracking with ROI analysis and lead generation metrics
- **Activity**: Activity logging and tracking for customer interactions, meetings, calls, and emails

### Hooks (Business Logic)
- **Opportunity Stage Change**: Automatically creates contracts when opportunities close-won and updates account status

### Actions (Custom Operations)
- **AI Smart Briefing**: Generates intelligent account insights by analyzing recent activities, communications, and context

## Usage

### Importing Schemas
```typescript
import { AccountSchema, ContactSchema, OpportunitySchema } from '@hotcrm/crm';

console.log(AccountSchema.label); // "Account"
```

### Using Hooks
```typescript
import { OpportunityStageChange } from '@hotcrm/crm';

// Hook automatically triggers when:
// - Opportunity stage changes to "Closed Won"
// - Creates associated Contract
// - Updates Account status
```

### Using Actions
```typescript
import { executeSmartBriefing } from '@hotcrm/crm';

const briefing = await executeSmartBriefing({
  accountId: 'acc_123',
  activityLimit: 10
});

console.log(briefing.summary);
console.log(briefing.keyInsights);
console.log(briefing.recommendations);
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
