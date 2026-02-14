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
      title: 'Campaign Count',
      type: 'metric' as const,
      object: 'campaign',
      aggregate: 'count' as const,
      layout: { x: 0, y: 0, w: 3, h: 2 }
    },
    {
      title: 'Active Campaigns',
      type: 'metric' as const,
      object: 'campaign',
      aggregate: 'count' as const,
      filter: ['is_active', '=', true],
      layout: { x: 3, y: 0, w: 3, h: 2 }
    },
    {
      title: 'Total Budget',
      type: 'metric' as const,
      object: 'campaign',
      valueField: 'budgeted_cost',
      aggregate: 'sum' as const,
      layout: { x: 6, y: 0, w: 3, h: 2 }
    },
    {
      title: 'Campaign ROI',
      type: 'kpi' as const,
      object: 'campaign',
      valueField: 'actual_revenue',
      aggregate: 'sum' as const,
      filter: ['status', '=', 'completed'],
      layout: { x: 9, y: 0, w: 3, h: 2 }
    },
    {
      title: 'Campaigns by Type',
      type: 'pie' as const,
      object: 'campaign',
      categoryField: 'type',
      aggregate: 'count' as const,
      layout: { x: 0, y: 2, w: 6, h: 4 }
    },
    {
      title: 'Campaign Performance Over Time',
      type: 'line' as const,
      object: 'campaign',
      categoryField: 'start_date',
      valueField: 'actual_revenue',
      aggregate: 'sum' as const,
      layout: { x: 6, y: 2, w: 6, h: 4 }
    },
    {
      title: 'Lead Sources Breakdown',
      type: 'bar' as const,
      object: 'lead',
      categoryField: 'lead_source',
      aggregate: 'count' as const,
      layout: { x: 0, y: 6, w: 6, h: 4 }
    },
    {
      title: 'Recent Campaigns',
      type: 'table' as const,
      object: 'campaign',
      aggregate: 'count' as const,
      filter: ['is_active', '=', true],
      layout: { x: 6, y: 6, w: 6, h: 4 }
    }
  ]
} satisfies Dashboard;

DashboardSchema.parse(MarketingDashboard);

export default MarketingDashboard;
