# Business Logic Hooks Implementation

This document describes the business logic hooks implemented for HotCRM's core CRM objects.

## Overview

The hooks provide automated business logic that runs when records are created, updated, or deleted. They follow the `@objectstack/spec v0.6.1` protocol and use **ObjectQL** for data access.

## Architecture

All hooks follow this pattern:

```typescript
import type { Hook } from '@objectstack/spec/data';
import { db } from '@hotcrm/core';

interface TriggerContext {
  old?: Record<string, any>;  // Previous record state
  new: Record<string, any>;   // New/current record state
  db: typeof db;              // ObjectQL database instance
  user: { id: string; name: string; email: string; }; // Current user
}

const MyHook: Hook = {
  name: 'MyHook',
  object: 'ObjectName',
  events: ['beforeInsert', 'beforeUpdate', 'afterInsert', 'afterUpdate'],
  handler: async (ctx: TriggerContext) => {
    // Hook logic here
  }
};
```

## Implemented Hooks

### 1. Account Hooks (`packages/crm/src/hooks/account.hook.ts`)

#### AccountHealthScoreTrigger
- **Events**: `beforeInsert`, `beforeUpdate`
- **Purpose**: Calculates account health score (0-100) based on multiple factors
- **Factors**:
  - Customer status (20 points)
  - Contract value (25 points)
  - Activity frequency (25 points)
  - Payment history (15 points)
  - Support cases (15 points)
- **Color Coding**:
  - 80-100: ✅ Healthy
  - 50-79: ⚠️ At Risk
  - 0-49: 🚨 Critical

#### AccountHierarchyTrigger
- **Events**: `afterInsert`, `afterUpdate`
- **Purpose**: Manages account hierarchy relationships
- **Features**:
  - Updates parent account metrics when child accounts change
  - Cascades ownership changes to all child accounts
  - Aggregates child account values to parent

#### AccountStatusAutomationTrigger
- **Events**: `beforeUpdate`
- **Purpose**: Automates customer status transitions
- **Rules**:
  - Auto-upgrade `Prospect` → `Active Customer` when first contract is added
  - Flags accounts with health score < 50 as at-risk
  - Would auto-mark as `Churned` when contracts expire (requires contract integration)

#### Helper Functions
- `updateAccountContractValue(accountId, db)`: Rolls up all active contract values
- `updateAccountRenewalDate(accountId, db)`: Finds nearest renewal date and creates reminder tasks at 90/60/30 days

### 2. Contact Hooks (`packages/crm/src/hooks/contact.hook.ts`)

#### ContactDecisionChainTrigger
- **Events**: `beforeInsert`, `beforeUpdate`
- **Purpose**: Automatically sets influence level and decision maker status
- **Auto-mapping**:
  - C-Level → High influence, IsDecisionMaker = true
  - VP → High influence
  - Director → Medium influence
  - Manager → Medium influence
  - Individual Contributor → Low influence

#### ContactDecisionMakerValidationTrigger
- **Events**: `afterInsert`, `afterUpdate`
- **Purpose**: Warns if an account has no decision maker
- **Action**: Logs warning message (could create task for account owner)

#### ContactDuplicateDetectionTrigger
- **Events**: `beforeInsert`, `beforeUpdate`
- **Purpose**: Detects potential duplicate contacts
- **Checks**:
  - Email uniqueness (enforced by unique constraint)
  - Same FirstName + LastName at same account
- **Action**: Logs warning for manual review

#### ContactRelationshipStrengthTrigger
- **Events**: `beforeUpdate`
- **Purpose**: Auto-updates relationship strength based on engagement
- **Rules**:
  - Auto-demote if no contact for 90+ days (Strong → Medium → Weak)
  - Auto-promote with recent frequent contact (Weak → Medium → Strong)
  - Considers activity frequency and recency

#### Helper Functions
- `updateContactLastContactDate(contactId, activityDate, db)`: Updates when activities occur
- `analyzeAndUpdateRelationshipStrength(contactId, db)`: Comprehensive relationship analysis

### 3. Activity Hooks (`packages/crm/src/hooks/activity.hook.ts`)

#### ActivityRelatedObjectUpdatesTrigger
- **Events**: `afterInsert`, `afterUpdate`
- **Purpose**: Updates related objects when activities are created/completed
- **Updates**:
  - `Contact.LastContactDate`
  - `Account.LastActivityDate`
  - `Opportunity.LastActivityDate`
  - Activity counters on related objects

#### ActivityCompletionTrigger
- **Events**: `beforeUpdate`
- **Purpose**: Handles activity completion
- **Actions**:
  - Sets `CompletedDate` when status changes to Completed
  - Creates next recurrence for recurring activities
  - Supports Daily, Weekly, Monthly, Yearly patterns

#### ActivityTypeValidationTrigger
- **Events**: `beforeInsert`, `beforeUpdate`
- **Purpose**: Validates type-specific requirements
- **Validations**:
  - Connected calls should have duration
  - Emails should have subject
  - In-person meetings should have location

