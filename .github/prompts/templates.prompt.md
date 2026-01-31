# 📦 Application Templates

Ready-to-use templates for common ObjectStack applications.

---

## CRM Application Template

A complete Customer Relationship Management system.

### Application Configuration

```typescript
// File: objectstack.config.ts
import { defineStack } from '@objectstack/spec';
import { App } from '@objectstack/spec/ui';

// Import core CRM objects
import { Account } from './src/objects/account.object';
import { Contact } from './src/objects/contact.object';
import { Opportunity } from './src/objects/opportunity.object';
import { Lead } from './src/objects/lead.object';
import { Case } from './src/objects/case.object';
import { Task } from './src/objects/task.object';
import { Campaign } from './src/objects/campaign.object';

export default defineStack({
  manifest: {
    id: 'com.mycompany.crm',
    version: '1.0.0',
    type: 'app',
    name: 'CRM System',
    description: 'Enterprise Customer Relationship Management'
  },
  
  objects: [
    Account,
    Contact,
    Opportunity,
    Lead,
    Case,
    Task,
    Campaign
  ],
  
  apps: [
    App.create({
      name: 'crm_app',
      label: 'CRM',
      icon: 'users',
      description: 'Customer Relationship Management',
      
      navigation: [
        {
          id: 'sales',
          type: 'group',
          label: 'Sales',
          icon: 'trending-up',
          children: [
            { id: 'leads', type: 'object', objectName: 'lead', icon: 'user-plus' },
            { id: 'accounts', type: 'object', objectName: 'account', icon: 'building' },
            { id: 'contacts', type: 'object', objectName: 'contact', icon: 'users' },
            { id: 'opportunities', type: 'object', objectName: 'opportunity', icon: 'target' }
          ]
        },
        {
          id: 'marketing',
          type: 'group',
          label: 'Marketing',
          icon: 'megaphone',
          children: [
            { id: 'campaigns', type: 'object', objectName: 'campaign', icon: 'mail' }
          ]
        },
        {
          id: 'service',
          type: 'group',
          label: 'Service',
          icon: 'life-buoy',
          children: [
            { id: 'cases', type: 'object', objectName: 'case', icon: 'ticket' }
          ]
        },
        {
          id: 'activities',
          type: 'group',
          label: 'Activities',
          icon: 'calendar',
          children: [
            { id: 'tasks', type: 'object', objectName: 'task', icon: 'check-square' }
          ]
        }
      ]
    })
  ]
});
```

### Core Objects

**1. Account (Customer Company)**
```typescript
export const Account: ObjectDefinition = {
  name: 'account',
  label: 'Account',
  labelPlural: 'Accounts',
  icon: 'building',
  description: 'Customer companies and organizations',
  
  fields: {
    Name: { type: 'text', label: 'Account Name', required: true, maxLength: 255 },
    Type: {
      type: 'select',
      label: 'Account Type',
      options: [
        { value: 'customer', label: 'Customer' },
        { value: 'partner', label: 'Partner' },
        { value: 'prospect', label: 'Prospect' }
      ]
    },
    Industry: { type: 'select', label: 'Industry', options: [...] },
    AnnualRevenue: { type: 'currency', label: 'Annual Revenue', min: 0 },
    NumberOfEmployees: { type: 'number', label: 'Employees', min: 0 },
    Website: { type: 'url', label: 'Website' },
    Phone: { type: 'phone', label: 'Phone' },
    BillingAddress: { type: 'address', label: 'Billing Address' },
    ShippingAddress: { type: 'address', label: 'Shipping Address' }
  },
  
  enable: {
    trackHistory: true,
    apiEnabled: true,
    searchEnabled: true,
    activities: true,
    feeds: true
  }
};
```

**2. Contact (Person)**
```typescript
export const Contact: ObjectDefinition = {
  name: 'contact',
  label: 'Contact',
  labelPlural: 'Contacts',
  
  fields: {
    FirstName: { type: 'text', label: 'First Name', required: true },
    LastName: { type: 'text', label: 'Last Name', required: true },
    Email: { type: 'email', label: 'Email', unique: true },
    Phone: { type: 'phone', label: 'Phone' },
    Title: { type: 'text', label: 'Job Title' },
    AccountId: {
      type: 'lookup',
      label: 'Account',
      reference: 'account',
      relationshipName: 'contacts'
    }
  }
};
```

