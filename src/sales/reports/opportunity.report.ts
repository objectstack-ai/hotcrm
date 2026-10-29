// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Report } from '@objectstack/spec/ui';

export const OpportunitiesByStageReport: Report = {
  name: 'opportunities_by_stage',
  label: 'Opportunities by Stage',
  description: 'Summary of opportunities grouped by stage',
  dataset: 'opportunity_metrics', rows: ['stage'], values: ['total_amount', 'avg_probability'],
  type: 'summary',
  // `{current_year_start}` is a spec date macro (DATE_MACRO_TOKENS) resolved
  // per-query, so the YTD window rolls with time instead of freezing the year
  // the artifact was built into dist/objectstack.json.
  runtimeFilter: { stage: { $ne: 'closed_lost' }, close_date: { $gte: '{current_year_start}' } },
  chart: { type: 'bar', title: 'Pipeline by Stage', showLegend: true, xAxis: 'stage', yAxis: 'total_amount' }
};

export const WonOpportunitiesByOwnerReport: Report = {
  name: 'won_opportunities_by_owner',
  label: 'Won Opportunities by Owner',
  description: 'Closed won opportunities grouped by owner',
  dataset: 'opportunity_metrics', rows: ['owner'], values: ['total_amount'],
  type: 'summary',
  runtimeFilter: { stage: 'closed_won' },
  chart: { type: 'column', title: 'Revenue by Sales Rep', showLegend: false, xAxis: 'owner', yAxis: 'total_amount' }
};

/**
 * Quarterly pipeline coverage — the matrix view that powers the classic
 * sales-ops "pipeline coverage" conversation: each forecast category against
 * the quarter the deal is expected to close in. `close_quarter` is a dedicated
 * quarterly dimension over the same field; the trend widgets keep their
 * monthly `close_date` dimension.
 */
export const PipelineCoverageByQuarterReport: Report = {
  name: 'pipeline_coverage_by_quarter',
  label: 'Pipeline Coverage by Quarter',
  description: 'Open pipeline amount by forecast category, bucketed by close quarter',
  dataset: 'opportunity_metrics', rows: ['forecast_category'], columns: ['close_quarter'], values: ['total_amount', 'opp_count'],
  type: 'matrix',
  runtimeFilter: { stage: { $nin: ['closed_won', 'closed_lost'] } },
};

/**
 * Sales-rep funnel — one row per rep, one column per stage (#2370 row 4).
 *
 * It was a two-level `summary` (owner → stage), and the 18.2.0 report page
 * drew that as a table repeating the owner's name on every stage row with no
 * per-owner subtotal (the spec has no subtotal key), over a chart of amount by
 * stage summed across every rep, so the "by owner" half was nowhere on the
 * chart. As a `matrix` the table carries each rep once, the stages run across
 * in the stage field's option order, and the row's Total IS the rep's
 * subtotal, with a grand total beneath. One measure, the amount: the summary's
 * deal count and average probability would put three columns under each of
 * seven stages; Opportunities by Stage carries those.
 *
 * The chart is one bar per rep, so the report's question ("whose pipeline?")
 * is on the chart too. A bar split by stage within each rep is not
 * expressible in 18.2.0: a report chart takes one `xAxis` dimension and one
 * `yAxis` measure, and a chart series is a measure, never a dimension's
 * values. Horizontal bars for the reason #2073 item 10 gave: every rep name
 * drawn whole. "Funnel" in the label is the sales word for the stage-by-stage
 * pipeline, not the chart's shape.
 */
export const OpportunityFunnelByOwnerStageReport: Report = {
  name: 'opportunity_funnel_owner_stage',
  label: 'Opportunity Funnel by Owner',
  description: 'Per-rep stage-by-stage pipeline funnel',
  dataset: 'opportunity_metrics', rows: ['owner'], columns: ['stage'], values: ['total_amount'],
  type: 'matrix',
  runtimeFilter: { stage: { $ne: 'closed_lost' } },
  chart: { type: 'horizontal-bar', title: 'Amount by Owner', showLegend: false, xAxis: 'owner', yAxis: 'total_amount' },
};
