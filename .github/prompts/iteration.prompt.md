# 📈 Iterative Development Strategy

MVP-focused development path for building ObjectStack applications incrementally.

---

## Philosophy: Build in Iterations, Not All at Once

**Why Iterative Development?**
- Faster feedback cycles
- Early validation of assumptions
- Reduced risk of major rework
- Progressive complexity management
- Better stakeholder engagement

---

## MVP Development Path (5-Week Cycle)

### Iteration 1: Core Objects (Week 1)

**Goal**: Establish basic data model with minimal viable fields.

**Focus**: Get the foundation right with CRUD operations.

#### What to Build

```typescript
// Identify 3-5 core objects
// CRM Example: Account, Contact, Opportunity
// ERP Example: Product, Order, Inventory
// Project Management: Project, Task, Milestone

// Create minimal field set for each object
export const Account: ObjectDefinition = {
  name: 'account',
  label: 'Account',
  labelPlural: 'Accounts',
  
  fields: {
    // Essential fields only
    Name: { 
      type: 'text', 
      label: 'Account Name',
      required: true,
      maxLength: 255
    },
    Status: {
      type: 'select',
      label: 'Status',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' }
      ],
      defaultValue: 'active'
    }
  },
  
  // Basic views only
  views: [
    {
      type: 'list',
      name: 'all',
      viewType: 'grid',
      label: 'All Accounts',
      columns: ['Name', 'Status', 'CreatedDate']
    }
  ]
};
```

#### Validation Criteria

- [ ] All objects support Create, Read, Update, Delete
- [ ] List views display correctly
- [ ] Field types render properly (text, select, date, etc.)
- [ ] Can navigate between related objects
- [ ] No TypeScript build errors
- [ ] Basic search works

#### Time Allocation

- Object modeling: 40%
- View configuration: 30%
- Testing: 20%
- Documentation: 10%

---

### Iteration 2: Relationships & Validation (Week 2)

**Goal**: Establish object relationships and ensure data integrity.

**Focus**: Connect your data model and add guardrails.

#### What to Build

```typescript
// Add relationship fields
export const Contact: ObjectDefinition = {
  name: 'contact',
  label: 'Contact',
  
  fields: {
    FirstName: { type: 'text', label: 'First Name', required: true },
    LastName: { type: 'text', label: 'Last Name', required: true },
    Email: { type: 'email', label: 'Email' },
    
    // Add lookup relationship
    AccountId: {
      type: 'lookup',
      label: 'Account',
      reference: 'account',
      relationshipName: 'contacts',  // Enable Account.contacts
      required: true
    }
  },
  
  // Add validation rules
  validations: [
    {
      type: 'uniqueness',
      name: 'unique_email',
      fields: ['Email'],
      errorMessage: 'Email address must be unique'
    },
    {
      type: 'script',
      name: 'email_or_phone_required',
      formula: 'Email != null || Phone != null',
      errorMessage: 'Please provide either Email or Phone'
    }
  ],
  
  // Add indexes for performance
  indexes: [
    { fields: ['AccountId'] },
    { fields: ['Email'], unique: true }
  ]
};
```

#### Validation Criteria

- [ ] Relationship fields link correctly
- [ ] Can navigate from parent to children (e.g., Account → Contacts)
- [ ] Validation rules trigger on save
- [ ] Error messages are user-friendly
- [ ] Duplicate prevention works
- [ ] Related lists show up on detail pages

#### Common Patterns

**1. One-to-Many (Lookup)**
```typescript
// Contact belongs to Account
AccountId: {
  type: 'lookup',
  reference: 'account',
  relationshipName: 'contacts'
}
```

**2. One-to-Many (Master-Detail)**
```typescript
// Order Item belongs to Order (cascade delete)
OrderId: {
  type: 'masterDetail',
  reference: 'order',
  relationshipName: 'items',
  cascadeDelete: true
}
```

