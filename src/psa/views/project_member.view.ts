// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { defineView } from '@objectstack/spec/ui';

/** Project Member views: who is staffed where, by project. */
export const ProjectMemberViews = defineView({
  list: {
    type: 'grid',
    name: 'all_project_members',
    label: 'All Project Members',
    userActions: { editInline: true },
    data: { provider: 'object', object: 'crm_project_member' },
    columns: [
      { field: 'person', width: 180, link: true, pinned: 'left' },
      { field: 'crm_project', width: 240 },
      { field: 'responsibility', width: 160 },
      { field: 'rate_card', width: 180 },
      { field: 'allocation_percent', width: 120, align: 'right' },
      { field: 'start_date', width: 120 },
      { field: 'end_date', width: 120 },
      { field: 'is_billable', width: 100, align: 'center' },
    ],
    sort: [{ field: 'crm_project', order: 'asc' }],
    pagination: { pageSize: 50 },
  },
});
