import type { Dashboard } from '@objectstack/spec/ui';
import { DashboardSchema } from '@objectstack/spec/ui';

/**
 * Marketing Dashboard
 * Campaign performance, ROI, and lead source analytics
 */
export const MarketingDashboard = {
  name: 'marketing_dashboard',
  label: 'Marketing Dashboard',
  description: 'Campaign performance, ROI, and lead generation metrics',
  widgets: [
    {
      id: 'campaign_count',
      title: 'Campaign Count',
      type: 'metric' as const,
      object: 'campaign',
      aggregate: 'count' as const,
      layout: { x: 0, y: 0, w: 3, h: 2 }
    },
    {
      id: 'active_campaigns',
      title: 'Active Campaigns',
      type: 'metric' as const,
      object: 'campaign',
      aggregate: 'count' as const,
      filter: { is_active: true },
      layout: { x: 3, y: 0, w: 3, h: 2 }
    },
    {
      id: 'total_budget',
      title: 'Total Budget',
      type: 'metric' as const,
      object: 'campaign',
      valueField: 'budgeted_cost',
      aggregate: 'sum' as const,
      layout: { x: 6, y: 0, w: 3, h: 2 }
    },
    {
      id: 'campaign_roi',
      title: 'Campaign ROI',
      type: 'kpi' as const,
      object: 'campaign',
      valueField: 'actual_revenue',
      aggregate: 'sum' as const,
      filter: { status: 'completed' },
      layout: { x: 9, y: 0, w: 3, h: 2 }
    },
    {
      id: 'campaigns_by_type',
      title: 'Campaigns by Type',
      type: 'pie' as const,
      object: 'campaign',
      categoryField: 'type',
      aggregate: 'count' as const,
      layout: { x: 0, y: 2, w: 6, h: 4 }
    },
    {
      id: 'campaign_performance_over_time',
      title: 'Campaign Performance Over Time',
      type: 'line' as const,
      object: 'campaign',
      categoryField: 'start_date',
      valueField: 'actual_revenue',
      aggregate: 'sum' as const,
      layout: { x: 6, y: 2, w: 6, h: 4 }
    },
    {
      id: 'lead_sources_breakdown',
      title: 'Lead Sources Breakdown',
      type: 'bar' as const,
      object: 'lead',
      categoryField: 'lead_source',
      aggregate: 'count' as const,
      layout: { x: 0, y: 6, w: 6, h: 4 }
    },
    {
      id: 'recent_campaigns',
      title: 'Recent Campaigns',
      type: 'table' as const,
      object: 'campaign',
      aggregate: 'count' as const,
      filter: { is_active: true },
      layout: { x: 6, y: 6, w: 6, h: 4 },
      options: {
        columns: [
          { header: 'Name', accessorKey: 'name' },
          { header: 'Type', accessorKey: 'type' },
          { header: 'Status', accessorKey: 'status' },
          { header: 'Start Date', accessorKey: 'start_date' },
          { header: 'Budgeted Cost', accessorKey: 'budgeted_cost' }
        ]
      }
    }
  ]
} satisfies Dashboard;

DashboardSchema.parse(MarketingDashboard);

export default MarketingDashboard;
