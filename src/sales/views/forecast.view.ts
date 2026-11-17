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
    userActions: { editInline: true },
    data: { provider: 'object', object: 'crm_forecast' },
    // The period is named by its kind and its first day, both drawn in the
    // reader's language: `period_label` is stored text the snapshot hook
    // writes in English ("Nov 2026", "Q3 2026"), so a zh-CN list read English
    // in its own column (#2432 row 2). The label stays on the record.
    //
    // No footer totals: the list holds months and the quarters that contain
    // them, so a column total counts each month twice (#2432, beside row 6).
    // No `sum` on `expected_amount` either: a formula has no stored column to
    // aggregate, and the spec refuses `sum` on a `formula` field (#1980).
    columns: [
      { field: 'owner_id',         width: 160, pinned: 'left', link: true },
      { field: 'period',           width: 100 },
      { field: 'period_start',     width: 130, sortable: true },
      { field: 'snapshot_date',    width: 130, sortable: true },
      { field: 'quota',            width: 130, align: 'right' },
      { field: 'closed_amount',    width: 140, align: 'right' },
      { field: 'commit_amount',    width: 140, align: 'right' },
      { field: 'best_case_amount', width: 140, align: 'right' },
      { field: 'pipeline_amount',  width: 140, align: 'right' },
      { field: 'expected_amount',  width: 140, align: 'right' },
      { field: 'attainment_pct',   width: 130, align: 'right' },
      { field: 'coverage_ratio',   width: 130, align: 'right' },
      { field: 'source',           width: 130 },
    ],
    // Newest period first. No default grouping (#2432 row 4): a heading per
    // period (#2060 item 11, #2367 row 5) put one row under each heading on a
    // book with one owner, and the console fetched each group's rows with a
    // request of its own (7 requests for 7 periods, measured on 18.5.0). The
    // columns stay groupable from the list's own grouping control. A quarter
    // and the month that opens it share `period_start`; the second key puts
    // the quarter first (`quarter` sorts after `month`), and the `period`
    // column tells the two apart.
    sort: [
      { field: 'period_start', order: 'desc' },
      { field: 'period',       order: 'desc' },
      { field: 'owner_id',     order: 'asc' },
    ],
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
      // saved-view filters included. Measured rather than inferred;
      // `test/forecast-current-quarter-view.test.ts` runs THIS filter through a
      // real engine and pins the three-way outcome (one quarter selected, not
      // zero and not all of them). First taken on 17.0.0-rc.2, RE-RUN
      // 2026-09-03 on 17.2.0 (#1467), RE-RUN on 17.3.0 (#1676, after the PR
      // #1577 bump) and RE-RUN again on 17.4.0 (#1883, after the PR #1814
      // bump), green all four times. Not yet re-run on 17.5.0; the test is
      // what re-takes the reading on each new pin.
      //
      // Both halves of the key are load-bearing, same as the quota-attainment
      // widget in `src/sales/dashboards/sales.dashboard.ts`: `period: 'quarter'`
      // alone returns every quarter ever snapshotted (the #730 defect), and
      // `period_start` alone merges the quarter row with the MONTH row that
      // opens the same quarter — Q3 and July both start on the 1st.
      //
      // The old `{this_quarter_start}` spelling is not merely unresolved now,
      // it is rejected: the resolver throws `Unresolvable filter placeholder`
      // and names `{current_quarter_start}` as the fix, so the silent-empty
      // failure mode that removal was reacting to is no longer reachable.
      label: 'This Quarter',
      userActions: { editInline: true },
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
      userActions: { editInline: true },
      data: { provider: 'object', object: 'crm_forecast' },
      // The period by kind and first day, as on All Forecasts (#2432 row 2).
      columns: ['period', 'period_start', 'snapshot_date', 'quota', 'closed_amount', 'commit_amount', 'pipeline_amount', 'attainment_pct'],
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
