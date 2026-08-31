// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Report } from '@objectstack/spec/ui';

/**
 * Customer Churn Signals — a "joined" report that gives a Customer Success
 * Manager a one-screen view of the four populations that matter for
 * proactive churn intervention:
 *
 *   1. CSM-Flagged          — accounts a human has marked at_risk / churning
 *   2. At-Risk Accounts     — active accounts with no activity in 60+ days
 *   3. Silent High-Value    — strategic/enterprise accounts gone quiet (90+ days)
 *   4. Recently Closed-Lost — opportunities lost in the last 30 days
 *
 * Each block is an independent sub-report; the joined renderer stacks them
 * vertically. There is no container-level filter on this report — each block
 * carries its own scope because they query different objects (`crm_account`,
 * `crm_opportunity`) at different time horizons.
 *
 * Block 1 is deliberately FIRST and deliberately not time-windowed. Blocks 2-4
 * are all derived signals: the clock stopped, the tier is quiet, the deal was
 * lost. `crm_account.health_score` is the only churn signal in the model a
 * person *asserts* — a CSM who has been in the room sets `at_risk` or
 * `churning` by hand — so it is the strongest evidence on the page and it is
 * independent of every window below it. An account that is being talked to
 * daily and is still churning is invisible to blocks 2-4 by construction, and
 * that account is the whole reason this block exists (#1186).
 *
 * Time windows use the spec's date-macro placeholders (`{60_days_ago}`, …,
 * DATE_MACRO_TOKENS in @objectstack/spec/data), which resolve per-query.
 * Computing the dates at module load froze them into dist/objectstack.json,
 * so every window silently stopped rolling on the day the artifact was built.
 *
 * Joined Reports demonstrate the spec's M3 capability: multi-block analytic
 * surfaces with shared chrome but independent data binding.
 */
export const CustomerChurnSignalsReport: Report = {
  name: 'customer_churn_signals',
  label: 'Customer Churn Signals',
  description:
    'Three-panel early-warning view: at-risk customers, silent high-value accounts, and recently-lost opportunities.',
  type: 'joined',
  blocks: [
    {
      // Named for the ACTOR, not the value, because `at_risk` is also a
      // `health_score` option and `at_risk_accounts` is already the block
      // below (a time window, nothing to do with the field). The two are
      // allowed to overlap: this one asks "who did a human flag", that one
      // asks "whose clock stopped".
      name: 'csm_flagged_accounts',
      label: 'CSM-Flagged Accounts',
      description:
        'Accounts a CSM has hand-flagged as at-risk or churning, grouped by type — human judgement, independent of the activity clock.',
      type: 'summary',
      dataset: 'account_metrics', rows: ['type'], values: ['account_count'],
      // No date term on purpose (see the header). `is_active` matches the two
      // account blocks below: a deactivated account has already churned, so it
      // is not a retention queue item. Grouping by `type` separates a flagged
      // CUSTOMER (revenue at risk today) from a flagged prospect or partner,
      // which the grid view `crm_account.at_risk_accounts` cannot show — it is
      // scoped to `type: 'customer'` before anything else.
      runtimeFilter: {
        is_active: true,
        health_score: { $in: ['at_risk', 'churning'] },
      },
    },
    {
      name: 'at_risk_accounts',
      label: 'At-Risk Accounts',
      description: 'Active accounts with no activity in 60+ days, grouped by industry.',
      type: 'summary',
      dataset: 'account_metrics', rows: ['industry'], values: ['account_count'],
      runtimeFilter: {
        is_active: true,
        last_activity_date: { $lt: '{60_days_ago}' },
      },
    },
    {
      name: 'silent_high_value',
      label: 'Silent High-Value Accounts',
      description: 'Strategic and enterprise accounts gone quiet for 90+ days, grouped by type.',
      type: 'summary',
      dataset: 'account_metrics', rows: ['type'], values: ['account_count'],
      // "High-value" is the account's tier, not a revenue threshold: the
      // strategic/enterprise tiers are exactly the book the CSM team owns.
      runtimeFilter: {
        is_active: true,
        tier: { $in: ['strategic', 'enterprise'] },
        last_activity_date: { $lt: '{90_days_ago}' },
      },
    },
    {
      name: 'recently_closed_lost',
      label: 'Recently Lost Opportunities',
      description: 'Opportunities closed-lost in the last 30 days — investigate before the customer fully churns.',
      type: 'summary',
      dataset: 'opportunity_metrics', rows: ['owner'], values: ['total_amount', 'opp_count'],
      runtimeFilter: {
        stage: 'closed_lost',
        close_date: { $gte: '{30_days_ago}' },
      },
    },
  ],
};
