# 🚀 AI Quick Reference

Quick lookup guide for AI agents developing ObjectStack applications.

---

## Decision Tree

When receiving a user requirement, use this tree to determine what to create:

```
User Requirement
    │
    ├─ Need to store data? → Create *.object.ts
    ├─ Need to display list? → Add views in object
    ├─ Need custom action? → Create *.action.ts
    ├─ Need data validation? → Add validations in object
    ├─ Need automated process? → Add workflows in object
    ├─ Need data analysis? → Create *.dashboard.ts or *.report.ts
    ├─ Need AI functionality? → Create *.agent.ts
    └─ Need custom page? → Create *.page.ts
```

---

## File Creation Quick Lookup

| User Requirement | Create File | Example Filename |
|-----------------|-------------|------------------|
| Customer management | `*.object.ts` | `customer.object.ts` |
| Product list display | Configure views in object | (within object file) |
| "Export" button | `*.action.ts` | `export_data.action.ts` |
| Sales dashboard | `*.dashboard.ts` | `sales_dashboard.dashboard.ts` |
| Monthly sales report | `*.report.ts` | `monthly_sales.report.ts` |
| Approval flow | `*.flow.ts` | `approval_flow.flow.ts` |
| Support AI assistant | `*.agent.ts` | `support_agent.agent.ts` |
| Auto-send email | Add workflows in object | (within object file) |
| Permission control | Add permissions in object | (within object file) |

---

## Object Definition Templates

### Basic Object Template

```typescript
import type { ObjectDefinition } from '@objectstack/spec/data';

export const MyObject: ObjectDefinition = {
  name: 'my_object',           // snake_case
  label: 'My Object',
  labelPlural: 'My Objects',
  description: 'Description of this object',
  
  fields: {
    Name: {
      type: 'text',
      label: 'Name',
      required: true,
      maxLength: 255
    },
    // ... more fields
  },
  
  enable: {
    trackHistory: true,
    apiEnabled: true,
    searchEnabled: true
  }
};

export default MyObject;
```

### Object with Relationships

```typescript
import type { ObjectDefinition } from '@objectstack/spec/data';

export const Contact: ObjectDefinition = {
  name: 'contact',
  label: 'Contact',
  
  fields: {
    FirstName: { 
      type: 'text', 
      label: 'First Name',
      required: true 
    },
    LastName: { 
      type: 'text', 
      label: 'Last Name',
      required: true 
    },
    
    // Lookup relationship (many-to-one)
    AccountId: {
      type: 'lookup',
      label: 'Account',
      reference: 'account',
      relationshipName: 'contacts',  // account.contacts
      required: true
    },
    
    // Formula field
    FullName: {
      type: 'formula',
      label: 'Full Name',
      returnType: 'text',
      formula: 'FirstName + " " + LastName'
    }
  },
  
  // List views
  views: [
    {
      type: 'list',
      name: 'all_contacts',
      viewType: 'grid',
      label: 'All Contacts',
      columns: ['FullName', 'AccountId', 'Email', 'Phone'],
      defaultSort: { field: 'LastName', direction: 'asc' }
    }
  ]
};

export default Contact;
```

### Object with Validation and Workflow

```typescript
import type { ObjectDefinition } from '@objectstack/spec/data';

export const Opportunity: ObjectDefinition = {
  name: 'opportunity',
  label: 'Opportunity',
  
  fields: {
    Name: { 
      type: 'text', 
      label: 'Name',
      required: true 
    },
    Amount: { 
      type: 'currency', 
      label: 'Amount',
      required: true 
    },
    Stage: {
      type: 'select',
      label: 'Stage',
      options: [
        { value: 'prospecting', label: 'Prospecting' },
        { value: 'qualification', label: 'Qualification' },
        { value: 'proposal', label: 'Proposal' },
        { value: 'closed_won', label: 'Closed Won' },
        { value: 'closed_lost', label: 'Closed Lost' }
      ],
      defaultValue: 'prospecting'
    }
  },
  
  // Validation rules
  validations: [
    {
      type: 'script',
      name: 'amount_positive',
      errorMessage: 'Amount must be greater than 0',
      formula: 'Amount > 0'
    }
  ],
  
  // Workflow automation
  workflows: [
    {
      type: 'field_update',
      name: 'auto_set_win_date',
      trigger: {
        on: 'update',
        when: 'Stage == "closed_won"'
      },
      actions: [
        {
          type: 'update_field',
          field: 'ActualCloseDate',
          value: '$Today'
        }
      ]
    }
  ]
};

export default Opportunity;
```

