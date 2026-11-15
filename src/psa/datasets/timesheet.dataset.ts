// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { defineDataset } from '@objectstack/spec/ui';

/**
 * Time utilization (#2316 phase 1c, ADR-0021).
 *
 * Hours booked per person, project and week, and the billable share of them.
 * One row is one timesheet: its `total_hours` and `billable_hours` summaries
 * add up its entries, and the person, the project and the status are the
 * sheet's own fields. Hours count toward cost only once their timesheet is
 * Approved, so the dashboard's tiles filter on `status`; a draft or waiting
 * sheet is booked time, not cost.
 *
 * Why the sheet and not the entry: the approval lives on the sheet, and
 * 18.4.0's in-process aggregate (ObjectQLStrategy, the strategy on every
 * non-SQL driver) groups by a field of an included object but refuses to
 * FILTER on one ("cannot evaluate a cross-object filter", 400, measured on the
 * branch server). An entry-level dataset could split approved hours from the
 * rest only as a dimension, never as a tile's filter. A week is therefore the
 * week the timesheet starts (`period_start`); a sheet covers at most 31 days.
 *
 * No money here: entry cost is hidden from team members at field level, and
 * this dataset is about hours. Cost lives in `project_financials`.
 */
export const TimeUtilizationDataset = defineDataset({
  name: 'time_utilization',
  label: 'Time Utilization',
  description: 'Hours booked per person, project and week, and the billable share',
  object: 'crm_timesheet',

  dimensions: [
    { name: 'period_week', label: 'Week', field: 'period_start', type: 'date', dateGranularity: 'week' },
    { name: 'period_month', label: 'Month', field: 'period_start', type: 'date', dateGranularity: 'month' },
    { name: 'person', label: 'Person', field: 'owner_id', type: 'lookup' },
    { name: 'project', label: 'Project', field: 'crm_project', type: 'lookup' },
    { name: 'status', label: 'Timesheet Status', field: 'status', type: 'string' },
  ],

  measures: [
    { name: 'total_hours', label: 'Hours', aggregate: 'sum', field: 'total_hours', format: '0,0.0' },
    { name: 'billable_hours', label: 'Billable Hours', aggregate: 'sum', field: 'billable_hours', format: '0,0.0' },
    { name: 'utilization', label: 'Billable Share', derived: { op: 'ratio', of: ['billable_hours', 'total_hours'] }, format: '0%' },
  ],
});
