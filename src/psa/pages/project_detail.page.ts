// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { Page } from '@objectstack/spec/ui';

/**
 * Project Detail — the project's default record page: the synthesized layout,
 * with the project's plan drawn on a Gantt under its fields (hotcrm#2545).
 *
 * Slotted (`kind: 'slotted'`): the console still draws the header, the
 * highlights, the Related tab (tasks, staffing, timesheets, expenses) and the
 * discussion it synthesizes for any object. Only the `details` slot, the body
 * of the first tab (Overview in the console), is authored:
 *
 *   1. a bare `record:details`, which draws the object's field groups exactly
 *      as the synthesized tab does;
 *   2. an `object-gantt` over this project's tasks. The filter's
 *      `{record_id}` is the record the page shows, resolved by the console
 *      (`RECORD_CONTEXT_TOKENS`); the server never sees the token.
 *
 * The Gantt reads the predecessors as finish-to-start links
 * (`dependencyTypes: false`: only ids are stored, so the link-type switcher is
 * hidden), milestones by `schedule_type`, and each bar's progress from the
 * task's Percent Complete. It names `parent_task` as its `parentField`, but on
 * 18.5.0 it does not nest: the console expands the lookup and the chart takes
 * the expanded row, not its id, as the parent (measured; the Task Tree list
 * view, which reads the id off the row, nests them). It nests once the chart
 * reads the id. Dragging a bar saves the task's
 * dates; the console's auto-schedule moves the successors on screen and saves
 * them, and nothing cascades on the server.
 *
 * The same chart over every project is the `project_plan` list view of
 * Project Tasks (`../views/project_task.view.ts`).
 */
export const ProjectDetailPage: Page = {
  name: 'project_detail_page',
  label: 'Project Detail',
  description: "The project's record page: the synthesized layout, with the project's task plan on a Gantt in the Overview tab.",

  type: 'record',
  object: 'crm_project',
  isDefault: true,

  kind: 'slotted',
  regions: [],
  slots: {
    details: [
      { type: 'record:details', id: 'project_details' },
      {
        type: 'object-gantt',
        id: 'project_task_gantt',
        properties: {
          objectName: 'crm_project_task',
          filter: [{ field: 'crm_project', operator: 'equals', value: '{record_id}' }],
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
            tooltipFields: ['task_owner', 'planned_hours', 'actual_hours'],
            viewMode: 'week',
          },
        },
      },
    ],
  },
};
