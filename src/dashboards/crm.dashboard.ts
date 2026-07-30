// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Dashboard } from '@objectstack/spec/ui';
import { avgDealSizeMetricWidget, pipelineByStageFunnelWidget } from './shared-widgets';

/**
 * CRM Overview Dashboard
 *
 * Single-page snapshot of revenue, pipeline, and customer activity. Designed
 * to mirror the polished CRM dashboard reference at
 * https://github.com/objectstack-ai/objectui/tree/main/examples/crm/src/dashboards
 * — KPI tiles with trend indicators and icons, an area-chart revenue trend, a
 * lead-source donut, a pipeline funnel, and a recent-deals table.
 *
 * This dashboard intentionally uses the framework's first-class metadata fields
 * (colorVariant, chartConfig, header, dateRange, descriptions, action buttons)
 * rather than ad-hoc hex strings stuffed into `options.color`.
 */
export const CrmOverviewDashboard: Dashboard = {
  name: 'crm_overview_dashboard',
  label: 'CRM Overview',
  description: 'Revenue metrics, pipeline analytics, and deal insights',

  columns: 12,
  gap: 4,
  refreshInterval: 300,

  header: {
    showTitle: true,
    showDescription: true,
    // Header action buttons removed: `create_opportunity` / `create_lead` are not
    // defined actions and `/reports` is not an in-app view route — all three were
    // dead. Re-add real, wired-up actions here when available.
  },

  dateRange: {
    field: 'close_date',
    defaultRange: 'this_quarter',
    allowCustomRange: true,
  },

  globalFilters: [
    {
      field: 'owner',
      label: 'Owner',
      type: 'lookup',
      scope: 'dashboard',
      optionsFrom: { object: 'sys_user', valueField: 'id', labelField: 'name' },
    },
  ],

  widgets: [
    // ─── KPI Row ──────────────────────────────────────────────────────
    {
      id: 'total_revenue',
      title: 'Total Revenue',
      description: 'Closed-won revenue this period',
      type: 'metric',
      filter: { stage: 'closed_won' },
      colorVariant: 'success',
      dataset: 'opportunity_metrics', values: ['total_amount'],
      layout: { x: 0, y: 0, w: 3, h: 2 },
      options: {
        icon: 'DollarSign',
        trend: { value: 12.5, direction: 'up', label: 'vs last month' },
      },
    },
    {
      id: 'active_deals',
      title: 'Active Deals',
      description: 'Open opportunities in the pipeline',
      type: 'metric',
      filter: { stage: { $nin: ['closed_won', 'closed_lost'] } },
      colorVariant: 'blue',
      dataset: 'opportunity_metrics', values: ['opp_count'],
      layout: { x: 3, y: 0, w: 3, h: 2 },
      options: {
        icon: 'Briefcase',
        format: '0,0',
        trend: { value: 2.1, direction: 'down', label: 'vs last month' },
      },
    },
    {
      id: 'won_deals',
      title: 'Won Deals',
      description: 'Closed-won deals this period',
      type: 'metric',
      filter: { stage: 'closed_won' },
      colorVariant: 'purple',
      dataset: 'opportunity_metrics', values: ['opp_count'],
      layout: { x: 6, y: 0, w: 3, h: 2 },
      options: {
        icon: 'Trophy',
        format: '0,0',
        trend: { value: 4.3, direction: 'up', label: 'vs last month' },
      },
    },
    avgDealSizeMetricWidget({ x: 9, y: 0, w: 3, h: 2 }, {
      options: {
        icon: 'bar-chart',
        trend: { value: 1.2, direction: 'up', label: 'vs last month' },
      },
    }),

    // ─── Charts Row 1 ─────────────────────────────────────────────────
    {
      id: 'revenue_trends',
      title: 'Revenue Trends',
      description: 'Closed-won revenue over the last 12 months',
      type: 'area',
      filter: { stage: 'closed_won', close_date: { $gte: '{12_months_ago}' } },
      filterBindings: { dateRange: false }, // self-scoped to 12 months — the date picker must not narrow it
      colorVariant: 'success',
      dataset: 'opportunity_metrics', dimensions: ['close_date'], values: ['total_amount'],
      layout: { x: 0, y: 2, w: 9, h: 4 },
      chartConfig: {
        type: 'area',
        showLegend: false,
        showDataLabels: false,
        colors: ['#10B981'],
        xAxis: { field: 'close_date', title: 'Month', showGridLines: false, logarithmic: false },
        yAxis: [{ field: 'total_amount', title: 'Revenue', format: '0,0', showGridLines: true, logarithmic: false }],
        interaction: { tooltips: true, brush: true, zoom: false },
      },
      options: { dateGranularity: 'month' },
    },
    {
      id: 'lead_source',
      title: 'Lead Source',
      description: 'Pipeline value by acquisition channel',
      type: 'donut',
      colorVariant: 'purple',
      dataset: 'opportunity_metrics', dimensions: ['lead_source'], values: ['total_amount'],
      layout: { x: 9, y: 2, w: 3, h: 4 },
      chartConfig: {
        type: 'donut',
        showLegend: true,
        showDataLabels: true,
        colors: ['#4F46E5', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
      },
    },

    // ─── Charts Row 2 ─────────────────────────────────────────────────
    pipelineByStageFunnelWidget({ x: 0, y: 6, w: 6, h: 4 }),
    {
      id: 'top_products',
      title: 'Top Products',
      description: 'Total list-price revenue by product category',
      type: 'bar',
      colorVariant: 'blue',
      // crm_product has neither `close_date` nor `owner`; opt out of both
      // dashboard filters bound to those fields. ObjectStack 15 (framework#2501)
      // injects every dashboard filter (dateRange + globalFilters) into each
      // widget's query, so a widget on an object lacking a filter field fails
      // with `no such column`.
      filterBindings: { dateRange: false, owner: false },
      dataset: 'product_metrics', dimensions: ['category'], values: ['list_price_sum'],
      layout: { x: 6, y: 6, w: 6, h: 4 },
      chartConfig: {
        type: 'bar',
        showLegend: false,
        showDataLabels: true,
        colors: ['#4F46E5'],
        xAxis: { field: 'category', title: 'Category', showGridLines: false, logarithmic: false },
        yAxis: [{ field: 'list_price_sum', title: 'Revenue', format: '0,0', showGridLines: true, logarithmic: false }],
      },
    },

    // ─── Pipeline by Owner ────────────────────────────────────────────
    // A dashboard `table` binds to an analytics dataset (a cube), so it must
    // aggregate — it cannot list raw records (ADR-0021). The previous
    // "Recent Opportunities" table selected only the `opp_count` measure with
    // no dimension, which renders a single summary row, not a per-deal list.
    // For a true per-record listing, surface an object-bound ListView through
    // app navigation instead (ADR-0017). Here we group by owner for a rep
    // pipeline breakdown that renders one row per owner.
    {
      id: 'pipeline_by_owner',
      title: 'Pipeline by Owner',
      description: 'Open pipeline value and deal count per sales rep',
      type: 'table',
      filter: { stage: { $nin: ['closed_won', 'closed_lost'] } },
      colorVariant: 'default',
      dataset: 'opportunity_metrics', dimensions: ['owner'], values: ['total_amount', 'opp_count', 'avg_amount'],
      layout: { x: 0, y: 10, w: 12, h: 4 },
      options: {
        columns: [
          { header: 'Owner',         accessorKey: 'owner' },
          { header: 'Pipeline',      accessorKey: 'total_amount', format: '0,0' },
          { header: 'Opportunities', accessorKey: 'opp_count' },
          { header: 'Avg Deal Size', accessorKey: 'avg_amount', format: '0,0' },
        ],
        sortBy: 'total_amount',
        sortOrder: 'desc',
        limit: 10,
        striped: true,
        density: 'comfortable',
      },
    },
  ],
};