**3. Opportunity (Sales Deal)**
```typescript
export const Opportunity: ObjectDefinition = {
  name: 'opportunity',
  label: 'Opportunity',
  labelPlural: 'Opportunities',
  
  fields: {
    Name: { type: 'text', label: 'Opportunity Name', required: true },
    AccountId: {
      type: 'lookup',
      label: 'Account',
      reference: 'account',
      relationshipName: 'opportunities',
      required: true
    },
    Amount: { type: 'currency', label: 'Amount', min: 0 },
    CloseDate: { type: 'date', label: 'Close Date', required: true },
    Stage: {
      type: 'select',
      label: 'Stage',
      options: [
        { value: 'prospecting', label: 'Prospecting' },
        { value: 'qualification', label: 'Qualification' },
        { value: 'proposal', label: 'Proposal' },
        { value: 'negotiation', label: 'Negotiation' },
        { value: 'closed_won', label: 'Closed Won' },
        { value: 'closed_lost', label: 'Closed Lost' }
      ],
      required: true
    },
    Probability: {
      type: 'formula',
      returnType: 'percent',
      formula: `
        CASE(Stage,
          'prospecting', 10,
          'qualification', 25,
          'proposal', 50,
          'negotiation', 75,
          'closed_won', 100,
          'closed_lost', 0,
          0
        )
      `
    }
  },
  
  views: [{
    type: 'list',
    name: 'pipeline',
    viewType: 'kanban',
    label: 'Sales Pipeline',
    groupBy: 'Stage',
    cardFields: ['Name', 'AccountId', 'Amount', 'CloseDate']
  }]
};
```

---

## ERP Application Template

Enterprise Resource Planning system for manufacturing/distribution.

### Application Configuration

```typescript
export default defineStack({
  manifest: {
    id: 'com.mycompany.erp',
    version: '1.0.0',
    type: 'app',
    name: 'ERP System'
  },
  
  objects: [
    Product,
    Inventory,
    PurchaseOrder,
    SalesOrder,
    Supplier,
    Customer,
    Invoice
  ],
  
  apps: [
    App.create({
      name: 'erp_app',
      label: 'ERP',
      icon: 'package',
      
      navigation: [
        {
          id: 'procurement',
          type: 'group',
          label: 'Procurement',
          children: [
            { id: 'suppliers', type: 'object', objectName: 'supplier' },
            { id: 'purchase_orders', type: 'object', objectName: 'purchase_order' }
          ]
        },
        {
          id: 'inventory',
          type: 'group',
          label: 'Inventory',
          children: [
            { id: 'products', type: 'object', objectName: 'product' },
            { id: 'inventory', type: 'object', objectName: 'inventory' }
          ]
        },
        {
          id: 'sales',
          type: 'group',
          label: 'Sales',
          children: [
            { id: 'customers', type: 'object', objectName: 'customer' },
            { id: 'sales_orders', type: 'object', objectName: 'sales_order' },
            { id: 'invoices', type: 'object', objectName: 'invoice' }
          ]
        }
      ]
    })
  ]
});
```

### Core Objects

**1. Product**
```typescript
export const Product: ObjectDefinition = {
  name: 'product',
  label: 'Product',
  
  fields: {
    Name: { type: 'text', label: 'Product Name', required: true },
    SKU: {
      type: 'text',
      label: 'SKU',
      required: true,
      unique: true,
      maxLength: 50
    },
    Description: { type: 'textarea', label: 'Description' },
    Category: { type: 'select', label: 'Category', options: [...] },
    UnitPrice: { type: 'currency', label: 'Unit Price', min: 0 },
    Cost: { type: 'currency', label: 'Cost', min: 0 },
    IsActive: { type: 'boolean', label: 'Active', defaultValue: true }
  },
  
  indexes: [
    { fields: ['SKU'], unique: true }
  ]
};
```

