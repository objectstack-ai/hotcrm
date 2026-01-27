# @hotcrm/core

Core engine and ObjectQL for HotCRM.

## Overview

This package provides the core functionality for HotCRM including:

- **ObjectQL Engine**: Type-safe query language replacing traditional SQL
- **Type Definitions**: TypeScript definitions for @objectstack/spec
- **Database Interface**: Standard interface for data operations

## Key Features

### ObjectQL Query Engine

```typescript
import { db } from '@hotcrm/core';

// Find records with array-based filters (Strict Protocol Compliance)
const activeAccounts = await db.find('Account', { 
  filters: [['status', '=', 'active']] 
});

// Complex queries with relationships
const result = await db.query({
  object: 'Account',
  fields: ['Name', 'Industry', 'AnnualRevenue'],
  filters: {
    Industry: { $in: ['Technology', 'Finance'] },
    AnnualRevenue: { $gt: 10000000 }
  },
  related: {
    Opportunities: {
      fields: ['Name', 'Amount', 'Stage'],
      filters: { Stage: { $ne: 'Closed Lost' } }
    }
  },
  orderBy: { field: 'AnnualRevenue', direction: 'desc' },
  limit: 50
});
```

## Installation

This package is part of the HotCRM monorepo. Install dependencies at the root:

```bash
pnpm install
```

## Build

```bash
pnpm --filter @hotcrm/core build
```

## Development

```bash
pnpm --filter @hotcrm/core dev
```
