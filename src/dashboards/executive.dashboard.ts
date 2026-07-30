// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Dashboard } from '@objectstack/spec/ui';
import { pipelineByStageFunnelWidget } from './shared-widgets';

/**
 * Executive Overview Dashboard
 *
 * High-level revenue, customer, and pipeline KPIs for company leadership.
 *
 * Widgets here are dataset-bound (ADR-0021), and the console's dataset widget
 * reads ONLY: type, dataset, dimensions, values, filter, filterBindings, and
 * layout. It builds charts and tables from the dataset's own field metadata
 * (labels, formats), so per-widget `chartConfig`, `colorVariant`, widget-level
 * `action*`, and free-form `options` (icons, formats, static trends, table
 * column specs) are never read — don't re-add them. In particular, metric-tile
 * trend deltas must come from real comparison queries (widget `compareTo`)
 * once the renderer supports them for dataset metrics; hardcoded percentages
 * previously carried here were fabrications and were removed (#500).
 * Date bucketing is likewise server-side (a dataset dimension's
 * `dateGranularity`, not widget options) — but see the note in
 * `opportunity_metrics` for why the trend widgets still group by raw dates.
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
      // Self-scoped to YTD; without this the injected dashboard dateRange
      // (default this_quarter) is ANDed in and the tile shows quarter revenue.
      filterBindings: { dateRange: false },
      dataset: 'opportunity_metrics', values: ['total_amount'],
      layout: { x: 0, y: 0, w: 3, h: 2 },
    },
    {
      id: 'total_accounts',
      title: 'Active Accounts',
      description: 'Customers with at least one active relationship',
      type: 'metric',
      filter: { is_active: true },
      // crm_account has neither `close_date` nor `lead_source`; opt this widget
      // out of both dashboard filters bound to those fields. ObjectStack 15
      // (framework#2501) injects every dashboard filter (dateRange + globalFilters)
      // into each widget's query, so a widget on an object lacking a filter field
      // fails with `no such column`. crm_account DOES have `owner`, so the owner
      // filter is left to apply.
      filterBindings: { dateRange: false, lead_source: false },
      dataset: 'account_metrics', values: ['account_count'],
      layout: { x: 3, y: 0, w: 3, h: 2 },
    },
    {
      id: 'total_contacts',
      title: 'Total Contacts',
      description: 'People in our address book',
      type: 'metric',
      filterBindings: { dateRange: false }, // crm_contact has no close_date — opt out of the date picker
      dataset: 'contact_metrics', values: ['contact_count'],
      layout: { x: 6, y: 0, w: 3, h: 2 },
    },
    {
      id: 'open_leads',
      title: 'Open Leads',
      description: 'Unconverted leads in the funnel',
      type: 'metric',
      filter: { is_converted: false },
      filterBindings: { dateRange: false }, // crm_lead has no close_date — opt out of the date picker
      dataset: 'lead_metrics', values: ['lead_count'],
      layout: { x: 9, y: 0, w: 3, h: 2 },
    },

    // ─── Row 2: Revenue Analysis ──────────────────────────────────────
    {
      id: 'revenue_trend',
      title: 'Revenue Trend',
      description: 'Closed-won revenue over the last 12 months',
      type: 'area',
      filter: { stage: 'closed_won', close_date: { $gte: '{12_months_ago}' } },
      filterBindings: { dateRange: false }, // self-scoped to 12 months — the date picker must not narrow it
      dataset: 'opportunity_metrics', dimensions: ['close_date'], values: ['total_amount'],
      layout: { x: 0, y: 2, w: 8, h: 4 },
      // Default rendering is intentional: the dataset widget plots the selected
      // dimension × values directly; a chartConfig would duplicate them inertly.
      suppressWarnings: ['chart-config-missing'],
    },
    {
      id: 'revenue_by_industry',
      title: 'Revenue by Industry',
      description: 'YTD closed-won revenue split by customer industry',
      type: 'donut',
      filter: { stage: 'closed_won', close_date: { $gte: '{current_year_start}' } },
      filterBindings: { dateRange: false }, // self-scoped to YTD — the date picker must not narrow it
      dataset: 'opportunity_metrics', dimensions: ['account_industry'], values: ['total_amount'],
      layout: { x: 8, y: 2, w: 4, h: 4 },
      suppressWarnings: ['chart-config-missing'], // intentional default rendering (see revenue_trend)
    },

    // ─── Row 3: Pipeline & Activity ───────────────────────────────────
    // The funnel now comes from the shared factory (#539); its remaining inert
    // config lives in shared-widgets.ts and is out of this PR's scope.
    pipelineByStageFunnelWidget({ x: 0, y: 6, w: 6, h: 4 }),
    {
      id: 'new_accounts_by_month',
      title: 'New Accounts',
      description: 'Account creation cadence — last 6 months',
      type: 'bar',
      filter: { created_at: { $gte: '{6_months_ago}' } },
      filterBindings: { dateRange: false, lead_source: false }, // crm_account has no close_date/lead_source; scopes itself by created_at
      dataset: 'account_metrics', dimensions: ['created_at'], values: ['account_count'],
      layout: { x: 6, y: 6, w: 6, h: 4 },
      suppressWarnings: ['chart-config-missing'], // intentional default rendering (see revenue_trend)
    },

    // ─── Row 4: Revenue by Industry ───────────────────────────────────
    // A dashboard `table` binds to an analytics cube, so it aggregates rather
    // than listing raw accounts (ADR-0021). The previous "Top Accounts by
    // Revenue" table selected only the `account_count` measure with no
    // dimension — a single summary row, not a customer ranking. Grouping by
    // industry gives a real multi-row breakdown of book-of-business by sector;
    // for a per-account list, use an object-bound ListView (ADR-0017).
    // Column headers and number formats come from the dataset's dimension and
    // measure metadata.
    {
      id: 'accounts_by_industry',
      title: 'Accounts by Industry',
      description: 'Total annual revenue and account count per industry',
      type: 'table',
      filterBindings: { dateRange: false, lead_source: false }, // crm_account has no close_date/lead_source — opt out of both
      dataset: 'account_metrics', dimensions: ['industry'], values: ['annual_revenue_sum', 'account_count'],
      layout: { x: 0, y: 10, w: 12, h: 4 },
    },
  ],
};