---

## Field Types Quick Reference

### Common Field Configurations

```typescript
// Text field
Name: {
  type: 'text',
  label: 'Name',
  required: true,
  maxLength: 255,
  unique: true
}

// Email field
Email: {
  type: 'email',
  label: 'Email',
  required: true,
  unique: true
}

// Number field
Quantity: {
  type: 'number',
  label: 'Quantity',
  min: 0,
  max: 9999,
  precision: 0  // integer
}

// Currency field
Price: {
  type: 'currency',
  label: 'Price',
  required: true,
  min: 0,
  precision: 2
}

// Date field
DueDate: {
  type: 'date',
  label: 'Due Date',
  required: true
}

// DateTime field
CreatedAt: {
  type: 'datetime',
  label: 'Created At',
  defaultValue: '$Now'
}

// Boolean field
IsActive: {
  type: 'boolean',
  label: 'Active',
  defaultValue: true
}

// Select field
Status: {
  type: 'select',
  label: 'Status',
  options: [
    { value: 'draft', label: 'Draft', color: 'gray' },
    { value: 'active', label: 'Active', color: 'green' }
  ],
  defaultValue: 'draft'
}

// Lookup relationship field
AccountId: {
  type: 'lookup',
  label: 'Account',
  reference: 'account',
  relationshipName: 'contacts',
  required: true
}

// Master-Detail relationship field
ParentId: {
  type: 'masterDetail',
  label: 'Parent Account',
  reference: 'account',
  relationshipName: 'children'
}

// Formula field
TotalAmount: {
  type: 'formula',
  label: 'Total Amount',
  returnType: 'currency',
  formula: 'Quantity * Price * (1 - Discount / 100)'
}

// Auto-number field
AccountNumber: {
  type: 'autoNumber',
  label: 'Account Number',
  format: 'ACC-{0000}',
  startingNumber: 1
}

// Rollup Summary field (on parent object)
TotalValue: {
  type: 'rollupSummary',
  label: 'Total Value',
  reference: 'opportunity',
  field: 'Amount',
  operation: 'sum',
  filter: 'Stage == "closed_won"'
}
```

---

## Validation Rule Templates

```typescript
validations: [
  // Script validation
  {
    type: 'script',
    name: 'amount_positive',
    errorMessage: 'Amount must be greater than 0',
    formula: 'Amount > 0',
    errorField: 'Amount'
  },
  
  // Uniqueness validation
  {
    type: 'uniqueness',
    fields: ['Email'],
    errorMessage: 'Email must be unique',
    scope: 'global'
  },
  
  // Date range validation
  {
    type: 'script',
    name: 'end_after_start',
    errorMessage: 'End date must be after start date',
    formula: 'EndDate > StartDate'
  },
  
  // State machine validation
  {
    type: 'state_machine',
    field: 'Status',
    transitions: [
      { from: 'draft', to: ['submitted'] },
      { from: 'submitted', to: ['approved', 'rejected'] },
      { from: 'approved', to: ['active'] }
    ]
  }
]
```

---

## Workflow Templates

```typescript
workflows: [
  // Field update
  {
    type: 'field_update',
    name: 'set_close_date',
    trigger: {
      on: 'update',
      when: 'Stage == "closed_won"'
    },
    actions: [
      { 
        type: 'update_field', 
        field: 'CloseDate', 
        value: '$Today' 
      }
    ]
  },
  
  // Send email
  {
    type: 'email_alert',
    name: 'notify_manager',
    trigger: {
      on: 'create',
      when: 'Amount > 100000'
    },
    actions: [
      {
        type: 'send_email',
        template: 'high_value_opportunity',
        to: '$Manager'
      }
    ]
  },
  
  // Create related record
  {
    type: 'record_create',
    name: 'create_task',
    trigger: {
      on: 'update',
      when: 'Status == "new"'
    },
    actions: [
      {
        type: 'create_record',
        object: 'task',
        fields: {
          Subject: 'Follow up: ' + Name,
          RelatedToId: '$RecordId',
          OwnerId: '$OwnerId'
        }
      }
    ]
  }
]
```

