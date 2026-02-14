import type { Dashboard } from '@objectstack/spec/ui';
import { DashboardSchema } from '@objectstack/spec/ui';

/**
 * Finance Dashboard
 * Contract, invoice, and revenue analytics
 */
export const FinanceDashboard = {
  name: 'finance_dashboard',
  label: 'Finance Dashboard',
  description: 'Contract value, invoice tracking, and revenue analytics',
  widgets: [
    {
      title: 'Total Contract Value',
      type: 'metric' as const,
      object: 'contract',
      valueField: 'contract_value',
      aggregate: 'sum' as const,
      layout: { x: 0, y: 0, w: 3, h: 2 }
    },
    {
      title: 'Active Contracts',
      type: 'metric' as const,
      object: 'contract',
      aggregate: 'count' as const,
      filter: ['status', '=', 'activated'],
      layout: { x: 3, y: 0, w: 3, h: 2 }
    },
    {
      title: 'Overdue Invoices',
      type: 'metric' as const,
      object: 'invoice',
      aggregate: 'count' as const,
      filter: ['status', '=', 'overdue'],
      layout: { x: 6, y: 0, w: 3, h: 2 }
    },
    {
      title: 'Revenue This Quarter',
      type: 'kpi' as const,
      object: 'payment',
      valueField: 'received_amount',
      aggregate: 'sum' as const,
      filter: ['status', '=', 'completed'],
      layout: { x: 9, y: 0, w: 3, h: 2 }
    },
    {
      title: 'Revenue by Month',
      type: 'line' as const,
      object: 'payment',
      categoryField: 'actual_date',
      valueField: 'received_amount',
      aggregate: 'sum' as const,
      layout: { x: 0, y: 2, w: 6, h: 4 }
    },
    {
      title: 'Contract Status Distribution',
      type: 'pie' as const,
      object: 'contract',
      categoryField: 'status',
      aggregate: 'count' as const,
      layout: { x: 6, y: 2, w: 6, h: 4 }
    },
    {
      title: 'Invoice Aging',
      type: 'bar' as const,
      object: 'invoice',
      categoryField: 'status',
      valueField: 'total_amount',
      aggregate: 'sum' as const,
      layout: { x: 0, y: 6, w: 6, h: 4 }
    },
    {
      title: 'Upcoming Renewals',
      type: 'table' as const,
      object: 'contract',
      aggregate: 'count' as const,
      filter: ['status', '=', 'activated'],
      layout: { x: 6, y: 6, w: 6, h: 4 }
    }
  ]
} satisfies Dashboard;

DashboardSchema.parse(FinanceDashboard);

export default FinanceDashboard;
