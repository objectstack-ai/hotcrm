// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { defineView } from '@objectstack/spec/ui';

/**
 * Forecast Views
 *
 *   • grid            — every snapshot
 *   • current_quarter — owners × this-quarter row
 *   • my_forecast     — current user's snapshots
 */
export const ForecastViews = defineView({
  list: {
    type: 'grid',
    name: 'all_forecasts',
    label: 'All Forecasts',
    data: { provider: 'object', object: 'crm_forecast' },
    columns: [
      { field: 'owner',            width: 160, pinned: 'left', link: true },
      { field: 'period_label',     width: 130, sortable: true },
      { field: 'period_start',     width: 130, sortable: true },
      { field: 'snapshot_date',    width: 130, sortable: true },
      { field: 'quota',            width: 130, align: 'right', summary: 'sum' },
      { field: 'closed_amount',    width: 140, align: 'right', summary: 'sum' },
      { field: 'commit_amount',    width: 140, align: 'right', summary: 'sum' },
      { field: 'best_case_amount', width: 140, align: 'right', summary: 'sum' },
      { field: 'pipeline_amount',  width: 140, align: 'right', summary: 'sum' },
      { field: 'expected_amount',  width: 140, align: 'right', summary: 'sum' },
      { field: 'attainment_pct',   width: 130, align: 'right' },
      { field: 'coverage_ratio',   width: 130, align: 'right' },
      { field: 'source',           width: 130 },
    ],
    sort: [
      { field: 'period_start',  order: 'desc' },
      { field: 'owner',         order: 'asc' },
    ],
    grouping: { fields: [{ field: 'period_label', order: 'desc' }] },
    pagination: { pageSize: 50 },
    appearance: { allowedVisualizations: ['grid'] },
    tabs: [
      { name: 'all',          label: 'All',           view: 'all_forecasts',  isDefault: true, pinned: true },
      { name: 'this_quarter', label: 'This Quarter',  icon: 'calendar',       view: 'this_quarter_forecasts' },
      { name: 'mine',         label: 'My Forecast',   icon: 'user',           view: 'my_forecast' },
    ],
  },

  listViews: {
    this_quarter_forecasts: {
      name: 'this_quarter_forecasts',
      type: 'grid',
      label: 'This Quarter',
      data: { provider: 'object', object: 'crm_forecast' },
      columns: ['owner', 'quota', 'closed_amount', 'commit_amount', 'best_case_amount', 'pipeline_amount', 'attainment_pct', 'coverage_ratio'],
      filter: [
        { field: 'period',       operator: 'equals', value: 'quarter' },
        { field: 'period_start', operator: 'equals', value: '{current_quarter_start}' },
      ],
      sort: [{ field: 'attainment_pct', order: 'desc' }],
    },
    my_forecast: {
      name: 'my_forecast',
      type: 'grid',
      label: 'My Forecast',
      data: { provider: 'object', object: 'crm_forecast' },
      columns: ['period_label', 'snapshot_date', 'quota', 'closed_amount', 'commit_amount', 'pipeline_amount', 'attainment_pct'],
      // `{current_user_id}` is the only user token the view runtime resolves
      // (`{current_user}` silently never matches).
      filter: [{ field: 'owner', operator: 'equals', value: '{current_user_id}' }],
      sort: [{ field: 'period_start', order: 'desc' }],
    },
  },

  form: {
    type: 'simple',
    data: { provider: 'object', object: 'crm_forecast' },
    sections: [
      {
        label: 'Snapshot',
        columns: 2,
        fields: ['owner', 'period', 'period_start', 'period_end', 'period_label', 'snapshot_date', 'source'],
      },
      {
        label: 'Amounts',
        columns: 2,
        fields: ['quota', 'closed_amount', 'commit_amount', 'best_case_amount', 'pipeline_amount', 'expected_amount', 'attainment_pct', 'coverage_ratio'],
      },
      {
        label: 'Notes',
        columns: 1,
        fields: ['notes'],
      },
    ],
  },
});
