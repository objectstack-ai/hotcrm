// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Dashboard } from '@objectstack/spec/ui';

/**
 * Sales Performance Dashboard
 *
 * Pipeline analytics, win rate trends, and rep performance for the sales team.
 * Modeled after the polished CRM dashboard reference at
 * https://github.com/objectstack-ai/objectui/tree/main/examples/crm.
 */
export const SalesDashboard: Dashboard = {
  name: 'sales_dashboard',
  label: 'Sales Performance',
  description: 'Pipeline analytics, win rate trends, and rep performance',

  columns: 12,
  gap: 4,
  refreshInterval: 180, // 3 minutes

  header: {
    showTitle: true,
    showDescription: true,
    // Header action buttons removed: `create_opportunity` / `export_dashboard_pdf`
    // are not defined actions, and `/reports/forecast` matches no report route —
    // all three were dead. Re-add real, wired-up actions here when available.
  },

  dateRange: {
    field: 'close_date',
    defaultRange: 'this_quarter',
    allowCustomRange: true,
  },

  globalFilters: [
    {
      field: 'owner',
      label: 'Sales Rep',
      type: 'lookup',
      scope: 'dashboard',
      optionsFrom: { object: 'user', valueField: 'id', labelField: 'name' },
    },
    {
      field: 'type',
      label: 'Deal Type',
      type: 'select',
      scope: 'dashboard',
      options: [
        { value: 'new_business',       label: 'New Business' },
        { value: 'existing_upgrade',   label: 'Existing Customer - Upgrade' },
        { value: 'existing_renewal',   label: 'Existing Customer - Renewal' },
        { value: 'existing_expansion', label: 'Existing Customer - Expansion' },
      ],
    },
  ],

  widgets: [
    // ─── Row 1: Pipeline KPIs ─────────────────────────────────────────
    {
      id: 'total_pipeline_value',
      title: 'Total Pipeline',
      description: 'Sum of open opportunity value',
      type: 'metric',
      filter: { stage: { $nin: ['closed_won', 'closed_lost'] } },
      colorVariant: 'blue',
      actionUrl: '/objects/opportunity?filter=open',
      actionType: 'url',
      actionIcon: 'ArrowUpRight',
      dataset: 'opportunity_metrics', values: ['total_amount'],
      layout: { x: 0, y: 0, w: 3, h: 2 },
      options: {
        icon: 'DollarSign',
        format: '0,0',
        trend: { value: 8.4, direction: 'up', label: 'vs last quarter' },
      },
    },
    {
      id: 'closed_won_qtd',
      title: 'Closed Won (QTD)',
      description: 'Revenue closed this quarter',
      type: 'metric',
      filter: { stage: 'closed_won', close_date: { $gte: '{current_quarter_start}' } },
      filterBindings: { dateRange: false }, // self-scoped to QTD — the date picker must not re-window it
      colorVariant: 'success',
      actionUrl: '/reports/closed-won',
      actionType: 'url',
      actionIcon: 'ArrowUpRight',
      dataset: 'opportunity_metrics', values: ['total_amount'],
      layout: { x: 3, y: 0, w: 3, h: 2 },
      options: {
        icon: 'Trophy',
        format: '0,0',
        trend: { value: 14.7, direction: 'up', label: 'vs last quarter' },
      },
    },
    {
      id: 'open_opportunities',
      title: 'Open Opportunities',
      description: 'Active deals in flight',
      type: 'metric',
      filter: { stage: { $nin: ['closed_won', 'closed_lost'] } },
      colorVariant: 'orange',
      actionUrl: '/objects/opportunity?filter=open',
      actionType: 'url',
      actionIcon: 'ArrowUpRight',
      dataset: 'opportunity_metrics', values: ['opp_count'],
      layout: { x: 6, y: 0, w: 3, h: 2 },
      options: {
        icon: 'Briefcase',
        format: '0,0',
        trend: { value: 2.1, direction: 'down', label: 'vs last quarter' },
      },
    },
    {
      id: 'avg_deal_size',
      title: 'Avg Deal Size',
      description: 'Average value of closed-won deals this quarter',
      type: 'metric',
      filter: { stage: 'closed_won', close_date: { $gte: '{current_quarter_start}' } },
      filterBindings: { dateRange: false }, // self-scoped to QTD — the date picker must not re-window it
      colorVariant: 'purple',
      actionUrl: '/reports/avg-deal-size',
      actionType: 'url',
      actionIcon: 'ArrowUpRight',
      dataset: 'opportunity_metrics', values: ['avg_amount'],
      layout: { x: 9, y: 0, w: 3, h: 2 },
      options: {
        icon: 'bar-chart',
        format: '0,0',
        trend: { value: 4.3, direction: 'up', label: 'vs last quarter' },
      },
    },

    // ─── Row 2: Pipeline & Trends ─────────────────────────────────────
    {
      id: 'pipeline_by_stage',
      title: 'Pipeline by Stage',
      description: 'Open opportunity value at each sales stage',
      type: 'funnel',
      filter: { stage: { $nin: ['closed_won', 'closed_lost'] } },
      colorVariant: 'teal',
      dataset: 'opportunity_metrics', dimensions: ['stage'], values: ['total_amount'],
      layout: { x: 0, y: 2, w: 6, h: 4 },
      chartConfig: {
        type: 'funnel',
        showLegend: false,
        showDataLabels: true,
        colors: ['#0EA5E9', '#06B6D4', '#14B8A6', '#10B981', '#22C55E'],
      },
    },
    {
      id: 'monthly_revenue_trend',
      title: 'Monthly Revenue Trend',
      description: 'Closed-won revenue, last 12 months',
      type: 'area',
      filter: { stage: 'closed_won', close_date: { $gte: '{12_months_ago}' } },
      filterBindings: { dateRange: false }, // self-scoped to 12 months — the date picker must not narrow it
      colorVariant: 'success',
      dataset: 'opportunity_metrics', dimensions: ['close_date'], values: ['total_amount'],
      layout: { x: 6, y: 2, w: 6, h: 4 },
      chartConfig: {
        type: 'area',
        showLegend: false,
        showDataLabels: false,
        colors: ['#10B981'],
        xAxis: { field: 'close_date', title: 'Month', showGridLines: false, logarithmic: false },
        yAxis: [{ field: 'total_amount', title: 'Revenue', format: '0,0', showGridLines: true, logarithmic: false }],
        annotations: [
          { type: 'line', axis: 'y', value: 100000, label: 'Quota', style: 'dashed', color: '#F59E0B' },
        ],
        interaction: { tooltips: true, brush: true, zoom: false },
      },
      options: { dateGranularity: 'month' },
    },

    // ─── Row 3: Performance Breakdown ─────────────────────────────────
    {
      id: 'pipeline_by_forecast_category',
      title: 'Pipeline by Forecast Category',
      description: 'Open pipeline grouped by sales forecast category',
      type: 'horizontal-bar',
      filter: { stage: { $nin: ['closed_won', 'closed_lost'] } },
      colorVariant: 'blue',
      dataset: 'opportunity_metrics', dimensions: ['forecast_category'], values: ['total_amount'],
      layout: { x: 0, y: 6, w: 6, h: 4 },
      chartConfig: {
        type: 'horizontal-bar',
        showLegend: false,
        showDataLabels: true,
        colors: ['#4F46E5'],
        xAxis: { field: 'forecast_category', title: 'Forecast', showGridLines: false, logarithmic: false },
        yAxis: [{ field: 'total_amount', title: 'Pipeline value', format: '0,0', showGridLines: true, logarithmic: false }],
      },
    },
    {
      id: 'lead_source_breakdown',
      title: 'Lead Source',
      description: 'Where our pipeline is coming from',
      type: 'donut',
      filter: { stage: { $nin: ['closed_lost'] } },
      colorVariant: 'purple',
      dataset: 'opportunity_metrics', dimensions: ['lead_source'], values: ['total_amount'],
      layout: { x: 6, y: 6, w: 6, h: 4 },
      chartConfig: {
        type: 'donut',
        showLegend: true,
        showDataLabels: true,
        colors: ['#4F46E5', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
      },
    },

    // ─── Row 4: Rep Leaderboard ───────────────────────────────────────
    // A dashboard `table` binds to an analytics cube and aggregates; it cannot
    // list raw deals (ADR-0021). The previous "Top Open Opportunities" table
    // selected only `opp_count` with no dimension — one summary row, not a deal
    // ranking. Grouping open pipeline by owner yields a rep leaderboard (one
    // row per rep). For a per-deal list, surface an object-bound ListView
    // through app navigation (ADR-0017).
    {
      id: 'open_pipeline_by_owner',
      title: 'Open Pipeline by Owner',
      description: 'In-flight pipeline value, deal count and avg win probability per rep',
      type: 'table',
      filter: { stage: { $nin: ['closed_won', 'closed_lost'] } },
      colorVariant: 'default',
      dataset: 'opportunity_metrics', dimensions: ['owner'], values: ['total_amount', 'opp_count', 'avg_probability'],
      layout: { x: 0, y: 10, w: 12, h: 4 },
      options: {
        columns: [
          { header: 'Owner',         accessorKey: 'owner' },
          { header: 'Open Pipeline', accessorKey: 'total_amount', format: '0,0' },
          { header: 'Open Deals',    accessorKey: 'opp_count' },
          { header: 'Avg Win Prob.', accessorKey: 'avg_probability', format: '0%' },
        ],
        sortBy: 'total_amount',
        sortOrder: 'desc',
        limit: 10,
        striped: true,
        density: 'comfortable',
      },
    },

    // ─── Row 5: Pivot — Stage × Lead Source ───────────────────────────
    {
      id: 'pipeline_stage_by_source',
      title: 'Pipeline by Stage × Lead Source',
      description: 'Cross-tab of open opportunity amount by stage and source',
      type: 'pivot',
      filter: { stage: { $nin: ['closed_won', 'closed_lost'] } },
      colorVariant: 'default',
      dataset: 'opportunity_metrics', dimensions: ['stage', 'lead_source'], values: ['total_amount'],
      layout: { x: 0, y: 14, w: 12, h: 4 },
      options: {
        rowField: 'stage',
        columnField: 'lead_source',
        valueField: 'amount',
        aggregation: 'sum',
        showRowTotals: true,
        showColumnTotals: true,
        format: '0,0',
        drillDown: {
          enabled: true,
          // Clicking a pivot cell opens a drawer listing the underlying
          // opportunity records for that stage + lead-source slice — the
          // same drill-through pattern used by the other dashboard widgets.
          target: 'drawer',
          columns: ['name', 'crm_account', 'amount', 'forecast_category', 'close_date', 'owner'],
          maxRows: 100,
        },
      },
    },
  ],
};
