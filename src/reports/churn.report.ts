// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Report } from '@objectstack/spec/ui';

/**
 * Customer Churn Signals — a "joined" report that gives a Customer Success
 * Manager a one-screen view of the three populations that matter for
 * proactive churn intervention:
 *
 *   1. At-Risk Accounts     — active accounts with no activity in 60+ days
 *   2. Silent High-Value    — strategic/enterprise accounts gone quiet (90+ days)
 *   3. Recently Closed-Lost — opportunities lost in the last 30 days
 *
 * Each block is an independent sub-report; the joined renderer stacks them
 * vertically. There is no container-level filter on this report — each block
 * carries its own scope because they query different objects (`crm_account`,
 * `crm_opportunity`) at different time horizons.
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
