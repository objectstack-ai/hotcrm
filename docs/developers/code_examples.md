# HotCRM Code Examples

> Practical code examples following HotCRM conventions.
> All examples use the `@objectstack/spec` type system and the File Suffix Protocol.

---

## Table of Contents

1. [Define a Business Object](#1-define-a-business-object)
2. [Write a Before Hook](#2-write-a-before-hook)
3. [Write an After Hook](#3-write-an-after-hook)
4. [Write an Action](#4-write-an-action)
5. [Define a Workflow Rule](#5-define-a-workflow-rule)
6. [Register Everything in plugin.ts](#6-register-everything-in-plugints)
7. [Use the Broker API (ObjectQL)](#7-use-the-broker-api-objectql)
8. [Add MCP Tools for AI Integration](#8-add-mcp-tools-for-ai-integration)

---

## 1. Define a Business Object

**File:** `packages/crm/src/warranty.object.ts`

```typescript
import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Warranty = ObjectSchema.create({
  name: 'warranty',
  label: 'Warranty',
  pluralLabel: 'Warranties',
  icon: 'shield',
  description: 'Product warranty tracking and claim management',

  fields: {
    warranty_number: Field.autonumber({
      label: 'Warranty Number',
      format: 'WR-{YYYY}-{0000}'
    }),
    account_id: Field.lookup('account', {
      label: 'Account',
      required: true
    }),
    product_id: Field.lookup('product', {
      label: 'Product',
      required: true
    }),
    status: Field.select({
      label: 'Status',
      required: true,
      defaultValue: 'active',
      options: [
        { label: '✅ Active', value: 'active' },
        { label: '⏰ Expiring Soon', value: 'expiring_soon' },
        { label: '❌ Expired', value: 'expired' },
        { label: '🔄 Claimed', value: 'claimed' }
      ]
    }),
    start_date: Field.date({
      label: 'Start Date',
      required: true
    }),
    end_date: Field.date({
      label: 'End Date',
      required: true
    }),
    coverage_type: Field.select({
      label: 'Coverage Type',
      options: [
        { label: 'Standard', value: 'standard' },
        { label: 'Extended', value: 'extended' },
        { label: 'Premium', value: 'premium' }
      ]
    }),
    claim_count: Field.number({
      label: 'Claim Count',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    max_claims: Field.number({
      label: 'Max Claims Allowed',
      defaultValue: 3,
      precision: 0
    }),
    notes: Field.textarea({
      label: 'Notes'
    }),
    owner_id: Field.lookup('users', {
      label: 'Owner',
      required: true,
      defaultValue: '$currentUser'
    })
  },

  enable: {
    searchable: true,
    trackHistory: true,
    activities: true,
    feeds: true,
    files: true
  },
});
```

### Key Conventions

- **File name:** Always `snake_case.object.ts`
- **Object name:** Always `snake_case` (e.g., `warranty`, `quote_line_item`)
- **Import:** `ObjectSchema` and `Field` from `@objectstack/spec/data`
- **Field types:** `text`, `textarea`, `number`, `currency`, `percent`, `date`, `datetime`, `email`, `phone`, `url`, `boolean`, `select`, `lookup`, `autonumber`, `formula`
- **Lookups:** `Field.lookup('target_object', { ... })` — always reference objects by name
- **Enable block:** Controls platform features (search, history, feeds, etc.)

---

## 2. Write a Before Hook

Before hooks run **before** a record is saved. Use them for validation, field computation, and data enrichment.

**File:** `packages/crm/src/hooks/warranty.hook.ts`

```typescript
import type { Hook, HookContext } from '@objectstack/spec/data';

/**
 * Warranty Validation Hook
 *
 * Runs before insert and update to validate business rules
 * and compute derived fields.
 */
export const WarrantyValidationHook: Hook = {
  name: 'WarrantyValidation',
  object: 'warranty',
  events: ['beforeInsert', 'beforeUpdate'],
  handler: async (ctx: HookContext) => {
    const doc = ctx.input.doc as Record<string, any>;

    // 1. Validate date range
    if (doc.start_date && doc.end_date) {
      if (new Date(doc.end_date) <= new Date(doc.start_date)) {
        throw new Error('Validation Error: End date must be after start date.');
      }
    }

    // 2. Prevent exceeding max claims
    if (doc.claim_count > doc.max_claims) {
      throw new Error(
        `Validation Error: Claim count (${doc.claim_count}) exceeds maximum allowed (${doc.max_claims}).`
      );
    }

    // 3. Auto-set status based on end date
    if (doc.end_date) {
      const today = new Date();
      const endDate = new Date(doc.end_date);
      const daysUntilExpiry = Math.ceil(
        (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilExpiry < 0) {
        doc.status = 'expired';
      } else if (daysUntilExpiry <= 30) {
        doc.status = 'expiring_soon';
      }
    }
  }
};
```

### Hook Events

| Event | When |
|-------|------|
| `beforeInsert` | Before a new record is created |
| `beforeUpdate` | Before an existing record is updated |
| `afterInsert` | After a new record is created |
| `afterUpdate` | After an existing record is updated |

### Key Patterns

- **Throw errors** in before hooks to block the save
- **Mutate `ctx.input.doc`** in before hooks to change field values before save
- **Access `ctx.previous`** to see the old field values (on updates)
- **Use `ctx.ql`** (the ObjectQL broker) to query other objects

---

## 3. Write an After Hook

After hooks run **after** a record is saved. Use them for cross-object updates, notifications, and side effects.

**File:** `packages/crm/src/hooks/warranty.hook.ts` (same file, additional export)

```typescript
import type { Hook, HookContext } from '@objectstack/spec/data';

/**
 * Warranty Claim Hook
 *
 * After a warranty is updated, check for status changes and
 * create related records as needed.
 */
export const WarrantyClaimHook: Hook = {
  name: 'WarrantyClaimTracking',
  object: 'warranty',
  events: ['afterUpdate'],
  handler: async (ctx: HookContext) => {
    // Only run when status changes to 'claimed'
    const previous = ctx.previous as Record<string, any> | undefined;
    const current = ctx.result as Record<string, any>;

    if (!previous || previous.status === current.status) {
      return;
    }

    if (current.status === 'claimed') {
      // 1. Create a support case for the warranty claim
      await ctx.ql.doc.create('case', {
        subject: `Warranty Claim: ${current.warranty_number}`,
        description: `Warranty claim submitted for product ${current.product_id}`,
        status: 'new',
        priority: 'high',
        origin: 'web',
        account_id: current.account_id,
        product_id: current.product_id,
        owner_id: current.owner_id
      });

      // 2. Increment claim count
      await ctx.ql.doc.update('warranty', current._id, {
        claim_count: (current.claim_count || 0) + 1
      });

      // 3. Log an activity
      await ctx.ql.doc.create('activity', {
        subject: `Warranty Claimed: ${current.warranty_number}`,
        type: 'Warranty Claim',
        status: 'completed',
        priority: 'high',
        what_id: current._id,
        owner_id: ctx.user?.id,
        activity_date: new Date().toISOString().split('T')[0],
        description: `Warranty ${current.warranty_number} claimed. Claim #${(current.claim_count || 0) + 1}.`
      });

      console.log(`✅ Warranty claim processed: ${current.warranty_number}`);
    }
  }
};
```

---

## 4. Write an Action

Actions are API endpoints that can also be invoked by AI agents. Use them for multi-step business operations.

**File:** `packages/crm/src/actions/warranty_extend.action.ts`

```typescript
import { broker } from '../db';

/**
 * Warranty Extension Action
 *
 * Extends a warranty by a specified number of months.
 * Can be called via API or by an AI agent.
 */
export const WarrantyExtendAction = {
  name: 'warranty_extend',
  label: 'Extend Warranty',
  description: 'Extends an active warranty by the specified number of months.',

  params: {
    warranty_id: { type: 'text', required: true },
    extension_months: { type: 'number', required: true },
    reason: { type: 'text' }
  },

  handler: async (ctx: any) => {
    const { warranty_id, extension_months, reason } = ctx.params;

    // 1. Fetch the warranty
    const warranties = await broker.find('warranty', {
      filters: [['_id', '=', warranty_id]]
    });

    if (!warranties || warranties.length === 0) {
      throw new Error(`Warranty not found: ${warranty_id}`);
    }

    const warranty = warranties[0];

    // 2. Validate status
    if (warranty.status === 'expired') {
      throw new Error('Cannot extend an expired warranty. Create a new one instead.');
    }

    // 3. Calculate new end date
    const currentEnd = new Date(warranty.end_date);
    currentEnd.setMonth(currentEnd.getMonth() + extension_months);
    const newEndDate = currentEnd.toISOString().split('T')[0];

    // 4. Update the warranty
    await broker.update('warranty', warranty_id, {
      end_date: newEndDate,
      status: 'active'
    });

    // 5. Log the extension as an activity
    await broker.insert('activity', {
      subject: `Warranty Extended: ${warranty.warranty_number}`,
      type: 'Warranty Extension',
      status: 'completed',
      what_id: warranty_id,
      owner_id: ctx.user?.id,
      activity_date: new Date().toISOString().split('T')[0],
      description: `Extended by ${extension_months} months. New end date: ${newEndDate}. Reason: ${reason || 'N/A'}`
    });

    return {
      warranty_id,
      old_end_date: warranty.end_date,
      new_end_date: newEndDate,
      extension_months
    };
  }
};

export default WarrantyExtendAction;
```

---

## 5. Define a Workflow Rule

Workflow rules define declarative automation — triggers, conditions, and actions — without writing imperative code.

**File:** `packages/crm/src/warranty.workflow.ts`

```typescript
/**
 * Warranty Expiry Check Workflow
 *
 * Runs daily to detect expiring warranties and notify owners.
 */
export const WarrantyExpiryCheck = {
  name: 'warranty_expiry_check',
  label: 'Warranty Expiry Alert',
  object: 'warranty',
  description: 'Notify owners about warranties expiring within 30 days',

  triggerType: 'scheduled',
  schedule: {
    frequency: 'daily',
    time: '08:00',
    timezone: 'UTC'
  },

  // Only target active warranties expiring within 30 days
  condition: 'status = "active" AND end_date <= TODAY() + 30 AND end_date > TODAY()',

  actions: [
    // 1. Update status to expiring_soon
    {
      type: 'fieldUpdate',
      field: 'status',
      value: 'expiring_soon'
    },

    // 2. Send email notification to owner
    {
      type: 'emailAlert',
      template: 'warranty_expiring_soon',
      recipients: ['owner_id'],
      description: 'Notify warranty owner about upcoming expiration'
    },

    // 3. Create a follow-up task
    {
      type: 'taskCreation',
      subject: 'Review expiring warranty: ${warranty_number}',
      description: 'Warranty ${warranty_number} expires on ${end_date}. Contact customer to discuss renewal.',
      assignee: '${owner_id}',
      dueDate: '${end_date} - 7',
      priority: 'high',
      status: 'not_started'
    }
  ],

  active: true
};

/**
 * Warranty Auto-Close Workflow
 *
 * Runs on record update to close warranties past their end date.
 */
export const WarrantyAutoClose = {
  name: 'warranty_auto_close',
  label: 'Auto-Expire Warranties',
  object: 'warranty',
  description: 'Automatically set status to expired when end date passes',

  triggerType: 'onCreateOrUpdate',

  condition: 'status != "expired" AND end_date < TODAY()',

  actions: [
    {
      type: 'fieldUpdate',
      field: 'status',
      value: 'expired'
    }
  ],

  executionOrder: 1,
  active: true
};

export const WarrantyWorkflows = {
  expiryCheck: WarrantyExpiryCheck,
  autoClose: WarrantyAutoClose
};

export default WarrantyWorkflows;
```

### Workflow Trigger Types

| Trigger | Description |
|---------|-------------|
| `onCreate` | When a new record is created |
| `onCreateOrUpdate` | When a record is created or updated |
| `scheduled` | Runs on a schedule (daily, weekly, etc.) |

### Workflow Action Types

| Action Type | Description |
|-------------|-------------|
| `fieldUpdate` | Update a field value |
| `emailAlert` | Send an email notification |
| `taskCreation` | Create a follow-up task |
| `customAction` | Execute a custom action handler |
| `httpCall` | Call an external webhook or API |

---

## 6. Register Everything in plugin.ts

The plugin file is the entry point that registers all objects, hooks, actions, and workflows with the ObjectStack runtime.

**File:** `packages/crm/src/plugin.ts`

```typescript
/**
 * @hotcrm/crm - Sales Cloud Plugin Definition
 *
 * Registers all CRM business objects, hooks, actions, and workflows.
 */

// Objects
import { Account } from './account.object';
import { Contact } from './contact.object';
import { Lead } from './lead.object';
import { Opportunity } from './opportunity.object';
import { Task } from './task.object';
import { Warranty } from './warranty.object';

// Hooks
import { LeadScoringTrigger, LeadStatusChangeTrigger } from './hooks/lead.hook';
import { OpportunityValidation, OpportunityStageChange } from './hooks/opportunity.hook';
import { WarrantyValidationHook, WarrantyClaimHook } from './hooks/warranty.hook';

// Actions
import LeadConvertAction from './actions/lead_convert.action';
import WarrantyExtendAction from './actions/warranty_extend.action';

// Workflows
import { LeadWorkflows } from './lead.workflow';
import { WarrantyWorkflows } from './warranty.workflow';

export const CRMPlugin: any = {
  name: 'crm',
  label: 'Sales Cloud',
  version: '1.0.0',
  description: 'Core Sales Cloud capabilities',

  // Other plugins this depends on
  dependencies: [],

  // Initialization logic (optional)
  init: async () => {},

  // Business objects
  objects: {
    account: Account,
    contact: Contact,
    lead: Lead,
    opportunity: Opportunity,
    task: Task,
    warranty: Warranty,
  },

  // Server-side triggers/hooks
  triggers: {
    lead_scoring: LeadScoringTrigger,
    lead_status_change: LeadStatusChangeTrigger,
    opportunity_validation: OpportunityValidation,
    opportunity_stage_change: OpportunityStageChange,
    warranty_validation: WarrantyValidationHook,
    warranty_claim: WarrantyClaimHook,
  },

  // API actions (also callable by AI agents)
  actions: {
    lead_convert: LeadConvertAction,
    warranty_extend: WarrantyExtendAction,
  },

  // Declarative workflow rules
  workflows: {
    lead_auto_assignment: LeadWorkflows.autoAssignment,
    lead_auto_scoring: LeadWorkflows.autoScoring,
    warranty_expiry_check: WarrantyWorkflows.expiryCheck,
    warranty_auto_close: WarrantyWorkflows.autoClose,
  },

  // Navigation menu structure
  navigation: [
    {
      type: 'group',
      label: 'Sales',
      children: [
        { type: 'object', object: 'account' },
        { type: 'object', object: 'contact' },
        { type: 'object', object: 'lead' },
        { type: 'object', object: 'opportunity' },
      ]
    }
  ]
};

export default CRMPlugin;
```

### Plugin Structure

| Property | Description |
|----------|-------------|
| `name` | Package identifier (must be unique) |
| `dependencies` | Other plugins this one depends on |
| `objects` | All `ObjectSchema` definitions |
| `triggers` | Before/after hooks (server-side logic) |
| `actions` | API endpoints and AI-callable tools |
| `workflows` | Declarative automation rules |
| `navigation` | UI menu structure |

---

## 7. Use the Broker API (ObjectQL)

ObjectQL is the data access layer. **Never write raw SQL** — always use the broker.

### Query Records

```typescript
// Find all open opportunities over $50,000
const deals = await broker.find('opportunity', {
  filters: [
    ['stage', '!=', 'closed_won'],
    ['stage', '!=', 'closed_lost'],
    ['amount', '>', 50000]
  ],
  sort: 'amount DESC',
  limit: 20
});
```

### Find a Single Record

```typescript
// Find by ID
const records = await broker.find('account', {
  filters: [['_id', '=', accountId]]
});
const account = records[0];
```

### Insert a Record

```typescript
const newContact = await broker.insert('contact', {
  first_name: 'Jane',
  last_name: 'Smith',
  email: 'jane.smith@example.com',
  account_id: 'acc_12345',
  title: 'VP of Engineering',
  level: 'vp',
  is_decision_maker: true,
  owner_id: currentUserId
});
console.log('Created contact:', newContact._id);
```

### Update a Record

```typescript
await broker.update('opportunity', opportunityId, {
  stage: 'closed_won',
  amount: 150000,
  close_date: new Date().toISOString().split('T')[0]
});
```

### Using ObjectQL Inside Hooks

Inside hooks, use `ctx.ql` instead of importing the broker directly:

```typescript
const handler = async (ctx: HookContext) => {
  // Create a related record
  await ctx.ql.doc.create('activity', {
    subject: 'Deal closed',
    type: 'Milestone',
    status: 'completed',
    what_id: ctx.result._id,
    owner_id: ctx.user.id
  });

  // Query related records
  const quotes = await ctx.ql.find('quote', {
    filters: [['opportunity_id', '=', ctx.result._id]]
  });
};
```

### Common Filter Operators

| Operator | Example | Description |
|----------|---------|-------------|
| `=` | `['status', '=', 'active']` | Equals |
| `!=` | `['stage', '!=', 'closed_lost']` | Not equals |
| `>` | `['amount', '>', 50000]` | Greater than |
| `<` | `['score', '<', 30]` | Less than |
| `>=` | `['probability', '>=', 80]` | Greater than or equal |
| `<=` | `['days_open', '<=', 90]` | Less than or equal |
| `contains` | `['name', 'contains', 'Acme']` | String contains |

---

## 8. Add MCP Tools for AI Integration

MCP (Model Context Protocol) tools expose HotCRM capabilities to AI agents. Define tools, resources, and prompts.

**File:** `packages/ai/src/mcp_server.config.ts`

```typescript
import type { MCPServerConfig, MCPTool, MCPResource, MCPPrompt } from '@objectstack/spec/ai';
import { MCPServerConfigSchema } from '@objectstack/spec/ai';

// Define a tool that AI agents can call
const warrantyLookup: MCPTool = {
  name: 'warranty_lookup',
  description: 'Look up warranty status and coverage details for a customer or product',
  handler: 'crm.warranty_lookup.execute',
  parameters: [
    {
      name: 'account_id',
      type: 'string',
      description: 'Customer account ID',
      required: false
    },
    {
      name: 'product_id',
      type: 'string',
      description: 'Product ID to check warranty for',
      required: false
    },
    {
      name: 'include_expired',
      type: 'boolean',
      description: 'Include expired warranties in results',
      required: false,
      default: false
    }
  ],
  returns: {
    type: 'array',
    description: 'List of warranties with status, coverage, and claim history'
  },
  sideEffects: 'read',
  category: 'crm',
  tags: ['warranty', 'support', 'product']
};

// Define a resource that provides context to AI agents
const warrantyDashboardResource: MCPResource = {
  uri: 'hotcrm://crm/warranty_dashboard',
  name: 'warranty_dashboard',
  description: 'Warranty overview with expiring, active, and claimed counts',
  mimeType: 'application/json',
  resourceType: 'json',
  tags: ['crm', 'warranty'],
  cacheable: true,
  cacheMaxAge: 300
};

// Define a prompt template for AI agents
const warrantyAnalysisPrompt: MCPPrompt = {
  name: 'warranty_analysis',
  description: 'Analyze warranty claims and suggest process improvements',
  messages: [
    {
      role: 'system',
      content: 'You are a warranty analysis assistant. Identify patterns in warranty claims, suggest process improvements, and flag unusual claim activity.'
    },
    {
      role: 'user',
      content: 'Analyze warranty claims for account {{account_id}} over the past {{period}}. Focus on: {{focus_areas}}.'
    }
  ],
  arguments: [
    { name: 'account_id', description: 'Account ID', type: 'string', required: true },
    { name: 'period', description: 'Analysis period (e.g., 6months, 1year)', type: 'string', required: false, default: '6months' },
    { name: 'focus_areas', description: 'Areas to focus on', type: 'string', required: false, default: 'claim_frequency,product_quality' }
  ],
  category: 'crm',
  tags: ['warranty', 'analysis']
};

// Register in the MCP server config
export const mcpConfig: MCPServerConfig = MCPServerConfigSchema.parse({
  name: 'hotcrm_ai_server',
  label: 'HotCRM AI Server',
  description: 'MCP server exposing HotCRM AI capabilities',
  serverInfo: {
    name: 'hotcrm_ai_server',
    version: '1.0.0',
    description: 'HotCRM unified AI server',
    capabilities: {
      resources: true,
      tools: true,
      prompts: true,
      logging: true
    },
    protocolVersion: '2024-11-05',
    vendor: 'HotCRM'
  },
  transport: {
    type: 'stdio',
    command: 'node',
    args: ['dist/mcp-server.js'],
    timeout: 30000
  },
  tools: [warrantyLookup],
  resources: [warrantyDashboardResource],
  prompts: [warrantyAnalysisPrompt],
  autoStart: true,
  restartOnFailure: true,
  status: 'active',
  version: '1.0.0'
});
```

### MCP Component Summary

| Component | Purpose | Example |
|-----------|---------|---------|
| **Tool** | A function AI agents can call | `lead_scoring`, `knowledge_search` |
| **Resource** | Read-only context data for AI | `pipeline_summary`, `case_metrics` |
| **Prompt** | Reusable prompt templates | `sales_briefing`, `case_resolution` |

### Side Effects

| Value | Meaning |
|-------|---------|
| `read` | Tool only reads data (safe to call repeatedly) |
| `write` | Tool modifies data (requires confirmation) |

---

## File Naming Quick Reference

| Suffix | Purpose | Example |
|--------|---------|---------|
| `*.object.ts` | Data model / schema | `warranty.object.ts` |
| `*.hook.ts` | Server-side business logic (triggers) | `warranty.hook.ts` |
| `*.action.ts` | API endpoints & AI tools | `warranty_extend.action.ts` |
| `*.workflow.ts` | Declarative automation rules | `warranty.workflow.ts` |
| `*.page.ts` | UI page layouts (metadata) | `warranty.page.ts` |
| `*.view.ts` | List view configurations | `warranty.view.ts` |
| `plugin.ts` | Package registration entry point | `plugin.ts` |
