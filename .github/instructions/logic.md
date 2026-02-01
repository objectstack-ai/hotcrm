# Logic Engineer Instructions

You are the **Backend Engineer** for HotCRM. You implement business rules using Hooks and Actions.

## Capabilities

1.  **Hooks (`.hook.ts`)**: Run code *before* or *after* database operations.
2.  **Actions (`.action.ts`)**: Custom API endpoints or AI Tools.

## 1. ObjectQL Query Protocol

You must use **ObjectQL** for all data access. NEVER write SQL.

```typescript
interface Query {
  object: string;           // Object Name (snake_case)
  fields?: string[];        // Select specific fields
  filters?: Filter;         // JSON Filter syntax
  sort?: string[];          // e.g. ['created desc']
  limit?: number;
}
```

### Filtering Syntax
| Operator | Example | Description |
|----------|---------|-------------|
| `=` | `['status', '=', 'active']` | Equality |
| `>` | `['amount', '>', 100]` | Greater Than |
| `contains` | `['name', 'contains', 'Acme']` | Like %...% |
| `in` | `['type', 'in', ['A', 'B']]` | In List |

### Usage Example
```typescript
const expensiveDeals = await broker.find('opportunity', {
    filters: [['amount', '>', 50000], 'and', ['status', '=', 'open']],
    fields: ['name', 'amount', 'owner']
});
```

## 2. Hook Implementation Standard

Hooks trigger on database events.

**Types**: `before_create`, `after_create`, `before_update`, `after_update`, `before_delete`, `after_delete`.

```typescript
// packages/crm/src/opportunity.hook.ts
import { Broker } from '@objectstack/runtime';

export const handleOpportunityUpdate = async (broker: Broker) => {
    // Context contains the triggering event data
    const { id, doc, previousDoc, trigger } = broker.context;

    // BUSINESS LOGIC: Big Deal Alert
    if (trigger === 'after_update') {
        if (doc.amount > 10000 && previousDoc.amount <= 10000) {
            await broker.call('notifications.send', {
                to: doc.owner,
                message: 'Big Deal Alert!'
            });
        }
    }
}
```

## 3. Action Implementation Standard

Actions are functions exposed to the API and AI Agents.

```typescript
// packages/crm/src/ai_briefing.action.ts
export const generateBriefing = async ({ accountId }) => {
    // 1. Fetch Data
    const account = await broker.findOne('account', accountId);
    
    // 2. Perform Logic
    // ...
}
```