**2. Inventory**
```typescript
export const Inventory: ObjectDefinition = {
  name: 'inventory',
  label: 'Inventory',
  
  fields: {
    ProductId: {
      type: 'lookup',
      label: 'Product',
      reference: 'product',
      relationshipName: 'inventoryRecords',
      required: true
    },
    Warehouse: { type: 'select', label: 'Warehouse', options: [...] },
    QuantityOnHand: { type: 'number', label: 'Quantity On Hand', min: 0 },
    QuantityReserved: { type: 'number', label: 'Quantity Reserved', min: 0 },
    QuantityAvailable: {
      type: 'formula',
      returnType: 'number',
      formula: 'QuantityOnHand - QuantityReserved'
    },
    ReorderPoint: { type: 'number', label: 'Reorder Point', min: 0 },
    ReorderQuantity: { type: 'number', label: 'Reorder Quantity', min: 0 }
  },
  
  workflows: [{
    type: 'fieldUpdate',
    name: 'low_stock_alert',
    trigger: {
      on: 'update',
      when: 'QuantityAvailable <= ReorderPoint'
    },
    actions: [{
      type: 'sendEmail',
      template: 'low_stock_alert',
      to: 'purchasing@company.com'
    }]
  }]
};
```

**3. Sales Order**
```typescript
export const SalesOrder: ObjectDefinition = {
  name: 'sales_order',
  label: 'Sales Order',
  
  fields: {
    OrderNumber: {
      type: 'autoNumber',
      label: 'Order Number',
      format: 'SO-{0000}',
      startingNumber: 1
    },
    CustomerId: {
      type: 'lookup',
      label: 'Customer',
      reference: 'customer',
      relationshipName: 'salesOrders',
      required: true
    },
    OrderDate: { type: 'date', label: 'Order Date', required: true },
    Status: {
      type: 'select',
      label: 'Status',
      options: [
        { value: 'draft', label: 'Draft' },
        { value: 'confirmed', label: 'Confirmed' },
        { value: 'shipped', label: 'Shipped' },
        { value: 'delivered', label: 'Delivered' },
        { value: 'cancelled', label: 'Cancelled' }
      ],
      defaultValue: 'draft'
    },
    TotalAmount: {
      type: 'summary',
      label: 'Total Amount',
      summarizedObject: 'sales_order_item',
      summarizedField: 'LineTotal',
      summaryType: 'sum'
    }
  }
};
```

---

## Project Management Template

For teams managing projects and tasks.

### Application Configuration

```typescript
export default defineStack({
  manifest: {
    id: 'com.mycompany.pm',
    version: '1.0.0',
    type: 'app',
    name: 'Project Management'
  },
  
  objects: [
    Project,
    Task,
    Milestone,
    TimeEntry,
    TeamMember,
    Sprint
  ],
  
  apps: [
    App.create({
      name: 'pm_app',
      label: 'Projects',
      icon: 'briefcase',
      
      navigation: [
        { id: 'projects', type: 'object', objectName: 'project' },
        { id: 'tasks', type: 'object', objectName: 'task' },
        { id: 'sprints', type: 'object', objectName: 'sprint' },
        { id: 'milestones', type: 'object', objectName: 'milestone' },
        { id: 'team', type: 'object', objectName: 'team_member' },
        { id: 'time_tracking', type: 'object', objectName: 'time_entry' }
      ]
    })
  ]
});
```

### Core Objects

**1. Project**
```typescript
export const Project: ObjectDefinition = {
  name: 'project',
  label: 'Project',
  
  fields: {
    Name: { type: 'text', label: 'Project Name', required: true },
    Description: { type: 'textarea', label: 'Description' },
    Status: {
      type: 'select',
      label: 'Status',
      options: [
        { value: 'planning', label: 'Planning' },
        { value: 'active', label: 'Active' },
        { value: 'on_hold', label: 'On Hold' },
        { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' }
      ]
    },
    StartDate: { type: 'date', label: 'Start Date' },
    EndDate: { type: 'date', label: 'End Date' },
    Budget: { type: 'currency', label: 'Budget' },
    ActualCost: {
      type: 'summary',
      label: 'Actual Cost',
      summarizedObject: 'time_entry',
      summarizedField: 'BillableAmount',
      summaryType: 'sum'
    }
  },
  
  views: [{
    type: 'list',
    name: 'gantt_view',
    viewType: 'gantt',
    label: 'Project Timeline',
    startDateField: 'StartDate',
    endDateField: 'EndDate',
    titleField: 'Name'
  }]
};
```

