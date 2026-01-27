# @hotcrm/metadata

⚠️ **DEPRECATED**: This package has been split into domain-specific packages for better modularity.

## Current State

This package currently contains **legacy YAML definitions** for objects that have not yet been migrated to TypeScript:

**Still in @hotcrm/metadata:**
- Campaign (Marketing campaigns) - YAML
- Activity (Customer interactions) - YAML  
- Case (Support cases) - YAML
- Knowledge (Knowledge base) - YAML
- Product (Product catalog) - YAML
- Pricebook (Pricing) - YAML
- Quote (CPQ) - YAML
- Payment (Payment tracking) - YAML
- Lead (partial, YAML version) - YAML

**Migrated to TypeScript in domain packages:**
- Account, Contact, Lead, Opportunity → `@hotcrm/crm`
- Contract → `@hotcrm/finance`

## Migration Guide

Please use the new domain-based packages for TypeScript schemas:

| Old Package | New Package | Domain |
|-------------|-------------|--------|
| `@hotcrm/metadata` (Account, Contact, Lead, Opportunity, Campaign, Activity) | `@hotcrm/crm` | Marketing & Sales |
| `@hotcrm/metadata` (Case, Knowledge) | `@hotcrm/support` | Customer Service |
| `@hotcrm/metadata` (Product, Pricebook, Quote) | `@hotcrm/products` | Product & Pricing |
| `@hotcrm/metadata` (Contract, Payment) | `@hotcrm/finance` | Financial Operations |

## Why Domain-Based Packages?

The new domain-driven architecture provides:

1. **Better Organization**: Code organized by business capability
2. **Team Ownership**: Each domain can be owned by a specific team
3. **Independent Evolution**: Domains evolve at their own pace
4. **Flexible Deployment**: Deploy only the domains you need
5. **Clear Boundaries**: Reduced coupling between unrelated business areas

## Migration Path

### Before
```typescript
import { AccountSchema, ContactSchema, OpportunitySchema } from '@hotcrm/metadata';
```

### After
```typescript
import { AccountSchema, ContactSchema, OpportunitySchema } from '@hotcrm/crm';
import { CaseSchema, KnowledgeSchema } from '@hotcrm/support';
import { ProductSchema, QuoteSchema } from '@hotcrm/products';
import { ContractSchema, PaymentSchema } from '@hotcrm/finance';
```

## Timeline

- **Current**: Package contains legacy YAML definitions for objects not yet migrated
- **Migration in Progress**: Objects being converted to TypeScript in domain packages
- **Future Release**: Package will be removed once all migrations are complete

## What Objects Are Where?

### @hotcrm/crm (TypeScript ✅)
- Account, Contact, Lead, Opportunity
- Campaign, Activity (still in YAML, referenced from metadata)

### @hotcrm/support (YAML only)
- Case, Knowledge (in metadata package)

### @hotcrm/products (YAML only)  
- Product, Pricebook, Quote (in metadata package)

### @hotcrm/finance (Mixed)
- Contract (TypeScript ✅)
- Payment (YAML, in metadata package)

## Documentation

For detailed information about the domain-driven architecture:
- [Domain Architecture Guide](../../DOMAIN_ARCHITECTURE.md)
- [CRM Package](../crm/README.md)
- [Support Package](../support/README.md)
- [Products Package](../products/README.md)
- [Finance Package](../finance/README.md)

---

## Legacy Documentation

Business object metadata definitions for HotCRM.

### Overview

This package contains all business object metadata definitions for the CRM system, covering the complete Lead-to-Cash lifecycle.

### Core Objects

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

### Usage

```typescript
import { AccountSchema, ContactSchema, OpportunitySchema } from '@hotcrm/metadata';

// Use object definitions in your code
console.log(AccountSchema.label); // "Account"
```

### Architecture

All objects are defined using TypeScript (`.object.ts` files) following the @objectstack/spec protocol:

- **Type-Safe**: Full TypeScript support with proper type inference
- **Declarative**: Metadata-driven architecture
- **Extensible**: Easy to add custom fields and relationships

### Development

```bash
# Build metadata package
pnpm --filter @hotcrm/metadata build

# Watch mode
pnpm --filter @hotcrm/metadata dev
```
