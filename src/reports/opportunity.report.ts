// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { ReportInput } from '@objectstack/spec/ui';

export const OpportunitiesByStageReport: ReportInput = {
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

export const WonOpportunitiesByOwnerReport: ReportInput = {
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
export const PipelineCoverageByQuarterReport: ReportInput = {
  name: 'pipeline_coverage_by_quarter',
  label: 'Pipeline Coverage by Forecast × Quarter',
  description: 'Open pipeline amount by forecast category, bucketed by close quarter',
  dataset: 'opportunity_metrics', rows: ['forecast_category'], columns: ['close_quarter'], values: ['total_amount', 'opp_count'],
  type: 'matrix',
  runtimeFilter: { stage: { $nin: ['closed_won', 'closed_lost'] } },
};

/**
 * Sales-rep funnel — two-level summary that mirrors how reps drill into their
 * own book of business. Exercises multi-level `rows` grouping (owner → stage)
 * over the dataset's measures.
 */
export const OpportunityFunnelByOwnerStageReport: ReportInput = {
  name: 'opportunity_funnel_owner_stage',
  label: 'Opportunity Funnel by Owner → Stage',
  description: 'Per-rep stage-by-stage pipeline funnel',
  dataset: 'opportunity_metrics', rows: ['owner', 'stage'], values: ['total_amount', 'opp_count', 'avg_probability'],
  type: 'summary',
  runtimeFilter: { stage: { $ne: 'closed_lost' } },
  chart: { type: 'funnel', title: 'Pipeline Funnel', showLegend: false, xAxis: 'stage', yAxis: 'total_amount' },
};
