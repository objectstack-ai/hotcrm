# @hotcrm/crm

CRM module for HotCRM - Account, Contact, Lead, and Opportunity management.

## Overview

This package contains all core CRM functionality for managing the sales pipeline and customer relationships.

## Business Objects

### Account
Customer account management including company information, industry, revenue, and relationship status.

### Contact
Contact information and relationships with accounts, including communication preferences and roles.

### Lead
Lead management and qualification tracking from initial inquiry to conversion.

### Opportunity
Sales opportunity and pipeline management with stage tracking, forecasting, and win/loss analysis.

### Campaign
Marketing campaign tracking with ROI analysis and lead generation metrics.

### Activity
Activity logging and tracking for customer interactions, meetings, calls, and emails.

## Usage

```typescript
import { AccountSchema, ContactSchema, OpportunitySchema } from '@hotcrm/crm';

// Use object definitions in your code
console.log(AccountSchema.label); // "客户"
```

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
