// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { defineDataset } from '@objectstack/spec/ui';

/** Account analytics dataset (ADR-0021). */
export const AccountDataset = defineDataset({
  name: 'account_metrics',
  label: 'Account Metrics',
  description: 'Semantic layer for account counts by industry / type',
  object: 'crm_account',
  dimensions: [
    { name: 'industry', label: 'Industry', synonyms: ['sector', 'vertical', '行业'], field: 'industry', type: 'string' },
    { name: 'type', label: 'Type', synonyms: ['account type', 'customer type', '客户类型'], field: 'type', type: 'string' },
    { name: 'created_at', label: 'Created', synonyms: ['created date', 'date created', '创建时间'], field: 'created_at', type: 'date', dateGranularity: 'month' },
  ],
  measures: [
    { name: 'account_count', label: 'Accounts', synonyms: ['number of accounts', 'customers', '客户数'], aggregate: 'count' },
    { name: 'annual_revenue_sum', label: 'Annual Revenue', synonyms: ['customer revenue', 'company revenue', '年收入'], aggregate: 'sum', field: 'annual_revenue', format: '0,0' },
  ],
});
