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
      title: 'Total Revenue (YTD)',
      type: 'metric' as const,
      object: 'opportunity',
      filter: ['stage', '=', 'closed_won'],
      valueField: 'amount',
      aggregate: 'sum' as const,
      layout: { x: 0, y: 0, w: 3, h: 2 }
    },
    {
      title: 'Pipeline Value',
      type: 'metric' as const,
      object: 'opportunity',
      filter: ['stage', 'NOT IN', ['closed_won', 'closed_lost']],
      valueField: 'amount',
      aggregate: 'sum' as const,
      layout: { x: 3, y: 0, w: 3, h: 2 }
    },
    {
      title: 'Win Rate',
      type: 'metric' as const,
      object: 'opportunity',
      filter: ['stage', 'IN', ['closed_won', 'closed_lost']],
      aggregate: 'count' as const,
      layout: { x: 6, y: 0, w: 3, h: 2 }
    },
    {
      title: 'Avg Deal Size',
      type: 'metric' as const,
      object: 'opportunity',
      filter: ['stage', '=', 'closed_won'],
      valueField: 'amount',
      aggregate: 'avg' as const,
      layout: { x: 9, y: 0, w: 3, h: 2 }
    },

    // Pipeline Funnel Chart
    {
      title: 'Sales Pipeline by Stage',
      type: 'funnel' as const,
      object: 'opportunity',
      filter: ['stage', '!=', 'closed_lost'],
      categoryField: 'stage',
      valueField: 'amount',
      aggregate: 'sum' as const,
      layout: { x: 0, y: 2, w: 6, h: 5 }
    },

    // Revenue Trend Chart
    {
      title: 'Revenue Trend (Last 12 Months)',
      type: 'bar' as const,
      object: 'opportunity',
      filter: ['stage', '=', 'closed_won'],
      categoryField: 'close_date',
      valueField: 'amount',
      aggregate: 'sum' as const,
      layout: { x: 6, y: 2, w: 6, h: 5 }
    },

    // Revenue by Industry
    {
      title: 'Revenue Distribution by Industry',
      type: 'pie' as const,
      object: 'opportunity',
      filter: ['stage', '=', 'closed_won'],
      categoryField: 'account.industry',
      valueField: 'amount',
      aggregate: 'sum' as const,
      layout: { x: 0, y: 7, w: 6, h: 4 }
    },

    // Win/Loss Analysis
    {
      title: 'Win/Loss Analysis',
      type: 'donut' as const,
      object: 'opportunity',
      filter: ['stage', 'IN', ['closed_won', 'closed_lost']],
      categoryField: 'stage',
      aggregate: 'count' as const,
      layout: { x: 6, y: 7, w: 6, h: 4 }
    },

    // Top 10 Deals Table
    {
      title: 'Top 10 Opportunities',
      type: 'table' as const,
      object: 'opportunity',
      filter: ['stage', '!=', 'closed_lost'],
      aggregate: 'count' as const,
      layout: { x: 0, y: 11, w: 12, h: 5 }
    },

    // Team Performance Leaderboard
    {
      title: 'Team Performance (This Quarter)',
      type: 'table' as const,
      object: 'opportunity',
      filter: ['stage', '=', 'closed_won'],
      categoryField: 'owner.name',
      valueField: 'amount',
      aggregate: 'sum' as const,
      layout: { x: 0, y: 16, w: 6, h: 4 }
    },

    // Forecast vs Actual
    {
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
