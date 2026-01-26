# HotCRM Examples

This document provides practical examples of using the HotCRM system.

## Example 1: Query Accounts with Opportunities

```typescript
import { db } from './src/engine/objectql';

async function getHighValueAccounts() {
  const result = await db.query({
    object: 'Account',
    fields: ['Name', 'Industry', 'AnnualRevenue', 'Rating'],
    filters: {
      AnnualRevenue: { $gt: 10000000 },
      Industry: { $in: ['Technology', 'Finance'] }
    },
    related: {
      Opportunities: {
        fields: ['Name', 'Amount', 'Stage', 'CloseDate'],
        filters: {
          Stage: { $ne: 'Closed Lost' }
        }
      }
    },
    orderBy: { field: 'AnnualRevenue', direction: 'desc' },
    limit: 20
  });

  console.log(`Found ${result.totalCount} high-value accounts`);
  return result.records;
}
```

## Example 2: Create Opportunity with Auto-trigger

```typescript
import { db } from './src/engine/objectql';

async function createWonOpportunity() {
  // Create a new opportunity
  const opportunity = await db.doc.create('Opportunity', {
    Name: '阿里巴巴 - 企业CRM采购',
    AccountId: 'acc-001',
    ContactId: 'con-001',
    Amount: 5000000,
    Stage: 'Negotiation', // Initial stage
    CloseDate: '2024-03-31',
    Type: 'New Business',
    OwnerId: 'user-001'
  });

  console.log('Opportunity created:', opportunity.Id);

  // Later, when deal is won, update stage
  // This will trigger OpportunityTrigger automatically
  await db.doc.update('Opportunity', opportunity.Id, {
    Stage: 'Closed Won'
  });

  // Trigger will:
  // 1. Create Contract automatically
  // 2. Update Account.CustomerStatus to "Active Customer"
  // 3. Send notification to sales director
}
```

## Example 3: AI Smart Briefing

```typescript
import { executeSmartBriefing } from './src/actions/AISmartBriefing';

async function getCustomerInsights(accountId: string) {
  const briefing = await executeSmartBriefing({
    accountId: accountId,
    activityLimit: 10
  });

  console.log('=== AI Smart Briefing ===');
  console.log('Summary:', briefing.summary);
  console.log('\nNext Steps:');
  briefing.nextSteps.forEach((step, i) => {
    console.log(`  ${i + 1}. ${step}`);
  });
  
  console.log('\nTalking Points:');
  briefing.talkingPoints.forEach((point, i) => {
    console.log(`  ${i + 1}. ${point}`);
  });
  
  console.log(`\nSentiment: ${briefing.sentiment}`);
  console.log(`Engagement Score: ${briefing.engagementScore}/100`);

  return briefing;
}
```

## Example 4: REST API Usage

### Create Account

```bash
curl -X POST http://localhost:3000/api/objects/Account \
  -H "Content-Type: application/json" \
  -d '{
    "Name": "腾讯科技",
    "Industry": "Technology",
    "AnnualRevenue": 500000000,
    "Rating": "Hot",
    "Phone": "0755-86013388",
    "Website": "https://www.tencent.com",
    "BillingCity": "深圳",
    "BillingCountry": "中国"
  }'
```

### Query with ObjectQL

```bash
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "object": "Opportunity",
    "fields": ["Name", "Amount", "Stage", "CloseDate"],
    "filters": {
      "Stage": "Negotiation",
      "Amount": { "$gt": 1000000 }
    },
    "limit": 10
  }'
```

### Get AI Briefing

```bash
curl -X POST http://localhost:3000/api/ai/smart-briefing \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "acc-001",
    "activityLimit": 15
  }'
```

## Example 5: Batch Operations

```typescript
import { db } from './src/engine/objectql';

async function batchUpdateOpportunityOwner(
  opportunityIds: string[],
  newOwnerId: string
) {
  const updates = opportunityIds.map(id => ({
    id: id,
    data: { OwnerId: newOwnerId }
  }));

  await db.batch.update('Opportunity', updates);
  
  console.log(`Updated ${opportunityIds.length} opportunities`);
}

async function batchCreateContacts(accountId: string) {
  const contacts = [
    {
      FirstName: '伟',
      LastName: '张',
      Title: 'CTO',
      Email: 'zhang.wei@company.com',
      AccountId: accountId
    },
    {
      FirstName: '娜',
      LastName: '李',
      Title: 'VP of Sales',
      Email: 'li.na@company.com',
      AccountId: accountId
    }
  ];

  const results = await db.batch.create('Contact', contacts);
  console.log(`Created ${results.length} contacts`);
  return results;
}
```

