// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { defineDataset } from '@objectstack/spec/ui';

/** Account analytics dataset (ADR-0021). */
export const AccountDataset = defineDataset({
  name: 'account_metrics',
  label: 'Account Metrics',
  description: 'Semantic layer for account counts by industry / type',
  object: 'crm_account',
  dimensions: [
    {
      name: 'industry',
      label: 'Industry',
      description: 'The industry recorded on the account; accounts with no industry form their own group.',
      synonyms: ['sector', 'vertical', '行业'],
      field: 'industry',
      type: 'string',
    },
    {
      name: 'type',
      label: 'Type',
      description: 'The kind of account: prospect, customer, partner or former customer.',
      synonyms: ['account type', 'customer type', '客户类型'],
      field: 'type',
      type: 'string',
    },
    {
      name: 'created_at',
      label: 'Created',
      description: 'The month the account record was created in the CRM, not the date the company became a customer.',
      synonyms: ['created date', 'date created', '创建时间'],
      field: 'created_at',
      type: 'date',
      dateGranularity: 'month',
    },
  ],
  measures: [
    {
      name: 'account_count',
      label: 'Accounts',
      description: 'How many account records there are, of every type: prospects, customers, partners and former customers alike; group by Type to count paying customers only.',
      synonyms: ['number of accounts', 'customers', '客户数'],
      aggregate: 'count',
    },
    {
      name: 'annual_revenue_sum',
      label: 'Annual Revenue',
      description: 'The sum of the Annual Revenue entered on the accounts: the size of the customer companies themselves, not what they have bought from us.',
      synonyms: ['customer revenue', 'company revenue', '年收入'],
      aggregate: 'sum',
      field: 'annual_revenue',
      format: '0,0',
    },
  ],
});
