// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { defineView } from '@objectstack/spec/ui';

/**
 * Timesheet views.
 *
 *   • All Timesheets — every timesheet the reader may see, latest period first.
 *   • My Timesheets — the reader's own.
 *   • Timesheets to Approve — submitted ones stamped with the reader as approver.
 */
export const TimesheetViews = defineView({
  list: {
    type: 'grid',
    name: 'all_timesheets',
    label: 'All Timesheets',
    userActions: { editInline: true },
    data: { provider: 'object', object: 'crm_timesheet' },
    columns: [
      { field: 'name', width: 280, link: true, pinned: 'left' },
      { field: 'owner_id', width: 160 },
      { field: 'crm_project', width: 220 },
      { field: 'period_start', width: 120, sortable: true },
      { field: 'period_end', width: 120 },
      { field: 'status', width: 110 },
      { field: 'total_hours', width: 110, align: 'right', summary: 'sum' },
    ],
    sort: [{ field: 'period_start', order: 'desc' }],
    pagination: { pageSize: 50 },
  },

  listViews: {
    my_timesheets: {
      name: 'my_timesheets',
      type: 'grid',
      label: 'My Timesheets',
      userActions: { editInline: true },
      data: { provider: 'object', object: 'crm_timesheet' },
      columns: ['name', 'crm_project', 'period_start', 'period_end', 'status', 'total_hours'],
      filter: [
        { field: 'owner_id', operator: 'equals', value: '{current_user_id}' },
      ],
      sort: [{ field: 'period_start', order: 'desc' }],
    },

    timesheets_to_approve: {
      name: 'timesheets_to_approve',
      type: 'grid',
      label: 'Timesheets to Approve',
      userActions: { editInline: true },
      data: { provider: 'object', object: 'crm_timesheet' },
      columns: ['name', 'owner_id', 'crm_project', 'period_start', 'period_end', 'total_hours', 'status'],
      filter: [
        { field: 'approver', operator: 'equals', value: '{current_user_id}' },
        { field: 'status', operator: 'equals', value: 'submitted' },
      ],
      sort: [{ field: 'period_start', order: 'asc' }],
    },
  },
});
