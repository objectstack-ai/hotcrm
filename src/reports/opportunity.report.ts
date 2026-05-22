// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { ReportInput } from '@objectstack/spec/ui';

// Server does not yet evaluate CEL helpers like `{current_year_start}` inside
// filter values (see plan note "filter-time CEL 求值"). Compute the ISO date
// at module load as a temporary workaround so the report actually matches rows.
const CURRENT_YEAR_START = `${new Date().getFullYear()}-01-01`;

export const OpportunitiesByStageReport: ReportInput = {
  name: 'opportunities_by_stage',
  label: 'Opportunities by Stage',
  description: 'Summary of opportunities grouped by stage',
  objectName: 'opportunity',
  type: 'summary',
  columns: [
    { field: 'name', label: 'Opportunity Name' },
    { field: 'account', label: 'Account' },
    { field: 'amount', label: 'Amount', aggregate: 'sum' },
    { field: 'close_date', label: 'Close Date' },
    { field: 'probability', label: 'Probability', aggregate: 'avg' },
  ],
  groupingsDown: [{ field: 'stage', sortOrder: 'asc' }],
  filter: { stage: { $ne: 'closed_lost' }, close_date: { $gte: CURRENT_YEAR_START } },
  chart: { type: 'bar', title: 'Pipeline by Stage', showLegend: true, xAxis: 'stage', yAxis: 'amount' }
};

export const WonOpportunitiesByOwnerReport: ReportInput = {
  name: 'won_opportunities_by_owner',
  label: 'Won Opportunities by Owner',
  description: 'Closed won opportunities grouped by owner',
  objectName: 'opportunity',
  type: 'summary',
  columns: [
    { field: 'name', label: 'Opportunity Name' },
    { field: 'account', label: 'Account' },
    { field: 'amount', label: 'Amount', aggregate: 'sum' },
    { field: 'close_date', label: 'Close Date' },
  ],
  groupingsDown: [{ field: 'owner', sortOrder: 'desc' }],
  filter: { stage: 'closed_won' },
  chart: { type: 'column', title: 'Revenue by Sales Rep', showLegend: false, xAxis: 'owner', yAxis: 'amount' }
};

/**
 * Quarterly pipeline coverage — the matrix view that powers the classic
 * sales-ops "pipeline coverage" conversation: each forecast category against
 * the quarter the deal is expected to close in. Uses the spec's
 * `dateGranularity` on `groupingsAcross` so the server can bucket close_date
 * into quarters in a single aggregate query.
 */
export const PipelineCoverageByQuarterReport: ReportInput = {
  name: 'pipeline_coverage_by_quarter',
  label: 'Pipeline Coverage by Forecast × Quarter',
  description: 'Open pipeline amount by forecast category, bucketed by close quarter',
  objectName: 'opportunity',
  type: 'matrix',
  columns: [
    { field: 'amount', label: 'Pipeline', aggregate: 'sum' },
    { field: 'name', label: 'Deals', aggregate: 'count' },
  ],
  groupingsDown: [{ field: 'forecast_category', sortOrder: 'asc' }],
  groupingsAcross: [
    { field: 'close_date', dateGranularity: 'quarter', sortOrder: 'asc' },
  ],
  filter: { stage: { $nin: ['closed_won', 'closed_lost'] } },
};

/**
 * Sales-rep funnel — two-level summary that mirrors how reps drill into their
 * own book of business. Tests the multi-level `groupingsDown` rendering and
 * the `aggregate`-mixed-with-`detail` column pattern.
 */
export const OpportunityFunnelByOwnerStageReport: ReportInput = {
  name: 'opportunity_funnel_owner_stage',
  label: 'Opportunity Funnel by Owner → Stage',
  description: 'Per-rep stage-by-stage pipeline funnel',
  objectName: 'opportunity',
  type: 'summary',
  columns: [
    { field: 'amount', label: 'Total Amount', aggregate: 'sum' },
    { field: 'name', label: 'Deals', aggregate: 'count' },
    { field: 'probability', label: 'Avg Probability', aggregate: 'avg' },
  ],
  groupingsDown: [
    { field: 'owner', sortOrder: 'asc' },
    { field: 'stage', sortOrder: 'asc' },
  ],
  filter: { stage: { $ne: 'closed_lost' } },
  chart: { type: 'funnel', title: 'Pipeline Funnel', showLegend: false, xAxis: 'stage', yAxis: 'amount' },
};
