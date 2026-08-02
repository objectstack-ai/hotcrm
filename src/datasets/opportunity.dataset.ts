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
    // Win/loss attribution (#593). Both columns are now mandatory at close
    // (`requiredWhen` on crm_opportunity), so grouping by either one over
    // settled deals has no "unattributed" bucket to explain away.
    { name: 'win_reason', label: 'Win Reason', field: 'win_reason', type: 'string' },
    { name: 'loss_reason', label: 'Loss Reason', field: 'loss_reason', type: 'string' },
    // v17 fixes scoped aggregate execution and SQLite's epoch bucketing.
    // Trends and quarter coverage need different buckets over the same field,
    // so each one is its own semantic dimension.
    { name: 'close_date', label: 'Close Date', field: 'close_date', type: 'date', dateGranularity: 'month' },
    { name: 'close_quarter', label: 'Close Quarter', field: 'close_date', type: 'date', dateGranularity: 'quarter' },
    // Cross-object dimension: account industry via the crm_account relationship.
    { name: 'account_industry', label: 'Account Industry', field: 'crm_account.industry', type: 'string' },
  ],

  measures: [
    { name: 'opp_count', label: 'Opportunities', aggregate: 'count' },
    { name: 'total_amount', label: 'Total Amount', aggregate: 'sum', field: 'amount', format: '0,0' },
    { name: 'avg_amount', label: 'Avg Deal Size', aggregate: 'avg', field: 'amount', format: '0,0' },
    { name: 'avg_probability', label: 'Avg Probability', aggregate: 'avg', field: 'probability', format: '0%' },

    // ─── Win rate (#593) ────────────────────────────────────────────────
    //
    // A ratio is the most dangerous kind of measure: a wrong denominator does
    // not error, it returns a plausible number (#614 rendered a 1,500,000
    // quota as 7,940,000 because a filter was missing one of its two halves).
    // So the two halves are declared here, ONCE, as named measures — not
    // improvised per widget — and every widget that shows `win_rate` also
    // shows `won_count` and `lost_count` beside it, so the reader can check
    // the arithmetic that produced the percentage.
    //
    // Each carries its OWN `filter`, which the executor honours by running
    // that measure as its own sub-query and merging the result back on the
    // selected dimensions. That is what lets one widget row hold "won 2, lost
    // 1, 67%" — the counts are over different row sets, and only a
    // measure-level filter can say so. A widget-level `filter` cannot: it
    // narrows the whole row set at once, which is exactly how you end up
    // dividing a number by itself.
    //
    // `decided_count` is deliberately its own filtered count and NOT
    // `derived: { op: 'sum', of: ['won_count', 'lost_count'] }`. Measured on
    // 17.0.0-rc.1: a filtered measure contributes NO row for a group its
    // filter selects nothing in — the count comes back absent, not 0 — and a
    // derived measure over an absent input evaluates to null. Summing the two
    // would therefore blank the win rate of any rep who has never lost a deal
    // (100%, the group you least want to hide). Counting the union directly
    // keeps the denominator present whenever the group has any settled deal at
    // all. The remaining asymmetry — a group with losses but NO wins reports a
    // null win rate rather than 0% — is a platform behaviour, not something a
    // widget can paper over; it is pinned by `test/win-loss-capture.test.ts`
    // and filed upstream. The tables show `lost_count` next to `win_rate`
    // precisely so that a blank rate reads as "0 wins out of 3", not as
    // "no data".
    { name: 'won_count', label: 'Won Deals', aggregate: 'count', filter: { stage: 'closed_won' } },
    { name: 'lost_count', label: 'Lost Deals', aggregate: 'count', filter: { stage: 'closed_lost' } },
    {
      name: 'decided_count',
      label: 'Settled Deals',
      aggregate: 'count',
      filter: { stage: { $in: ['closed_won', 'closed_lost'] } },
    },
    { name: 'won_amount', label: 'Won Revenue', aggregate: 'sum', field: 'amount', filter: { stage: 'closed_won' }, format: '0,0' },
    { name: 'lost_amount', label: 'Lost Revenue', aggregate: 'sum', field: 'amount', filter: { stage: 'closed_lost' }, format: '0,0' },
    { name: 'win_rate', label: 'Win Rate', derived: { op: 'ratio', of: ['won_count', 'decided_count'] }, format: '0%' },
  ],
});
