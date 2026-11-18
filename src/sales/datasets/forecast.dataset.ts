// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { defineDataset } from '@objectstack/spec/ui';

/**
 * Forecast analytics dataset (ADR-0021).
 *
 * `crm_forecast` carries the real per-owner, per-period quota and attainment
 * snapshots, but had no semantic layer — which is how the Sales dashboard
 * ended up annotating its revenue chart with a hardcoded quota of 100000
 * while the seeded quotas run 500k–1.5M. Widgets that talk about quota must
 * bind here instead of inventing numbers.
 *
 * ## The measures are NOT additive across periods (#614)
 *
 * One row per owner per period, and the table deliberately holds several
 * periods at once (a current quarter, a current month, several settled ones).
 * `quota_sum` and friends are plain `sum`s, so a query that does not pin the
 * period adds a quarter's quota to a month's quota to last quarter's quota and
 * calls the result "Quota" — the defect that shipped on
 * `quota_attainment_by_rep` until #614.
 *
 * Every consumer must therefore make the period unambiguous, one of two ways:
 *
 *   • group by `period_label` (unique per period, so each row IS one period) —
 *     the shape a quota-over-time trend wants; or
 *   • filter to a single snapshot with `period` + `period_start`
 *     (`{ period: 'quarter', period_start: '{current_quarter_start}' }`) —
 *     the shape a "where do we stand right now" scoreboard wants.
 *
 * `test/forecast-period-scope.test.ts` fails the build for any widget or report
 * that does neither, so the trap cannot be walked into twice.
 *
 * This constraint is deliberately NOT a dataset-level `filter` pinning the
 * latest quarter. A dataset filter is invisible at the call site: it would make
 * the very trend the `period` / `period_label` dimensions exist to serve return
 * a single row, with nothing on the widget to explain why. The failure mode of
 * a missing widget filter is a loud test; the failure mode of a hidden dataset
 * filter is silently missing data.
 */
export const ForecastDataset = defineDataset({
  name: 'forecast_metrics',
  label: 'Forecast Metrics',
  description: 'Semantic layer for per-owner quota, attainment and pipeline coverage',
  object: 'crm_forecast',

  dimensions: [
    // Semantic name `owner`; column `owner_id`, the platform anchor (#548).
    {
      name: 'owner',
      label: 'Owner',
      description: 'The sales rep a forecast row belongs to; each owner has one row per period.',
      synonyms: ['sales rep', 'forecast owner', '负责人'],
      field: 'owner_id',
      type: 'lookup',
    },
    {
      name: 'period',
      label: 'Period Type',
      description: 'Whether a forecast row covers a month or a quarter; pick one, because adding a month to a quarter counts the same deals twice.',
      synonyms: ['period kind', 'monthly or quarterly', '周期类型'],
      field: 'period',
      type: 'string',
    },
    {
      name: 'period_label',
      label: 'Period',
      description: 'The named period of a forecast row, such as Q3 2026 or Aug 2026.',
      synonyms: ['forecast period', 'month or quarter', '预测周期'],
      field: 'period_label',
      type: 'string',
    },
    {
      name: 'period_start',
      label: 'Period Start',
      description: 'The first day of the forecast period, the first of a month or of a quarter.',
      synonyms: ['start of period', 'period start date', '周期开始'],
      field: 'period_start',
      type: 'date',
    },
  ],

  measures: [
    {
      name: 'quota_sum',
      label: 'Quota',
      description: 'The sum of the Quota set on the forecast rows in view: the sales target. Rows with no quota set add nothing; pin one period type, or a month and a quarter are added together.',
      synonyms: ['target', 'sales target', '配额', '销售目标'],
      aggregate: 'sum',
      field: 'quota',
      format: '0,0',
    },
    {
      name: 'closed_sum',
      label: 'Closed',
      description: 'The Closed Won amount recorded on the forecast rows: what the owners have already won in the period; open pipeline and lost deals are not included.',
      synonyms: ['closed won amount', 'booked', '已成交'],
      aggregate: 'sum',
      field: 'closed_amount',
      format: '0,0',
    },
    {
      name: 'pipeline_sum',
      label: 'Pipeline',
      description: 'The open pipeline recorded on the forecast rows: the amount of open deals, at any open stage, expected to close in the period; won and lost deals are not included.',
      synonyms: ['open pipeline', 'pipeline amount', '管道金额'],
      aggregate: 'sum',
      field: 'pipeline_amount',
      format: '0,0',
    },
    {
      name: 'commit_sum',
      label: 'Commit',
      description: 'The Commit amount recorded on the forecast rows: open deals in the Commit forecast category; Best Case and Pipeline deals are not included.',
      synonyms: ['committed', 'commit forecast', '承诺金额'],
      aggregate: 'sum',
      field: 'commit_amount',
      format: '0,0',
    },
    // Derived ratio (ADR-0021 Q1) rather than avg(attainment_pct): summing
    // closed and quota before dividing weights every rep/period by quota
    // size, where an average of per-row percentages would not.
    {
      name: 'attainment',
      label: 'Attainment',
      description: 'Closed divided by Quota, with both summed before dividing, so a large quota weighs more than a small one; rows with no quota make it blank, not zero.',
      synonyms: ['quota attainment', 'percent of quota', '完成率'],
      derived: { op: 'ratio', of: ['closed_sum', 'quota_sum'] },
      format: '0%',
    },
  ],
});
