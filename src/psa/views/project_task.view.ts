// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { defineView } from '@objectstack/spec/ui';

/**
 * Project Task views (hotcrm#2545, PSA phase 2a).
 *
 *   • All Project Tasks — every task the reader may see, by project and start.
 *   • Project Plan — the same tasks on a Gantt: predecessors as links,
 *     milestones as diamonds, filtered by project. It names `parent_task` as
 *     its `parentField`; see the Task Tree note for why it does not nest yet.
 *   • Task Tree — the same tasks indented under their summary tasks.
 *   • My Project Tasks — the tasks the reader owns that are still open.
 *
 * The project's record page is the platform default and draws no Gantt
 * (#2740): one project's plan is Project Plan with its project quick filter.
 */
export const ProjectTaskViews = defineView({
  list: {
    type: 'grid',
    name: 'all_project_tasks',
    label: 'All Project Tasks',
    userActions: { editInline: true },
    data: { provider: 'object', object: 'crm_project_task' },
    columns: [
      { field: 'name', width: 260, link: true, pinned: 'left' },
      { field: 'crm_project', width: 240 },
      { field: 'parent_task', width: 200 },
      { field: 'task_owner', width: 160 },
      { field: 'status', width: 120 },
      { field: 'planned_start', width: 120 },
      { field: 'planned_end', width: 120 },
      { field: 'planned_hours', width: 120, align: 'right' },
      { field: 'actual_hours', width: 120, align: 'right' },
      { field: 'percent_complete', width: 120, align: 'right' },
    ],
    sort: [{ field: 'crm_project', order: 'asc' }, { field: 'planned_start', order: 'asc' }],
    pagination: { pageSize: 50 },
  },

  listViews: {
    project_plan: {
      name: 'project_plan',
      type: 'gantt',
      label: 'Project Plan',
      data: { provider: 'object', object: 'crm_project_task' },
      columns: ['name', 'task_owner', 'percent_complete'],
      sort: [{ field: 'planned_start', order: 'asc' }],
      gantt: {
        startDateField: 'planned_start',
        endDateField: 'planned_end',
        titleField: 'name',
        progressField: 'percent_complete',
        parentField: 'parent_task',
        dependenciesField: 'predecessors',
        dependencyTypes: false,
        typeField: 'schedule_type',
        colorField: 'status',
        tooltipFields: ['crm_project', 'task_owner', 'planned_hours', 'actual_hours'],
        quickFilters: [{ field: 'crm_project' }, { field: 'status' }],
        viewMode: 'week',
      },
    },

    // The task tree, indented under each summary task. The Gantt above takes
    // the same `parentField` but does not yet nest a lookup the console
    // expands (it reads the expanded row, not its id; measured on 18.5.0), so
    // the tree is read here until it does.
    project_task_tree: {
      name: 'project_task_tree',
      type: 'tree',
      label: 'Task Tree',
      data: { provider: 'object', object: 'crm_project_task' },
      columns: ['name', 'crm_project', 'status', 'planned_start', 'planned_end', 'planned_hours', 'percent_complete'],
      sort: [{ field: 'planned_start', order: 'asc' }],
      tree: {
        parentField: 'parent_task',
        labelField: 'name',
        fields: ['crm_project', 'status', 'planned_start', 'planned_end', 'planned_hours', 'actual_hours', 'percent_complete'],
      },
    },

    my_project_tasks: {
      name: 'my_project_tasks',
      type: 'grid',
      label: 'My Project Tasks',
      userActions: { editInline: true },
      data: { provider: 'object', object: 'crm_project_task' },
      columns: ['name', 'crm_project', 'status', 'planned_start', 'planned_end', 'planned_hours', 'actual_hours', 'percent_complete'],
      filter: [
        { field: 'task_owner', operator: 'equals', value: '{current_user_id}' },
        { field: 'status', operator: 'in', value: ['not_started', 'in_progress', 'on_hold'] },
      ],
      sort: [{ field: 'planned_end', order: 'asc' }],
    },
  },
});
