# Development Workflow Guide

Complete guide for developing ObjectStack applications in HotCRM.

---

## Overview

This guide consolidates all development workflows, best practices, and processes for building world-class ObjectStack applications. Whether you're a new contributor or experienced developer, follow these guidelines to ensure consistency and quality.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Development Workflow](#development-workflow)
3. [Iterative Development](#iterative-development)
4. [Version Management](#version-management)
5. [Best Practices](#best-practices)
6. [Application Templates](#application-templates)
7. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Prerequisites

- Node.js >= 20.9.0
- pnpm >= 9.0.0
- TypeScript knowledge
- Familiarity with @objectstack/spec v0.6.1

### Setup

```bash
# Clone repository
git clone https://github.com/objectstack-ai/hotcrm.git
cd hotcrm

# Install dependencies
pnpm install

# Build packages
pnpm build

# Start development server
pnpm dev
```

### Essential Reading

1. **[Metadata Protocol](.github/prompts/metadata.prompt.md)** - File suffix system and naming conventions
2. **[AI Quick Reference](.github/prompts/ai-quick-reference.prompt.md)** - Quick lookup for common tasks
3. **[Platform Capabilities](.github/prompts/capabilities.prompt.md)** - Feature mapping and design patterns

---

## Development Workflow

**Philosophy**: Configuration > Low-Code > Pro-Code

### Three-Phase Development Process

#### Phase 1: Data Layer (60% effort)

Define business objects, fields, relationships, and validation rules.

**Example: Creating a Customer Object**

```typescript
// File: packages/crm/src/customer.object.ts
import type { ObjectDefinition } from '@objectstack/spec/data';

export const Customer: ObjectDefinition = {
  name: 'customer',              // snake_case
  label: 'Customer',
  labelPlural: 'Customers',
  
  fields: {
    Name: {                      // PascalCase for fields
      type: 'text',
      label: 'Company Name',
      required: true,
      maxLength: 255
    },
    Industry: {
      type: 'select',
      label: 'Industry',
      options: [
        { value: 'tech', label: 'Technology' },
        { value: 'finance', label: 'Finance' }
      ]
    },
    AnnualRevenue: {
      type: 'currency',
      label: 'Annual Revenue',
      min: 0
    }
  },
  
  enable: {
    trackHistory: true,
    apiEnabled: true,
    searchEnabled: true
  }
};

export default Customer;
```

**Checklist**:
- [ ] Object name uses snake_case
- [ ] Field names use PascalCase
- [ ] All fields have clear labels
- [ ] Required fields marked
- [ ] Relationships have relationshipName

**Learn More**: [Development Workflow Guide](.github/prompts/workflow.prompt.md)

#### Phase 2: Business Logic (20% effort)

Add validation rules, workflows, and automation.

```typescript
validations: [
  {
    type: 'uniqueness',
    name: 'unique_email',
    fields: ['Email'],
    errorMessage: 'Email address must be unique'
  }
],

workflows: [
  {
    type: 'fieldUpdate',
    name: 'auto_assign_owner',
    trigger: { on: 'create' },
    actions: [{
      type: 'updateField',
      field: 'OwnerId',
      value: '$CurrentUser'
    }]
  }
]
```

#### Phase 3: UI Layer (20% effort)

Create views, actions, and optimize user experience.

```typescript
views: [
  {
    type: 'list',
    name: 'all_customers',
    viewType: 'grid',
    label: 'All Customers',
    columns: ['Name', 'Industry', 'AnnualRevenue', 'Status']
  },
  {
    type: 'list',
    name: 'customer_pipeline',
    viewType: 'kanban',
    label: 'Customer Pipeline',
    groupBy: 'Status'
  }
]
```

---

## Iterative Development

### MVP Development Path (5 Weeks)

Build incrementally, validate early, iterate often.

**Week 1: Core Objects**
- Define 3-5 core objects
- Minimal field set
- Basic CRUD operations
- Simple list views

**Week 2: Relationships & Validation**
- Add lookup/master-detail relationships
- Configure validation rules
- Add indexes for performance
- Test data integrity

**Week 3: Business Logic**
- Add workflows and automation
- Create formula fields
- Configure approval processes
- Test automation

**Week 4: UI Enhancement**
- Multiple view types (grid, kanban, calendar)
- Custom actions
- Form layouts
- Dashboard creation

**Week 5: Advanced Features**
- AI integration
- Advanced reports
- Fine-grained permissions
- Performance optimization

**Learn More**: [Iterative Development Strategy](.github/prompts/iteration.prompt.md)

---

## Version Management

### Semantic Versioning

Follow [SemVer 2.0.0](https://semver.org/):

```
MAJOR.MINOR.PATCH

1.0.0 → 1.0.1  (Patch: Bug fixes)
1.0.0 → 1.1.0  (Minor: New features, backward compatible)
1.0.0 → 2.0.0  (Major: Breaking changes)
```

### Release Process

1. **Prepare Release**
   ```bash
   pnpm test
   pnpm build
   node scripts/validate-protocol.js
   ```

2. **Update Version**
   ```typescript
   // objectstack.config.ts
   manifest: {
     version: '1.1.0'  // Update version
   }
   ```

3. **Write Changelog**
   ```markdown
   ## [1.1.0] - 2024-01-30
   
   ### Added
   - New Product object with inventory tracking
   
   ### Fixed
   - Corrected Order calculation bug
   ```

4. **Commit and Tag**
   ```bash
   git commit -m "chore(release): version 1.1.0"
   git tag -a v1.1.0 -m "Release version 1.1.0"
   git push origin main --tags
   ```

**Learn More**: [Version Management Guide](.github/prompts/versioning.prompt.md)

---

## Best Practices

### Data Modeling

**DO**:
- ✅ Use single responsibility principle (one object = one concept)
- ✅ Normalize data (avoid duplication)
- ✅ Use appropriate field types
- ✅ Add indexes to foreign keys and frequently queried fields

**DON'T**:
- ❌ Create "god objects" with 100+ mixed fields
- ❌ Duplicate data across objects
- ❌ Forget relationshipName on lookup fields
- ❌ Skip indexes on performance-critical fields

### Security

**Field-Level Security**:
```typescript
permissions: [{
  profile: 'hr_manager',
  fieldPermissions: {
    Salary: { read: true, edit: true }
  }
}]
```

**Row-Level Security**:
```typescript
recordAccess: {
  type: 'owner_based',
  ownerField: 'OwnerId'
}
```

### Performance

**Add Indexes**:
```typescript
indexes: [
  { fields: ['Status'] },                    // Filtered fields
  { fields: ['CreatedDate'], direction: 'desc' },  // Sort fields
  { fields: ['AccountId'] },                 // Foreign keys
  { fields: ['Status', 'CreatedDate'] }      // Composite
]
```

**Learn More**: [Best Practices Guide](.github/prompts/best-practices.prompt.md)

---

## Application Templates

Choose a template to start quickly:

### CRM Template
- Account, Contact, Opportunity, Lead
- Sales pipeline, marketing automation
- Customer service cases

### ERP Template
- Product, Inventory, Orders
- Procurement, sales, invoicing
- Supply chain management

### Project Management Template
- Project, Task, Sprint, Milestone
- Time tracking, resource management
- Gantt charts, kanban boards

**Learn More**: [Application Templates](.github/prompts/templates.prompt.md)

---

## Troubleshooting

### Common Issues

**Type Errors**:
```typescript
// ❌ Wrong field type
type: 'dropdown'

// ✅ Correct field type
type: 'select'
```

**Missing relationshipName**:
```typescript
// ❌ Missing
AccountId: {
  type: 'lookup',
  reference: 'account'
}

// ✅ Correct
AccountId: {
  type: 'lookup',
  reference: 'account',
  relationshipName: 'contacts'
}
```

**Workflow Not Triggering**:
```typescript
// ❌ Missing trigger
workflows: [{
  actions: [...]
}]

// ✅ Add trigger
workflows: [{
  trigger: { on: 'create' },
  actions: [...]
}]
```

**Learn More**: [Troubleshooting Guide](.github/prompts/troubleshooting.prompt.md)

---

## Development Commands

```bash
# Development
pnpm dev                    # Start dev server
pnpm dev:watch             # Watch mode

# Building
pnpm build                 # Build all packages
pnpm --filter @hotcrm/crm build  # Build specific package

# Testing
pnpm test                  # Run all tests
pnpm test:watch           # Watch mode

# Validation
node scripts/validate-protocol.js  # Validate metadata

# Linting
pnpm lint                  # Run ESLint
pnpm lint:fix             # Auto-fix
pnpm typecheck            # TypeScript check
```

---

## Quality Checklist

Before committing:

- [ ] All object names use snake_case
- [ ] All field names use PascalCase
- [ ] All relationships have relationshipName
- [ ] Validation rules have clear error messages
- [ ] Views have reasonable column counts
- [ ] TypeScript builds without errors (`pnpm build`)
- [ ] Tests pass (`pnpm test`)
- [ ] Protocol validation passes (`node scripts/validate-protocol.js`)
- [ ] No console errors in development

---

## Getting Help

### Documentation
- [ObjectStack Documentation](https://objectstack.dev/docs)
- [API Reference](https://objectstack.dev/api)
- [HotCRM README](./README.md)

### Community
- [GitHub Discussions](https://github.com/objectstack-ai/hotcrm/discussions)
- [GitHub Issues](https://github.com/objectstack-ai/hotcrm/issues)

### Contributing
- [Contributing Guide](./CONTRIBUTING.md)
- [Code of Conduct](./CODE_OF_CONDUCT.md)

---

## Next Steps

1. ✅ Read this guide
2. ✅ Review [Metadata Protocol](.github/prompts/metadata.prompt.md)
3. ✅ Choose an [Application Template](.github/prompts/templates.prompt.md)
4. ✅ Follow [Iterative Development](.github/prompts/iteration.prompt.md)
5. ✅ Apply [Best Practices](.github/prompts/best-practices.prompt.md)
6. ✅ Use [Troubleshooting](.github/prompts/troubleshooting.prompt.md) when needed

---

**Happy Coding! 🚀**
