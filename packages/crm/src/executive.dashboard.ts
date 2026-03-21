import type { Dashboard } from '@objectstack/spec/ui';
import { DashboardSchema } from '@objectstack/spec/ui';

/**
 * Executive Dashboard
 * Cross-cloud KPIs: sales, support, HR, and account health
 */
export const ExecutiveDashboard = {
  name: 'executive_dashboard',
  label: 'Executive Dashboard',
  description: 'Cross-cloud executive overview of sales, support, and workforce',
  widgets: [
    {
      id: 'pipeline_value',
      title: 'Pipeline Value',
      type: 'metric' as const,
      object: 'opportunity',
      valueField: 'amount',
      aggregate: 'sum' as const,
      filter: { stage: { $ne: 'closed_lost' } },
      layout: { x: 0, y: 0, w: 3, h: 2 }
    },
    {
      id: 'won_revenue',
      title: 'Won Revenue',
      type: 'metric' as const,
      object: 'opportunity',
      valueField: 'amount',
      aggregate: 'sum' as const,
      filter: { stage: 'closed_won' },
      layout: { x: 3, y: 0, w: 3, h: 2 }
    },
    {
      id: 'open_cases',
      title: 'Open Cases',
      type: 'metric' as const,
      object: 'case',
      aggregate: 'count' as const,
      filter: { status: { $ne: 'closed' } },
      layout: { x: 6, y: 0, w: 3, h: 2 }
    },
    {
      id: 'employee_count',
      title: 'Employee Count',
      type: 'metric' as const,
      object: 'employee',
      aggregate: 'count' as const,
      filter: { employment_status: 'active' },
      layout: { x: 9, y: 0, w: 3, h: 2 }
    },
    {
      id: 'pipeline_by_stage',
      title: 'Pipeline by Stage',
      type: 'funnel' as const,
      object: 'opportunity',
      categoryField: 'stage',
      valueField: 'amount',
      aggregate: 'sum' as const,
      layout: { x: 0, y: 2, w: 6, h: 4 }
    },
    {
      id: 'revenue_trend',
      title: 'Revenue Trend',
      type: 'line' as const,
      object: 'opportunity',
      categoryField: 'close_date',
      valueField: 'amount',
      aggregate: 'sum' as const,
      filter: { stage: 'closed_won' },
      layout: { x: 6, y: 2, w: 6, h: 4 }
    },
    {
      id: 'case_volume_by_priority',
      title: 'Case Volume by Priority',
      type: 'bar' as const,
      object: 'case',
      categoryField: 'priority',
      aggregate: 'count' as const,
      layout: { x: 0, y: 6, w: 6, h: 4 }
    },
    {
      id: 'top_deals',
      title: 'Top Deals',
      type: 'table' as const,
      aggregate: 'count' as const,
      object: 'opportunity',
      filter: { stage: { $ne: 'closed_lost' } },
      layout: { x: 6, y: 6, w: 6, h: 4 },
      options: {
        columns: [
          { header: 'Name', accessorKey: 'name' },
          { header: 'Amount', accessorKey: 'amount' },
          { header: 'Stage', accessorKey: 'stage' },
          { header: 'Close Date', accessorKey: 'close_date' }
        ]
      }
    }
  ]
} satisfies Dashboard;

DashboardSchema.parse(ExecutiveDashboard);

export default ExecutiveDashboard;
