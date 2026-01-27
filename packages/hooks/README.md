# @hotcrm/hooks

Business logic and triggers for HotCRM.

## Overview

This package contains all business automation logic, hooks, and triggers that respond to data changes and automate business workflows.

## Key Features

- **Opportunity Automation**: Automatic contract creation when opportunities are won
- **Workflow Triggers**: Before/After insert, update, delete triggers
- **Business Rules**: Automated validation and data enrichment
- **Event-Driven**: Responds to data changes in real-time

## Available Hooks

### OpportunityHook

Automatically creates contracts when opportunities are closed-won:

```typescript
import { OpportunityHook } from '@hotcrm/hooks';

// Hook automatically triggers when:
// - Opportunity stage changes to "Closed Won"
// - Creates associated Contract
// - Sets contract values from opportunity data
```

## Usage

Hooks are automatically registered by the system and execute when matching conditions are met.

## Development

```bash
# Build hooks package
pnpm --filter @hotcrm/hooks build

# Watch mode
pnpm --filter @hotcrm/hooks dev
```

## Adding New Hooks

1. Create a new `*.hook.ts` file in `src/`
2. Export hook logic with before/after handlers
3. Update `index.ts` to export the new hook
4. Register hook in the server configuration
