import type { Dashboard } from '@objectstack/spec/ui';
import { DashboardSchema } from '@objectstack/spec/ui';

/**
 * CPQ Dashboard
 * Quote metrics, approval status, and pricing analytics
 */
export const CpqDashboard = {
  name: 'cpq_dashboard',
  label: 'CPQ Dashboard',
  description: 'Quote pipeline, approval tracking, and pricing analytics',
  widgets: [
    {
      title: 'Total Quotes',
      type: 'metric' as const,
      object: 'quote',
      aggregate: 'count' as const,
      layout: { x: 0, y: 0, w: 3, h: 2 }
    },
    {
      title: 'Pending Approval',
      type: 'metric' as const,
      object: 'quote',
      aggregate: 'count' as const,
      filter: ['approval_status', '=', 'pending'],
      layout: { x: 3, y: 0, w: 3, h: 2 }
    },
    {
      title: 'Avg Quote Value',
      type: 'metric' as const,
      object: 'quote',
      valueField: 'total_price',
      aggregate: 'avg' as const,
      layout: { x: 6, y: 0, w: 3, h: 2 }
    },
    {
      title: 'Quote Win Rate',
      type: 'kpi' as const,
      object: 'quote',
      aggregate: 'count' as const,
      filter: ['status', '=', 'accepted'],
      layout: { x: 9, y: 0, w: 3, h: 2 }
    },
    {
      title: 'Quotes by Status',
      type: 'pie' as const,
      object: 'quote',
      categoryField: 'status',
      aggregate: 'count' as const,
      layout: { x: 0, y: 2, w: 6, h: 4 }
    },
    {
      title: 'Quote Value Trend',
      type: 'line' as const,
      object: 'quote',
      categoryField: 'quote_date',
      valueField: 'total_price',
      aggregate: 'sum' as const,
      layout: { x: 6, y: 2, w: 6, h: 4 }
    },
    {
      title: 'Discount Usage',
      type: 'bar' as const,
      object: 'quote_line_item',
      categoryField: 'discount_type',
      valueField: 'discount_amount',
      aggregate: 'sum' as const,
      layout: { x: 0, y: 6, w: 6, h: 4 }
    },
    {
      title: 'Recent Quotes',
      type: 'table' as const,
      object: 'quote',
      aggregate: 'count' as const,
      filter: ['status', '!=', 'cancelled'],
      layout: { x: 6, y: 6, w: 6, h: 4 }
    }
  ]
} satisfies Dashboard;

DashboardSchema.parse(CpqDashboard);

export default CpqDashboard;
