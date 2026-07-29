// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Dashboard } from '@objectstack/spec/ui';

/**
 * Executive Overview Dashboard
 *
 * High-level revenue, customer, and pipeline KPIs for company leadership.
 * Designed to mirror the polished CRM dashboard reference at
 * https://github.com/objectstack-ai/objectui/tree/main/examples/crm — using
 * the framework's first-class metadata fields (colorVariant, chartConfig,
 * header, dateRange, descriptions, action buttons) instead of raw hex colors.
 */
export const ExecutiveDashboard: Dashboard = {
  name: 'executive_dashboard',
  label: 'Executive Overview',
  description: 'High-level revenue, customer, and pipeline KPIs for leadership',

  columns: 12,
  gap: 4,
  refreshInterval: 300, // 5 minutes

  header: {
    showTitle: true,
    showDescription: true,
    // Header action buttons removed: they referenced actions/routes that were
    // never implemented (`export_dashboard_pdf`, `schedule_dashboard_email`,
    // `customize_dashboard` are not defined anywhere), so they rendered as dead
    // buttons. Re-add real, wired-up actions here if these features land.
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
    {
      field: 'lead_source',
      label: 'Lead Source',
      type: 'select',
      scope: 'dashboard',
      options: [
        { value: 'web',         label: 'Web' },
        { value: 'referral',    label: 'Referral' },
        { value: 'partner',     label: 'Partner' },
        { value: 'event',       label: 'Event' },
        { value: 'cold_call',   label: 'Cold Call' },
        { value: 'advertising', label: 'Advertising' },
      ],
    },
  ],

  widgets: [
    // ─── Row 1: Headline KPIs ─────────────────────────────────────────
    {
      id: 'total_revenue_ytd',
      title: 'Total Revenue (YTD)',
      description: 'Closed-won revenue this year',
      type: 'metric',
      filter: { stage: 'closed_won', close_date: { $gte: '{current_year_start}' } },
      colorVariant: 'success',
      actionUrl: '/reports/revenue-ytd',
      actionType: 'url',
      actionIcon: 'ArrowUpRight',
      dataset: 'opportunity_metrics', values: ['total_amount'],
      layout: { x: 0, y: 0, w: 3, h: 2 },
      options: {
        icon: 'DollarSign',
        trend: { value: 12.5, direction: 'up', label: 'vs last quarter' },
      },
    },
    {
      id: 'total_accounts',
      title: 'Active Accounts',
      description: 'Customers with at least one active relationship',
      type: 'metric',
      filter: { is_active: true },
      colorVariant: 'blue',
      actionUrl: '/objects/account',
      actionType: 'url',
      actionIcon: 'ArrowUpRight',
      // crm_account has neither `close_date` nor `lead_source`; opt this widget
      // out of both dashboard filters bound to those fields. ObjectStack 15
      // (framework#2501) injects every dashboard filter (dateRange + globalFilters)
      // into each widget's query, so a widget on an object lacking a filter field
      // fails with `no such column`. crm_account DOES have `owner`, so the owner
      // filter is left to apply.
      filterBindings: { dateRange: false, lead_source: false },
      dataset: 'account_metrics', values: ['account_count'],
      layout: { x: 3, y: 0, w: 3, h: 2 },
      options: {
        icon: 'Building2',
        format: '0,0',
        trend: { value: 3.4, direction: 'up', label: 'vs last quarter' },
      },
    },
    {
      id: 'total_contacts',
      title: 'Total Contacts',
      description: 'People in our address book',
      type: 'metric',
      colorVariant: 'purple',
      actionUrl: '/objects/contact',
      actionType: 'url',
      actionIcon: 'ArrowUpRight',
      filterBindings: { dateRange: false }, // crm_contact has no close_date — opt out of the date picker
      dataset: 'contact_metrics', values: ['contact_count'],
      layout: { x: 6, y: 0, w: 3, h: 2 },
      options: {
        icon: 'Users',
        format: '0,0',
        trend: { value: 5.8, direction: 'up', label: 'vs last quarter' },
      },
    },
    {
      id: 'open_leads',
      title: 'Open Leads',
      description: 'Unconverted leads in the funnel',
      type: 'metric',
      filter: { is_converted: false },
      colorVariant: 'orange',
      actionUrl: '/objects/lead',
      actionType: 'url',
      actionIcon: 'ArrowUpRight',
      filterBindings: { dateRange: false }, // crm_lead has no close_date — opt out of the date picker
      dataset: 'lead_metrics', values: ['lead_count'],
      layout: { x: 9, y: 0, w: 3, h: 2 },
      options: {
        icon: 'Sparkles',
        format: '0,0',
        trend: { value: 1.2, direction: 'down', label: 'vs last quarter' },
      },
    },

    // ─── Row 2: Revenue Analysis ──────────────────────────────────────
    {
      id: 'revenue_trend',
      title: 'Revenue Trend',
      description: 'Closed-won revenue over the last 12 months',
      type: 'area',
      filter: { stage: 'closed_won', close_date: { $gte: '{12_months_ago}' } },
      colorVariant: 'success',
      dataset: 'opportunity_metrics', dimensions: ['close_date'], values: ['total_amount'],
      layout: { x: 0, y: 2, w: 8, h: 4 },
      chartConfig: {
        type: 'area',
        title: 'Revenue Trend',
        subtitle: 'Last 12 months',
        showLegend: false,
        showDataLabels: false,
        colors: ['#10B981'],
        xAxis: { field: 'close_date', title: 'Month', showGridLines: false, logarithmic: false },
        yAxis: [{ field: 'total_amount', title: 'Revenue', format: '0,0', showGridLines: true, logarithmic: false }],
        interaction: { tooltips: true, zoom: false, brush: true },
      },
      options: { dateGranularity: 'month' },
    },
    {
      id: 'revenue_by_industry',
      title: 'Revenue by Industry',
      description: 'YTD closed-won revenue split by customer industry',
      type: 'donut',
      filter: { stage: 'closed_won', close_date: { $gte: '{current_year_start}' } },
      colorVariant: 'blue',
      dataset: 'opportunity_metrics', dimensions: ['account_industry'], values: ['total_amount'],
      layout: { x: 8, y: 2, w: 4, h: 4 },
      chartConfig: {
        type: 'donut',
        showLegend: true,
        showDataLabels: true,
        colors: ['#4F46E5', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
      },
    },

    // ─── Row 3: Pipeline & Activity ───────────────────────────────────
    {
      id: 'pipeline_by_stage',
      title: 'Pipeline by Stage',
      description: 'Open opportunity value by sales stage',
      type: 'funnel',
      filter: { stage: { $nin: ['closed_won', 'closed_lost'] } },
      colorVariant: 'teal',
      dataset: 'opportunity_metrics', dimensions: ['stage'], values: ['total_amount'],
      layout: { x: 0, y: 6, w: 6, h: 4 },
      chartConfig: {
        type: 'funnel',
        showLegend: false,
        showDataLabels: true,
        colors: ['#0EA5E9', '#06B6D4', '#14B8A6', '#10B981', '#22C55E'],
      },
    },
    {
      id: 'new_accounts_by_month',
      title: 'New Accounts',
      description: 'Account creation cadence — last 6 months',
      type: 'bar',
      filter: { created_at: { $gte: '{6_months_ago}' } },
      colorVariant: 'purple',
      filterBindings: { dateRange: false, lead_source: false }, // crm_account has no close_date/lead_source; scopes itself by created_at
      dataset: 'account_metrics', dimensions: ['created_at'], values: ['account_count'],
      layout: { x: 6, y: 6, w: 6, h: 4 },
      chartConfig: {
        type: 'bar',
        showLegend: false,
        showDataLabels: true,
        colors: ['#8B5CF6'],
        xAxis: { field: 'created_at', title: 'Month', showGridLines: false, logarithmic: false },
        yAxis: [{ field: 'account_count', title: 'New accounts', showGridLines: true, logarithmic: false }],
      },
      options: { dateGranularity: 'month' },
    },

    // ─── Row 4: Revenue by Industry ───────────────────────────────────
    // A dashboard `table` binds to an analytics cube, so it aggregates rather
    // than listing raw accounts (ADR-0021). The previous "Top Accounts by
    // Revenue" table selected only the `account_count` measure with no
    // dimension — a single summary row, not a customer ranking. Grouping by
    // industry gives a real multi-row breakdown of book-of-business by sector;
    // for a per-account list, use an object-bound ListView (ADR-0017).
    {
      id: 'accounts_by_industry',
      title: 'Accounts by Industry',
      description: 'Total annual revenue and account count per industry',
      type: 'table',
      colorVariant: 'default',
      filterBindings: { dateRange: false, lead_source: false }, // crm_account has no close_date/lead_source — opt out of both
      dataset: 'account_metrics', dimensions: ['industry'], values: ['annual_revenue_sum', 'account_count'],
      layout: { x: 0, y: 10, w: 12, h: 4 },
      options: {
        columns: [
          { header: 'Industry',        accessorKey: 'industry' },
          { header: 'Annual Revenue',  accessorKey: 'annual_revenue_sum', format: '0,0' },
          { header: 'Accounts',        accessorKey: 'account_count' },
        ],
        sortBy: 'annual_revenue_sum',
        sortOrder: 'desc',
        limit: 10,
        striped: true,
        density: 'comfortable',
      },
    },
  ],
};