#### Batch Functions
- `autoCompletePastDueActivities(db)`: Daily job to auto-complete overdue tasks
- `sendOverdueNotifications(db)`: Daily job to notify about overdue activities

### 4. Campaign Hooks (`packages/crm/src/hooks/campaign.hook.ts`)

#### CampaignROICalculationTrigger
- **Events**: `beforeInsert`, `beforeUpdate`
- **Purpose**: Calculates campaign ROI and conversion rates
- **Formulas**:
  - `ROI = (ActualRevenue - ActualCost) / ActualCost * 100`
  - `ConversionRate = ConvertedLeads / TotalLeads * 100`

#### CampaignBudgetTrackingTrigger
- **Events**: `beforeUpdate`
- **Purpose**: Monitors campaign budget utilization
- **Alerts**:
  - ⚠️ Warning at 80% of budget
  - 🚨 Alert at 100% of budget
  - Could block additional spending when exceeded

#### CampaignStatusChangeTrigger
- **Events**: `afterUpdate`
- **Purpose**: Handles campaign lifecycle events
- **Actions**:
  - Calculates final metrics when status = Completed
  - Logs reason when status = Aborted

#### Helper Functions
- `updateCampaignMetrics(campaignId, db)`: Updates campaign statistics from related leads/opportunities
- `addCampaignMembersByCriteria(campaignId, criteria, db)`: Bulk-adds members based on filters
- `removeUnsubscribedMembers(campaignId, db)`: Removes unsubscribed contacts
- `calculateCampaignPerformance(campaignId, db)`: Comprehensive performance analysis including:
  - Cost per lead
  - Cost per opportunity
  - Cost per customer
  - Conversion rates at each stage

## Data Access Pattern

All hooks use **ObjectQL** for data access, following the protocol:

```typescript
// Find records
const accounts = await db.find('Account', {
  filters: [['Status', '=', 'Active']],
  fields: ['Name', 'Industry'],
  sort: ['Name'],
  limit: 100
});

// Create record
const contract = await db.doc.create('Contract', {
  AccountId: accountId,
  Status: 'Draft',
  ContractValue: 100000
});

// Update record
await db.doc.update('Account', accountId, {
  HealthScore: 85
});

// Get record
const account = await db.doc.get('Account', accountId, {
  fields: ['Name', 'HealthScore']
});
```

## Integration Points

### From Contract to Account
When contracts are created/updated:
```typescript
await updateAccountContractValue(accountId, db);
await updateAccountRenewalDate(accountId, db);
```

### From Activity to Contact/Account
When activities are created:
```typescript
await updateContactLastContactDate(contactId, activityDate, db);
```

### From Opportunity/Lead to Campaign
When opportunities/leads change:
```typescript
await updateCampaignMetrics(campaignId, db);
```

## Scheduled Jobs

Some automation requires daily batch processing:

```typescript
// Daily at midnight
await autoCompletePastDueActivities(db);
await sendOverdueNotifications(db);

// Weekly on Sunday
// Run relationship strength analysis for all contacts
```

## Testing Hooks

To test hooks in development:

```typescript
import { AccountHealthScoreTrigger } from './account.hook';
import { db } from '@hotcrm/core';

// Simulate trigger context
const ctx = {
  new: {
    Name: 'Test Account',
    CustomerStatus: 'Active Customer',
    ContractValue: 500000
  },
  db,
  user: { id: 'user-123', name: 'Test User', email: 'test@example.com' }
};

// Execute hook
await AccountHealthScoreTrigger.handler(ctx);
console.log('Health Score:', ctx.new.HealthScore);
```

## Future Enhancements

1. **AI Integration**
   - Sentiment analysis for relationship strength
   - Predictive churn detection
   - Smart next-best-action recommendations

2. **Advanced Analytics**
   - Customer lifetime value (CLV) calculation
   - Predictive health scoring with ML
   - Anomaly detection in activity patterns

3. **Workflow Automation**
   - Approval workflows for large contracts
   - Escalation rules for at-risk accounts
   - Auto-assignment based on territory/industry

4. **Integration Hooks**
   - Webhooks for external systems
   - Email integration for activity tracking
   - Calendar sync for meetings

## Best Practices

1. **Performance**: Hooks should complete quickly (< 5 seconds)
2. **Idempotency**: Hooks should be safe to run multiple times
3. **Error Handling**: Always catch and log errors, don't block saves
4. **Logging**: Use descriptive console logs with emoji for visibility
5. **Validation**: Use validation rules in object definitions, not hooks
6. **Batch Operations**: Use batch jobs for heavy processing

## Notes

- All hooks are currently in "logging mode" - they log what they would do but don't make actual database calls
- Uncomment the database operations in production deployment
- Some features require additional fields to be added to object definitions
- Campaign object needs to be converted from YAML to TypeScript format for full integration
