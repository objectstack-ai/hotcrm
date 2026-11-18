// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { defineDataset } from '@objectstack/spec/ui';

/**
 * Time utilization (#2316 phase 1c, #2483, ADR-0021).
 *
 * Hours booked per person, project and week, and the billable share of them.
 * One row is one time entry, so a week or a month is the one the hours were
 * worked in (`entry_date`), whatever timesheet they sit on. The person, the
 * project and the approval are the timesheet's, read through the master-detail
 * link (`include: ['crm_timesheet']`). Hours count toward cost only once their
 * timesheet is Approved, so the dashboard's tiles filter on
 * `crm_timesheet.status`; a draft or waiting sheet is booked time, not cost.
 *
 * The filter on an included object's field is served from 18.5.0
 * (objectstack#33512): 18.4.0's in-process aggregate (every driver without
 * SQL, and any date-bucketed query) refused it with 400 "cannot evaluate a
 * cross-object filter", which is why phase 1c built this dataset on the
 * timesheet and counted a sheet's hours in the week it starts. The include is
 * required: without it the filter names a field the entry does not have.
 *
 * No money here: entry cost is hidden from team members at field level, and
 * this dataset is about hours. Cost lives in `project_financials`.
 */
export const TimeUtilizationDataset = defineDataset({
  name: 'time_utilization',
  label: 'Time Utilization',
  description: 'Hours booked per person, project and week, and the billable share',
  object: 'crm_time_entry',
  include: ['crm_timesheet'],

  dimensions: [
    { name: 'period_week', label: 'Week', synonyms: ['by week', 'weekly', '周'], field: 'entry_date', type: 'date', dateGranularity: 'week' },
    { name: 'period_month', label: 'Month', synonyms: ['by month', 'monthly', '月'], field: 'entry_date', type: 'date', dateGranularity: 'month' },
    { name: 'person', label: 'Person', synonyms: ['employee', 'consultant', '人员'], field: 'crm_timesheet.owner_id', type: 'lookup' },
    { name: 'project', label: 'Project', synonyms: ['engagement', '项目'], field: 'crm_timesheet.crm_project', type: 'lookup' },
    { name: 'status', label: 'Timesheet Status', synonyms: ['timesheet approval', '工时表状态'], field: 'crm_timesheet.status', type: 'string' },
  ],

  measures: [
    { name: 'total_hours', label: 'Hours', synonyms: ['time booked', 'hours logged', '工时'], aggregate: 'sum', field: 'hours', format: '0,0.0' },
    { name: 'billable_hours', label: 'Billable Hours', synonyms: ['chargeable hours', '可计费工时'], aggregate: 'sum', field: 'hours', filter: { is_billable: true }, format: '0,0.0' },
    { name: 'utilization', label: 'Billable Share', synonyms: ['billable ratio', 'chargeable share', '利用率'], derived: { op: 'ratio', of: ['billable_hours', 'total_hours'] }, format: '0%' },
  ],
});
