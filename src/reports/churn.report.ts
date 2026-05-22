// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { ReportInput } from '@objectstack/spec/ui';

// Module-load helper: produce an ISO date N days before "now". Joined-report
// blocks use these as literal $lt / $gte bounds so the server-side SQL driver
// receives plain string parameters (CEL filter-time evaluation is not yet
// implemented in the engine — see TODO in packages/objectql).
const daysAgo = (n: number): string => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
};

/**
 * Customer Churn Signals — a "joined" report that gives a Customer Success
 * Manager a one-screen view of the three populations that matter for
 * proactive churn intervention:
 *
 *   1. At-Risk Accounts     — active accounts with no activity in 60+ days
 *   2. Silent High-Value    — top revenue accounts gone quiet (90+ days)
 *   3. Recently Closed-Lost — opportunities lost in the last 30 days
 *
 * Each block is an independent sub-report; the joined renderer stacks them
 * vertically. There is no container-level filter on this report — each block
 * carries its own scope because they query different objects (`account`,
 * `opportunity`) at different time horizons.
 *
 * Joined Reports demonstrate the spec's M3 capability: multi-block analytic
 * surfaces with shared chrome but independent data binding.
 */
export const CustomerChurnSignalsReport: ReportInput = {
  name: 'customer_churn_signals',
  label: 'Customer Churn Signals',
  description:
    'Three-panel early-warning view: at-risk customers, silent high-value accounts, and recently-lost opportunities.',
  objectName: 'account',
  type: 'joined',
  // Container columns: joined reports declare their effective columns inside
  // each block, so the top-level `columns` is intentionally empty.
  columns: [],
  blocks: [
    {
      name: 'at_risk_accounts',
      label: 'At-Risk Accounts',
      description: 'Active accounts with no activity in 14+ days, grouped by industry.',
      type: 'summary',
      objectName: 'account',
      columns: [
        { field: 'name', label: 'Account' },
        { field: 'id', label: 'Accounts', aggregate: 'count' },
      ],
      groupingsDown: [{ field: 'industry', sortOrder: 'asc' }],
      filter: {
        is_active: true,
        last_activity_date: { $lt: daysAgo(14) },
      },
    },
    {
      name: 'silent_high_value',
      label: 'Silent High-Value Accounts',
      description: 'Active accounts gone quiet for 30+ days, grouped by type.',
      type: 'summary',
      objectName: 'account',
      columns: [
        { field: 'id', label: 'Accounts', aggregate: 'count' },
      ],
      groupingsDown: [{ field: 'type', sortOrder: 'asc' }],
      filter: {
        is_active: true,
        last_activity_date: { $lt: daysAgo(30) },
      },
    },
    {
      name: 'recently_closed_lost',
      label: 'Recently Lost Opportunities',
      description: 'Opportunities closed-lost in the last 30 days — investigate before the customer fully churns.',
      type: 'summary',
      objectName: 'opportunity',
      columns: [
        { field: 'amount', label: 'Lost Revenue', aggregate: 'sum' },
        { field: 'id', label: 'Deals', aggregate: 'count' },
      ],
      groupingsDown: [{ field: 'owner', sortOrder: 'asc' }],
      filter: {
        stage: 'closed_lost',
        close_date: { $gte: daysAgo(30) },
      },
    },
  ],
};
