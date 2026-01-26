# @objectstack/spec Protocol Documentation

## Overview

The `@objectstack/spec` is a metadata-driven protocol for building enterprise applications. It defines a standard way to describe business objects, relationships, user interfaces, and business logic using declarative YAML/JSON files.

## Core Concepts

### 1. Metadata-Driven Architecture

All business objects (Account, Contact, Opportunity, etc.) are defined through YAML files with the `.object.yml` extension. This approach provides:

- **Declarative Configuration**: Define what you want, not how to build it
- **Version Control Friendly**: All metadata is in text files
- **AI-Friendly**: Easy for AI to understand and modify
- **Type Safety**: Schema validation ensures consistency

### 2. Object Definition Structure

```yaml
name: ObjectName          # API name of the object
label: Display Name       # User-facing label
labelPlural: Plural Name  # Plural form
icon: icon-name          # Icon identifier
description: Text        # Object description

# Features
features:
  searchable: true
  trackFieldHistory: true
  enableActivities: true
  enableNotes: true
  enableAttachments: true

# Fields
fields:
  - name: FieldName
    type: text|number|date|select|lookup|masterDetail|currency|...
    label: Field Label
    required: true|false
    unique: true|false
    searchable: true|false
    options: [...]       # For select fields
    referenceTo: Object  # For lookup/masterDetail fields
    defaultValue: value

# Relationships
relationships:
  - name: RelationshipName
    type: hasMany|belongsTo
    object: RelatedObject
    foreignKey: FieldName
    label: Display Label

# List Views
listViews:
  - name: ViewName
    label: Display Label
    filters: [...]
    columns: [...]
    sortBy: FieldName
    sortOrder: asc|desc

# Page Layout
pageLayout:
  sections:
    - label: Section Label
      columns: 1|2
      fields: [...]

# Validation Rules
validationRules:
  - name: RuleName
    errorMessage: Message
    formula: Formula Expression

# Triggers
triggers:
  - name: TriggerName
    event: beforeInsert|afterInsert|beforeUpdate|afterUpdate|beforeDelete|afterDelete
    file: path/to/trigger.ts
    conditions: [...]
```

### 3. Field Types

#### Basic Types
- `text`: String field (with length parameter)
- `textarea`: Multi-line text
- `number`: Numeric value
- `currency`: Money amount with precision
- `percent`: Percentage value
- `date`: Date only
- `datetime`: Date and time
- `time`: Time only
- `checkbox`: Boolean value

#### Complex Types
- `select`: Dropdown with predefined options
- `multiselect`: Multiple selection
- `lookup`: Reference to another object (foreign key)
- `masterDetail`: Parent-child relationship with cascade delete
- `autoNumber`: Auto-incrementing number with format
- `formula`: Calculated field based on expression
- `rollupSummary`: Aggregate from child records

#### Contact Types
- `email`: Email address with validation
- `phone`: Phone number
- `url`: Web address

### 4. ObjectQL (Object Query Language)

ObjectQL is a type-safe query language that replaces SQL with a more intuitive JSON/JavaScript syntax.

#### Basic Query

```typescript
const result = await db.query({
  object: 'Account',
  fields: ['Name', 'Industry', 'AnnualRevenue'],
  filters: {
    Industry: 'Technology',
    AnnualRevenue: { $gt: 10000000 }
  },
  orderBy: { field: 'AnnualRevenue', direction: 'desc' },
  limit: 50
});
```

#### Query with Relations

```typescript
const result = await db.query({
  object: 'Account',
  fields: ['Name', 'Industry'],
  related: {
    Opportunities: {
      fields: ['Name', 'Amount', 'Stage'],
      filters: {
        Stage: { $ne: 'Closed Lost' }
      }
    },
    Contacts: {
      fields: ['FirstName', 'LastName', 'Email']
    }
  }
});
```

#### Filter Operators

- `$eq`: Equals (default if no operator specified)
- `$ne`: Not equals
- `$gt`: Greater than
- `$gte`: Greater than or equal
- `$lt`: Less than
- `$lte`: Less than or equal
- `$in`: In array
- `$nin`: Not in array
- `$like`: Pattern matching
- `$between`: Between two values

#### CRUD Operations

```typescript
// Create
const record = await db.doc.create('Account', {
  Name: 'Acme Corp',
  Industry: 'Technology'
});

// Read
const account = await db.doc.get('Account', id, {
  fields: ['Name', 'Industry']
});

// Update
await db.doc.update('Account', id, {
  Industry: 'Finance'
});

// Delete
await db.doc.delete('Account', id);
```

### 5. Triggers

Triggers are TypeScript functions that execute when data changes occur.

#### Trigger Context

