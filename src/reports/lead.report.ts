// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { ReportInput } from '@objectstack/spec/ui';

/**
 * Lead engagement trend — matrix over `last_contacted_date` (a user-managed
 * datetime, so it can be set in seed data and varied across months for a
 * realistic demo). Lets a marketing-ops lead spot which channels we're
 * actively working month-over-month.
 *
 * The across axis is NOT bucketed by month yet: `lead_metrics` cannot declare
 * `dateGranularity` while the app is pinned to @objectstack 16.x (both gaps
 * are spelled out on `opportunity_metrics.close_date`; hotcrm#523), so the
 * columns are one-per-raw-date until the 17.0 upgrade lands. The month bucket
 * is pinned as intent in `test/dataset-granularity.test.ts`.
 */
export const LeadInflowByMonthSourceReport: ReportInput = {
  name: 'lead_inflow_by_month_source',
  label: 'Lead Engagement by Month × Source',
  description: 'Contacted-lead volume per month, broken down by acquisition channel',
  dataset: 'lead_metrics', rows: ['lead_source'], columns: ['last_contacted_date'], values: ['lead_count'],
  type: 'matrix',
  // A never-contacted lead has no engagement month, and grouping it produced a
  // headerless '—' column next to the real ones. This report counts CONTACTED
  // leads (see the label/description), so the empty bucket is excluded at the
  // source rather than rendered as a mystery column.
  runtimeFilter: { last_contacted_date: { $ne: null } },
};
