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
 */
export const ForecastDataset = defineDataset({
  name: 'forecast_metrics',
  label: 'Forecast Metrics',
  description: 'Semantic layer for per-owner quota, attainment and pipeline coverage',
  object: 'crm_forecast',

  dimensions: [
    { name: 'owner', label: 'Owner', field: 'owner', type: 'lookup' },
    { name: 'period', label: 'Period Type', field: 'period', type: 'string' },
    { name: 'period_label', label: 'Period', field: 'period_label', type: 'string' },
    { name: 'period_start', label: 'Period Start', field: 'period_start', type: 'date' },
  ],

  measures: [
    { name: 'quota_sum', label: 'Quota', aggregate: 'sum', field: 'quota', format: '0,0' },
    { name: 'closed_sum', label: 'Closed', aggregate: 'sum', field: 'closed_amount', format: '0,0' },
    { name: 'pipeline_sum', label: 'Pipeline', aggregate: 'sum', field: 'pipeline_amount', format: '0,0' },
    { name: 'commit_sum', label: 'Commit', aggregate: 'sum', field: 'commit_amount', format: '0,0' },
    // Derived ratio (ADR-0021 Q1) rather than avg(attainment_pct): summing
    // closed and quota before dividing weights every rep/period by quota
    // size, where an average of per-row percentages would not.
    { name: 'attainment', label: 'Attainment', derived: { op: 'ratio', of: ['closed_sum', 'quota_sum'] }, format: '0%' },
  ],
});
