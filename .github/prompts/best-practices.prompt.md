# ✨ Best Practices Guide

Comprehensive best practices for building high-quality ObjectStack applications.

---

## Data Modeling Best Practices

### 1. Object Design Principles

#### Single Responsibility Principle

Each object should represent ONE business concept.

```typescript
// ✅ GOOD: Single responsibility
export const Customer: ObjectDefinition = {
  name: 'customer',
  label: 'Customer',
  fields: {
    // Only customer-related fields
    Name: { type: 'text', label: 'Company Name' },
    Industry: { type: 'select', label: 'Industry' },
    AnnualRevenue: { type: 'currency', label: 'Annual Revenue' }
  }
};

// ❌ BAD: Mixed responsibilities
export const CustomerAndOrder: ObjectDefinition = {
  name: 'customer_and_order',
  fields: {
    CompanyName: { type: 'text' },
    OrderTotal: { type: 'currency' },      // Should be in Order object
    ProductSKU: { type: 'text' },          // Should be in Product object
    ShippingAddress: { type: 'textarea' }   // Mixed concerns
  }
};
```

#### Normalize Your Data

Avoid data duplication by using relationships.

```typescript
// ✅ GOOD: Normalized
export const Contact: ObjectDefinition = {
  name: 'contact',
  fields: {
    FirstName: { type: 'text', label: 'First Name' },
    LastName: { type: 'text', label: 'Last Name' },
    AccountId: {                          // Reference to Account
      type: 'lookup',
      reference: 'account',
      relationshipName: 'contacts'
    }
  }
};

// ❌ BAD: Denormalized
export const Contact: ObjectDefinition = {
  name: 'contact',
  fields: {
    FirstName: { type: 'text' },
    LastName: { type: 'text' },
    AccountName: { type: 'text' },        // Duplicates Account.Name
    AccountIndustry: { type: 'text' },    // Duplicates Account.Industry
    AccountRevenue: { type: 'currency' }  // Duplicates Account.AnnualRevenue
  }
};
```

### 2. Relationship Design Patterns

#### Pattern 1: Lookup (Many-to-One)

Use for optional or independent relationships.

```typescript
// Many Contacts belong to one Account
export const Contact: ObjectDefinition = {
  name: 'contact',
  fields: {
    AccountId: {
      type: 'lookup',
      label: 'Account',
      reference: 'account',
      relationshipName: 'contacts',  // Enables Account.contacts
      required: false                // Optional relationship
    }
  }
};
```

**When to use:**
- Child can exist without parent
- Parent deletion shouldn't affect children
- Flexible relationships

#### Pattern 2: Master-Detail (One-to-Many with Cascade)

Use for tight parent-child relationships.

```typescript
// Order Items must belong to an Order
export const OrderItem: ObjectDefinition = {
  name: 'order_item',
  fields: {
    OrderId: {
      type: 'masterDetail',
      label: 'Order',
      reference: 'order',
      relationshipName: 'items',
      required: true,                // Must have parent
      cascadeDelete: true            // Deleted with parent
    }
  }
};
```

**When to use:**
- Child meaningless without parent
- Parent deletion should cascade
- Tight coupling required

#### Pattern 3: Many-to-Many (Junction Object)

Use for flexible many-to-many relationships.

```typescript
// Products can have many Categories, Categories can have many Products
export const ProductCategory: ObjectDefinition = {
  name: 'product_category',
  label: 'Product Category',
  fields: {
    ProductId: {
      type: 'lookup',
      label: 'Product',
      reference: 'product',
      required: true
    },
    CategoryId: {
      type: 'lookup',
      label: 'Category',
      reference: 'category',
      required: true
    }
  },
  indexes: [
    // Prevent duplicate associations
    { fields: ['ProductId', 'CategoryId'], unique: true }
  ]
};
```

**When to use:**
- Both sides have multiple associations
- Need to store additional attributes on relationship
- Flexible associations

### 3. Field Design Best Practices

#### Use Appropriate Field Types