---

## View Configuration Templates

### Grid View

```typescript
{
  type: 'list',
  name: 'all_records',
  viewType: 'grid',
  label: 'All Records',
  columns: ['Name', 'Status', 'CreatedDate', 'OwnerId'],
  defaultSort: { field: 'CreatedDate', direction: 'desc' },
  filters: [
    {
      field: 'Status',
      operator: 'equals',
      value: 'active'
    }
  ]
}
```

### Kanban View

```typescript
{
  type: 'list',
  name: 'opportunity_kanban',
  viewType: 'kanban',
  label: 'Sales Pipeline',
  groupBy: 'Stage',
  cardFields: ['Name', 'Amount', 'AccountId'],
  sumField: 'Amount'
}
```

### Calendar View

```typescript
{
  type: 'list',
  name: 'task_calendar',
  viewType: 'calendar',
  label: 'Task Calendar',
  dateField: 'DueDate',
  titleField: 'Subject',
  colorField: 'Priority'
}
```

---

## Dashboard Template

```typescript
import type { DashboardDefinition } from '@objectstack/spec/ui';

export const SalesDashboard: DashboardDefinition = {
  name: 'sales_dashboard',
  label: 'Sales Dashboard',
  
  layout: {
    type: 'grid',
    columns: 12
  },
  
  widgets: [
    // Metric widget
    {
      type: 'metric',
      title: 'Total Revenue',
      object: 'opportunity',
      aggregation: 'sum',
      field: 'Amount',
      size: { w: 3, h: 2 },
      position: { x: 0, y: 0 }
    },
    
    // Chart widget
    {
      type: 'chart',
      title: 'Revenue by Month',
      chartType: 'line',
      object: 'opportunity',
      groupBy: { field: 'CloseDate', interval: 'month' },
      aggregations: [
        { field: 'Amount', function: 'sum', label: 'Revenue' }
      ],
      size: { w: 6, h: 4 },
      position: { x: 0, y: 2 }
    },
    
    // Funnel widget
    {
      type: 'chart',
      title: 'Sales Funnel',
      chartType: 'funnel',
      object: 'opportunity',
      groupBy: { field: 'Stage' },
      aggregations: [
        { field: 'Amount', function: 'sum', label: 'Value' }
      ],
      size: { w: 6, h: 4 },
      position: { x: 6, y: 2 }
    }
  ]
};

export default SalesDashboard;
```

---

## Action Definition Template

```typescript
import type { ActionDefinition } from '@objectstack/spec/ui';

export const CloneRecord: ActionDefinition = {
  name: 'clone_record',
  label: 'Clone',
  type: 'script',
  icon: 'copy',
  context: 'record',
  script: `
    const newRecord = {...currentRecord};
    delete newRecord.Id;
    newRecord.Name = newRecord.Name + ' (Copy)';
    return createRecord(objectName, newRecord);
  `
};

export default CloneRecord;
```

---

## Permission Configuration Template

```typescript
permissions: [
  {
    profile: 'sales_manager',
    objectPermissions: {
      create: true,
      read: true,
      update: true,
      delete: true
    },
    fieldPermissions: {
      '*': { read: true, edit: true }
    }
  },
  {
    profile: 'sales_rep',
    objectPermissions: {
      create: true,
      read: true,
      update: true,
      delete: false
    },
    recordAccess: {
      type: 'owner_based',
      ownerField: 'OwnerId'
    },
    fieldPermissions: {
      'Amount': { read: true, edit: false },
      'Discount': { read: true, edit: false }
    }
  }
]
```

---

## System Variables

System variables can be used in formulas, default values, and workflow actions:

