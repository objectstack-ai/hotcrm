# @hotcrm/crm

CRM module for HotCRM - Complete Marketing & Sales domain with Account, Contact, Lead, and Opportunity management.

## Overview

This package contains all core CRM functionality for managing the sales pipeline and customer relationships. Following vertical slice architecture, it includes schemas, hooks, and actions all in one cohesive package.

## What's Included

### Business Objects (Schemas)

**TypeScript Definitions (Preferred):**
- **Account** (`account.object.ts`): Customer/company management with industry classification, revenue tracking, and parent-child hierarchies
- **Contact** (`contact.object.ts`): Individual contact management with account relationships and role tracking
- **Lead** (`lead.object.ts`): Lead capture, qualification, and conversion tracking with AI-powered scoring
- **Opportunity** (`opportunity.object.ts`): Sales pipeline management with 7 stages, AI win probability, and forecasting

**Legacy YAML Definitions:**
- **Campaign**: Marketing campaign tracking with budget, ROI, and multi-channel support
- **Activity**: Call, email, meeting, and task logging with GPS and AI transcription

> Note: Campaign and Activity are planned for TypeScript migration in future releases.

### Hooks (Business Logic)
- **Lead Conversion Hook** (`lead.hook.ts`): Automatically creates Account/Contact/Opportunity when lead is converted
- **Opportunity Stage Change Hook** (`opportunity.hook.ts`): Creates contracts when opportunities close-won and updates account status

### Actions (Custom Operations)
- **AI Smart Briefing** (`ai_smart_briefing.action.ts`): Generates intelligent account insights by analyzing recent activities, communications, and context

## Usage

### Importing Schemas
```typescript
import { 
  AccountSchema, 
  ContactSchema, 
  LeadSchema,
  OpportunitySchema 
} from '@hotcrm/crm';

console.log(AccountSchema.label); // "Account"
console.log(LeadSchema.label); // "Lead"
```

### Using Hooks
```typescript
import { 
  LeadConversionHook,
  OpportunityStageChangeHook 
} from '@hotcrm/crm';

// Lead conversion hook automatically triggers when:
// - Lead status changes to "Converted"
// - Creates associated Account, Contact, and Opportunity
// - Links relationships properly

// Opportunity stage change hook automatically triggers when:
// - Opportunity stage changes to "Closed Won"
// - Creates associated Contract
// - Updates Account status to "Active Customer"
```

### Using Actions
```typescript
import { executeSmartBriefing } from '@hotcrm/crm';

const briefing = await executeSmartBriefing({
  accountId: 'acc_123',
  activityLimit: 10
});

console.log(briefing.summary);      // AI-generated account overview
console.log(briefing.keyInsights);  // Important observations
console.log(briefing.recommendations); // Next steps
console.log(briefing.talkingPoints);   // Industry-specific sales points
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
