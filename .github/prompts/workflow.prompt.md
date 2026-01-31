# 🔄 ObjectStack Development Workflow

Complete development workflow guide for building ObjectStack applications.

---

## Development Philosophy

**Configuration > Low-Code > Pro-Code**

Prioritize declarative configuration over imperative code to maximize maintainability and minimize errors.

---

## Development Process

The development workflow follows three main phases optimized for efficiency and quality:

### Phase 1: Data Layer Development (60% effort)

**Goal**: Define the foundation - business objects, fields, relationships, and validation rules.

**Why 60%**: Getting the data model right is critical. Changes here are expensive later.

#### Step 1.1: Define Core Objects

```typescript
// File: src/objects/customer.object.ts
import type { ObjectDefinition } from '@objectstack/spec/data';

export const Customer: ObjectDefinition = {
  name: 'customer',              // snake_case
  label: 'Customer',
  labelPlural: 'Customers',
  description: 'Customer account information',
  
  fields: {
    Name: {                      // PascalCase for field names
      type: 'text',
      label: 'Company Name',
      required: true,
      maxLength: 255,
      searchable: true
    },
    // Add more fields...
  }
};

export default Customer;
```

**Checklist**:
- [ ] Object name uses snake_case
- [ ] Field names use PascalCase
- [ ] All fields have clear labels
- [ ] Required fields marked
- [ ] Field types are correct

#### Step 1.2: Add Field Definitions

**Common Field Patterns**:

```typescript
fields: {
  // Text fields
  Name: { type: 'text', label: 'Name', required: true, maxLength: 255 },
  Description: { type: 'textarea', label: 'Description', maxLength: 5000 },
  
  // Numbers and currency
  AnnualRevenue: { type: 'currency', label: 'Annual Revenue', min: 0 },
  EmployeeCount: { type: 'number', label: 'Employees', min: 1 },
  
  // Selections
  Industry: {
    type: 'select',
    label: 'Industry',
    options: [
      { value: 'tech', label: 'Technology' },
      { value: 'finance', label: 'Finance' },
      { value: 'retail', label: 'Retail' }
    ]
  },
  
  // Dates
  EstablishedDate: { type: 'date', label: 'Established Date' },
  LastContactDate: { type: 'datetime', label: 'Last Contact' },
  
  // Boolean
  IsActive: { type: 'boolean', label: 'Active', defaultValue: true }
}
```

#### Step 1.3: Define Relationships

**Relationship Patterns**:

```typescript
// Pattern 1: Lookup (many-to-one)
fields: {
  AccountId: {
    type: 'lookup',
    label: 'Account',
    reference: 'account',
    relationshipName: 'contacts',  // Required for reverse lookup
    required: true
  }
}

// Pattern 2: Master-Detail (cascade delete)
fields: {
  OrderId: {
    type: 'masterDetail',
    label: 'Order',
    reference: 'order',
    relationshipName: 'items',
    cascadeDelete: true            // Items deleted with Order
  }
}

// Pattern 3: Many-to-Many (via junction object)
// Create a junction object: product_category
const ProductCategory: ObjectDefinition = {
  name: 'product_category',
  fields: {
    ProductId: { type: 'lookup', reference: 'product' },
    CategoryId: { type: 'lookup', reference: 'category' }
  },
  indexes: [
    { fields: ['ProductId', 'CategoryId'], unique: true }
  ]
};
```

**Checklist**:
- [ ] All lookup fields have relationshipName
- [ ] Cascade delete configured where needed
- [ ] Many-to-many uses junction objects
- [ ] Indexes added for foreign keys

#### Step 1.4: Configure Object Features

```typescript
enable: {
  trackHistory: true,        // Track field changes
  apiEnabled: true,          // REST API access
  searchEnabled: true,       // Global search
  activities: true,          // Tasks, events, calls
  feeds: true,               // Chatter-like feeds
  files: true                // File attachments
}
```

---

### Phase 2: Business Logic Layer (20% effort)

**Goal**: Add validation rules, workflow automation, and permission control.

#### Step 2.1: Add Validation Rules

