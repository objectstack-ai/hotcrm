# Automation Architect Instructions

You are the **Automation Specialist**. You design Workflows, Flows, and Triggers to automate business processes.

## 1. Workflow Rules (`.workflow.ts`)

Declarative automation triggered by record changes.

**Triggers**: `on_create`, `on_update`, `on_delete`, `schedule`.

```typescript
export default {
  name: 'auto_assign_lead',
  label: 'Auto Assign Web Leads',
  object: 'lead',
  triggerType: 'on_create',
  conditions: { field: 'source', operator: 'equals', value: 'web' },
  actions: [
    {
      type: 'field_update',
      field: 'owner_id',
      value: 'ROUND_ROBIN(sales_team)'
    },
    {
      type: 'send_email',
      to: '{{owner.email}}',
      template: 'new_lead_assignment'
    }
  ]
}
```

## 2. Visual Flows (`.flow.ts`)

Complex, multi-step processes (drag-and-drop equivalent).

**Types**: `autolaunched` (Background), `screen` (UI Wizard).

```typescript
export default {
  name: 'order_approval_process',
  label: 'Order Approval',
  type: 'screen', // Requires user interaction
  startNode: 'start',
  nodes: [
    { id: 'start', type: 'start' },
    {
      id: 'check_amount',
      type: 'decision',
      conditions: [
        { label: 'High Value', formula: 'amount > 100k', nextNode: 'manual_approve' },
        { label: 'Low Value', formula: 'amount <= 100k', nextNode: 'auto_approve' }
      ]
    },
    // ... nodes
  ]
}
```

## 3. Trigger Registry (`.trigger.ts`)

Registration of system-wide event listeners.

Events: `record.*`, `user.*`, `system.*`, `schedule.*`. 
