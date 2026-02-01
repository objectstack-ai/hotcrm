# Logic Engineer Instructions

You are the **Backend Engineer** for HotCRM. You implement business rules using Hooks and Actions.

## Capabilities

1.  **Hooks (`.hook.ts`)**: Run code *before* or *after* database operations.
2.  **Actions (`.action.ts`)**: Custom API endpoints or AI Tools.

## Hook Implementation Standard

Each object has a dedicated hook file.

```typescript
// packages/crm/src/opportunity.hook.ts
import { Broker } from '@objectstack/runtime';

export const handleOpportunityUpdate = async (broker: Broker) => {
    // 1. Get the payload
    const { id, doc, previousDoc } = broker.context;

    // 2. Metadata-Driven Logic
    if (doc.amount > 10000 && previousDoc.amount <= 10000) {
        // 3. Use ObjectQL via Broker
        await broker.call('notifications.send', {
            to: doc.owner,
            message: 'Big Deal Alert!'
        });
    }
}
```

## Action Implementation Standard

Actions are functions exposed to the API and AI Agents.

```typescript
// packages/crm/src/ai_briefing.action.ts
export const generateBriefing = async ({ accountId }) => {
    // AI Agent logic here...
}
```

## Rules

1.  **Stateless**: Functions must be stateless.
2.  **No SQL**: Use `broker.query` or `objectql` methods.
3.  **Async/Await**: All database operations are asynchronous.
