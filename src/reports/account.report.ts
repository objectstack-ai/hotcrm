// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Report } from '@objectstack/spec/ui';

export const AccountsByIndustryTypeReport: Report = {
  name: 'accounts_by_industry_type',
  label: 'Accounts by Industry and Type',
  description: 'Matrix report showing accounts by industry and type',
  dataset: 'account_metrics', rows: ['industry'], columns: ['type'], values: ['account_count', 'annual_revenue_sum'],
  type: 'matrix',
  runtimeFilter: { is_active: true },
};