```typescript
fields: {
  // Text - Short strings
  Name: { 
    type: 'text', 
    maxLength: 255,
    searchable: true           // Enable search
  },
  
  // Textarea - Long text
  Description: { 
    type: 'textarea', 
    maxLength: 5000,
    rows: 5                    // UI hint
  },
  
  // Email - Automatic validation
  Email: { 
    type: 'email',
    unique: true               // Prevent duplicates
  },
  
  // Currency - Financial data
  Amount: { 
    type: 'currency',
    min: 0,                    // No negative amounts
    precision: 2,              // 2 decimal places
    currency: 'USD'            // Default currency
  },
  
  // Percent - Normalized 0-100
  Probability: { 
    type: 'percent',
    min: 0,
    max: 100
  },
  
  // Boolean - True/false
  IsActive: { 
    type: 'boolean',
    defaultValue: true         // Default to active
  },
  
  // Select - Predefined options
  Status: {
    type: 'select',
    options: [
      { value: 'draft', label: 'Draft' },
      { value: 'active', label: 'Active' },
      { value: 'archived', label: 'Archived' }
    ],
    defaultValue: 'draft'
  },
  
  // Date - Day precision
  DueDate: { 
    type: 'date',
    min: 'TODAY()'             // Can't be in past
  },
  
  // DateTime - Full timestamp
  CreatedAt: { 
    type: 'datetime',
    defaultValue: 'NOW()',     // Auto-populate
    readonly: true             // Can't modify
  }
}
```

#### Field Naming Conventions

```typescript
// ✅ GOOD: PascalCase for field names
fields: {
  FirstName: { type: 'text' },
  LastName: { type: 'text' },
  AccountId: { type: 'lookup' },
  AnnualRevenue: { type: 'currency' },
  IsActive: { type: 'boolean' }
}

// ❌ BAD: Inconsistent naming
fields: {
  first_name: { type: 'text' },        // snake_case
  lastName: { type: 'text' },          // camelCase
  account_id: { type: 'lookup' },      // snake_case
  AnnualRevenue: { type: 'currency' }, // PascalCase (correct)
  active: { type: 'boolean' }          // lowercase
}
```

### 4. Performance Optimization

#### Index Strategy

Add indexes to improve query performance.

```typescript
export const Order: ObjectDefinition = {
  name: 'order',
  fields: {
    OrderNumber: { type: 'text' },
    CustomerId: { type: 'lookup', reference: 'customer' },
    Status: { type: 'select' },
    CreatedDate: { type: 'datetime' },
    TotalAmount: { type: 'currency' }
  },
  
  indexes: [
    // Unique index for business keys
    { fields: ['OrderNumber'], unique: true },
    
    // Foreign key indexes
    { fields: ['CustomerId'] },
    
    // Frequently filtered fields
    { fields: ['Status'] },
    
    // Sort fields
    { fields: ['CreatedDate'], direction: 'desc' },
    
    // Composite indexes for common queries
    { fields: ['CustomerId', 'Status'] },
    { fields: ['Status', 'CreatedDate'] }
  ]
};
```

**When to add indexes:**
- ✅ Foreign keys (lookup fields)
- ✅ Frequently filtered fields
- ✅ Frequently sorted fields
- ✅ Unique constraints
- ✅ Common query combinations

**When NOT to add indexes:**
- ❌ Fields rarely queried
- ❌ Fields with very low cardinality (e.g., boolean)
- ❌ Very large text fields
- ❌ Rapidly changing fields

#### Field Selection Optimization

```typescript
// ✅ GOOD: Query only needed fields
views: [{
  type: 'list',
  name: 'order_list',
  columns: [
    'OrderNumber',
    'CustomerId',
    'TotalAmount',
    'Status',
    'CreatedDate'
  ]
  // Only these fields are queried
}]

// ❌ BAD: Avoid large fields in list views
views: [{
  type: 'list',
  columns: [
    'OrderNumber',
    'DetailedDescription',  // Large textarea
    'LegalTerms',           // Large html
    'Attachments'           // File field
  ]
}]
```

---

## Security Best Practices

### 1. Field-Level Security

Control who can see and edit specific fields.

```typescript
export const Employee: ObjectDefinition = {
  name: 'employee',
  fields: {
    Name: { type: 'text', label: 'Name' },
    Email: { type: 'email', label: 'Email' },
    Salary: { 
      type: 'currency',
      label: 'Salary',
      encrypted: true        // Encrypt at rest
    },
    SSN: {
      type: 'text',
      label: 'Social Security Number',
      encrypted: true,
      masked: true           // Show only last 4 digits
    }
  },
  
  permissions: [
    {
      profile: 'hr_manager',
      fieldPermissions: {
        Salary: { read: true, edit: true },
        SSN: { read: true, edit: false }
      }
    },
    {
      profile: 'regular_user',
      fieldPermissions: {
        Salary: { read: false, edit: false },  // Hidden
        SSN: { read: false, edit: false }      // Hidden
      }
    }
  ]
};
```

### 2. Row-Level Security

Control which records users can access.

