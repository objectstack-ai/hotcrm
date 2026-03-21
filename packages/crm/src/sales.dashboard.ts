import type { Dashboard } from '@objectstack/spec/ui';
import { DashboardSchema } from '@objectstack/spec/ui';

/**
 * Sales Performance Dashboard
 * Demonstrates comprehensive dashboard with metrics, charts, and tables
 */
export const SalesDashboard = {
  name: 'sales_overview',
  label: 'Sales Dashboard',
  description: 'Comprehensive overview of sales performance and pipeline health',

  widgets: [
    // KPI Metrics Row
    {
      id: 'total_revenue_closed_won',
      title: 'Total Revenue (Closed Won)',
      type: 'metric' as const,
      object: 'opportunity',
      filter: { stage: 'closed_won' },
      valueField: 'amount',
      aggregate: 'sum' as const,
      layout: { x: 0, y: 0, w: 3, h: 2 }
    },
    {
      id: 'pipeline_value',
      title: 'Pipeline Value',
      type: 'metric' as const,
      object: 'opportunity',
      filter: { stage: { $nin: ['closed_won', 'closed_lost'] } },
      valueField: 'amount',
      aggregate: 'sum' as const,
      layout: { x: 3, y: 0, w: 3, h: 2 }
    },
    {
      id: 'win_rate',
      title: 'Win Rate',
      type: 'metric' as const,
      object: 'opportunity',
      filter: { stage: { $in: ['closed_won', 'closed_lost'] } },
      aggregate: 'count' as const,
      layout: { x: 6, y: 0, w: 3, h: 2 }
    },
    {
      id: 'avg_deal_size',
      title: 'Avg Deal Size',
      type: 'metric' as const,
      object: 'opportunity',
      filter: { stage: 'closed_won' },
      valueField: 'amount',
      aggregate: 'avg' as const,
      layout: { x: 9, y: 0, w: 3, h: 2 }
    },

    // Pipeline Funnel Chart
    {
      id: 'sales_pipeline_by_stage',
      title: 'Sales Pipeline by Stage',
      type: 'funnel' as const,
      object: 'opportunity',
      filter: { stage: { $ne: 'closed_lost' } },
      categoryField: 'stage',
      valueField: 'amount',
      aggregate: 'sum' as const,
      layout: { x: 0, y: 2, w: 6, h: 5 }
    },

    // Revenue Trend Chart
    {
      id: 'revenue_trend',
      title: 'Revenue Trend',
      type: 'bar' as const,
      object: 'opportunity',
      filter: { stage: 'closed_won' },
      categoryField: 'close_date',
      valueField: 'amount',
      aggregate: 'sum' as const,
      layout: { x: 6, y: 2, w: 6, h: 5 }
    },

    // Revenue by Industry
    {
      id: 'revenue_distribution_by_industry',
      title: 'Revenue Distribution by Industry',
      type: 'pie' as const,
      object: 'opportunity',
      filter: { stage: 'closed_won' },
      categoryField: 'account.industry',
      valueField: 'amount',
      aggregate: 'sum' as const,
      layout: { x: 0, y: 7, w: 6, h: 4 }
    },

    // Win/Loss Analysis
    {
      id: 'win_loss_analysis',
      title: 'Win/Loss Analysis',
      type: 'donut' as const,
      object: 'opportunity',
      filter: { stage: { $in: ['closed_won', 'closed_lost'] } },
      categoryField: 'stage',
      aggregate: 'count' as const,
      layout: { x: 6, y: 7, w: 6, h: 4 }
    },

    // Top 10 Deals Table
    {
      id: 'top_10_opportunities',
      title: 'Top 10 Opportunities',
      type: 'table' as const,
      object: 'opportunity',
      filter: { stage: { $ne: 'closed_lost' } },
      aggregate: 'count' as const,
      layout: { x: 0, y: 11, w: 12, h: 5 },
      options: {
        columns: ['name', 'account_id', 'amount', 'stage', 'close_date']
      }
    },

    // Team Performance Leaderboard
    {
      id: 'team_performance_this_quarter',
      title: 'Team Performance (This Quarter)',
      type: 'table' as const,
      object: 'opportunity',
      filter: { stage: 'closed_won' },
      categoryField: 'owner.name',
      valueField: 'amount',
      aggregate: 'sum' as const,
      layout: { x: 0, y: 16, w: 6, h: 4 },
      options: {
        columns: ['owner_id', 'amount', 'close_date']
      }
    },

    // Forecast vs Actual
    {
      id: 'forecast_vs_actual_revenue',
      title: 'Forecast vs Actual Revenue',
      type: 'line' as const,
      object: 'opportunity',
      categoryField: 'close_date',
      valueField: 'amount',
      aggregate: 'sum' as const,
      layout: { x: 6, y: 16, w: 6, h: 4 }
    }
  ],

  refreshInterval: 300
} satisfies Dashboard;

DashboardSchema.parse(SalesDashboard);

export default SalesDashboard;
