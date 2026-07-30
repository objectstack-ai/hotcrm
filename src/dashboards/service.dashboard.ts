// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Dashboard } from '@objectstack/spec/ui';

/**
 * Customer Service Dashboard
 *
 * Case load, SLA health, and resolution performance for the support team.
 * Uses semantic colorVariant tokens (warning/danger/success) and chartConfig
 * palettes instead of raw hex values, mirroring the polished CRM dashboard
 * reference at https://github.com/objectstack-ai/objectui/tree/main/examples/crm.
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

  // NO `dateRange` — deliberately, and this is the fix for #460.
  //
  // This dashboard carried `{ field: 'created_date', defaultRange:
  // 'last_30_days' }` and opened on all zeros with 38 cases in the system. The
  // cause is NOT the preset. `crm_case.created_date` is a `Field.datetime()`,
  // and on the SQLite path `driver-sql` 16.1.0 coerces datetime filter values
  // to epoch-millisecond INTEGERs (`coerceFilterValue`), on the documented
  // assumption that datetime columns are stored as INTEGER ms. They are not —
  // every datetime in the demo database is ISO TEXT, including the platform's
  // own `created_at` / `updated_at` audit columns. SQLite orders every INTEGER
  // before every TEXT, so on a datetime column:
  //     created_date >= <int>   is TRUE for every row   (window has no floor)
  //     created_date <= <int>   is FALSE for every row  (window matches nothing)
  // The runtime ANDs the dashboard range into every widget query, so the `$lte`
  // half zeroed the whole dashboard. Measured against the running 16.1.0
  // console: `$gte` alone → all 38 cases, `$lte` alone → 0, both bounds → 0, in
  // every date format tried (`2026-07-30`, full ISO, end-of-day). WIDENING THE
  // PRESET CANNOT FIX THIS — `last_90_days` renders exactly the same zeros.
  //
  // The other three dashboards are unaffected because they window `close_date`,
  // a `Field.date()`, which stays TEXT `YYYY-MM-DD` on both sides of the
  // comparison. That is why Service was the outlier — not the preset choice.
  //
  // Dropping the range is what makes the dashboard render (verified in the
  // console: 30 open / 7 critical / 45.0h / 3 SLA breaches, every chart
  // populated). The cost is honest and visible: this dashboard has no date
  // picker. Restore the line below once datetime filtering is fixed upstream;
  // the guard in `metadata-references.test.ts` fails while it is still unsafe.
  //
  //   dateRange: { field: 'created_date', defaultRange: 'last_90_days', allowCustomRange: true },

  globalFilters: [
    {
      field: 'owner',
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
      actionUrl: '/objects/case?filter=open',
      actionType: 'url',
      actionIcon: 'ArrowUpRight',
      dataset: 'case_metrics', values: ['case_count'],
      layout: { x: 0, y: 0, w: 3, h: 2 },
      options: {
        icon: 'Inbox',
        format: '0,0',
        trend: { value: 6.2, direction: 'down', label: 'vs last week' },
      },
    },
    {
      id: 'critical_cases',
      title: 'Critical Cases',
      description: 'Open cases marked as critical priority',
      type: 'metric',
      filter: { priority: 'critical', is_closed: false },
      colorVariant: 'danger',
      actionUrl: '/objects/case?priority=critical',
      actionType: 'url',
      actionIcon: 'ArrowUpRight',
      dataset: 'case_metrics', values: ['case_count'],
      layout: { x: 3, y: 0, w: 3, h: 2 },
      options: {
        icon: 'AlertTriangle',
        format: '0,0',
        trend: { value: 1.0, direction: 'up', label: 'vs last week' },
      },
    },
    {
      id: 'avg_resolution_time',
      title: 'Avg Resolution Time',
      description: 'Mean time to close, in hours',
      type: 'metric',
      filter: { is_closed: true },
      colorVariant: 'blue',
      actionUrl: '/reports/resolution-time',
      actionType: 'url',
      actionIcon: 'ArrowUpRight',
      dataset: 'case_metrics', values: ['avg_resolution'],
      layout: { x: 6, y: 0, w: 3, h: 2 },
      options: {
        icon: 'Clock',
        format: '0.0',
        suffix: 'h',
        trend: { value: 9.8, direction: 'down', label: 'vs last week' },
      },
    },
    {
      id: 'sla_violations',
      title: 'SLA Violations',
      description: 'Cases that breached their SLA',
      type: 'metric',
      filter: { is_sla_violated: true },
      colorVariant: 'warning',
      actionUrl: '/objects/case?filter=sla_violated',
      actionType: 'url',
      actionIcon: 'ArrowUpRight',
      dataset: 'case_metrics', values: ['case_count'],
      layout: { x: 9, y: 0, w: 3, h: 2 },
      options: {
        icon: 'ShieldAlert',
        format: '0,0',
        trend: { value: 2.4, direction: 'down', label: 'vs last week' },
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
      // Kept opted out so this stays self-scoped if the dashboard `dateRange`
      // is ever restored (see the note above).
      // Caveat, same root cause as #460: on 16.1.0 a `$gte` against a datetime
      // column is TRUE for every row, so this floor is currently INERT and the
      // chart plots every case rather than the last 30 days. Indistinguishable
      // today (the seed spans exactly 30 days) and it starts working once the
      // driver is fixed — but the title's "last 30 days" is not yet enforced.
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
        interaction: { tooltips: true, brush: true, zoom: false },
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

    // ─── Row 4: Open Cases by Priority ────────────────────────────────
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
      layout: { x: 0, y: 10, w: 12, h: 4 },
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
