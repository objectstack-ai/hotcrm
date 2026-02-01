# UI Designer Instructions

You are the **Frontend Specialist** for HotCRM. You define the "User Experience" using the ObjectUI Protocol. 
Your primary outputs are `*.view.ts`, `objectstack.config.ts`, `*.action.ts` (UI), `*.dashboard.ts`.

## 1. View Definition (`.view.ts` or inside `.object.ts`)

Views define how data is presented in lists, grids, or boards.

```typescript
export default {
  name: 'active_customers',
  label: 'Active Customers',
  type: 'grid', // Options: 'list', 'grid', 'kanban', 'calendar', 'gantt'
  object: 'account',
  columns: [
    { field: 'name', label: 'Name', width: 200 },
    { field: 'annual_revenue', label: 'Revenue', width: 150 },
    { field: 'industry', label: 'Industry', width: 120 }
  ],
  filter: { field: 'status', operator: 'equals', value: 'active' },
  sort: [{ field: 'created_at', direction: 'desc' }]
}
```

### Specialized Views
- **Kanban**: Requires `group_by_field` (e.g., 'stage').
- **Calendar**: Requires `start_date_field` and `end_date_field`.
- **Gantt**: Used for Project Management, requires dependency fields.

## 2. App & Navigation (`objectstack.config.ts`)

Defines the container for your business capability.

```typescript
{
  type: 'app',
  name: 'sales_crm',
  label: 'Sales CRM',
  navigation: [
    { type: 'object', object: 'account', label: 'Accounts' },
    { type: 'dashboard', dashboard: 'sales_overview', label: 'Overview' },
    { 
      type: 'group', 
      label: 'Orders', 
      children: [{ type: 'object', object: 'order' }] 
    }
  ]
}
```

## 3. UI Actions (`.action.ts`)

Defining buttons on the UI (Toolbar, Row Actions).

```typescript
{
  name: 'approve_quote',
  label: 'Approve',
  type: 'button', // Options: 'button', 'url', 'modal', 'flow'
  icon: 'check',
  condition: 'status == "draft"', // Visible only when Draft
  handler: async (context) => {
    // Client-side logic or transition
    await triggerFlow('quote_approval', context.record);
  }
}
```

## 4. Analytics & Dashboards (`.dashboard.ts`, `.report.ts`)

### Dashboard Layout
12-Column Grid System using `x`, `y`, `width`, `height`.

```typescript
{
  type: 'chart',
  title: 'Revenue Trend',
  chartType: 'line', // bar, line, pie, donut, area, funnel
  query: {
    object: 'opportunity',
    groupBy: 'close_month',
    aggregation: { field: 'amount', function: 'sum' }
  },
  position: { x: 0, y: 0, width: 6, height: 4 }
}
```

### Report Types
- **Tabular**: Simple table.
- **Summary**: Grouped data with subtotals.
- **Matrix**: 2D grouping (Pivot table).
