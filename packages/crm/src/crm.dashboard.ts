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
      id: 'total_pipeline_value',
      title: 'Total Pipeline Value',
      type: 'metric' as const,
      object: 'opportunity',
      valueField: 'amount',
      aggregate: 'sum' as const,
      filter: { stage: { $ne: 'closed_lost' } },
      layout: { x: 0, y: 0, w: 3, h: 2 }
    },
    {
      id: 'open_deals',
      title: 'Open Deals',
      type: 'metric' as const,
      object: 'opportunity',
      aggregate: 'count' as const,
      filter: { stage: { $ne: 'closed_lost' } },
      layout: { x: 3, y: 0, w: 3, h: 2 }
    },
    {
      id: 'won_this_quarter',
      title: 'Won This Quarter',
      type: 'kpi' as const,
      object: 'opportunity',
      valueField: 'amount',
      aggregate: 'sum' as const,
      filter: { stage: 'closed_won' },
      layout: { x: 6, y: 0, w: 3, h: 2 }
    },
    {
      id: 'avg_deal_size',
      title: 'Avg Deal Size',
      type: 'metric' as const,
      object: 'opportunity',
      valueField: 'amount',
      aggregate: 'avg' as const,
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
      id: 'win_rate_by_month',
      title: 'Win Rate by Month',
      type: 'line' as const,
      object: 'opportunity',
      categoryField: 'close_date',
      valueField: 'probability',
      aggregate: 'avg' as const,
      layout: { x: 6, y: 2, w: 6, h: 4 }
    },
    {
      id: 'top_accounts_by_revenue',
      title: 'Top Accounts by Revenue',
      type: 'bar' as const,
      object: 'account',
      categoryField: 'name',
      valueField: 'annual_revenue',
      aggregate: 'sum' as const,
      layout: { x: 0, y: 6, w: 6, h: 4 }
    },
    {
      id: 'deals_closing_this_month',
      title: 'Deals Closing This Month',
      type: 'table' as const,
      aggregate: 'count' as const,
      object: 'opportunity',
      filter: { stage: { $ne: 'closed_lost' } },
      layout: { x: 6, y: 6, w: 6, h: 4 },
      options: {
        columns: ['name', 'amount', 'stage', 'close_date']
      }
    }
  ]
} satisfies Dashboard;

DashboardSchema.parse(CrmDashboard);

export default CrmDashboard;