```typescript
// Current user
OwnerId: { defaultValue: '$CurrentUser' }

// Current date/time
CreatedDate: { defaultValue: '$Today' }
CreatedDateTime: { defaultValue: '$Now' }

// Date calculations
DueDate: { defaultValue: '$Today + 7' }  // 7 days later
ReminderDate: { defaultValue: '$Today - 1' }  // Yesterday

// In formulas
formula: 'CloseDate > $Today'
formula: 'OwnerId == $CurrentUser'

// In workflows
value: '$Today'
value: '$Now'
value: '$CurrentUser'
value: '$RecordId'
value: '$OwnerId'
value: '$Manager'
```

---

## Naming Conventions

**CRITICAL: Follow these naming conventions strictly**

```typescript
// ✅ CORRECT

// Filename: snake_case
// customer_account.object.ts

// Object name: snake_case
name: 'customer_account'

// Field names (PascalCase)
fields: {
  FirstName: { ... },
  AccountName: { ... },
  AnnualRevenue: { ... }
}

// Config properties: camelCase
maxLength: 255
defaultValue: 'draft'
relationshipName: 'contacts'

// Type constant exports: PascalCase
export const CustomerAccount: ObjectDefinition = ...
```

```typescript
// ❌ INCORRECT

// Wrong object name (should be snake_case)
name: 'customerAccount'  // WRONG
name: 'CustomerAccount'  // WRONG

// Wrong field names (should be PascalCase)
fields: {
  firstName: { ... },      // WRONG
  account_name: { ... },   // WRONG
}

// Wrong config properties (should be camelCase)
max_length: 255           // WRONG
default_value: 'draft'    // WRONG
```

---

## Debugging Checklist

When issues arise, check in order:

- [ ] File suffix correct? (`*.object.ts`, `*.view.ts`, etc.)
- [ ] Import statements correct? (from `@objectstack/spec/...`)
- [ ] Type annotation added? (`: ObjectDefinition`)
- [ ] Object name using snake_case? (`name: 'my_object'`)
- [ ] Field names using PascalCase? (`FirstName`, `AccountId`)
- [ ] Config keys using camelCase? (`maxLength`, `defaultValue`)
- [ ] Relationship fields have `relationshipName`?
- [ ] Validation rules have `errorMessage`?
- [ ] Workflows have explicit `trigger`?
- [ ] Views specify `columns` or `fields`?
- [ ] TypeScript compilation passes? (`pnpm tsc --noEmit`)

---

## Quick Commands

### Development

```bash
# Install dependencies
pnpm install

# Type check
pnpm tsc --noEmit

# Build
pnpm build

# Run development server
pnpm dev

# Run tests
pnpm test

# Lint code
pnpm lint

# Format code
pnpm format
```

### Validation

```bash
# Validate protocol compliance
node scripts/validate-protocol.js

# Check object definitions
pnpm validate:objects

# Verify field types
pnpm validate:fields
```

### Package Management

```bash
# Add dependency
pnpm add <package>

# Add dev dependency
pnpm add -D <package>

# Update dependencies
pnpm update

# Clean install
pnpm clean && pnpm install
```

---

## Common Patterns

### Pattern: Header-Detail Relationship

```typescript
// Parent: Order
export const Order: ObjectDefinition = {
  name: 'order',
  label: 'Order',
  fields: {
    OrderNumber: { type: 'autoNumber', format: 'ORD-{0000}' },
    TotalAmount: {
      type: 'rollupSummary',
      reference: 'order_line',
      field: 'LineTotal',
      operation: 'sum'
    }
  }
};

// Child: OrderLine
export const OrderLine: ObjectDefinition = {
  name: 'order_line',
  label: 'Order Line',
  fields: {
    OrderId: {
      type: 'masterDetail',
      reference: 'order',
      relationshipName: 'lines'
    },
    Quantity: { type: 'number' },
    UnitPrice: { type: 'currency' },
    LineTotal: {
      type: 'formula',
      returnType: 'currency',
      formula: 'Quantity * UnitPrice'
    }
  }
};
```

### Pattern: Status Lifecycle

