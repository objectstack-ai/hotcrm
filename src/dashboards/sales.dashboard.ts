// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Dashboard } from '@objectstack/spec/ui';
import { avgDealSizeMetricWidget, pipelineByStageFunnelWidget } from './shared-widgets';

/**
 * Sales Performance Dashboard
 *
 * Pipeline analytics, win rate trends, and rep performance for the sales team.
 * Modeled after the polished CRM dashboard reference at
 * https://github.com/objectstack-ai/objectui/tree/main/examples/crm.
 *
 * No KPI tile declares a `trend`. A period-over-period delta is a measurement,
 * so it has to come from a real comparison query (widget `compareTo`) once the
 * renderer supports it for dataset metrics — the percentages this file used to
 * carry were typed by hand and recomputed by nothing, so they kept asserting
 * the same "+8.4% vs last quarter" on any data, including an empty database.
 * Same rule as the executive dashboard (#500, #587).
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
    // Keep the opening KPI row in the first viewport for a live demo. The
    // description remains available in dashboard metadata and translations.
    showDescription: false,
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
      optionsFrom: { object: 'sys_user', valueField: 'id', labelField: 'name' },
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
      dataset: 'opportunity_metrics', values: ['total_amount'],
      layout: { x: 0, y: 0, w: 3, h: 2 },
      options: {
        icon: 'DollarSign',
        format: '0,0',
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
      dataset: 'opportunity_metrics', values: ['total_amount'],
      layout: { x: 3, y: 0, w: 3, h: 2 },
      options: {
        icon: 'Trophy',
        format: '0,0',
      },
    },
    {
      id: 'open_opportunities',
      title: 'Open Opportunities',
      description: 'Active deals in flight',
      type: 'metric',
      filter: { stage: { $nin: ['closed_won', 'closed_lost'] } },
      colorVariant: 'orange',
      dataset: 'opportunity_metrics', values: ['opp_count'],
      layout: { x: 6, y: 0, w: 3, h: 2 },
      options: {
        icon: 'Briefcase',
        format: '0,0',
      },
    },
    avgDealSizeMetricWidget({ x: 9, y: 0, w: 3, h: 2 }, {
      description: 'Average value of closed-won deals this quarter',
      filter: { stage: 'closed_won', close_date: { $gte: '{current_quarter_start}' } },
      filterBindings: { dateRange: false }, // self-scoped to QTD — the date picker must not re-window it
      colorVariant: 'purple',
      options: {
        icon: 'bar-chart',
        format: '0,0',
      },
    }),

    // ─── Row 2: Win / Loss KPIs ───────────────────────────────────────
    //
    // The ratio and its two inputs sit side by side ON PURPOSE (#593). A win
    // rate is the failure mode #614 shipped: a wrong denominator raises no
    // error, it just prints a plausible percentage. Showing "62%" next to
    // "8 won" and "5 lost" means a reader can check the arithmetic at a
    // glance, and a half that silently loses its filter stops being invisible.
    //
    // All three windows are the same self-scoped 12 months (`dateRange: false`
    // so the header's date picker cannot re-window one of them and not the
    // others — three tiles over three different windows would be worse than
    // no tiles at all).
    {
      // NOTE: no `stage` filter here, and that is deliberate. Both halves of
      // the ratio come from the DATASET's own measure filters — `won_count`
      // over closed_won, `decided_count` over closed_won + closed_lost — so
      // open pipeline is excluded by the measures. A widget-level
      // `stage: {$in: [...]}` filter would narrow numerator and denominator
      // alike, which is how a ratio quietly becomes a division by itself.
      id: 'win_rate_12m',
      title: 'Win Rate (12M)',
      description: 'Deals won as a share of all deals settled in the last 12 months',
      type: 'metric',
      filter: { close_date: { $gte: '{12_months_ago}' } },
      filterBindings: { dateRange: false },
      colorVariant: 'success',
      dataset: 'opportunity_metrics', values: ['win_rate'],
      layout: { x: 0, y: 2, w: 4, h: 2 },
      options: { icon: 'Percent', format: '0%' },
    },
    {
      id: 'won_deals_12m',
      title: 'Deals Won (12M)',
      description: 'The numerator of the win rate',
      type: 'metric',
      filter: { close_date: { $gte: '{12_months_ago}' } },
      filterBindings: { dateRange: false },
      colorVariant: 'blue',
      dataset: 'opportunity_metrics', values: ['won_count'],
      layout: { x: 4, y: 2, w: 4, h: 2 },
      options: { icon: 'Trophy', format: '0,0' },
    },
    {
      id: 'lost_deals_12m',
      title: 'Deals Lost (12M)',
      description: 'The other half of the win-rate denominator',
      type: 'metric',
      filter: { close_date: { $gte: '{12_months_ago}' } },
      filterBindings: { dateRange: false },
      colorVariant: 'orange',
      dataset: 'opportunity_metrics', values: ['lost_count'],
      layout: { x: 8, y: 2, w: 4, h: 2 },
      options: { icon: 'TrendingDown', format: '0,0' },
    },

    // ─── Row 3: Pipeline & Trends ─────────────────────────────────────
    pipelineByStageFunnelWidget({ x: 0, y: 4, w: 6, h: 4 }),
    {
      id: 'monthly_revenue_trend',
      title: 'Monthly Revenue Trend',
      description: 'Closed-won revenue, last 12 months',
      type: 'area',
      filter: { stage: 'closed_won', close_date: { $gte: '{12_months_ago}' } },
      filterBindings: { dateRange: false }, // self-scoped to 12 months — the date picker must not narrow it
      colorVariant: 'success',
      dataset: 'opportunity_metrics', dimensions: ['close_date'], values: ['total_amount'],
      layout: { x: 6, y: 4, w: 6, h: 4 },
      chartConfig: {
        type: 'area',
        showLegend: false,
        showDataLabels: false,
        colors: ['#10B981'],
        xAxis: { field: 'close_date', title: 'Month', showGridLines: false, logarithmic: false },
        // No quota annotation line: ChartAnnotationSchema only takes a STATIC
        // value, and the real quotas live per-owner/per-period in
        // crm_forecast.quota (seeded 500k–1.5M — the old hardcoded 100000 was
        // fiction). Quota vs. actual is the quota_attainment_by_rep table
        // below, bound to the forecast_metrics dataset.
        yAxis: [{ field: 'total_amount', title: 'Revenue', format: '0,0', showGridLines: true, logarithmic: false }],
        interaction: { tooltips: true, brush: true },
      },
      options: { dateGranularity: 'month' },
    },

    // ─── Row 4: Performance Breakdown ─────────────────────────────────
    {
      id: 'pipeline_by_forecast_category',
      title: 'Pipeline by Forecast Category',
      description: 'Open pipeline grouped by sales forecast category',
      type: 'horizontal-bar',
      filter: { stage: { $nin: ['closed_won', 'closed_lost'] } },
      colorVariant: 'blue',
      dataset: 'opportunity_metrics', dimensions: ['forecast_category'], values: ['total_amount'],
      layout: { x: 0, y: 8, w: 6, h: 4 },
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
      layout: { x: 6, y: 8, w: 6, h: 4 },
      chartConfig: {
        type: 'donut',
        showLegend: true,
        showDataLabels: true,
        colors: ['#4F46E5', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
      },
    },

    // ─── Row 5: Rep Leaderboard ───────────────────────────────────────
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
      layout: { x: 0, y: 12, w: 12, h: 4 },
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

    // ─── Row 6: Quota Attainment ──────────────────────────────────────
    // The real per-rep quota data (crm_forecast.quota) surfaced as a table:
    // dashboard chart annotations cannot reference a dataset (static values
    // only), so quota vs. actual gets its own widget instead of a fake line.
    {
      id: 'quota_attainment_by_rep',
      title: 'Quota Attainment by Rep',
      description: 'Current-quarter quota, closed revenue and attainment per rep, from forecast snapshots',
      type: 'table',
      colorVariant: 'default',
      // crm_forecast has neither `close_date` nor `type`; opt out of the
      // dashboard filters bound to those fields (framework#2501 injects every
      // dashboard filter into each widget query). `owner` exists and applies.
      filterBindings: { dateRange: false, type: false },
      // ONE period, or the numbers are nonsense (#614). `crm_forecast` holds a
      // row per owner PER PERIOD, and `quota_sum` / `closed_sum` are plain
      // `sum` measures — so an unpinned query adds this quarter's quota to this
      // month's quota to every settled quarter's quota and labels the total
      // "Quota". On the shipped seeds that turned a rep's real 1,500,000
      // quarterly quota into 7,940,000, with attainment wrong by the same
      // construction (89% instead of 55%).
      //
      // Both halves of the key are needed. `period: 'quarter'` alone still sums
      // every quarter ever snapshotted; `period_start` alone still merges the
      // quarter row with the month row that opens the same quarter (Q3 and July
      // both start on the 1st). Together they name exactly one snapshot per
      // owner — the same (owner, period, period_start) tuple the snapshot sweep
      // upserts on and the object indexes.
      //
      // `{current_quarter_start}` is resolved by the ANALYTICS path, verified
      // rather than assumed: `queryDataset` runs both the dataset filter and the
      // widget's `runtimeFilter` through `resolveFilterTokens`, which
      // understands `{(current|last|next)_(week|month|quarter|year)_(start|end)}`
      // and throws `FILTER_TOKEN_UNKNOWN` on anything else. This is NOT true of
      // the list-view path — see the comment on `this_quarter_forecasts` in
      // `src/views/forecast.view.ts`, where the same macro would ship to the
      // driver as a literal string. Do not generalise from one path to the other.
      //
      // Cost of pinning to the CURRENT quarter rather than the latest one: for
      // the few hours between a quarter boundary and the 03:00 sweep that opens
      // the new row, the table is empty. Empty is the honest state — the
      // alternative renders last quarter's attainment under a header that says
      // this one.
      filter: { period: 'quarter', period_start: '{current_quarter_start}' },
      dataset: 'forecast_metrics', dimensions: ['owner'], values: ['quota_sum', 'closed_sum', 'attainment'],
      layout: { x: 0, y: 16, w: 12, h: 4 },
      options: {
        columns: [
          { header: 'Owner',      accessorKey: 'owner' },
          { header: 'Quota',      accessorKey: 'quota_sum', format: '0,0' },
          { header: 'Closed',     accessorKey: 'closed_sum', format: '0,0' },
          { header: 'Attainment', accessorKey: 'attainment', format: '0%' },
        ],
        sortBy: 'attainment',
        sortOrder: 'desc',
        limit: 10,
        striped: true,
        density: 'comfortable',
      },
    },

    // ─── Row 7: Win / Loss analysis ───────────────────────────────────
    //
    // Three widgets over the settled half of the pipeline (#593). Each of the
    // two win-rate breakdowns is a TABLE, not a bar chart, and that is the
    // whole design: a bar of "67%" is unfalsifiable, whereas a row reading
    // "Won 2 · Lost 1 · Settled 3 · 67%" carries its own proof. Perturb either
    // half — win a deal that was lost, or lose one that was won — and three of
    // those four numbers move. `test/win-loss-capture.test.ts` does exactly
    // that against the real dataset executor and the real seeds.
    //
    // Both tables opt out of the header's `close_date` window
    // (`dateRange: false`) for the reason the quota table does: a win rate over
    // "this quarter" on a demo database is computed from whichever one or two
    // deals happen to have settled inside it, which is noise wearing the
    // costume of a KPI. Twelve months is the same window the row-2 tiles and
    // the revenue trend use, so the dashboard tells one consistent story.
    {
      id: 'win_rate_by_owner',
      title: 'Win / Loss by Rep',
      description: 'Deals won, deals lost and win rate per rep — last 12 months',
      type: 'table',
      filter: { close_date: { $gte: '{12_months_ago}' } },
      filterBindings: { dateRange: false },
      colorVariant: 'default',
      dataset: 'opportunity_metrics',
      dimensions: ['owner'],
      values: ['won_count', 'lost_count', 'decided_count', 'win_rate', 'won_amount'],
      layout: { x: 0, y: 20, w: 6, h: 4 },
      options: {
        columns: [
          { header: 'Owner',       accessorKey: 'owner' },
          { header: 'Won',         accessorKey: 'won_count' },
          { header: 'Lost',        accessorKey: 'lost_count' },
          { header: 'Settled',     accessorKey: 'decided_count' },
          { header: 'Win Rate',    accessorKey: 'win_rate', format: '0%' },
          { header: 'Won Revenue', accessorKey: 'won_amount', format: '0,0' },
        ],
        sortBy: 'decided_count',
        sortOrder: 'desc',
        limit: 10,
        striped: true,
        density: 'comfortable',
      },
    },
    {
      id: 'win_rate_by_lead_source',
      title: 'Win / Loss by Lead Source',
      description: 'Which sources produce deals that actually close — last 12 months',
      type: 'table',
      filter: { close_date: { $gte: '{12_months_ago}' } },
      filterBindings: { dateRange: false },
      colorVariant: 'default',
      dataset: 'opportunity_metrics',
      dimensions: ['lead_source'],
      values: ['won_count', 'lost_count', 'decided_count', 'win_rate', 'won_amount'],
      layout: { x: 6, y: 20, w: 6, h: 4 },
      options: {
        columns: [
          { header: 'Lead Source', accessorKey: 'lead_source' },
          { header: 'Won',         accessorKey: 'won_count' },
          { header: 'Lost',        accessorKey: 'lost_count' },
          { header: 'Settled',     accessorKey: 'decided_count' },
          { header: 'Win Rate',    accessorKey: 'win_rate', format: '0%' },
          { header: 'Won Revenue', accessorKey: 'won_amount', format: '0,0' },
        ],
        sortBy: 'decided_count',
        sortOrder: 'desc',
        limit: 12,
        striped: true,
        density: 'comfortable',
      },
    },
    {
      // The loss-reason breakdown the fields were declared for and never got.
      //
      // `loss_reason` is mandatory on every `closed_lost` record (see
      // crm_opportunity), so this chart has no "unattributed" slice to
      // apologise for — an empty chart here means no losses in the window,
      // never "nobody filled the field in".
      //
      // Counts, not amounts: the question a loss review asks is "how often did
      // we lose for this reason", and one large lost deal should not outweigh
      // five recurring feature gaps. `lost_amount` is declared on the dataset
      // for the revenue view of the same question.
      id: 'loss_reason_breakdown',
      title: 'Why We Lose',
      description: 'Lost deals by reason — last 12 months',
      type: 'donut',
      filter: { stage: 'closed_lost', close_date: { $gte: '{12_months_ago}' } },
      filterBindings: { dateRange: false },
      colorVariant: 'orange',
      dataset: 'opportunity_metrics', dimensions: ['loss_reason'], values: ['opp_count'],
      layout: { x: 0, y: 24, w: 12, h: 4 },
      chartConfig: {
        type: 'donut',
        showLegend: true,
        showDataLabels: true,
        colors: ['#EF4444', '#F59E0B', '#8B5CF6', '#06B6D4', '#4F46E5', '#10B981', '#64748B'],
      },
    },

    // ─── Row 9: Pivot — Stage × Lead Source ───────────────────────────
    {
      id: 'pipeline_stage_by_source',
      title: 'Pipeline by Stage × Lead Source',
      description: 'Cross-tab of open opportunity amount by stage and source',
      type: 'pivot',
      filter: { stage: { $nin: ['closed_won', 'closed_lost'] } },
      colorVariant: 'default',
      dataset: 'opportunity_metrics', dimensions: ['stage', 'lead_source'], values: ['total_amount'],
      layout: { x: 0, y: 28, w: 12, h: 4 },
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