## Example 6: Using the Sales Dashboard

The sales dashboard is configured in `/src/ui/dashboard/SalesDashboard.ts` and can be rendered by fetching:

```bash
GET http://localhost:3000/api/ui/dashboard/sales
```

The response is an amis JSON schema that can be rendered by the amis framework.

### Dashboard Features

1. **KPI Cards**
   - Revenue (quarterly)
   - New Leads
   - Win Rate

2. **Pipeline Funnel**
   - Visual representation of opportunities by stage
   - Total amount per stage
   - Conversion rates

3. **Recent Activities**
   - Timeline of team actions
   - User avatars and timestamps
   - Activity status

## Example 7: Custom Validation

From `Account.object.yml`:

```yaml
validationRules:
  - name: RequireIndustryForHighRevenue
    errorMessage: 年营收超过1000万的客户必须选择行业
    formula: |
      AND(
        AnnualRevenue > 10000000,
        ISBLANK(Industry)
      )
```

This rule ensures data quality by requiring high-value accounts to have an industry classification.

## Example 8: Formula Fields

From `Opportunity.object.yml`:

```yaml
fields:
  - name: IsWon
    type: formula
    label: 是否赢单
    returnType: checkbox
    formula: Stage = "Closed Won"
```

Formula fields are automatically calculated based on other field values.

## Example 9: Master-Detail Relationship

From `Contact.object.yml`:

```yaml
fields:
  - name: AccountId
    type: masterDetail
    label: 所属客户
    referenceTo: Account
    required: true
    cascadeDelete: true
```

When an Account is deleted, all related Contacts are automatically deleted (cascade delete).

## Example 10: AI-Powered Component Integration

Integrate the AI Smart Briefing card into an Account detail page:

```typescript
import aiSmartBriefingCard from './src/ui/components/AISmartBriefingCard';

const accountDetailPage = {
  "type": "page",
  "title": "${Name}",
  "body": [
    // AI Smart Briefing at the top
    aiSmartBriefingCard,
    
    // Other account details below
    {
      "type": "card",
      "body": [
        // ... account fields
      ]
    }
  ]
};
```

## Running Examples

### Start the Server

```bash
npm install
npm run dev
```

The server will start on `http://localhost:3000`.

### Test Health Check

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-26T10:00:00.000Z",
  "version": "1.0.0"
}
```

### Access Dashboard

```bash
curl http://localhost:3000/api/ui/dashboard/sales
```

Returns the complete amis configuration for the sales dashboard.

## Development Workflow

1. **Define Object**: Create `.object.yml` in `src/metadata/`
2. **Implement Trigger**: Create trigger file in `src/triggers/`
3. **Build UI**: Create amis config in `src/ui/`
4. **Test**: Use REST API or write tests
5. **Deploy**: Build and deploy to production

## Best Practices

1. **Always use ObjectQL** for database operations
2. **Follow naming conventions** (PascalCase for objects, camelCase for fields)
3. **Add validation rules** to ensure data quality
4. **Use defensive programming** in triggers (check for null/undefined)
5. **Design for mobile** first when creating UI
6. **Leverage AI features** for enhanced user experience
7. **Document your changes** in code comments

## Troubleshooting

### Issue: Trigger not firing

Check:
1. Is the trigger defined in the object's YAML file?
2. Is the event type correct (beforeUpdate, afterUpdate, etc.)?
3. Are the conditions met?
4. Check server logs for errors

### Issue: Query returns no results

Check:
1. Are the filters correct?
2. Does the data exist in the database?
3. Are field names spelled correctly?
4. Check case sensitivity

### Issue: UI not rendering

Check:
1. Is the amis schema valid JSON?
2. Are all required fields present?
3. Check browser console for errors
4. Verify API endpoints are responding

## Additional Resources

- [README.md](../README.md) - Project overview
- [OBJECTSTACK_SPEC.md](./OBJECTSTACK_SPEC.md) - Protocol documentation
- [AI_PROMPT_GUIDE.md](./AI_PROMPT_GUIDE.md) - AI prompting guide
- [Object Metadata](../src/metadata/) - All object definitions
- [Triggers](../src/triggers/) - Business logic triggers
- [UI Components](../src/ui/) - Interface configurations
