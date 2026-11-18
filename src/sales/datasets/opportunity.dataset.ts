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
    {
      name: 'stage',
      label: 'Stage',
      description: 'Where the deal stands in the sales process, from Prospecting to Closed Won or Closed Lost; every stage but the last two is open pipeline.',
      synonyms: ['sales stage', 'deal stage', '阶段'],
      field: 'stage',
      type: 'string',
    },
    {
      name: 'lead_source',
      label: 'Lead Source',
      description: 'Where the deal came from, as recorded on the opportunity; deals with no source recorded form their own group.',
      synonyms: ['opportunity source', 'deal source', '商机来源'],
      field: 'lead_source',
      type: 'string',
    },
    {
      name: 'forecast_category',
      label: 'Forecast Category',
      description: 'The forecast bucket the deal is counted in: Pipeline, Best Case, Commit, Omitted or Closed.',
      synonyms: ['forecast bucket', '预测类别'],
      field: 'forecast_category',
      type: 'string',
    },
    {
      name: 'type',
      label: 'Deal Type',
      description: 'Whether the deal is new business or an upgrade, renewal or expansion with an existing customer.',
      synonyms: ['opportunity type', 'new or renewal', '商机类型'],
      field: 'type',
      type: 'string',
    },
    // Semantic name `owner`; column `owner_id`, the platform anchor (#548).
    {
      name: 'owner',
      label: 'Owner',
      description: 'The sales rep who owns the deal; results show the person, and a deal counts once, under its current owner only.',
      synonyms: ['sales rep', 'deal owner', '负责人'],
      field: 'owner_id',
      type: 'lookup',
    },
    // Win/loss attribution (#593). Both columns are now mandatory at close
    // (`requiredWhen` on crm_opportunity), so grouping by either one over
    // settled deals has no "unattributed" bucket to explain away.
    {
      name: 'win_reason',
      label: 'Win Reason',
      description: 'Why a won deal was won, recorded when it is closed as won; open and lost deals have no win reason.',
      synonyms: ['why we won', '赢单原因'],
      field: 'win_reason',
      type: 'string',
    },
    {
      name: 'loss_reason',
      label: 'Loss Reason',
      description: 'Why a lost deal was lost, recorded when it is closed as lost; open and won deals have no loss reason.',
      synonyms: ['why we lost', '丢单原因'],
      field: 'loss_reason',
      type: 'string',
    },
    // v17 fixes scoped aggregate execution and SQLite's epoch bucketing.
    // Trends and quarter coverage need different buckets over the same field,
    // so each one is its own semantic dimension.
    {
      name: 'close_date',
      label: 'Close Date',
      description: 'The close date by calendar month: the expected close date for an open deal, the date it closed for a won or lost one; not the date the deal was created.',
      synonyms: ['expected close', 'closing date', '关闭日期'],
      field: 'close_date',
      type: 'date',
      dateGranularity: 'month',
    },
    {
      name: 'close_quarter',
      label: 'Close Quarter',
      description: 'The same close date grouped by calendar quarter, for quarter-by-quarter views; it is not a fiscal calendar.',
      synonyms: ['quarter', 'fiscal quarter', '关闭季度'],
      field: 'close_date',
      type: 'date',
      dateGranularity: 'quarter',
    },
    // Cross-object dimension: account industry via the crm_account relationship.
    {
      name: 'account_industry',
      label: 'Account Industry',
      description: 'The industry of the customer account the deal belongs to, read from the account; deals whose account has no industry form their own group.',
      synonyms: ['customer industry', '客户行业'],
      field: 'crm_account.industry',
      type: 'string',
    },
  ],

  measures: [
    {
      name: 'opp_count',
      label: 'Opportunities',
      description: 'How many opportunities there are, at every stage: open, won and lost alike; Won Deals counts the won ones only.',
      synonyms: ['number of opportunities', 'deals', '商机数'],
      aggregate: 'count',
    },
    {
      name: 'total_amount',
      label: 'Total Amount',
      description: 'The sum of the Amount of every deal at every stage, open, won and lost alike, so it is neither open pipeline nor won revenue until it is narrowed by stage.',
      synonyms: ['pipeline value', 'deal value', '商机金额'],
      aggregate: 'sum',
      field: 'amount',
      format: '0,0',
    },
    {
      name: 'avg_amount',
      label: 'Avg Deal Size',
      description: 'The average Amount of one deal, at every stage, open, won and lost alike; deals with no amount entered are left out of the average.',
      synonyms: ['average deal size', 'average amount', '平均金额', '客单价'],
      aggregate: 'avg',
      field: 'amount',
      format: '0,0',
    },
    {
      name: 'avg_probability',
      label: 'Avg Probability',
      description: 'The average Probability (%) of the deals in view; probability follows the stage, so it shows how far along the deals are, not a weighted pipeline amount.',
      synonyms: ['average win probability', '平均赢率'],
      aggregate: 'avg',
      field: 'probability',
      format: '0%',
    },

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
    // and filed as #656. The tables show `lost_count` next to `win_rate`
    // precisely so that a blank rate reads as "0 wins out of 3", not as
    // "no data".
    {
      name: 'won_count',
      label: 'Won Deals',
      description: 'How many deals are at Closed Won; open and lost deals are not counted.',
      synonyms: ['deals won', 'wins', '赢单数'],
      aggregate: 'count',
      filter: { stage: 'closed_won' },
    },
    {
      name: 'lost_count',
      label: 'Lost Deals',
      description: 'How many deals are at Closed Lost; open and won deals are not counted.',
      synonyms: ['deals lost', 'losses', '丢单数'],
      aggregate: 'count',
      filter: { stage: 'closed_lost' },
    },
    {
      name: 'decided_count',
      label: 'Settled Deals',
      description: 'How many deals have an outcome, Closed Won or Closed Lost; open deals are not counted. It is the denominator of Win Rate.',
      synonyms: ['closed deals', 'decided deals', '已结单数'],
      aggregate: 'count',
      filter: { stage: { $in: ['closed_won', 'closed_lost'] } },
    },
    // `revenue` (and 收入) is deliberately NOT a synonym here (#2593): the word
    // fits three governed numbers in this app, won deals here, an account's
    // Annual Revenue and a project's Planned Revenue, so a question asked with
    // it is answered by asking which one, from each candidate's description.
    // `test/dataset-vocabulary.test.ts` pins that it matches no member.
    {
      name: 'won_amount',
      label: 'Won Revenue',
      description: 'The Amount of the deals at Closed Won: booked deal revenue. It excludes open and lost deals, and it is not an account annual revenue or a project planned revenue.',
      synonyms: ['bookings', '赢单金额'],
      aggregate: 'sum',
      field: 'amount',
      filter: { stage: 'closed_won' },
      format: '0,0',
    },
    {
      name: 'lost_amount',
      label: 'Lost Revenue',
      description: 'The Amount of the deals at Closed Lost; open and won deals are not included.',
      synonyms: ['lost amount', '丢单金额'],
      aggregate: 'sum',
      field: 'amount',
      filter: { stage: 'closed_lost' },
      format: '0,0',
    },
    {
      name: 'win_rate',
      label: 'Win Rate',
      description: 'Won Deals divided by Settled Deals, counted in deals rather than amount; open deals are left out, so a full pipeline does not lower it.',
      synonyms: ['close rate', 'conversion rate', '赢率', '赢单率'],
      derived: { op: 'ratio', of: ['won_count', 'decided_count'] },
      format: '0%',
    },
  ],
});
