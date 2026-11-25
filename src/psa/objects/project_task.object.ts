// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { ObjectSchema, Field } from '@objectstack/spec/data';
import { F, P } from '@objectstack/spec';
import { PROJECT_TASK_STATUS_OPTIONS } from './_psa-picklists';

/**
 * Project Task — one piece of a project's plan: what is done, by whom, when,
 * and with how many hours (hotcrm#2545, PSA phase 2a).
 *
 * Not `crm_task`. That object is the sales activity (a call to return, an
 * email to send); this one is the delivery plan the Project Plan view's Gantt
 * draws (`../views/project_task.view.ts`).
 *
 * ## The tree and the schedule
 *
 * `parent_task` makes the tasks a tree: a task with subtasks is a summary row,
 * and the Task Tree view nests it over its subtasks. `predecessors` are the tasks that
 * must finish first (finish-to-start), drawn as the Gantt's links. Both are
 * picked from the same project's tasks, and `project_task.hook.ts` refuses a
 * parent or a predecessor from another project, and a parent that would make
 * a loop.
 *
 * The console's Gantt can auto-schedule: moving a task shifts its successors on
 * screen and saves them. There is no server-side cascade, so a date changed
 * over the API or in the record form moves that task only (accepted for 2a).
 *
 * ## Progress
 *
 * A task's `percent_complete` is the owner's estimate; Completed counts as
 * 100 %. The project's own Percent Complete is computed from its tasks by
 * `project_task.hook.ts`: the tasks with no subtasks, weighted by their
 * planned hours, cancelled ones left out. A summary task's own hours and
 * percentage are not counted, so nothing is counted twice.
 *
 * `actual_hours` sums the time entries booked against the task.
 *
 * ## Who sees and writes it
 *
 * `controlled_by_parent`: whoever reads the project reads its tasks, and
 * whoever edits the project (its owner, its project manager, an admin) writes
 * them. The team reads the plan (ruling D).
 */
export const ProjectTask = ObjectSchema.create({
  name: 'crm_project_task',
  label: 'Project Task',
  pluralLabel: 'Project Tasks',
  icon: 'list-checks',
  description: 'A piece of a project\'s plan, with its dates, planned hours, owner and progress',

  sharingModel: 'controlled_by_parent',
  nameField: 'name',
  highlightFields: ['status', 'task_owner', 'planned_end', 'percent_complete'],

  fieldGroups: [
    { key: 'basic', label: 'Task', icon: 'list-checks' },
    { key: 'schedule', label: 'Schedule', icon: 'calendar' },
    { key: 'effort', label: 'Effort', icon: 'timer' },
  ],

  fields: {
    crm_project: Field.masterDetail('crm_project', {
      label: 'Project',
      group: 'basic',
      required: true,
      storage: { notNull: true },
      deleteBehavior: 'cascade',
      relatedListColumns: ['name', 'parent_task', 'task_owner', 'planned_start', 'planned_end', 'planned_hours', 'status', 'percent_complete'],
    }),

    name: Field.text({
      label: 'Task Name',
      group: 'basic',
      required: true,
      maxLength: 200,
    }),

    parent_task: Field.lookup('crm_project_task', {
      label: 'Parent Task',
      group: 'basic',
      dependsOn: ['crm_project'],
      description: 'The task this one is part of. A task with subtasks is a summary: its progress comes from them.',
      relatedListColumns: ['name', 'task_owner', 'planned_start', 'planned_end', 'status', 'percent_complete'],
    }),

    task_owner: Field.lookup('sys_user', {
      label: 'Task Owner',
      group: 'basic',
      description: 'The person who does the task or answers for it.',
    }),

    status: Field.select({
      label: 'Status',
      group: 'basic',
      required: true,
      options: PROJECT_TASK_STATUS_OPTIONS.map((o) => (o.value === 'not_started' ? { ...o, default: true } : o)),
    }),

    is_milestone: Field.boolean({
      label: 'Milestone',
      group: 'basic',
      defaultValue: false,
      description: 'A checkpoint rather than work: drawn as a diamond on the Gantt, usually with no planned hours.',
    }),

    description: Field.textarea({ label: 'Description', group: 'basic' }),

    planned_start: Field.date({ label: 'Planned Start', group: 'schedule' }),
    planned_end: Field.date({ label: 'Planned End', group: 'schedule' }),

    predecessors: Field.lookup('crm_project_task', {
      label: 'Predecessors',
      group: 'schedule',
      multiple: true,
      dependsOn: ['crm_project'],
      description: 'The tasks that must finish before this one starts.',
    }),

    // What the Gantt reads to draw a milestone as a diamond (`typeField`). A
    // task with subtasks is drawn as a summary whatever this says. `hidden`
    // keeps it off the record page, the drawer and the form: it repeats the
    // Milestone checkbox as a machine value, and only the Gantt reads it.
    schedule_type: Field.formula({
      label: 'Schedule Type',
      group: 'schedule',
      hidden: true,
      returnType: 'text',
      expression: F`record.is_milestone == true ? "milestone" : "task"`,
    }),

    planned_hours: Field.number({
      label: 'Planned Hours',
      group: 'effort',
      scale: 2,
      min: 0,
      description: 'The effort the task is planned at. The project\'s Percent Complete weighs each task by it.',
    }),

    percent_complete: Field.percent({
      label: 'Percent Complete',
      group: 'effort',
      min: 0,
      max: 100,
      description: 'How far along the task is. Set to 100 when the task is Completed.',
    }),

    actual_hours: Field.summary({
      label: 'Actual Hours',
      group: 'effort',
      scale: 2,
      readonly: true,
      summaryOperations: {
        object: 'crm_time_entry',
        field: 'hours',
        function: 'sum',
        relationshipField: 'crm_project_task',
      },
    }),
  },

  validations: [
    {
      name: 'project_task_planned_dates',
      type: 'script',
      severity: 'error',
      message: 'Planned End must be on or after Planned Start.',
      condition: P`has(record.planned_start) && record.planned_start != null && has(record.planned_end) && record.planned_end != null && record.planned_end < record.planned_start`,
    },
  ],

  indexes: [
    { fields: ['crm_project'] },
    { fields: ['parent_task'] },
    { fields: ['task_owner'] },
    { fields: ['status'] },
  ],

  enable: {
    trackHistory: true,
    apiEnabled: true,
    apiMethods: ['get', 'list', 'create', 'update', 'delete'],
  },
});
