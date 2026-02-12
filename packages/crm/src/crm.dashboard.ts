import type { Dashboard } from '@objectstack/spec/ui';
import { DashboardSchema } from '@objectstack/spec/ui';

/**
 * CRM Sales Dashboard
 * Key sales metrics: pipeline, win rate, and top accounts
 */
export const CrmDashboard = {
  name: 'crm_dashboard',
  label: 'Sales Dashboard',
  description: 'Key sales metrics and pipeline overview',
  widgets: [
    {
      title: 'Total Pipeline Value',
      type: 'metric' as const,
      object: 'opportunity',
      valueField: 'amount',
      aggregate: 'sum' as const,
      filter: ['stage', '!=', 'closed_lost'],
      layout: { x: 0, y: 0, w: 3, h: 2 }
    },
    {
      title: 'Open Deals',
      type: 'metric' as const,
      object: 'opportunity',
      aggregate: 'count' as const,
      filter: ['stage', '!=', 'closed_lost'],
      layout: { x: 3, y: 0, w: 3, h: 2 }
    },
    {
      title: 'Won This Quarter',
      type: 'kpi' as const,
      object: 'opportunity',
      valueField: 'amount',
      aggregate: 'sum' as const,
      filter: ['stage', '=', 'closed_won'],
      layout: { x: 6, y: 0, w: 3, h: 2 }
    },
    {
      title: 'Avg Deal Size',
      type: 'metric' as const,
      object: 'opportunity',
      valueField: 'amount',
      aggregate: 'avg' as const,
      layout: { x: 9, y: 0, w: 3, h: 2 }
    },
    {
      title: 'Pipeline by Stage',
      type: 'funnel' as const,
      object: 'opportunity',
      categoryField: 'stage',
      valueField: 'amount',
      aggregate: 'sum' as const,
      layout: { x: 0, y: 2, w: 6, h: 4 }
    },
    {
      title: 'Win Rate by Month',
      type: 'line' as const,
      object: 'opportunity',
      categoryField: 'close_date',
      valueField: 'probability',
      aggregate: 'avg' as const,
      layout: { x: 6, y: 2, w: 6, h: 4 }
    },
    {
      title: 'Top Accounts by Revenue',
      type: 'bar' as const,
      object: 'account',
      categoryField: 'name',
      valueField: 'annual_revenue',
      aggregate: 'sum' as const,
      layout: { x: 0, y: 6, w: 6, h: 4 }
    },
    {
      title: 'Deals Closing This Month',
      type: 'table' as const,
      object: 'opportunity',
      filter: ['stage', '!=', 'closed_lost'],
      layout: { x: 6, y: 6, w: 6, h: 4 }
    }
  ]
} satisfies Dashboard;

DashboardSchema.parse(CrmDashboard);

export default CrmDashboard;
