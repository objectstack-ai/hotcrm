// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Dashboard } from '@objectstack/spec/ui';

/**
 * Sales Activity & Customer Health Dashboard (#592).
 *
 * The app had **no activity metric of any kind**: calls per rep, meetings
 * booked and activity per deal were unanswerable because the only trace of an
 * interaction was a `sys_activity` row with the interesting part inside a JSON
 * string, and `task_metrics` had shipped with no widget using it at all. This
 * dashboard is what `crm_event` makes possible, and it is where the churn story
 * finally has numbers behind it.
 *
 * # No `dateRange`, deliberately — a design choice, not a blocked one
 *
 * `crm_event.start_datetime` is a `Field.datetime()`, the exact column shape
 * that once zeroed the Service dashboard (#460): `driver-sql` 16.1.0 coerced a
 * datetime filter bound to epoch-millisecond INTEGER while every datetime in
 * the database is ISO TEXT, and SQLite orders every INTEGER before every TEXT —
 * so `$gte` matched every row (no floor) and `$lte` matched none (empty
 * dashboard). That is history, not a live constraint. Both named preconditions
 * are fixed and released: objectstack#3912 (the coercion) and objectstack#3777
 * (a bare-date `$lte` dropping same-day rows) — both under the **17.0.0**
 * heading of the installed `driver-sql` and `service-analytics` CHANGELOGs,
 * and this app pins 17.3.0. `service.dashboard.ts` records the same two
 * closures, which is why #1157 restored the Service picker; the two files
 * agree, and neither states an upstream fix as an unmet precondition.
 *
 * The reason this dashboard still carries no picker is therefore a PRODUCT
 * one, and it stands on its own: both questions a date range would answer are
 * already answered here, by widgets a dashboard range would narrow rather than
 * serve — the runtime ANDs `dateRange` into every widget query.
 *
 *   - The trend is on an AXIS, not in a filter. `activity_by_week` groups on
 *     the `event_metrics.start_datetime` dimension, which declares
 *     `dateGranularity: 'week'`; "is the team speeding up or going quiet?" is
 *     read ACROSS the history, so a picker would truncate the axis that is the
 *     whole point of the chart.
 *   - Recency is already SELF-SCOPED. The three quiet-account tiles each carry
 *     their own window on `crm_account.last_activity_date` — `$lt`
 *     `{30_days_ago}` / `{60_days_ago}` / `{90_days_ago}` — and "quiet for 90
 *     days" means ninety days, not ninety days re-cut by whatever the picker
 *     says. On the sibling dashboards that DO have one, that is spelled
 *     `filterBindings: { dateRange: false }`; here it would have to be spelled
 *     on every tile that matters.
 *
 * ⇒ Adding a picker is a product judgement to be made on its merits, not a
 * platform unblock to be collected. If it is ever made, the work is a
 * `dateRange` plus explicit `filterBindings` opt-outs on the widgets above.
 *
 * No KPI tile declares a `trend`: a period-over-period delta is a measurement
 * and has to come from a real comparison query, not from a number typed by
 * hand (#500, #587).
 */
