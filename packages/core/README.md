# @hotcrm/core

Core engine and ObjectQL query language for HotCRM.

## Overview

This package provides the foundational components for the entire HotCRM system, including the ObjectQL query engine, TypeScript type definitions for the @objectstack/spec protocol, and the database abstraction layer.

## Key Features

### ObjectQL Query Engine

ObjectQL is a **type-safe, flexible query language** that replaces traditional SQL with a more intuitive, object-oriented approach. It provides:

- **Type Safety**: Full TypeScript support with compile-time type checking
- **Relationship Queries**: Easily query related objects in a single request
- **Flexible Filtering**: Rich filter syntax with comparison operators
- **Aggregation**: Built-in support for COUNT, SUM, AVG, MIN, MAX
- **Pagination**: Built-in limit/offset and cursor-based pagination
- **Sorting**: Multi-field ordering with ASC/DESC

### Type Definitions

Complete TypeScript definitions for:
- Service objects and fields
- Relationships and lookups
- Validation rules
- UI metadata
- Hooks and actions

### Database Abstraction

Unified interface for data operations:
- Create, Read, Update, Delete (CRUD)
- Bulk operations
- Transaction support
- Query optimization

## Usage Examples

### Basic Queries

```typescript
import { db } from '@hotcrm/core';

// Simple find with array-based filters (Strict Protocol Compliance)
const activeAccounts = await db.find('Account', { 
  filters: [['Status', '=', 'Active']] 
});

// Find with multiple filters
const techAccounts = await db.find('Account', {
  filters: [
    ['Industry', '=', 'Technology'],
    ['AnnualRevenue', '>', 10000000]
  ]
});
```

### Complex Queries with Relationships

```typescript
import { db } from '@hotcrm/core';

// Query accounts with related opportunities
const result = await db.query({
  object: 'Account',
  fields: ['Name', 'Industry', 'AnnualRevenue'],
  filters: {
    Industry: { $in: ['Technology', 'Finance'] },
    AnnualRevenue: { $gt: 10000000 }
  },
  related: {
    Opportunities: {
      fields: ['Name', 'Amount', 'Stage', 'CloseDate'],
      filters: { Stage: { $ne: 'Closed Lost' } },
      orderBy: { field: 'Amount', direction: 'desc' }
    },
    Contacts: {
      fields: ['Name', 'Email', 'Title']
    }
  },
  orderBy: { field: 'AnnualRevenue', direction: 'desc' },
  limit: 50
});

console.log(result.records); // Array of accounts with nested opportunities
console.log(result.totalCount); // Total number of matching records
```

### CRUD Operations

```typescript
import { db } from '@hotcrm/core';

// Create a new record
const newAccount = await db.doc.create('Account', {
  Name: 'Acme Corporation',
  Industry: 'Technology',
  AnnualRevenue: 50000000,
  Phone: '555-1234',
  Website: 'https://acme.com'
});

// Read a single record
const account = await db.doc.get('Account', 'acc_123');

// Update a record
const updated = await db.doc.update('Account', 'acc_123', {
  AnnualRevenue: 55000000,
  Status: 'Active Customer'
});

// Delete a record
await db.doc.delete('Account', 'acc_123');
```

### Advanced Filtering

```typescript
import { db } from '@hotcrm/core';

// Multiple conditions with operators
const opportunities = await db.find('Opportunity', {
  filters: {
    // AND conditions
    Amount: { $gte: 50000, $lte: 500000 },
    Stage: { $in: ['Proposal', 'Negotiation'] },
    CloseDate: { $gte: new Date('2024-01-01') },
    // OR conditions
    $or: [
      { Probability: { $gte: 75 } },
      { Amount: { $gte: 250000 } }
    ]
  }
});
```

### Aggregation Queries

```typescript
import { db } from '@hotcrm/core';

// Aggregate by field
const revenueByIndustry = await db.aggregate('Account', {
  groupBy: 'Industry',
  aggregates: [
    { field: 'AnnualRevenue', operation: 'SUM', alias: 'totalRevenue' },
    { field: 'Id', operation: 'COUNT', alias: 'accountCount' }
  ]
});
```

## Installation

This package is part of the HotCRM monorepo. Install all dependencies from the root:

```bash
# Install pnpm if needed
npm install -g pnpm

# Install all workspace dependencies
pnpm install
```

## Build

```bash
# Build from root
pnpm build:core

# Or build directly
pnpm --filter @hotcrm/core build
```

## Development

```bash
# Watch mode for development
pnpm --filter @hotcrm/core dev
```

## Architecture

### ObjectQL Engine

The ObjectQL engine is the heart of HotCRM's data access layer:

```
ObjectQL Query
    ↓
Query Parser & Validator
    ↓
Query Optimizer
    ↓
Execution Engine
    ↓
Database Adapter
    ↓
Results with Type Safety
```

### Type System

Full TypeScript support ensures:
- Compile-time type checking
- IntelliSense/autocomplete in IDEs
- Runtime type validation
- Schema inference from metadata

## Package Exports

```typescript
// Main exports
export { db } from './objectql';           // Database interface
export type { 
  ServiceObject,
  Field,
  Relationship,
  QueryOptions,
  QueryResult
} from './types';
```

## Dependencies

This package has minimal dependencies and serves as the foundation for all other HotCRM packages:
- No domain package dependencies
- Core TypeScript utilities
- Database adapter abstractions

## Used By

All HotCRM packages depend on `@hotcrm/core`:
- `@hotcrm/crm` - CRM domain
- `@hotcrm/support` - Support domain
- `@hotcrm/products` - Products domain  
- `@hotcrm/finance` - Finance domain
- `@hotcrm/ui` - UI components
- `@hotcrm/server` - Server application

## Future Enhancements

Planned features for future releases:
- Database connection pooling
- Query result caching
- Real-time subscriptions
- GraphQL adapter
- Multi-tenant support
