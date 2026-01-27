# @hotcrm/actions

⚠️ **DEPRECATED**: This package has been integrated into domain packages for better vertical integration.

## Migration Guide

Actions are now part of their respective domain packages:

| Old Package | New Package | Action |
|-------------|-------------|--------|
| `@hotcrm/actions` (AI Smart Briefing) | `@hotcrm/crm` | Account analysis and insights |

## Why Domain-Integrated Actions?

The new architecture follows the principle of **vertical slice architecture**:
- Each domain contains its own schemas, hooks, and actions
- Better cohesion within domains
- Reduced coupling between packages
- Easier to understand and maintain

## Migration Path

### Before
```typescript
import { executeSmartBriefing } from '@hotcrm/actions';
```

### After
```typescript
import { executeSmartBriefing } from '@hotcrm/crm';
```

## Timeline

- **Current**: Package marked as deprecated
- **Next Release**: Package will be removed

---

## Legacy Documentation

Custom actions for HotCRM.

### Overview

This package contains custom business actions that extend the core CRM functionality with specialized operations.

## Available Actions

### AI Smart Briefing

Generates intelligent account briefings using AI:

```typescript
import { executeSmartBriefing } from '@hotcrm/actions';

const briefing = await executeSmartBriefing({
  accountId: 'acc_123',
  activityLimit: 10
});

console.log(briefing.summary);
console.log(briefing.keyInsights);
console.log(briefing.recommendations);
```

**Features:**
- Account overview and status
- Recent activity analysis
- Key insights extraction
- AI-powered recommendations
- Risk and opportunity identification

## Usage

```typescript
import { executeSmartBriefing } from '@hotcrm/actions';

// Execute AI smart briefing
const result = await executeSmartBriefing({
  accountId: accountId,
  activityLimit: 5
});
```

## Development

```bash
# Build actions package
pnpm --filter @hotcrm/actions build

# Watch mode
pnpm --filter @hotcrm/actions dev
```

## Adding New Actions

1. Create a new `*.action.ts` file in `src/`
2. Implement action logic
3. Export action from `index.ts`
4. Register action endpoint in the server