```typescript
interface TriggerContext {
  old?: Record<string, any>;  // Before state (updates/deletes)
  new: Record<string, any>;   // After state
  db: ObjectQLEngine;         // Database interface
  user: {                     // Current user
    id: string;
    name: string;
    email: string;
  };
  trigger: {
    object: string;
    event: string;
  };
}
```

#### Example Trigger

```typescript
export async function onOpportunityStageChange(ctx: TriggerContext) {
  if (ctx.new.Stage === 'Closed Won') {
    // Create contract
    await ctx.db.doc.create('Contract', {
      AccountId: ctx.new.AccountId,
      OpportunityId: ctx.new.Id,
      Status: 'Draft'
    });
    
    // Update account
    await ctx.db.doc.update('Account', ctx.new.AccountId, {
      CustomerStatus: 'Active Customer'
    });
  }
}
```

### 6. UI Engine (amis + Tailwind)

The UI is built using the amis low-code framework with Tailwind CSS for styling.

#### amis Schema Structure

```json
{
  "type": "page",
  "body": [
    {
      "type": "card",
      "className": "rounded-2xl shadow-sm",
      "body": [...]
    }
  ]
}
```

#### Design Principles

1. **Apple-inspired Aesthetics**
   - Large border radius (`rounded-xl`, `rounded-2xl`)
   - Subtle shadows (`shadow-sm`)
   - High contrast typography
   - Generous white space

2. **Tailwind CSS Classes**
   - `bg-gradient-to-br from-gray-50 to-gray-100`
   - `border border-gray-200`
   - `backdrop-blur-sm`
   - `hover:shadow-md transition-shadow duration-200`

3. **Component Types**
   - `card`: Container with styling
   - `grid`: Responsive grid layout
   - `service`: Data fetching
   - `chart`: Data visualization
   - `list`: Repeating items
   - `form`: Input forms

### 7. ObjectStack Actions

Actions are API endpoints that can be called from the UI or other systems.

#### Action Definition

```typescript
export interface ActionRequest {
  // Input parameters
}

export interface ActionResponse {
  // Output data
}

export async function executeAction(
  request: ActionRequest
): Promise<ActionResponse> {
  // Implementation
}
```

### 8. Validation Rules

Validation rules use formula expressions to enforce business logic.

#### Formula Syntax

- `AND(condition1, condition2)`: Logical AND
- `OR(condition1, condition2)`: Logical OR
- `NOT(condition)`: Logical NOT
- `ISBLANK(field)`: Check if field is empty
- `field > value`: Comparison
- `field = "value"`: String equality

#### Example Rules

```yaml
validationRules:
  - name: RequireIndustryForHighRevenue
    errorMessage: 年营收超过1000万的客户必须选择行业
    formula: |
      AND(
        AnnualRevenue > 10000000,
        ISBLANK(Industry)
      )
```

## Best Practices

### 1. Object Design

- **Keep objects focused**: Each object should represent a single business concept
- **Use meaningful names**: API names should be clear and consistent
- **Define relationships carefully**: Choose between lookup and master-detail based on cascade needs
- **Add indexes**: Mark frequently queried fields as `searchable`

### 2. Field Design

- **Required fields**: Only mark truly essential fields as required
- **Default values**: Provide sensible defaults to improve UX
- **Field length**: Set appropriate length limits
- **Validation**: Add validation rules for data quality

### 3. UI Design

- **Mobile-first**: Design for small screens first
- **Progressive disclosure**: Show most important info first
- **Consistent spacing**: Use Tailwind spacing scale
- **Loading states**: Always show loading indicators

### 4. Performance

- **Limit query results**: Use pagination for large datasets
- **Select specific fields**: Don't query fields you don't need
- **Index frequently filtered fields**: Mark as searchable
- **Cache when possible**: Use service workers for static data

### 5. Security

- **Row-level security**: Implement OwnerId checks
- **Field-level permissions**: Control who can see/edit fields
- **Audit trail**: Enable field history tracking
- **Input validation**: Never trust client input

## Integration with AI

The @objectstack/spec is designed to be AI-friendly:

1. **Declarative Syntax**: Easy for AI to parse and generate
2. **Structured Metadata**: Consistent format for all objects
3. **Natural Language Labels**: Human-readable field names
4. **Formula Language**: Expressions in pseudo-code
5. **Type Safety**: Explicit type definitions

This makes it easy for AI to:
- Generate new objects from natural language descriptions
- Suggest field additions based on similar objects
- Create validation rules from business requirements
- Build UI layouts automatically
- Write triggers for common patterns

## Conclusion

The @objectstack/spec protocol provides a complete framework for building enterprise applications in a metadata-driven way. By following this specification, you can create maintainable, scalable, and AI-friendly CRM systems like HotCRM.
