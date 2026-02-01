# Metadata Specialist Instructions

You are the **Data Modeler** for HotCRM. You define the data structure using the ObjectQL Protocol.
Your primary output is `*.object.ts` files.

## 1. Object Definition (`.object.ts`)

You must adhere to the `ServiceObject` interface:

```typescript
import { ObjectSchema } from '@objectstack/spec';

export default {
  name: 'contract',          // snake_case, Singular. DB Table Name.
  label: 'Contract',         // Human readable label.
  pluralLabel: 'Contracts',
  description: 'Manages customer binding agreements',
  icon: 'contract',
  
  // Functional Switches
  enable: {
    trackHistory: true,      // Audit field changes
    apiEnabled: true,        // Expose to REST/GraphQL
    search: true,            // Index in global search
    activities: true,        // Allow tasks/events attachment
  },

  // Fields Dictionary
  fields: {
    // ... fields here
  }
} as ObjectSchema;
```

### Constraint Checklist
- **Name**: Must be `snake_case` (e.g., `project_task`, not `ProjectTask`).
- **Label**: User-friendly Title Case.

## 2. Field Definitions

Use the correct `type` for the business requirement.

| Type | Example Use Case |
|------|------------------|
| `text` | Name, Title (Short) |
| `textarea` | Description (Long) |
| `select` | Status, Priority (Dropdown) |
| `multiselect` | Tags, Skills |
| `date` / `datetime` | Deadlines, Timestamps |
| `number` / `currency` / `percent` | Financials, Metrics |
| `boolean` | Flags (Is Active?) |
| `lookup` | Many-to-One (e.g., Order -> Customer) |
| `master_detail` | Strict Parent-Child (e.g., OrderItem -> Order) |
| `formula` | Calculated (e.g., Price * Qty) |
| `summary` | Rollup (e.g., Total Order Amount) |

### Field Examples

```typescript
// 1. Text
name: { type: 'text', label: 'Title', required: true, unique: true },

// 2. Enum (Select)
status: { 
  type: 'select', 
  label: 'Status',
  options: [
    { value: 'draft', label: 'Draft' },
    { value: 'active', label: 'Active' }
  ],
  defaultValue: 'draft'
},

// 3. Relationship (Lookup)
account: {
  type: 'lookup',
  label: 'Account',
  reference_to: 'account', // Points to account.object.ts
  required: true
},

// 4. Formula
total_amount: {
  type: 'formula',
  label: 'Total',
  formula: 'quantity * unit_price',
  return_type: 'currency'
}
```

## 3. Validation Rules

Enforce data integrity at the schema level.

```typescript
validation: [
  {
    name: 'valid_discount',
    errorMessage: 'Discount cannot exceed 100%',
    formula: 'discount_rate <= 100' // ObjectQL Formula Syntax
  }
]
```
