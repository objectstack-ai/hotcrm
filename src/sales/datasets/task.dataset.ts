// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { defineDataset } from '@objectstack/spec/ui';

/**
 * Task analytics dataset (ADR-0021).
 *
 * Added for the "My Day" dashboard — `crm_task` had views, seed data and
 * automation but no semantic layer, so a rep's own workload could not be
 * counted or broken down anywhere.
 *
 * `priority_rank` is exposed alongside `priority` so a breakdown can be
 * ordered by urgency; sorting on the raw select compares option strings and
 * inverts it (normal > low > high > urgent).
 */
export const TaskDataset = defineDataset({
  name: 'task_metrics',
  label: 'Task Metrics',
  description: 'Semantic layer for task workload and completion',
  object: 'crm_task',
  dimensions: [
    {
      name: 'status',
      label: 'Status',
      description: 'Where the task stands: Not Started, In Progress, Waiting, Completed or Deferred.',
      synonyms: ['task status', '任务状态'],
      field: 'status',
      type: 'string',
    },
    {
      name: 'priority',
      label: 'Priority',
      description: 'The priority set on the task: Low, Normal, High or Urgent.',
      synonyms: ['task priority', '优先级'],
      field: 'priority',
      type: 'string',
    },
    {
      name: 'priority_rank',
      label: 'Urgency',
      description: 'The priority as a number for sorting, 1 for Low up to 4 for Urgent, and 0 for a task with no priority.',
      synonyms: ['priority rank', 'importance', '紧急程度'],
      field: 'priority_rank',
      type: 'number',
    },
    {
      name: 'type',
      label: 'Type',
      description: 'The kind of task: call, email, meeting, follow-up, demo or other.',
      synonyms: ['task type', '任务类型'],
      field: 'type',
      type: 'string',
    },
    {
      name: 'due_date',
      label: 'Due Date',
      description: 'The date the task is due; tasks with no due date form their own group.',
      synonyms: ['deadline', 'due', '截止日期'],
      field: 'due_date',
      type: 'date',
    },
    {
      name: 'is_overdue',
      label: 'Overdue',
      description: 'Whether the task was past its due date and not completed when it was last saved.',
      synonyms: ['late', 'past due', '逾期'],
      field: 'is_overdue',
      type: 'boolean',
    },
    {
      name: 'is_completed',
      label: 'Completed',
      description: 'Whether the task is at Completed; every other status counts as not completed.',
      synonyms: ['done', 'finished', '已完成'],
      field: 'is_completed',
      type: 'boolean',
    },
  ],
  measures: [
    {
      name: 'task_count',
      label: 'Tasks',
      description: 'How many tasks there are, in every status, completed and deferred ones included; group by Completed to count open work only.',
      synonyms: ['number of tasks', 'to-dos', '任务数'],
      aggregate: 'count',
    },
    {
      name: 'avg_progress',
      label: 'Avg Progress',
      description: 'The average Progress (%) of the tasks in view, completed tasks included; a task whose progress was never set counts as 0%.',
      synonyms: ['average progress', 'percent complete', '平均进度'],
      aggregate: 'avg',
      field: 'progress_percent',
      format: '0.0%',
    },
  ],
});
