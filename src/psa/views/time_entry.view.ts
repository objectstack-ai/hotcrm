// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { defineView } from '@objectstack/spec/ui';

/**
 * Time Entry views.
 *
 *   • All Time Entries — every line the reader may see, latest first.
 *   • My Week (hotcrm#2546) — the reader's lines of the current week, Monday
 *     to Sunday, grouped by project, edited in place. A new line names its
 *     project and date and finds or creates its timesheet
 *     (`time_entry_timesheet`). The lines are one row per project, task and
 *     day, the shape a row-by-weekday grid reads, so that grid can replace
 *     this list later with no model change.
 *   • My Time — all the reader's lines, grouped by timesheet (one per project
 *     and period), latest first: last week's lines are entered here.
 */
export const TimeEntryViews = defineView({
  list: {
    type: 'grid',
    name: 'all_time_entries',
    label: 'All Time Entries',
    userActions: { editInline: true },
    data: { provider: 'object', object: 'crm_time_entry' },
    columns: [
      { field: 'entry_date', width: 120, link: true, pinned: 'left' },
      { field: 'owner_id', width: 160 },
      { field: 'crm_project', width: 220 },
      { field: 'crm_project_task', width: 200 },
      { field: 'hours', width: 100, align: 'right', summary: 'sum' },
      { field: 'is_billable', width: 100, align: 'center' },
      { field: 'crm_timesheet', width: 280 },
      { field: 'notes', width: 300 },
    ],
    sort: [{ field: 'entry_date', order: 'desc' }],
    pagination: { pageSize: 50 },
  },

  listViews: {
    my_week_time: {
      name: 'my_week_time',
      type: 'grid',
      label: 'My Week',
      userActions: { editInline: true },
      data: { provider: 'object', object: 'crm_time_entry' },
      columns: [
        { field: 'entry_date', width: 130, link: true, pinned: 'left' },
        { field: 'crm_project', width: 220 },
        { field: 'crm_project_task', width: 220 },
        { field: 'hours', width: 100, align: 'right', summary: 'sum' },
        { field: 'is_billable', width: 100, align: 'center' },
        { field: 'notes', width: 300 },
      ],
      // The line's owner is its timesheet's person (`time_entry_costing`
      // stamps it), and `{current_week_start}` / `{current_week_end}` run
      // Monday to Sunday, the week a new line's timesheet covers.
      filter: [
        { field: 'owner_id', operator: 'equals', value: '{current_user_id}' },
        { field: 'entry_date', operator: 'greater_than_or_equal', value: '{current_week_start}' },
        { field: 'entry_date', operator: 'less_than_or_equal', value: '{current_week_end}' },
      ],
      grouping: { fields: [{ field: 'crm_project', order: 'asc', collapsed: false }] },
      sort: [{ field: 'entry_date', order: 'asc' }],
      pagination: { pageSize: 100 },
    },

    my_time_entries: {
      name: 'my_time_entries',
      type: 'grid',
      label: 'My Time',
      userActions: { editInline: true },
      data: { provider: 'object', object: 'crm_time_entry' },
      columns: [
        { field: 'entry_date', width: 130, link: true, pinned: 'left' },
        { field: 'crm_project', width: 220 },
        { field: 'crm_project_task', width: 220 },
        { field: 'hours', width: 100, align: 'right', summary: 'sum' },
        { field: 'is_billable', width: 100, align: 'center' },
        { field: 'notes', width: 300 },
      ],
      filter: [
        { field: 'owner_id', operator: 'equals', value: '{current_user_id}' },
      ],
      // Latest period first: a group is ordered by its newest line.
      grouping: { fields: [{ field: 'crm_timesheet', order: 'desc', orderBy: 'entry_date', collapsed: false }] },
      sort: [{ field: 'entry_date', order: 'desc' }],
      pagination: { pageSize: 100 },
    },
  },
});