```typescript
validations: [
  // Uniqueness validation
  {
    type: 'uniqueness',
    name: 'unique_email',
    fields: ['Email'],
    errorMessage: 'Email address must be unique'
  },
  
  // Script validation
  {
    type: 'script',
    name: 'revenue_positive',
    formula: 'AnnualRevenue > 0',
    errorMessage: 'Revenue must be greater than 0',
    errorField: 'AnnualRevenue'
  },
  
  // Required field combination
  {
    type: 'script',
    name: 'contact_required',
    formula: 'Email != null || Phone != null',
    errorMessage: 'Either Email or Phone must be provided'
  }
]
```

**Validation Best Practices**:
- Always specify errorField for better UX
- Use clear, actionable error messages
- Test edge cases
- Validate data integrity, not business rules (use workflows for those)

#### Step 2.2: Add Workflows

```typescript
workflows: [
  // Auto-assign owner on creation
  {
    type: 'fieldUpdate',
    name: 'auto_assign_owner',
    trigger: {
      on: 'create'
    },
    actions: [
      {
        type: 'updateField',
        field: 'OwnerId',
        value: '$CurrentUser'
      }
    ]
  },
  
  // Update status on approval
  {
    type: 'fieldUpdate',
    name: 'activate_on_approval',
    trigger: {
      on: 'update',
      when: 'ApprovalStatus == "approved"'
    },
    actions: [
      {
        type: 'updateField',
        field: 'Status',
        value: 'active'
      },
      {
        type: 'sendEmail',
        template: 'approval_notification',
        to: '$Owner'
      }
    ]
  }
]
```

**Workflow Patterns**:
- Use for automation, not validation
- Keep trigger conditions simple
- Test thoroughly
- Document complex workflows

#### Step 2.3: Add Formula Fields

```typescript
fields: {
  // Simple concatenation
  FullName: {
    type: 'formula',
    label: 'Full Name',
    returnType: 'text',
    formula: 'FirstName + " " + LastName'
  },
  
  // Date calculation
  DaysUntilDue: {
    type: 'formula',
    label: 'Days Until Due',
    returnType: 'number',
    formula: 'DAYS(DueDate, TODAY())'
  },
  
  // Conditional logic
  PriorityLevel: {
    type: 'formula',
    label: 'Priority',
    returnType: 'text',
    formula: 'IF(Amount > 100000, "High", IF(Amount > 50000, "Medium", "Low"))'
  }
}
```

---

### Phase 3: UI Layer Development (20% effort)

**Goal**: Create views, actions, dashboards and optimize user experience.

#### Step 3.1: Configure List Views

```typescript
views: [
  // Grid view (default table view)
  {
    type: 'list',
    name: 'all_customers',
    viewType: 'grid',
    label: 'All Customers',
    columns: ['Name', 'Industry', 'AnnualRevenue', 'Status'],
    filters: [],
    defaultSort: { field: 'Name', direction: 'asc' }
  },
  
  // Kanban view (for status-based objects)
  {
    type: 'list',
    name: 'customer_pipeline',
    viewType: 'kanban',
    label: 'Customer Pipeline',
    groupBy: 'Status',
    cardFields: ['Name', 'Industry', 'AnnualRevenue'],
    sortBy: { field: 'CreatedDate', direction: 'desc' }
  },
  
  // Calendar view (for date-based objects)
  {
    type: 'list',
    name: 'events_calendar',
    viewType: 'calendar',
    label: 'Events Calendar',
    dateField: 'EventDate',
    endDateField: 'EndDate',
    titleField: 'Subject'
  }
]
```

**View Best Practices**:
- Show 5-7 columns in grid views (not too many)
- Use meaningful default sort
- Add filters for common queries
- Choose view type based on data characteristics

#### Step 3.2: Create Custom Actions

```typescript
actions: [
  {
    name: 'convert_lead',
    label: 'Convert to Customer',
    type: 'flow',
    description: 'Convert this lead to a customer account',
    icon: 'convert',
    confirmation: 'Are you sure you want to convert this lead?',
    successMessage: 'Lead converted successfully'
  },
  {
    name: 'send_quote',
    label: 'Send Quote',
    type: 'email',
    emailTemplate: 'quote_template',
    icon: 'email'
  }
]
```

#### Step 3.3: Design Form Layouts

