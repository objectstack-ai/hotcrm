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
      { field: 'owner_id',            width: 160, pinned: 'left', link: true },
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
      { field: 'owner_id',         order: 'asc' },
    ],
    grouping: { fields: [{ field: 'period_label', order: 'desc' }] },
    pagination: { pageSize: 50 },
    appearance: { allowedVisualizations: ['grid'] },
  },

  listViews: {
    this_quarter_forecasts: {
      name: 'this_quarter_forecasts',
      type: 'grid',
      // The label promises the CURRENT quarter, and the filter delivers it.
      //
      // The restriction was dropped in #515 on the measurement that "the list
      // data path resolves no date macro". That measurement was taken on
      // @objectstack 16.1.0 and has since expired: `resolveFilterTokens()` was
      // wired into the ObjectQL READ path in 17.0.0-rc.0 (objectql
      // `feat(filters): evaluate {filter-token} placeholders server-side`,
      // #3582) — `find`/`findOne`/`count`/`aggregate`, ahead of the middleware
      // chain, which is the one gate every server-side read passes through,
      // saved-view filters included. Measured on the pinned 17.0.0-rc.2 rather
      // than inferred; `test/forecast-current-quarter-view.test.ts` runs THIS
      // filter through a real engine and pins the three-way outcome (one
      // quarter selected, not zero and not all of them).
      //
      // Both halves of the key are load-bearing, same as the quota-attainment
      // widget in `src/dashboards/sales.dashboard.ts`: `period: 'quarter'`
      // alone returns every quarter ever snapshotted (the #730 defect), and
      // `period_start` alone merges the quarter row with the MONTH row that
      // opens the same quarter — Q3 and July both start on the 1st.
      //
      // The old `{this_quarter_start}` spelling is not merely unresolved now,
      // it is rejected: the resolver throws `Unresolvable filter placeholder`
      // and names `{current_quarter_start}` as the fix, so the silent-empty
      // failure mode that removal was reacting to is no longer reachable.
      label: 'This Quarter',
      data: { provider: 'object', object: 'crm_forecast' },
      columns: ['owner_id', 'quota', 'closed_amount', 'commit_amount', 'best_case_amount', 'pipeline_amount', 'attainment_pct', 'coverage_ratio'],
      filter: [
        { field: 'period', operator: 'equals', value: 'quarter' },
        { field: 'period_start', operator: 'equals', value: '{current_quarter_start}' },
      ],
      // One sort key, because the filter pins `period_start` to a single value
      // — the `period_start desc` key that ranked quarters against each other
      // existed only to float the current quarter to the top of an unscoped
      // list, and is provably inert now that the list holds one quarter.
      //
      // The tiebreaker is NOT `attainment_pct desc`, which is a FORMULA — the
      // engine computes it in JS after the query, so the data engine never saw
      // that sort key and the ordering within a quarter was arbitrary (same
      // class of defect as #489's `days_in_stage` filter). `closed_amount` is
      // the stored numerator behind attainment and ranks the same direction.
      sort: [
        { field: 'closed_amount', order: 'desc' },
      ],
      // Empty is the honest state, and it needs to say so. The seeds ship no
      // current-quarter row on purpose (#702 — the sweep owns that window, and
      // two producers in one window is what left a phantom ownerless
      // duplicate), so on a fresh install this view is empty until the 03:00
      // `forecast_snapshot` sweep has run once. That is the same trade the
      // quota-attainment widget already takes; without this copy the user
      // cannot tell it apart from a broken view.
      emptyState: {
        title: 'This Quarter Has No Snapshots Yet',
        message: 'Quarterly snapshots are written by the nightly forecast sweep. Until it has run once for the current quarter this view is empty — settled quarters are on the All tab.',
        icon: 'calendar',
      },
    },
    my_forecast: {
      name: 'my_forecast',
      type: 'grid',
      label: 'My Forecast',
      data: { provider: 'object', object: 'crm_forecast' },
      columns: ['period_label', 'snapshot_date', 'quota', 'closed_amount', 'commit_amount', 'pipeline_amount', 'attainment_pct'],
      // `{current_user_id}` is the only user token the view runtime resolves
      // (`{current_user}` silently never matches).
      filter: [{ field: 'owner_id', operator: 'equals', value: '{current_user_id}' }],
      sort: [{ field: 'period_start', order: 'desc' }],
    },
  },

  form: {
    type: 'simple',
    sections: [
      {
        name: 'snapshot',
        label: 'Snapshot',
        columns: 2,
        fields: ['owner_id', 'period', 'period_start', 'period_end', 'period_label', 'snapshot_date', 'source'],
      },
      {
        name: 'amounts',
        label: 'Amounts',
        columns: 2,
        fields: ['quota', 'closed_amount', 'commit_amount', 'best_case_amount', 'pipeline_amount', 'expected_amount', 'attainment_pct', 'coverage_ratio'],
      },
      {
        name: 'notes',
        label: 'Notes',
        columns: 1,
        fields: ['notes'],
      },
    ],
  },
});
