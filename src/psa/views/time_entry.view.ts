// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { defineView } from '@objectstack/spec/ui';

/** Time Entry views: entries are written on their timesheet; this grid reads them across. */
export const TimeEntryViews = defineView({
  list: {
    type: 'grid',
    name: 'all_time_entries',
    label: 'All Time Entries',
    userActions: { editInline: true },
    data: { provider: 'object', object: 'crm_time_entry' },
    columns: [
      { field: 'entry_date', width: 120, link: true, pinned: 'left' },
      { field: 'crm_timesheet', width: 280 },
      { field: 'hours', width: 100, align: 'right', summary: 'sum' },
      { field: 'is_billable', width: 100, align: 'center' },
      { field: 'notes', width: 300 },
    ],
    sort: [{ field: 'entry_date', order: 'desc' }],
    pagination: { pageSize: 50 },
  },
});