export const ActivityDashboard: Dashboard = {
  name: 'sales_activity_dashboard',
  label: 'Sales Activity',
  description: 'Who is talking to customers, how often, and which accounts have gone quiet',

  columns: 12,
  gap: 4,
  refreshInterval: 300,

  header: {
    showTitle: true,
    showDescription: true,
  },

  globalFilters: [
    {
      field: 'owner_id',
      label: 'Rep',
      type: 'lookup',
      scope: 'dashboard',
      optionsFrom: { object: 'sys_user', valueField: 'id', labelField: 'name' },
    },
  ],

  widgets: [
    // ─── Row 1: what happened, and what is booked ─────────────────────
    {
      id: 'interactions_held',
      title: 'Interactions Logged',
      description: 'Calls and meetings that actually happened',
      type: 'metric',
      filter: { status: 'held' },
      colorVariant: 'success',
      dataset: 'event_metrics', values: ['event_count'],
      layout: { x: 0, y: 0, w: 3, h: 2 },
      options: { icon: 'PhoneCall', format: '0,0' },
    },
    {
      id: 'meetings_booked',
      title: 'Meetings Booked',
      description: 'Meetings on the calendar that have not happened yet',
      type: 'metric',
      filter: { status: 'planned', type: 'meeting' },
      colorVariant: 'blue',
      dataset: 'event_metrics', values: ['event_count'],
      layout: { x: 3, y: 0, w: 3, h: 2 },
      options: { icon: 'CalendarPlus', format: '0,0' },
    },
    {
      id: 'customer_minutes',
      title: 'Customer Minutes',
      description: 'Total time spent in front of customers',
      type: 'metric',
      filter: { status: 'held' },
      colorVariant: 'purple',
      dataset: 'event_metrics', values: ['total_minutes'],
      layout: { x: 6, y: 0, w: 3, h: 2 },
      options: { icon: 'Clock', format: '0,0' },
    },
    {
      // First widget in the app to use `task_metrics`. The dataset shipped with
      // the "My Day" work and then had no consumer at all (#592) — a semantic
      // layer nobody queries is a maintenance cost with no reader.
      id: 'tasks_completed',
      title: 'Tasks Completed',
      description: 'Follow-ups closed out — the other half of activity',
      type: 'metric',
      filter: { is_completed: true },
      colorVariant: 'orange',
      dataset: 'task_metrics', values: ['task_count'],
      layout: { x: 9, y: 0, w: 3, h: 2 },
      options: { icon: 'CheckCheck', format: '0,0' },
    },

    // ─── Row 2: who, and when ─────────────────────────────────────────
    {
      id: 'activity_by_rep',
      title: 'Activity by Rep',
      description: 'Logged interactions per owner — the coverage question',
      type: 'bar',
      filter: { status: 'held' },
      colorVariant: 'success',
      dataset: 'event_metrics', dimensions: ['owner'], values: ['event_count'],
      layout: { x: 0, y: 2, w: 6, h: 4 },
      chartConfig: {
        type: 'bar',
        showLegend: false,
        showDataLabels: true,
        colors: ['#10B981'],
        xAxis: { field: 'owner', title: 'Rep', showGridLines: false, logarithmic: false },
        yAxis: [{ field: 'event_count', title: 'Interactions', showGridLines: true, logarithmic: false }],
      },
    },
    {
      id: 'activity_by_week',
      title: 'Activity Volume by Week',
      description: 'Interactions per week — is the team speeding up or going quiet?',
      type: 'area',
      filter: { status: 'held' },
      colorVariant: 'blue',
      // The week bucket lives on the DIMENSION, not in a filter — see the
      // header note on why the trend belongs on an axis here. The datetime
      // filter bound itself works (objectstack#3912 / #3777, 17.0.0); putting
      // the trend in a filter would narrow it, which is a different objection.
      dataset: 'event_metrics', dimensions: ['start_datetime'], values: ['event_count'],
      layout: { x: 6, y: 2, w: 6, h: 4 },
      chartConfig: {
        type: 'area',
        showLegend: false,
        showDataLabels: false,
        colors: ['#0EA5E9'],
        xAxis: { field: 'start_datetime', title: 'Week', showGridLines: false, logarithmic: false },
        yAxis: [{ field: 'event_count', title: 'Interactions', showGridLines: true, logarithmic: false }],
        interaction: { tooltips: true, brush: true },
      },
    },

    // ─── Row 3: what the activity is about ────────────────────────────
    {
      id: 'activity_mix',
      title: 'Activity Mix',
      description: 'Calls vs meetings vs demos',
      type: 'donut',
      filter: { status: 'held' },
      colorVariant: 'purple',
      dataset: 'event_metrics', dimensions: ['type'], values: ['event_count'],
      layout: { x: 0, y: 6, w: 4, h: 4 },
      chartConfig: {
        type: 'donut',
        showLegend: true,
        showDataLabels: true,
        colors: ['#4169E1', '#10B981', '#8B5CF6', '#F59E0B', '#0EA5E9', '#94A3B8'],
      },
    },
    {
      id: 'activity_by_record_type',
      title: 'Where the Activity Lands',
      description: 'Which part of the funnel is getting attention',
      type: 'bar',
      filter: { status: 'held' },
      colorVariant: 'blue',
      dataset: 'event_metrics', dimensions: ['related_to_type'], values: ['event_count'],
      layout: { x: 4, y: 6, w: 4, h: 4 },
      chartConfig: {
        type: 'bar',
        showLegend: false,
        showDataLabels: true,
        colors: ['#4169E1'],
        xAxis: { field: 'related_to_type', title: 'Related To', showGridLines: false, logarithmic: false },
        yAxis: [{ field: 'event_count', title: 'Interactions', showGridLines: true, logarithmic: false }],
      },
    },
    {
      // "Activity per open deal" as two honest numbers rather than one
      // fabricated ratio: the semantic layer has no cross-dataset calculated
      // measure, so a single "1.8 activities/deal" tile would have to be
      // computed by the renderer over two independent queries — which nothing
      // does today. A manager reads the pair; a made-up quotient would read as
      // measured. Filed as a follow-up rather than faked here.
      id: 'deal_activity',
      title: 'Interactions on Deals',
      description: 'Logged interactions linked to an opportunity — read against Open Deals →',
      type: 'metric',
      filter: { status: 'held', related_to_type: 'crm_opportunity' },
      colorVariant: 'success',
      dataset: 'event_metrics', values: ['event_count'],
      layout: { x: 8, y: 6, w: 2, h: 4 },
      options: { icon: 'Target', format: '0,0' },
    },
    {
      id: 'open_deals_for_activity',
      title: 'Open Deals',
      description: 'Opportunities still in play',
      type: 'metric',
      filter: { stage: { $nin: ['closed_won', 'closed_lost'] } },
      colorVariant: 'blue',
      dataset: 'opportunity_metrics', values: ['opp_count'],
      layout: { x: 10, y: 6, w: 2, h: 4 },
      options: { icon: 'Briefcase', format: '0,0' },
    },

    // ─── Row 4: the churn story, now backed by a real signal ──────────
    // These window `crm_account.last_activity_date`, which is a `Field.date()`
    // (TEXT `YYYY-MM-DD`) — the same shape `customer_churn_signals` already
    // filters safely. Until #592 the column was written by nothing at all: the
    // bubble that fed it was silently discarded on every invocation because
    // the field was `readonly` (#2948). These three tiles are the reason that
    // mattered.
    {
      id: 'quiet_accounts_30',
      title: 'Quiet 30+ Days',
      description: 'Active accounts with no logged interaction in a month',
      type: 'metric',
      filter: { is_active: true, last_activity_date: { $lt: '{30_days_ago}' } },
      colorVariant: 'warning',
      dataset: 'account_metrics', values: ['account_count'],
      layout: { x: 0, y: 10, w: 4, h: 2 },
      options: { icon: 'BellOff', format: '0,0' },
    },
    {
      id: 'quiet_accounts_60',
      title: 'Quiet 60+ Days',
      description: 'Two months of silence — the at-risk threshold',
      type: 'metric',
      filter: { is_active: true, last_activity_date: { $lt: '{60_days_ago}' } },
      colorVariant: 'orange',
      dataset: 'account_metrics', values: ['account_count'],
      layout: { x: 4, y: 10, w: 4, h: 2 },
      options: { icon: 'AlertTriangle', format: '0,0' },
    },
    {
      id: 'quiet_accounts_90',
      title: 'Quiet 90+ Days',
      description: 'A quarter with no contact — intervene or write it off',
      type: 'metric',
      filter: { is_active: true, last_activity_date: { $lt: '{90_days_ago}' } },
      colorVariant: 'danger',
      dataset: 'account_metrics', values: ['account_count'],
      layout: { x: 8, y: 10, w: 4, h: 2 },
      options: { icon: 'AlertOctagon', format: '0,0' },
    },
  ],
};
