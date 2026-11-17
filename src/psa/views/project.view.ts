// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { defineView } from '@objectstack/spec/ui';

/**
 * Project views (hotcrm#2316 phase 1).
 *
 *   • All Projects — every project the reader may see, newest first, with its
 *     order and its cost and margin.
 *   • My Projects — the projects the reader manages.
 *   • Active Projects — the ones being delivered now, by planned end.
 *
 * No form is authored: the form and the record page derive from the object's
 * `fieldGroups`.
 */
export const ProjectViews = defineView({
  list: {
    type: 'grid',
    name: 'all_projects',
    label: 'All Projects',
    userActions: { editInline: true },
    data: { provider: 'object', object: 'crm_project' },
    columns: [
      { field: 'project_number', width: 120 },
      { field: 'name', width: 260, link: true, pinned: 'left' },
      { field: 'crm_account', width: 200 },
      // The order the project delivers (hotcrm#2561), beside its customer.
      { field: 'crm_sales_order', width: 200 },
      { field: 'kind', width: 110 },
      { field: 'status', width: 120 },
      { field: 'project_manager', width: 160 },
      { field: 'planned_end', width: 120, sortable: true },
      { field: 'approved_budget', width: 140, align: 'right' },
      { field: 'actual_labor_cost', width: 140, align: 'right' },
      { field: 'actual_expense_cost', width: 140, align: 'right' },
    ],
    sort: [{ field: 'project_number', order: 'desc' }],
    pagination: { pageSize: 50 },
  },

  listViews: {
    my_projects: {
      name: 'my_projects',
      type: 'grid',
      label: 'My Projects',
      userActions: { editInline: true },
      data: { provider: 'object', object: 'crm_project' },
      columns: ['name', 'crm_account', 'kind', 'status', 'planned_end', 'approved_budget', 'actual_labor_cost'],
      filter: [
        { field: 'project_manager', operator: 'equals', value: '{current_user_id}' },
      ],
      sort: [{ field: 'planned_end', order: 'asc' }],
    },

    active_projects: {
      name: 'active_projects',
      type: 'grid',
      label: 'Active Projects',
      userActions: { editInline: true },
      data: { provider: 'object', object: 'crm_project' },
      columns: ['name', 'crm_account', 'project_manager', 'planned_end', 'percent_complete', 'approved_budget', 'actual_labor_cost'],
      filter: [
        { field: 'status', operator: 'equals', value: 'active' },
      ],
      sort: [{ field: 'planned_end', order: 'asc' }],
    },
  },
});