**2. Task**
```typescript
export const Task: ObjectDefinition = {
  name: 'task',
  label: 'Task',
  
  fields: {
    Subject: { type: 'text', label: 'Subject', required: true },
    Description: { type: 'textarea', label: 'Description' },
    ProjectId: {
      type: 'lookup',
      label: 'Project',
      reference: 'project',
      relationshipName: 'tasks',
      required: true
    },
    AssignedTo: {
      type: 'lookup',
      label: 'Assigned To',
      reference: 'user',
      relationshipName: 'assignedTasks'
    },
    Status: {
      type: 'select',
      label: 'Status',
      options: [
        { value: 'not_started', label: 'Not Started' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'blocked', label: 'Blocked' },
        { value: 'completed', label: 'Completed' }
      ]
    },
    Priority: {
      type: 'select',
      label: 'Priority',
      options: [
        { value: 'low', label: 'Low' },
        { value: 'medium', label: 'Medium' },
        { value: 'high', label: 'High' },
        { value: 'critical', label: 'Critical' }
      ]
    },
    DueDate: { type: 'date', label: 'Due Date' },
    EstimatedHours: { type: 'number', label: 'Estimated Hours' },
    ActualHours: {
      type: 'summary',
      label: 'Actual Hours',
      summarizedObject: 'time_entry',
      summarizedField: 'Hours',
      summaryType: 'sum'
    }
  },
  
  views: [
    {
      type: 'list',
      name: 'task_board',
      viewType: 'kanban',
      label: 'Task Board',
      groupBy: 'Status',
      cardFields: ['Subject', 'AssignedTo', 'Priority', 'DueDate']
    },
    {
      type: 'list',
      name: 'task_calendar',
      viewType: 'calendar',
      label: 'Task Calendar',
      dateField: 'DueDate',
      titleField: 'Subject'
    }
  ]
};
```

---

## E-Commerce Template

For online retail businesses.

### Core Objects

**1. Product Catalog**
**2. Shopping Cart**
**3. Order Management**
**4. Customer Management**
**5. Inventory Tracking**

---

## Healthcare Template

For medical practices and clinics.

### Core Objects

**1. Patient**
**2. Appointment**
**3. Medical Record**
**4. Prescription**
**5. Billing**

---

## Template Selection Guide

| Template | Best For | Core Features |
|----------|----------|---------------|
| CRM | B2B Sales, Customer Service | Leads, Accounts, Opportunities, Cases |
| ERP | Manufacturing, Distribution | Products, Inventory, Orders, Invoicing |
| Project Management | Software Teams, Agencies | Projects, Tasks, Sprints, Time Tracking |
| E-Commerce | Online Retail | Product Catalog, Cart, Orders, Payments |
| Healthcare | Medical Practices | Patients, Appointments, Records, Billing |

---

## Customization Guide

### 1. Start with Template
```bash
# Clone template
git clone https://github.com/objectstack/templates/crm
cd crm
pnpm install
```

### 2. Customize Objects
```typescript
// Modify objects in src/objects/
// Add fields, change labels, etc.
```

### 3. Add Custom Objects
```typescript
// Create new object files
// src/objects/my_custom_object.object.ts
export const MyCustomObject: ObjectDefinition = {
  // ...
};
```

### 4. Update Configuration
```typescript
// objectstack.config.ts
import { MyCustomObject } from './src/objects/my_custom_object.object';

export default defineStack({
  objects: [
    ...existingObjects,
    MyCustomObject  // Add to list
  ]
});
```

---

## Related Guides

- [Development Workflow](./workflow.prompt.md)
- [Iterative Development](./iteration.prompt.md)
- [Best Practices](./best-practices.prompt.md)
