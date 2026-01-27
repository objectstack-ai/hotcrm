# @hotcrm/metadata

Business object metadata definitions for HotCRM.

## Overview

This package contains all business object metadata definitions for the CRM system, covering the complete Lead-to-Cash lifecycle.

## Core Objects

### Marketing & Sales
- **Lead**: Lead management and qualification
- **Campaign**: Marketing campaign tracking
- **Account**: Customer account management
- **Contact**: Contact information and relationships
- **Opportunity**: Sales opportunity and pipeline management
- **Activity**: Activity logging and tracking

### Products & Pricing
- **Product**: Product catalog and specifications
- **Pricebook**: Pricing structures and configurations
- **Quote**: CPQ (Configure, Price, Quote) functionality

### Contracts & Finance
- **Contract**: Contract lifecycle management
- **Payment**: Payment tracking and reconciliation

### Service & Support
- **Case**: Customer support case management
- **Knowledge**: Knowledge base and documentation

## Usage

```typescript
import { AccountSchema, ContactSchema, OpportunitySchema } from '@hotcrm/metadata';

// Use object definitions in your code
console.log(AccountSchema.label); // "客户"
```

## Architecture

All objects are defined using TypeScript (`.object.ts` files) following the @objectstack/spec protocol:

- **Type-Safe**: Full TypeScript support with proper type inference
- **Declarative**: Metadata-driven architecture
- **Extensible**: Easy to add custom fields and relationships

## Development

```bash
# Build metadata package
pnpm --filter @hotcrm/metadata build

# Watch mode
pnpm --filter @hotcrm/metadata dev
```
