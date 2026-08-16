// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Dashboard } from '@objectstack/spec/ui';

/**
 * Customer Service Dashboard
 *
 * Case load, SLA health, and resolution performance for the support team.
 * Uses semantic colorVariant tokens (warning/danger/success) and chartConfig
 * palettes instead of raw hex values, mirroring the polished CRM dashboard
 * reference at https://github.com/objectstack-ai/objectui/tree/main/examples/crm.
 *
 * No KPI tile declares a `trend`. A period-over-period delta is a measurement,
 * so it has to come from a real comparison query (widget `compareTo`) once the
 * renderer supports it for dataset metrics — the percentages this file used to
 * carry were typed by hand and recomputed by nothing, so they kept asserting
 * the same "-6.2% vs last week" on any data, including an empty database.
 * Same rule as the executive dashboard (#500, #587).
 */
export const ServiceDashboard: Dashboard = {
  name: 'service_dashboard',
  label: 'Customer Service',
  description: 'Case load, SLA health, and resolution performance',

  columns: 12,
  gap: 4,
  refreshInterval: 60, // 1 minute — service desks need fresh numbers

  header: {
    showTitle: true,
    showDescription: true,
    // Header action buttons removed: `create_case` is not a defined action and
    // `/objects/case?owner=current_user` / `/reports/sla` are not in-app view
    // routes — all three were dead. Re-add real, wired-up actions here when available.
  },

  // Historical note (#460 → #1157): this dashboard shipped without a date
  // picker from PR #546 until the 17.0.0 GA upgrade, because windowing a
  // `Field.datetime()` could not be compared — `driver-sql` 16.1.0 coerced
  // datetime bounds to epoch-ms INTEGER while every datetime in the database is
  // ISO TEXT, so `$gte` matched everything and `$lte` matched nothing and the
  // whole dashboard read zeros. Both named preconditions are fixed and
  // released: objectstack#3912 (the coercion) and objectstack#3777 (a bare-date
  // `$lte` dropping same-day rows). The window below is not restored on the
  // strength of those closures alone — `test/dashboard-date-range-window.test.ts`
  // executes it against a real SQLite database and compares every widget to a
  // ground truth computed in the same run, so a re-regression fails CI here
  // rather than being discovered as an all-zero dashboard again.
  dateRange: { field: 'created_date', defaultRange: 'last_90_days', allowCustomRange: true },

  globalFilters: [
    {
      field: 'owner_id',
      label: 'Agent',
      type: 'lookup',
      scope: 'dashboard',
      optionsFrom: { object: 'sys_user', valueField: 'id', labelField: 'name' },
    },
    {
      field: 'priority',
      label: 'Priority',
      type: 'select',
      scope: 'dashboard',
      options: [
        { value: 'critical', label: 'Critical' },
        { value: 'high',     label: 'High' },
        { value: 'medium',   label: 'Medium' },
        { value: 'low',      label: 'Low' },
      ],
    },
  ],

  widgets: [
    // ─── Row 1: Case-Load KPIs ────────────────────────────────────────
    {
      id: 'open_cases',
      title: 'Open Cases',
      description: 'Cases that are not yet closed',
      type: 'metric',
      filter: { is_closed: false },
      colorVariant: 'orange',
      dataset: 'case_metrics', values: ['case_count'],
      layout: { x: 0, y: 0, w: 3, h: 2 },
      options: {
        icon: 'Inbox',
        format: '0,0',
      },
    },
    {
      id: 'critical_cases',
      title: 'Critical Cases',
      description: 'Open cases marked as critical priority',
      type: 'metric',
      filter: { priority: 'critical', is_closed: false },
      colorVariant: 'danger',
      dataset: 'case_metrics', values: ['case_count'],
      layout: { x: 3, y: 0, w: 3, h: 2 },
      options: {
        icon: 'AlertTriangle',
        format: '0,0',
      },
    },
    {
      id: 'avg_resolution_time',
      title: 'Avg Resolution Time',
      description: 'Mean time to close, in hours',
      type: 'metric',
      filter: { is_closed: true },
      colorVariant: 'blue',
      dataset: 'case_metrics', values: ['avg_resolution'],
      layout: { x: 6, y: 0, w: 3, h: 2 },
      options: {
        icon: 'Clock',
        format: '0.0',
        suffix: 'h',
      },
    },
    {
      id: 'sla_violations',
      title: 'SLA Violations',
      description: 'Cases that breached their SLA',
      type: 'metric',
      filter: { is_sla_violated: true },
      colorVariant: 'warning',
      dataset: 'case_metrics', values: ['case_count'],
      layout: { x: 9, y: 0, w: 3, h: 2 },
      options: {
        icon: 'ShieldAlert',
        format: '0,0',
      },
    },

    // ─── Row 2: Distribution ──────────────────────────────────────────
    {
      id: 'cases_by_status',
      title: 'Cases by Status',
      description: 'Workload distribution across the pipeline',
      type: 'donut',
      filter: { is_closed: false },
      colorVariant: 'blue',
      dataset: 'case_metrics', dimensions: ['status'], values: ['case_count'],
      layout: { x: 0, y: 2, w: 4, h: 4 },
      chartConfig: {
        type: 'donut',
        showLegend: true,
        showDataLabels: true,
        colors: ['#0EA5E9', '#06B6D4', '#14B8A6', '#10B981', '#F59E0B'],
      },
    },
    {
      id: 'cases_by_priority',
      title: 'Cases by Priority',
      description: 'Open case mix by urgency',
      type: 'pie',
      filter: { is_closed: false },
      colorVariant: 'warning',
      dataset: 'case_metrics', dimensions: ['priority'], values: ['case_count'],
      layout: { x: 4, y: 2, w: 4, h: 4 },
      chartConfig: {
        type: 'pie',
        showLegend: true,
        showDataLabels: true,
        // critical → high → medium → low
        colors: ['#DC2626', '#F97316', '#F59E0B', '#10B981'],
      },
    },
    {
      id: 'cases_by_origin',
      title: 'Cases by Origin',
      description: 'Where our cases are coming from',
      type: 'bar',
      colorVariant: 'purple',
      dataset: 'case_metrics', dimensions: ['origin'], values: ['case_count'],
      layout: { x: 8, y: 2, w: 4, h: 4 },
      chartConfig: {
        type: 'bar',
        showLegend: false,
        showDataLabels: true,
        colors: ['#8B5CF6'],
        xAxis: { field: 'origin', title: 'Channel', showGridLines: false, logarithmic: false },
        yAxis: [{ field: 'case_count', title: 'Cases', showGridLines: true, logarithmic: false }],
      },
    },

    // ─── Row 3: Volume & SLA Trends ───────────────────────────────────
    {
      id: 'daily_case_volume',
      title: 'Daily Case Volume',
      description: 'New cases created over the last 30 days',
      type: 'area',
      filter: { created_date: { $gte: '{30_days_ago}' } },
      // Opted out ON PURPOSE, re-decided in #1157 rather than inherited.
      //
      // The floor above is no longer inert: on 17.0.0 `{30_days_ago}` resolves
      // to a start-of-day bound the driver compares correctly (measured, with a
      // ground truth, in `test/dashboard-date-range-window.test.ts`), so this
      // chart really does plot the last 30 days and its title is true again.
      // That is exactly why it must not follow the picker: the dashboard range
      // is ANDed into every bound widget, so a reader who selects "last 7 days"
      // would get a 7-day chart still labelled "last 30 days". Self-described
      // windows opt out — the same rule the Executive dashboard's YTD tile
      // follows, pinned by `test/action-references.test.ts`. Binding it instead
      // would mean dropping this filter and retitling the widget in all four
      // locale bundles; the fixed 30-day volume trend beside a 90-day case load
      // is the intended reading.
      filterBindings: { dateRange: false },
      colorVariant: 'blue',
      dataset: 'case_metrics', dimensions: ['created_date'], values: ['case_count'],
      layout: { x: 0, y: 6, w: 8, h: 4 },
      chartConfig: {
        type: 'area',
        showLegend: false,
        showDataLabels: false,
        colors: ['#0EA5E9'],
        xAxis: { field: 'created_date', title: 'Day', showGridLines: false, logarithmic: false },
        yAxis: [{ field: 'case_count', title: 'Cases opened', showGridLines: true, logarithmic: false }],
        interaction: { tooltips: true, brush: true },
      },
      options: { dateGranularity: 'day' },
    },
    {
      id: 'sla_compliance_gauge',
      title: 'SLA Compliance',
      description: 'Percent of cases resolved within SLA this period',
      type: 'gauge',
      filter: { is_closed: true },
      colorVariant: 'success',
      dataset: 'case_metrics', values: ['avg_sla_violated'],
      layout: { x: 8, y: 6, w: 4, h: 4 },
      chartConfig: {
        type: 'gauge',
        showLegend: false,
        showDataLabels: true,
        colors: ['#10B981', '#F59E0B', '#EF4444'],
        annotations: [
          { type: 'line', axis: 'y', value: 0.95, label: 'Target', style: 'dashed', color: '#10B981' },
        ],
      },
      options: {
        format: '0%',
        invert: true, // value is sla_violated rate; gauge shows compliance = 1 - rate
        thresholds: [
          { value: 0.95, color: 'success' },
          { value: 0.85, color: 'warning' },
          { value: 0,    color: 'danger' },
        ],
      },
    },

    // ─── Row 4: Knowledge deflection (#601) ───────────────────────────
    //
    // The deflection metric the card asks the service dashboard to show, and
    // the reason it is THREE tiles rather than one: a ratio widget on its own
    // is unreadable — 100% could be "40 of 40" or "1 of 1", and a blank rate
    // could be "no closed cases" or "no KB resolutions" (measured: a filtered
    // measure contributes NO row for a group it selects nothing in, so the
    // rate comes back absent, not 0). Numerator and denominator therefore ship
    // beside the percentage, the same rule the sales dashboard's win rate
    // follows after #614.
    {
      id: 'kb_deflection_rate',
      title: 'KB Deflection Rate',
      description: 'Share of closed cases resolved with a knowledge article',
      type: 'metric',
      colorVariant: 'success',
      dataset: 'case_metrics', values: ['kb_deflection_rate'],
      layout: { x: 0, y: 10, w: 4, h: 2 },
      options: { icon: 'BookOpenCheck', format: '0%' },
    },
    {
      id: 'kb_resolved_cases',
      title: 'Resolved by KB',
      description: 'Closed cases pointing at the article that resolved them',
      type: 'metric',
      colorVariant: 'blue',
      dataset: 'case_metrics', values: ['kb_resolved_count'],
      layout: { x: 4, y: 10, w: 4, h: 2 },
      options: { icon: 'BookOpen', format: '0,0' },
    },
    {
      id: 'closed_cases_total',
      title: 'Closed Cases',
      description: 'The denominator behind the deflection rate',
      type: 'metric',
      colorVariant: 'default',
      dataset: 'case_metrics', values: ['closed_count'],
      layout: { x: 8, y: 10, w: 4, h: 2 },
      options: { icon: 'CheckCheck', format: '0,0' },
    },
    {
      id: 'top_resolving_articles',
      title: 'Top Resolving Articles',
      description: 'Knowledge articles ranked by the closed cases they resolved',
      type: 'table',
      filter: { is_closed: true },
      colorVariant: 'default',
      dataset: 'case_metrics', dimensions: ['resolved_article'], values: ['kb_resolved_count'],
      layout: { x: 0, y: 12, w: 12, h: 4 },
      options: {
        columns: [
          { header: 'Article', accessorKey: 'resolved_article' },
          { header: 'Cases Resolved', accessorKey: 'kb_resolved_count' },
        ],
        sortBy: 'kb_resolved_count',
        sortOrder: 'desc',
        limit: 10,
        striped: true,
        density: 'comfortable',
      },
    },

    // ─── Row 5: Open Cases by Priority ────────────────────────────────
    // A dashboard `table` binds to an analytics cube and aggregates; it cannot
    // list individual cases (ADR-0021). This is deliberately TEAM-WIDE, not
    // "my cases": the analytics query path resolves no user token at all —
    // `{current_user}` (and even `{current_user_id}`) reach the query as
    // literal strings and match no owner, so a personal filter renders 0 for
    // everyone (see the proven note in crm.app.ts's My Work group). For a
    // per-agent queue, use the my_open_cases ListView ("My Cases" in the
    // My Work nav group). Restoring a personal widget here is tracked in
    // issue #510.
    {
      id: 'open_cases_by_priority',
      title: 'Open Cases by Priority',
      description: 'Open cases and their SLA-violation rate, broken down by priority',
      type: 'table',
      filter: { is_closed: false },
      colorVariant: 'default',
      dataset: 'case_metrics', dimensions: ['priority'], values: ['case_count', 'avg_sla_violated'],
      layout: { x: 0, y: 16, w: 12, h: 4 },
      options: {
        columns: [
          { header: 'Priority',            accessorKey: 'priority' },
          { header: 'Open Cases',          accessorKey: 'case_count' },
          { header: 'SLA Violation Rate',  accessorKey: 'avg_sla_violated', format: '0.0%' },
        ],
        sortBy: 'case_count',
        sortOrder: 'desc',
        limit: 10,
        striped: true,
        density: 'comfortable',
      },
    },
  ],
};
