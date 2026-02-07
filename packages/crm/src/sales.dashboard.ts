import { Dashboard } from '@objectstack/spec/ui';

/**
 * Sales Performance Dashboard
 * Demonstrates comprehensive dashboard with metrics, charts, and tables
 */
export const SalesDashboard = Dashboard.create({
  name: 'sales_overview',
  label: 'Sales Dashboard',
  description: 'Comprehensive overview of sales performance and pipeline health',

  layout: {
    type: 'grid',
    columns: 12,
    gap: 4
  },

  widgets: [
    // KPI Metrics Row
    {
      id: 'total_revenue',
      type: 'metric',
      title: 'Total Revenue (YTD)',
      position: { row: 1, col: 1, width: 3, height: 2 },
      dataSource: {
        object: 'opportunity',
        filters: [
          ['stage', '=', 'Closed Won'],
          ['close_date', '>=', 'THIS_YEAR']
        ],
        aggregate: {
          field: 'amount',
          function: 'sum'
        }
      },
      format: {
        type: 'currency',
        prefix: '$',
        decimals: 0
      },
      trend: {
        comparison: 'LAST_YEAR',
        showPercentage: true
      }
    },

    {
      id: 'pipeline_value',
      type: 'metric',
      title: 'Pipeline Value',
      position: { row: 1, col: 4, width: 3, height: 2 },
      dataSource: {
        object: 'opportunity',
        filters: [
          ['stage', 'NOT IN', ['Closed Won', 'Closed Lost']]
        ],
        aggregate: {
          field: 'amount',
          function: 'sum'
        }
      },
      format: {
        type: 'currency',
        prefix: '$',
        decimals: 0
      },
      trend: {
        comparison: 'LAST_MONTH',
        showPercentage: true
      }
    },

    {
      id: 'win_rate',
      type: 'metric',
      title: 'Win Rate',
      position: { row: 1, col: 7, width: 3, height: 2 },
      dataSource: {
        formula: 'COUNT(stage = "Closed Won") / COUNT(stage IN ["Closed Won", "Closed Lost"]) * 100'
      },
      format: {
        type: 'percent',
        decimals: 1
      },
      trend: {
        comparison: 'LAST_QUARTER',
        showPercentage: false
      }
    },

    {
      id: 'avg_deal_size',
      type: 'metric',
      title: 'Avg Deal Size',
      position: { row: 1, col: 10, width: 3, height: 2 },
      dataSource: {
        object: 'opportunity',
        filters: [
          ['stage', '=', 'Closed Won'],
          ['close_date', '>=', 'THIS_QUARTER']
        ],
        aggregate: {
          field: 'amount',
          function: 'avg'
        }
      },
      format: {
        type: 'currency',
        prefix: '$',
        decimals: 0
      }
    },

    // Pipeline Funnel Chart
    {
      id: 'pipeline_funnel',
      type: 'chart',
      title: 'Sales Pipeline by Stage',
      position: { row: 3, col: 1, width: 6, height: 5 },
      chartType: 'funnel',
      dataSource: {
        object: 'opportunity',
        filters: [['stage', '!=', 'Closed Lost']],
        groupBy: 'stage',
        aggregate: {
          field: 'amount',
          function: 'sum'
        },
        orderBy: [
          { field: 'stage_order', direction: 'asc' }
        ]
      },
      options: {
        showValues: true,
        showPercentage: true,
        colors: ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe']
      }
    },

    // Revenue Trend Chart
    {
      id: 'revenue_by_month',
      type: 'chart',
      title: 'Revenue Trend (Last 12 Months)',
      position: { row: 3, col: 7, width: 6, height: 5 },
      chartType: 'bar',
      dataSource: {
        object: 'opportunity',
        filters: [
          ['stage', '=', 'Closed Won'],
          ['close_date', '>=', 'LAST_12_MONTHS']
        ],
        groupBy: {
          field: 'close_date',
          interval: 'month'
        },
        aggregate: {
          field: 'amount',
          function: 'sum'
        }
      },
      options: {
        xAxis: { label: 'Month' },
        yAxis: { label: 'Revenue ($)' },
        colors: ['#10b981'],
        showDataLabels: true
      }
    },

    // Revenue by Industry
    {
      id: 'revenue_by_industry',
      type: 'chart',
      title: 'Revenue Distribution by Industry',
      position: { row: 8, col: 1, width: 6, height: 4 },
      chartType: 'pie',
      dataSource: {
        object: 'opportunity',
        filters: [
          ['stage', '=', 'Closed Won'],
          ['close_date', '>=', 'THIS_YEAR']
        ],
        groupBy: 'account.industry',
        aggregate: {
          field: 'amount',
          function: 'sum'
        }
      },
      options: {
        showLegend: true,
        showPercentages: true,
        colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
      }
    },

    // Win/Loss Analysis
    {
      id: 'win_loss_analysis',
      type: 'chart',
      title: 'Win/Loss Analysis',
      position: { row: 8, col: 7, width: 6, height: 4 },
      chartType: 'donut',
      dataSource: {
        object: 'opportunity',
        filters: [
          ['stage', 'IN', ['Closed Won', 'Closed Lost']],
          ['close_date', '>=', 'THIS_QUARTER']
        ],
        groupBy: 'stage',
        aggregate: {
          field: 'id',
          function: 'count'
        }
      },
      options: {
        showLegend: true,
        showPercentages: true,
        colors: {
          'Closed Won': '#10b981',
          'Closed Lost': '#ef4444'
        }
      }
    },

    // Top 10 Deals Table
    {
      id: 'top_deals',
      type: 'table',
      title: 'Top 10 Opportunities',
      position: { row: 12, col: 1, width: 12, height: 5 },
      dataSource: {
        object: 'opportunity',
        filters: [['stage', '!=', 'Closed Lost']],
        fields: ['name', 'account.name', 'amount', 'stage', 'close_date', 'probability', 'owner.name'],
        orderBy: [
          { field: 'amount', direction: 'desc' }
        ],
        limit: 10
      },
      columns: [
        { field: 'name', label: 'Opportunity', width: 250, link: true },
        { field: 'account.name', label: 'Account', width: 200, link: true },
        { field: 'amount', label: 'Amount', width: 150, align: 'right', format: 'currency' },
        { field: 'stage', label: 'Stage', width: 150 },
        { field: 'close_date', label: 'Close Date', width: 120, format: 'YYYY-MM-DD' },
        { field: 'probability', label: 'Probability', width: 100, align: 'right', format: 'percent' },
        { field: 'owner.name', label: 'Owner', width: 150 }
      ]
    },

    // Team Performance Leaderboard
    {
      id: 'team_leaderboard',
      type: 'table',
      title: 'Team Performance (This Quarter)',
      position: { row: 17, col: 1, width: 6, height: 4 },
      dataSource: {
        object: 'opportunity',
        filters: [
          ['stage', '=', 'Closed Won'],
          ['close_date', '>=', 'THIS_QUARTER']
        ],
        groupBy: 'owner.name',
        aggregate: [
          { field: 'amount', function: 'sum', alias: 'total_revenue' },
          { field: 'id', function: 'count', alias: 'deals_closed' }
        ],
        orderBy: [
          { field: 'total_revenue', direction: 'desc' }
        ],
        limit: 10
      },
      columns: [
        { field: 'owner.name', label: 'Rep', width: 200 },
        { field: 'total_revenue', label: 'Revenue', width: 150, align: 'right', format: 'currency' },
        { field: 'deals_closed', label: 'Deals', width: 100, align: 'right' }
      ]
    },

    // Forecast vs Actual
    {
      id: 'forecast_vs_actual',
      type: 'chart',
      title: 'Forecast vs Actual Revenue',
      position: { row: 17, col: 7, width: 6, height: 4 },
      chartType: 'line',
      dataSource: {
        // This would use a custom data source combining forecast and actual data
        custom: true,
        handler: 'getForecastVsActual'
      },
      options: {
        xAxis: { label: 'Month' },
        yAxis: { label: 'Revenue ($)' },
        series: [
          { name: 'Forecast', color: '#60a5fa', style: 'dashed' },
          { name: 'Actual', color: '#10b981', style: 'solid' }
        ],
        showDataLabels: false
      }
    }
  ],

  // Dashboard-level filters
  filters: [
    {
      field: 'owner',
      label: 'Sales Rep',
      type: 'lookup',
      defaultValue: 'ALL'
    },
    {
      field: 'date_range',
      label: 'Date Range',
      type: 'daterange',
      defaultValue: 'THIS_QUARTER'
    },
    {
      field: 'region',
      label: 'Region',
      type: 'select',
      options: ['All', 'North America', 'Europe', 'APAC', 'LATAM']
    }
  ],

  // Auto-refresh configuration
  refresh: {
    enabled: true,
    interval: 300  // 5 minutes
  }
});

export default SalesDashboard;
