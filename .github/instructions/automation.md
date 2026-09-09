# Automation Architect Instructions

You are the **Automation Specialist**. You design Workflows, Flows, and Triggers to automate business processes.

## 1. There is no `workflow` metadata type — ⛔ do not author a `*.workflow.ts`

`WorkflowRuleSchema` is exported by no installed `@objectstack/*` package, and `ObjectSchema`
rejects `workflows:` / `workflow:` by name (ADR-0019/0020). A `*.workflow.ts` file is registered
by nothing and validated by nothing — it is silently ignored. Route record-triggered automation
to the three real destinations (`AGENTS.md` §Schema Validation Requirements): field updates
belong in `*.hook.ts`; status flips and notifications in a `record_change` / `schedule` flow
(§2 below); approvals in an `approval` node inside a flow. Whatever the destination, the object
it names carries the explicit `crm_` prefix (`crm_lead`, never `lead`).

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