```typescript
pageLayout: {
  type: 'tabbed',
  tabs: [
    {
      label: 'Details',
      sections: [
        {
          label: 'Basic Information',
          columns: 2,
          fields: ['Name', 'Industry', 'Website', 'Phone']
        },
        {
          label: 'Financial Information',
          columns: 2,
          fields: ['AnnualRevenue', 'EmployeeCount']
        }
      ]
    },
    {
      label: 'Address',
      sections: [
        {
          label: 'Billing Address',
          columns: 2,
          fields: ['BillingStreet', 'BillingCity', 'BillingState', 'BillingZip']
        },
        {
          label: 'Shipping Address',
          columns: 2,
          fields: ['ShippingStreet', 'ShippingCity', 'ShippingState', 'ShippingZip']
        }
      ]
    }
  ]
}
```

---

## Application Configuration

Every ObjectStack application needs a configuration file:

```typescript
// File: objectstack.config.ts
import { defineStack } from '@objectstack/spec';
import { App } from '@objectstack/spec/ui';

// Import objects
import { Account } from './src/objects/account.object';
import { Contact } from './src/objects/contact.object';
import { Opportunity } from './src/objects/opportunity.object';

export default defineStack({
  manifest: {
    id: 'com.mycompany.crm',
    version: '1.0.0',
    type: 'app',
    name: 'My CRM',
    description: 'Enterprise CRM application'
  },
  
  objects: [Account, Contact, Opportunity],
  
  apps: [
    App.create({
      name: 'crm_app',
      label: 'CRM',
      icon: 'users',
      navigation: [
        {
          id: 'sales',
          type: 'group',
          label: 'Sales',
          children: [
            { id: 'accounts', type: 'object', objectName: 'account' },
            { id: 'contacts', type: 'object', objectName: 'contact' },
            { id: 'opportunities', type: 'object', objectName: 'opportunity' }
          ]
        }
      ]
    })
  ]
});
```

---

## Development Commands

```bash
# Development
pnpm dev                          # Start development server
pnpm dev:watch                    # Watch mode with hot reload

# Building
pnpm build                        # Build all packages
pnpm build:core                   # Build core package only
pnpm --filter @app/crm build     # Build specific package

# Testing
pnpm test                         # Run all tests
pnpm test:watch                   # Watch mode
pnpm test -- path/to/test.ts     # Run specific test

# Linting
pnpm lint                         # Run ESLint
pnpm lint:fix                     # Auto-fix issues
pnpm typecheck                    # TypeScript check

# Validation
node scripts/validate-protocol.js # Validate metadata compliance
```

---

## Quality Checklist

Before committing, verify:

- [ ] All object names use snake_case
- [ ] All field names use PascalCase
- [ ] All relationships have relationshipName
- [ ] Validation rules have clear error messages
- [ ] Views have reasonable column counts
- [ ] TypeScript builds without errors
- [ ] Tests pass
- [ ] No console errors in development

---

## Common Patterns

### Auto-Number Fields

```typescript
fields: {
  AccountNumber: {
    type: 'autoNumber',
    label: 'Account Number',
    format: 'ACC-{0000}',
    startingNumber: 1
  }
}
```

### Dependent Picklists

```typescript
fields: {
  Country: {
    type: 'select',
    label: 'Country',
    options: [
      { value: 'US', label: 'United States' },
      { value: 'CA', label: 'Canada' }
    ]
  },
  State: {
    type: 'select',
    label: 'State',
    dependsOn: 'Country',
    options: {
      US: [
        { value: 'CA', label: 'California' },
        { value: 'NY', label: 'New York' }
      ],
      CA: [
        { value: 'ON', label: 'Ontario' },
        { value: 'BC', label: 'British Columbia' }
      ]
    }
  }
}
```

### Summary Fields (Roll-Up)

```typescript
fields: {
  TotalAmount: {
    type: 'summary',
    label: 'Total Amount',
    summarizedObject: 'order_item',
    summarizedField: 'Amount',
    summaryType: 'sum',
    filter: 'Status = "Active"'
  }
}
```

---

## Next Steps

1. Read [Iterative Development Strategy](./iteration.prompt.md)
2. Review [Best Practices Guide](./best-practices.prompt.md)
3. Check [Troubleshooting Guide](./troubleshooting.prompt.md)
4. See [Version Management](./versioning.prompt.md)