```typescript
export const Opportunity: ObjectDefinition = {
  name: 'opportunity',
  
  permissions: [
    {
      profile: 'sales_rep',
      objectPermissions: {
        create: true,
        read: true,
        update: true,
        delete: false
      },
      // RLS: Only see own opportunities
      recordAccess: {
        type: 'owner_based',
        ownerField: 'OwnerId'
      }
    },
    {
      profile: 'sales_manager',
      objectPermissions: {
        create: true,
        read: true,
        update: true,
        delete: true
      },
      // RLS: See team's opportunities
      recordAccess: {
        type: 'role_based',
        viewSubordinates: true
      }
    },
    {
      profile: 'executive',
      objectPermissions: {
        create: true,
        read: true,
        update: true,
        delete: true
      },
      // RLS: See all opportunities
      recordAccess: {
        type: 'all'
      }
    }
  ]
};
```

### 3. Validation for Security

Prevent malicious data entry.

```typescript
validations: [
  // Prevent XSS in text fields
  {
    type: 'script',
    name: 'no_html_tags',
    formula: 'NOT(CONTAINS(Name, "<script"))',
    errorMessage: 'HTML tags are not allowed'
  },
  
  // Ensure safe URLs
  {
    type: 'script',
    name: 'safe_url',
    formula: 'BEGINS(Website, "https://")',
    errorMessage: 'Only HTTPS URLs are allowed'
  },
  
  // Limit file uploads
  {
    type: 'script',
    name: 'file_size_limit',
    formula: 'FileSize <= 10485760',  // 10MB
    errorMessage: 'File size must be less than 10MB'
  }
]
```

---

## User Experience Best Practices

### 1. Form Layout Optimization

Group related fields for better UX.

```typescript
pageLayout: {
  type: 'tabbed',
  tabs: [
    {
      label: 'Overview',
      sections: [
        {
          label: 'Basic Information',
          columns: 2,
          fields: [
            'Name',
            'Industry',
            'Website',
            'Phone',
            'Email',
            'Type'
          ]
        },
        {
          label: 'Financial Information',
          columns: 2,
          fields: [
            'AnnualRevenue',
            'EmployeeCount',
            'TickerSymbol',
            'Ownership'
          ]
        }
      ]
    },
    {
      label: 'Address Information',
      sections: [
        {
          label: 'Billing Address',
          columns: 2,
          fields: [
            'BillingStreet',
            'BillingCity',
            'BillingState',
            'BillingZip',
            'BillingCountry'
          ]
        },
        {
          label: 'Shipping Address',
          columns: 2,
          fields: [
            'ShippingStreet',
            'ShippingCity',
            'ShippingState',
            'ShippingZip',
            'ShippingCountry'
          ],
          actions: [
            {
              name: 'copy_billing',
              label: 'Copy from Billing',
              type: 'button'
            }
          ]
        }
      ]
    },
    {
      label: 'Additional Information',
      sections: [
        {
          label: 'Description',
          columns: 1,
          fields: ['Description']
        }
      ]
    }
  ]
}
```

**Layout Best Practices:**
- Use 2 columns for most forms
- Use 1 column for large text fields
- Group related fields in sections
- Use tabs to organize complex forms
- Limit to 5-7 sections per tab

### 2. Defaults and Auto-population

Make data entry easier with smart defaults.

```typescript
fields: {
  // Default values
  Status: {
    type: 'select',
    options: ['Draft', 'Active', 'Archived'],
    defaultValue: 'Draft'
  },
  
  // System-generated defaults
  CreatedDate: {
    type: 'datetime',
    defaultValue: 'NOW()',
    readonly: true
  },
  
  // Current user
  OwnerId: {
    type: 'lookup',
    reference: 'user',
    defaultValue: '$CurrentUser'
  },
  
  // Calculated defaults
  ExpirationDate: {
    type: 'date',
    defaultValue: 'TODAY() + 30'  // 30 days from now
  }
}
```

### 3. Helpful Error Messages

Write clear, actionable error messages.

```typescript
validations: [
  // ✅ GOOD: Clear and actionable
  {
    type: 'script',
    name: 'amount_required_for_closed_won',
    formula: 'IF(Stage == "Closed Won", Amount != null, true)',
    errorMessage: 'Please enter the Amount before marking as Closed Won',
    errorField: 'Amount'
  },
  
  // ❌ BAD: Vague error
  {
    type: 'script',
    name: 'validation_1',
    formula: 'IF(Stage == "Closed Won", Amount != null, true)',
    errorMessage: 'Validation failed'
  }
]
```

