// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { defineDataset } from '@objectstack/spec/ui';

/** Account analytics dataset (ADR-0021). */
export const AccountDataset = defineDataset({
  name: 'account_metrics',
  label: 'Account Metrics',
  description: 'Semantic layer for account counts by industry / type',
  object: 'crm_account',
  dimensions: [
    { name: 'industry', label: 'Industry', field: 'industry', type: 'string' },
    { name: 'type', label: 'Type', field: 'type', type: 'string' },
    // No `dateGranularity` (intended: month) — see the note on
    // opportunity_metrics.close_date for why it cannot be declared on 16.x.
    { name: 'created_at', label: 'Created', field: 'created_at', type: 'date' },
  ],
  measures: [
    { name: 'account_count', label: 'Accounts', aggregate: 'count' },
    { name: 'annual_revenue_sum', label: 'Annual Revenue', aggregate: 'sum', field: 'annual_revenue', format: '0,0' },
  ],
});
