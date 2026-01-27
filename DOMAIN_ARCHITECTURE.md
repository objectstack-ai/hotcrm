# Domain-Driven Architecture

## Overview

HotCRM now follows a **Domain-Driven Design (DDD)** approach, organizing code by business domain rather than technical layer. This architecture provides better modularity, clearer boundaries, and enables teams to work independently on different business capabilities.

## Architecture Principles

### 1. Domain-Centric Organization

Code is organized around **business domains**, not technical layers:

**Before (Horizontal/Technical):**
```
packages/metadata/
  ├── Account.object.ts
  ├── Contact.object.ts
  ├── Case.object.yml
  ├── Product.object.yml
  └── Contract.object.ts
```

**After (Vertical/Domain):**
```
packages/
  ├── crm/              # CRM Domain
  │   ├── Account
  │   ├── Contact
  │   └── Opportunity
  ├── support/          # Support Domain
  │   ├── Case
  │   └── Knowledge
  ├── products/         # Products Domain
  │   └── Product
  └── finance/          # Finance Domain
      └── Contract
```

### 2. Bounded Contexts

Each domain package represents a **bounded context** with:
- Clear domain boundaries
- Cohesive business logic
- Minimal coupling with other domains
- Independent evolution

### 3. Ubiquitous Language

Each domain uses terminology from its business area:
- **CRM**: Accounts, Leads, Opportunities, Pipeline
- **Support**: Cases, Tickets, Knowledge Base, SLA
- **Products**: Catalog, SKU, Pricing, Quotes
- **Finance**: Contracts, Payments, Revenue, Invoices

## Domain Packages

### @hotcrm/crm - Marketing & Sales

**Business Capability:** Lead-to-Cash lifecycle management

**Objects:**
- **Account**: Customer/company management
- **Contact**: Person relationships
- **Lead**: Prospecting and qualification
- **Opportunity**: Deal pipeline tracking
- **Campaign**: Marketing initiatives
- **Activity**: Customer interactions

**Core Workflows:**
- Lead qualification → Opportunity creation
- Opportunity stages → Closed Won/Lost
- Account relationship management
- Sales forecasting and pipeline analysis

**Team Focus:** Sales, Marketing

---

### @hotcrm/support - Customer Service

**Business Capability:** Customer support and knowledge management

**Objects:**
- **Case**: Support ticket/issue tracking
- **Knowledge**: Knowledge base articles

**Core Workflows:**
- Case creation and assignment
- SLA tracking and escalation
- Knowledge article publishing
- Customer satisfaction tracking

**Team Focus:** Support, Customer Success

---

### @hotcrm/products - Product & Pricing

**Business Capability:** Product catalog and pricing management

**Objects:**
- **Product**: Product definitions and specifications
- **Pricebook**: Pricing strategies
- **Quote**: CPQ (Configure, Price, Quote)

**Core Workflows:**
- Product catalog management
- Multi-tier pricing
- Quote generation and approval
- Product configuration

**Team Focus:** Product Management, Sales Operations

---

### @hotcrm/finance - Financial Operations

**Business Capability:** Contract-to-cash process

**Objects:**
- **Contract**: Agreement lifecycle management
- **Payment**: Payment tracking and reconciliation

**Core Workflows:**
- Contract creation and approval
- Payment scheduling
- Revenue recognition
- Invoice management

**Team Focus:** Finance, Legal

## Cross-Domain Integration

### @hotcrm/hooks

**Purpose:** Cross-domain automation

**Examples:**
- When Opportunity (CRM) closes → Create Contract (Finance)
- When Contract (Finance) activates → Update Account status (CRM)

**Dependencies:** Uses multiple domain packages as needed

---

### @hotcrm/actions

**Purpose:** Business operations that span domains

**Examples:**
- AI Smart Briefing: Analyzes Account (CRM) data
- Bulk operations across multiple domains
- Third-party integrations

**Dependencies:** Primarily uses CRM domain

---

### @hotcrm/ui

**Purpose:** User interface components

**Strategy:** Domain-specific UI components organized by domain

**Future Structure:**
```
packages/ui/src/
  ├── crm/              # CRM-related UI
  ├── support/          # Support-related UI
  ├── products/         # Products-related UI
  └── finance/          # Finance-related UI
```

## Dependency Rules

### Core Principle: Acyclic Dependencies

```
Application Layer (server)
        ↓
Integration Layer (hooks, actions, ui)
        ↓
Domain Layer (crm, support, products, finance)
        ↓
Foundation Layer (core)
```

### Rules:

1. **Foundation depends on nothing**
   - `@hotcrm/core` has no dependencies

2. **Domains depend only on foundation**
   - Domain packages (`crm`, `support`, `products`, `finance`) depend only on `core`
   - Domains are independent of each other

3. **Integration depends on domains**
   - `hooks`, `actions`, `ui` can depend on one or more domain packages
   - Integration packages coordinate between domains