---

## Code Quality Best Practices

### 1. Type Safety

Always use proper TypeScript types.

```typescript
// ✅ GOOD: Typed definition
import type { ObjectDefinition } from '@objectstack/spec/data';

export const Account: ObjectDefinition = {
  name: 'account',
  label: 'Account',
  fields: {
    Name: { type: 'text', required: true }
  }
};

export default Account;

// ❌ BAD: Untyped
export default {
  name: 'account',
  label: 'Account',
  fields: {
    Name: { type: 'text', required: true }
  }
};  // Type is 'any', no validation!
```

### 2. File Organization

Follow the file suffix protocol.

```
src/
├── objects/
│   ├── account.object.ts
│   ├── contact.object.ts
│   └── opportunity.object.ts
├── hooks/
│   ├── account.hook.ts
│   └── opportunity.hook.ts
├── actions/
│   ├── convert_lead.action.ts
│   └── send_quote.action.ts
├── dashboards/
│   └── sales_dashboard.dashboard.ts
└── reports/
    └── pipeline_report.report.ts
```

### 3. Documentation

Document complex logic and business rules.

```typescript
export const Opportunity: ObjectDefinition = {
  name: 'opportunity',
  description: 'Sales opportunities in the pipeline',
  
  fields: {
    /**
     * Probability calculation based on stage:
     * - Prospecting: 10%
     * - Qualification: 25%
     * - Proposal: 50%
     * - Negotiation: 75%
     * - Closed Won: 100%
     * - Closed Lost: 0%
     */
    Probability: {
      type: 'formula',
      label: 'Probability %',
      returnType: 'percent',
      formula: `
        CASE(Stage,
          'Prospecting', 10,
          'Qualification', 25,
          'Proposal', 50,
          'Negotiation', 75,
          'Closed Won', 100,
          'Closed Lost', 0,
          0
        )
      `
    }
  }
};
```

---

## Common Pitfalls to Avoid

### 1. Data Modeling Pitfalls

```typescript
// ❌ DON'T: Create God objects
const Everything: ObjectDefinition = {
  name: 'everything',
  fields: {
    // 100+ fields mixing multiple concerns
  }
};

// ✅ DO: Split into focused objects
const Account: ObjectDefinition = { /* ... */ };
const Contact: ObjectDefinition = { /* ... */ };
const Opportunity: ObjectDefinition = { /* ... */ };
```

### 2. Relationship Pitfalls

```typescript
// ❌ DON'T: Forget relationshipName
AccountId: {
  type: 'lookup',
  reference: 'account'
  // Missing relationshipName!
}

// ✅ DO: Always include relationshipName
AccountId: {
  type: 'lookup',
  reference: 'account',
  relationshipName: 'contacts'  // Enables Account.contacts
}
```

### 3. Validation Pitfalls

```typescript
// ❌ DON'T: Put business logic in validations
validations: [{
  type: 'script',
  formula: 'IF(Stage == "Closed Won", SendEmail == true, true)',
  errorMessage: 'Must send email when closing'
}]

// ✅ DO: Use workflows for business logic
workflows: [{
  trigger: { on: 'update', when: 'Stage == "Closed Won"' },
  actions: [{ type: 'sendEmail', template: 'won_notification' }]
}]
```

### 4. Performance Pitfalls

```typescript
// ❌ DON'T: Missing indexes on foreign keys
fields: {
  AccountId: { type: 'lookup', reference: 'account' }
}
// No index! Queries will be slow.

// ✅ DO: Add indexes
fields: {
  AccountId: { type: 'lookup', reference: 'account' }
},
indexes: [
  { fields: ['AccountId'] }  // Index foreign keys
]
```

---

## Testing Best Practices

```typescript
// Test object definitions
describe('Account Object', () => {
  it('should have required fields', () => {
    expect(Account.fields.Name.required).toBe(true);
  });
  
  it('should validate properly', () => {
    const validation = Account.validations.find(v => v.name === 'unique_email');
    expect(validation).toBeDefined();
  });
});

// Test workflows
describe('Opportunity Workflows', () => {
  it('should auto-assign owner on create', async () => {
    const opp = await createOpportunity({ Name: 'Test Opp' });
    expect(opp.OwnerId).toBe(currentUser.id);
  });
});
```

---

## Related Guides

- [Development Workflow](./workflow.prompt.md)
- [Iterative Development](./iteration.prompt.md)
- [Version Management](./versioning.prompt.md)
- [Troubleshooting](./troubleshooting.prompt.md)