**3. Many-to-Many**
```typescript
// Create junction object
export const ProductCategory: ObjectDefinition = {
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

---

### Iteration 3: Business Logic (Week 3)

**Goal**: Add automation, workflows, and calculated fields.

**Focus**: Make the system work smarter, not harder.

#### What to Build

```typescript
export const Opportunity: ObjectDefinition = {
  name: 'opportunity',
  label: 'Opportunity',
  
  fields: {
    Name: { type: 'text', label: 'Name', required: true },
    Amount: { type: 'currency', label: 'Amount', min: 0 },
    Stage: {
      type: 'select',
      label: 'Stage',
      options: [
        { value: 'prospecting', label: 'Prospecting' },
        { value: 'qualification', label: 'Qualification' },
        { value: 'proposal', label: 'Proposal' },
        { value: 'closed_won', label: 'Closed Won' },
        { value: 'closed_lost', label: 'Closed Lost' }
      ]
    },
    CloseDate: { type: 'date', label: 'Close Date', required: true },
    
    // Add formula fields
    DaysToClose: {
      type: 'formula',
      label: 'Days to Close',
      returnType: 'number',
      formula: 'DAYS(CloseDate, TODAY())'
    },
    Probability: {
      type: 'formula',
      label: 'Probability',
      returnType: 'percent',
      formula: `
        CASE(Stage,
          'prospecting', 10,
          'qualification', 25,
          'proposal', 75,
          'closed_won', 100,
          'closed_lost', 0,
          0
        )
      `
    }
  },
  
  // Add workflows
  workflows: [
    {
      type: 'fieldUpdate',
      name: 'auto_assign_owner',
      trigger: { on: 'create' },
      actions: [
        {
          type: 'updateField',
          field: 'OwnerId',
          value: '$CurrentUser'
        }
      ]
    },
    {
      type: 'fieldUpdate',
      name: 'send_won_notification',
      trigger: {
        on: 'update',
        when: 'Stage == "closed_won" && PRIORVALUE(Stage) != "closed_won"'
      },
      actions: [
        {
          type: 'sendEmail',
          template: 'opportunity_won',
          to: '$Owner'
        },
        {
          type: 'createRecord',
          object: 'task',
          fields: {
            Subject: 'Follow up with customer',
            Status: 'Not Started',
            Priority: 'High'
          }
        }
      ]
    }
  ]
};
```

#### Validation Criteria

- [ ] Workflows trigger automatically
- [ ] Formula fields calculate correctly
- [ ] Workflow actions execute in correct order
- [ ] Email notifications send properly
- [ ] Record creation works from workflows
- [ ] No infinite loops in automation

#### Business Logic Patterns

**Auto-Assignment**
```typescript
workflows: [{
  trigger: { on: 'create' },
  actions: [{
    type: 'updateField',
    field: 'OwnerId',
    value: '$CurrentUser'
  }]
}]
```

**Stage-Based Actions**
```typescript
workflows: [{
  trigger: {
    on: 'update',
    when: 'Stage == "closed_won"'
  },
  actions: [
    { type: 'sendEmail', template: 'won_notification' },
    { type: 'createRecord', object: 'contract' }
  ]
}]
```

**Time-Based Actions**
```typescript
workflows: [{
  trigger: {
    type: 'scheduled',
    schedule: 'daily',
    when: 'DueDate == TODAY()'
  },
  actions: [{
    type: 'sendEmail',
    template: 'due_reminder'
  }]
}]
```

---

### Iteration 4: UI Enhancement (Week 4)

**Goal**: Optimize user experience with multiple view types and custom actions.

**Focus**: Make the system delightful to use.

#### What to Build

```typescript
export const Task: ObjectDefinition = {
  name: 'task',
  label: 'Task',
  
  fields: {
    Subject: { type: 'text', label: 'Subject', required: true },
    Status: { type: 'select', label: 'Status', options: [...] },
    Priority: { type: 'select', label: 'Priority', options: [...] },
    DueDate: { type: 'date', label: 'Due Date' }
  },
  
  // Multiple view types
  views: [
    // Grid view for data entry
    {
      type: 'list',
      name: 'all_tasks',
      viewType: 'grid',
      label: 'All Tasks',
      columns: ['Subject', 'Status', 'Priority', 'DueDate', 'OwnerId'],
      filters: [
        { field: 'Status', operator: '!=', value: 'Completed' }
      ],
      defaultSort: { field: 'DueDate', direction: 'asc' }
    },
    
    // Kanban view for visual management
    {
      type: 'list',
      name: 'task_board',
      viewType: 'kanban',
      label: 'Task Board',
      groupBy: 'Status',
      cardFields: ['Subject', 'Priority', 'DueDate'],
      sortBy: { field: 'Priority', direction: 'desc' }
    },
    
    // Calendar view for scheduling
    {
      type: 'list',
      name: 'task_calendar',
      viewType: 'calendar',
      label: 'Task Calendar',
      dateField: 'DueDate',
      titleField: 'Subject',
      colorField: 'Priority'
    }
  ],
  
  // Custom actions
  actions: [
    {
      name: 'complete_task',
      label: 'Mark Complete',
      type: 'update',
      fields: { Status: 'Completed' },
      icon: 'check',
      showInList: true
    },
    {
      name: 'delegate_task',
      label: 'Delegate',
      type: 'flow',
      flowName: 'task_delegation',
      icon: 'user-plus'
    }
  ],
  
  // Form layout with tabs
  pageLayout: {
    type: 'tabbed',
    tabs: [
      {
        label: 'Details',
        sections: [
          {
            label: 'Task Information',
            columns: 2,
            fields: ['Subject', 'Status', 'Priority', 'DueDate']
          },
          {
            label: 'Description',
            columns: 1,
            fields: ['Description']
          }
        ]
      },
      {
        label: 'Related',
        sections: [
          {
            label: 'Related To',
            columns: 2,
            fields: ['WhatId', 'WhoId']
          }
        ]
      }
    ]
  }
};
```

#### Validation Criteria

- [ ] Grid view shows all data clearly
- [ ] Kanban view groups correctly
- [ ] Calendar view displays events
- [ ] Custom actions execute properly
- [ ] Form layout is intuitive
- [ ] Mobile-responsive design works
- [ ] Loading states are smooth

#### UI Best Practices

**View Selection**:
- **Grid**: When users need to scan/edit many records
- **Kanban**: For status/stage-based workflows
- **Calendar**: For date/time-based records
- **Timeline**: For project/schedule visualization

**Column Limits**:
- Grid view: 5-7 columns max
- Kanban cards: 3-5 fields max
- Mobile view: 2-3 columns max

**Action Placement**:
- Common actions: Show in list view
- Contextual actions: Show on detail page
- Bulk actions: Show as list buttons

---

### Iteration 5: Advanced Features (Week 5+)

**Goal**: Add AI integration, advanced reports, and fine-grained permissions.

**Focus**: Differentiate with advanced capabilities.

#### What to Build

```typescript
// 1. AI Agent Integration
export const SalesAssistant = {
  name: 'sales_assistant',
  type: 'chat',
  label: 'Sales Assistant',
  description: 'AI assistant for sales questions and automation',
  
  capabilities: [
    'answer_questions',
    'create_records',
    'generate_insights',
    'recommend_actions'
  ],
  
  model: 'gpt-4',
  temperature: 0.7,
  
  systemPrompt: `
    You are a sales assistant for our CRM system.
    You can help with:
    - Answering questions about accounts, contacts, opportunities
    - Creating new records
    - Providing sales insights
    - Recommending next steps
  `,
  
  tools: [
    'create_opportunity',
    'search_accounts',
    'get_pipeline_report'
  ]
};