```typescript
export const Task: ObjectDefinition = {
  name: 'task',
  label: 'Task',
  fields: {
    Status: {
      type: 'select',
      options: [
        { value: 'not_started', label: 'Not Started' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' }
      ]
    }
  },
  validations: [
    {
      type: 'state_machine',
      field: 'Status',
      transitions: [
        { from: 'not_started', to: ['in_progress', 'cancelled'] },
        { from: 'in_progress', to: ['completed', 'cancelled'] }
      ]
    }
  ],
  workflows: [
    {
      type: 'field_update',
      name: 'set_completion_date',
      trigger: {
        on: 'update',
        when: 'Status == "completed"'
      },
      actions: [
        { type: 'update_field', field: 'CompletedDate', value: '$Today' }
      ]
    }
  ]
};
```

### Pattern: Approval Process

```typescript
export const ExpenseReport: ObjectDefinition = {
  name: 'expense_report',
  label: 'Expense Report',
  fields: {
    TotalAmount: { type: 'currency' },
    ApprovalStatus: {
      type: 'select',
      options: [
        { value: 'draft', label: 'Draft' },
        { value: 'submitted', label: 'Submitted' },
        { value: 'approved', label: 'Approved' },
        { value: 'rejected', label: 'Rejected' }
      ]
    }
  },
  workflows: [
    {
      type: 'approval_process',
      name: 'expense_approval',
      trigger: {
        on: 'update',
        when: 'ApprovalStatus == "submitted" && TotalAmount > 1000'
      },
      approvers: [
        { role: 'manager', field: 'ManagerId' }
      ],
      onApprove: [
        { type: 'update_field', field: 'ApprovalStatus', value: 'approved' }
      ],
      onReject: [
        { type: 'update_field', field: 'ApprovalStatus', value: 'rejected' }
      ]
    }
  ]
};
```

---

## Best Practices

### 1. Object Design

- **Use descriptive names**: `customer_account` not `ca`
- **Keep it normalized**: Don't duplicate data across objects
- **Plan relationships**: Use lookup for optional, masterDetail for required parent-child

### 2. Field Design

- **Set appropriate defaults**: Use `$Today`, `$CurrentUser` where applicable
- **Add help text**: Provide guidance for users
- **Use formulas**: Calculate values instead of storing them when possible
- **Validate early**: Add validation rules to prevent bad data

### 3. Views and UI

- **Start with standard views**: Grid, Kanban, Calendar cover most needs
- **Use meaningful labels**: Clear, user-friendly text
- **Limit columns**: Show only essential fields in list views
- **Add filters**: Help users find what they need quickly

### 4. Automation

- **Keep workflows simple**: One workflow = one responsibility
- **Use clear trigger conditions**: Make it obvious when workflow fires
- **Test thoroughly**: Verify workflows don't create loops
- **Document complex logic**: Add comments for future maintainers

### 5. Performance

- **Add indexes**: On frequently queried fields
- **Use rollup summaries**: Instead of querying children
- **Limit formula complexity**: Keep formulas readable and fast
- **Paginate large lists**: Use reasonable page sizes

---

## Quick Tips

1. **Always import types**: `import type { ObjectDefinition } from '@objectstack/spec/data'`
2. **Export as default**: `export default MyObject;`
3. **Use PascalCase for fields**: `FirstName`, `AccountId`, `TotalAmount`
4. **Use snake_case for object names**: `customer_account`, `order_line`
5. **Test incrementally**: Validate each object as you create it
6. **Follow the protocol**: Check `@objectstack/spec` for latest schema
7. **Use validation script**: `node scripts/validate-protocol.js`
8. **Commit often**: Small, focused commits are easier to review

---

## Resources

- **ObjectStack Spec**: `@objectstack/spec` package documentation
- **File Suffix Protocol**: `.github/prompts/metadata.prompt.md`
- **Project Structure**: `.github/prompts/project-structure.prompt.md`
- **Capabilities Guide**: `.github/prompts/capabilities.prompt.md`
- **Testing Guide**: `.github/prompts/testing.prompt.md`

---

**Remember**: Configuration over Code. Use metadata-driven patterns whenever possible. Only write custom code when the platform doesn't provide the needed capability.
