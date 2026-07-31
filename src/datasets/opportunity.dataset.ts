// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { defineDataset } from '@objectstack/spec/ui';

/**
 * Opportunity analytics dataset (ADR-0021).
 *
 * The single semantic source of truth for pipeline metrics across the Sales,
 * CRM and Executive dashboards. Widgets bind to this dataset and select
 * measures BY NAME (`total_amount`, `avg_amount`, `opp_count`) so "pipeline
 * revenue" means the same thing everywhere.
 */
export const OpportunityDataset = defineDataset({
  name: 'opportunity_metrics',
  label: 'Opportunity Metrics',
  description: 'Semantic layer for sales-pipeline counts and amounts',
  object: 'crm_opportunity',

  // Include the account relationship so dimensions can traverse it (the join is
  // derived from the `crm_account` lookup — no hand-written ON clause).
  include: ['crm_account'],

  dimensions: [
    { name: 'stage', label: 'Stage', field: 'stage', type: 'string' },
    { name: 'lead_source', label: 'Lead Source', field: 'lead_source', type: 'string' },
    { name: 'forecast_category', label: 'Forecast Category', field: 'forecast_category', type: 'string' },
    { name: 'type', label: 'Deal Type', field: 'type', type: 'string' },
    { name: 'owner', label: 'Owner', field: 'owner', type: 'lookup' },
    // ─── Why no `dateGranularity` on any date dimension (hotcrm#523) ────
    // This is the canonical note; the other datasets point here.
    //
    // Declaring a bucket on a dataset dimension is the supported mechanism and
    // IS what these dimensions want (month for the trend widgets, quarter for
    // pipeline_coverage_by_quarter, day for cases_opened_by_day_priority). It
    // cannot be declared while the app is pinned to @objectstack 16.x: doing so
    // makes every affected surface render EMPTY, which is worse than the
    // un-bucketed columns it would fix. Two independent 16.x gaps, both
    // verified against the pinned packages, both fixed in 17.0.0-rc.0:
    //
    //   1. Read scope. A granular dimension is refused by NativeSQLStrategy
    //      (service-analytics `canHandle` bails on any timeDimension carrying a
    //      granularity), so the query falls through to ObjectQLStrategy → the
    //      auto-bridged `executeAggregate`, which calls `engine.aggregate()`
    //      WITHOUT the caller's ExecutionContext. The sharing middleware then
    //      sees an empty principal and composes `{ id: '__deny_all__' }` for
    //      every `sharingModel: 'private'` object — which is all of ours. Fixed
    //      upstream by #3602/#3597: the bridge threads `context`, and the
    //      strategy applies the read scope itself.
    //   2. Bucketing. A `Field.datetime()` column lands in SQLite as INTEGER
    //      epoch millis, and 16.x buckets with a bare `strftime('%Y-%m', col)`
    //      — NULL for every row, i.e. a single '—' column. 17.0's driver-sql
    //      normalises epoch storage before formatting. `Field.date()` columns
    //      (close_date) are TEXT and bucket correctly even on 16.x, but they
    //      still hit gap 1.
    //
    // The intended bucket per dimension is not lost — it lives in
    // `test/dataset-granularity.test.ts`, whose guard flips from "must not
    // declare" to "must declare" the moment this app moves to @objectstack 17.
    // Until then the trend widgets and matrix reports group by the raw date.
    { name: 'close_date', label: 'Close Date', field: 'close_date', type: 'date' },
    // Cross-object dimension: account industry via the crm_account relationship.
    { name: 'account_industry', label: 'Account Industry', field: 'crm_account.industry', type: 'string' },
  ],

  measures: [
    { name: 'opp_count', label: 'Opportunities', aggregate: 'count' },
    { name: 'total_amount', label: 'Total Amount', aggregate: 'sum', field: 'amount', format: '0,0' },
    { name: 'avg_amount', label: 'Avg Deal Size', aggregate: 'avg', field: 'amount', format: '0,0' },
    { name: 'avg_probability', label: 'Avg Probability', aggregate: 'avg', field: 'probability', format: '0%' },
  ],
});