// 2. Advanced Reports
export const SalesPipeline = {
  type: 'report',
  name: 'sales_pipeline',
  label: 'Sales Pipeline Analysis',
  description: 'Detailed pipeline breakdown by stage and rep',
  
  reportType: 'matrix',
  objectName: 'opportunity',
  
  groupBy: [
    { field: 'Stage', sort: 'asc' },
    { field: 'OwnerId', sort: 'asc' }
  ],
  
  aggregations: [
    { field: 'Amount', function: 'sum', label: 'Total Amount' },
    { field: 'Id', function: 'count', label: 'Count' }
  ],
  
  filters: [
    { field: 'Status', operator: '=', value: 'Open' },
    { field: 'CloseDate', operator: '>=', value: 'THIS_QUARTER' }
  ],
  
  charts: [
    {
      type: 'bar',
      title: 'Pipeline by Stage',
      xAxis: 'Stage',
      yAxis: 'Amount'
    }
  ]
};

// 3. Fine-Grained Permissions
export const OpportunityPermissions = {
  object: 'opportunity',
  
  profiles: [
    {
      name: 'sales_rep',
      objectPermissions: {
        create: true,
        read: true,
        update: true,
        delete: false
      },
      fieldPermissions: {
        Amount: { read: true, edit: true },
        Commission: { read: false, edit: false }  // Hide sensitive field
      },
      recordAccess: {
        type: 'owner_based',
        ownerField: 'OwnerId'  // Only see own opportunities
      }
    },
    {
      name: 'sales_manager',
      objectPermissions: {
        create: true,
        read: true,
        update: true,
        delete: true
      },
      fieldPermissions: {
        Amount: { read: true, edit: true },
        Commission: { read: true, edit: true }  // Managers see everything
      },
      recordAccess: {
        type: 'role_based',
        viewSubordinates: true  // See team's opportunities
      }
    }
  ]
};
```

#### Validation Criteria

- [ ] AI agent responds accurately
- [ ] Reports generate correct data
- [ ] Charts visualize properly
- [ ] Permissions enforce correctly
- [ ] Field-level security works
- [ ] Row-level security works
- [ ] Performance is acceptable

---

## Iteration Checklist

Use this checklist at the end of each iteration:

### Data Quality
- [ ] All fields have clear labels
- [ ] Required fields marked appropriately
- [ ] Field types match data
- [ ] Default values set where appropriate

### Relationships
- [ ] All lookups have relationshipName
- [ ] Master-detail cascade configured
- [ ] Many-to-many uses junction objects
- [ ] Related lists display correctly

### Validation
- [ ] Validation rules have clear messages
- [ ] Error messages are actionable
- [ ] Edge cases are handled
- [ ] Uniqueness constraints work

### Workflows
- [ ] Triggers fire correctly
- [ ] Actions execute in order
- [ ] No infinite loops
- [ ] Error handling in place

### UI/UX
- [ ] Views configured appropriately
- [ ] Forms are intuitive
- [ ] Actions are accessible
- [ ] Mobile experience is good

### Performance
- [ ] Indexes on foreign keys
- [ ] Indexes on frequently queried fields
- [ ] No N+1 queries
- [ ] Page load times acceptable

### Documentation
- [ ] CHANGELOG.md updated
- [ ] Complex logic documented
- [ ] API changes noted
- [ ] Migration guide provided (if needed)

### Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing complete
- [ ] No console errors

---

## Iteration Metrics

Track these metrics to measure progress:

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Object completion | 100% | All fields defined |
| View coverage | 80%+ | Objects have list views |
| Validation coverage | 90%+ | Critical fields validated |
| Workflow automation | 70%+ | Common tasks automated |
| Test coverage | 80%+ | Code coverage report |
| Build time | < 30s | `pnpm build` duration |
| Type errors | 0 | `pnpm typecheck` |

---

## Common Pitfalls

### Week 1 Pitfalls
- ❌ Over-engineering the data model
- ❌ Adding too many fields initially
- ✅ Start simple, iterate later

### Week 2 Pitfalls
- ❌ Missing relationshipName on lookups
- ❌ No indexes on foreign keys
- ✅ Test relationships thoroughly

### Week 3 Pitfalls
- ❌ Creating workflow infinite loops
- ❌ No error handling in workflows
- ✅ Test automation edge cases

### Week 4 Pitfalls
- ❌ Too many columns in grid views
- ❌ No mobile optimization
- ✅ Test on multiple devices

### Week 5 Pitfalls
- ❌ Over-complicated AI prompts
- ❌ No permission testing
- ✅ Start with simple use cases

---

## Next Steps

After completing all iterations:

1. **User Acceptance Testing**: Get real user feedback
2. **Performance Optimization**: Profile and optimize slow queries
3. **Security Audit**: Review permissions and access controls
4. **Documentation**: Complete user guides and admin docs
5. **Deployment Planning**: Prepare for production release

**See Also**:
- [Development Workflow](./workflow.prompt.md)
- [Best Practices](./best-practices.prompt.md)
- [Version Management](./versioning.prompt.md)
