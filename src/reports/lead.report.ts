// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { ReportInput } from '@objectstack/spec/ui';

/**
 * Lead engagement trend — matrix with monthly bucketing on
 * `last_contacted_date` (a user-managed datetime, so it can be set in seed
 * data and varied across months for a realistic demo). Lets a marketing-ops
 * lead spot which channels we're actively working month-over-month.
 * Exercises the `dateGranularity: 'month'` server-side aggregation path.
 */
export const LeadInflowByMonthSourceReport: ReportInput = {
  name: 'lead_inflow_by_month_source',
  label: 'Lead Engagement by Month × Source',
  description: 'Contacted-lead volume per month, broken down by acquisition channel',
  objectName: 'lead',
  type: 'matrix',
  columns: [
    { field: 'id', label: 'Leads Touched', aggregate: 'count' },
  ],
  groupingsDown: [{ field: 'lead_source', sortOrder: 'asc' }],
  groupingsAcross: [
    { field: 'last_contacted_date', dateGranularity: 'month', sortOrder: 'asc' },
  ],
};