4. **Application depends on everything**
   - `server` integrates all packages

## Adding New Domains

### When to Create a New Domain Package

Create a new domain package when:

1. **Cohesive Business Capability**: The objects form a complete business capability
2. **Independent Team**: A team can own and evolve it independently
3. **Clear Boundaries**: Minimal overlap with existing domains
4. **Bounded Context**: Has its own ubiquitous language

### Example: Adding Inventory Domain

```bash
# 1. Create package structure
mkdir -p packages/inventory/src

# 2. Create package.json
{
  "name": "@hotcrm/inventory",
  "version": "1.0.0",
  "dependencies": {
    "@hotcrm/core": "workspace:*"
  }
}

# 3. Add objects
packages/inventory/src/
  ├── warehouse.object.ts
  ├── stock.object.ts
  └── index.ts

# 4. Update workspace dependencies
# Add to packages that need it (e.g., hooks, server)
```

## Migration from Technical to Domain Organization

### Phase 1: Parallel Structure ✅ COMPLETED

- Created domain packages alongside existing metadata package
- Migrated files to domain packages
- Updated dependencies

### Phase 2: Deprecation (Future)

- Mark `@hotcrm/metadata` as deprecated
- Update all imports to use domain packages
- Maintain for backward compatibility

### Phase 3: Removal (Future)

- Remove `@hotcrm/metadata` package
- Complete transition to domain-driven architecture

## Benefits

### For Development

1. **Clearer Code Organization**: Easy to find related code
2. **Better Onboarding**: New developers understand business domains
3. **Reduced Cognitive Load**: Focus on one domain at a time
4. **Independent Evolution**: Domains evolve at their own pace

### For Teams

1. **Team Ownership**: Each team owns a domain
2. **Parallel Development**: Teams work independently
3. **Reduced Conflicts**: Fewer merge conflicts
4. **Clear Responsibilities**: Obvious who owns what

### For Deployment

1. **Micro-frontend Architecture**: Deploy domains as separate UIs
2. **Microservices Ready**: Each domain can become a service
3. **Selective Deployment**: Deploy only changed domains
4. **Better Scaling**: Scale domains independently

### For Business

1. **Faster Feature Delivery**: Independent domain development
2. **Better Alignment**: Code structure matches business structure
3. **Easier Customization**: Customize per domain/customer
4. **Flexible Pricing**: License domains separately

## Examples

### Use Case 1: Industry-Specific CRM

**Healthcare CRM:**
```
@hotcrm/core
@hotcrm/crm (basic CRM)
@hotcrm/healthcare (specialized domain)
  ├── patient.object.ts
  ├── appointment.object.ts
  └── medical-record.object.ts
```

### Use Case 2: Multi-Region Deployment

**EU Deployment:**
```
@hotcrm/core
@hotcrm/crm
@hotcrm/support
@hotcrm/compliance-gdpr (EU-specific)
```

**US Deployment:**
```
@hotcrm/core
@hotcrm/crm
@hotcrm/support
@hotcrm/compliance-hipaa (US-specific)
```

### Use Case 3: White-Label Solutions

**Brand A:**
```
@hotcrm/crm
@hotcrm/ui-brand-a
```

**Brand B:**
```
@hotcrm/crm
@hotcrm/ui-brand-b
```

## Best Practices

### 1. Keep Domains Independent

❌ **Bad:**
```typescript
// In @hotcrm/support
import { Account } from '@hotcrm/crm';
```

✅ **Good:**
```typescript
// In @hotcrm/hooks
import { Account } from '@hotcrm/crm';
import { Case } from '@hotcrm/support';

// Integrate in hooks layer
```

### 2. Use Integration Packages

For cross-domain logic, use integration packages (`hooks`, `actions`), not direct domain dependencies.

### 3. Domain Events (Future)

Use events for domain communication:
```typescript
// @hotcrm/crm emits
eventBus.emit('opportunity.closed_won', { opportunityId, amount });

// @hotcrm/finance listens
eventBus.on('opportunity.closed_won', createContract);
```

### 4. Shared Models via Core

Put truly shared types in `@hotcrm/core`:
```typescript
// @hotcrm/core
export interface Currency {
  code: string;
  symbol: string;
}
```

## Resources

- [Domain-Driven Design by Eric Evans](https://www.domainlanguage.com/ddd/)
- [Bounded Contexts](https://martinfowler.com/bliki/BoundedContext.html)
- [Monorepo Best Practices](https://monorepo.tools/)

## Future Enhancements

1. **Domain Events**: Event-driven architecture between domains
2. **GraphQL Federation**: Each domain exposes its own GraphQL schema
3. **Domain-Specific Languages**: Custom DSLs per domain
4. **Independent Versioning**: Version domains independently
5. **Domain Analytics**: Separate analytics per domain
