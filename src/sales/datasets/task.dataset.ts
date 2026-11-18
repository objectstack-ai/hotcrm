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
    { name: 'status', label: 'Status', synonyms: ['task status', '任务状态'], field: 'status', type: 'string' },
    { name: 'priority', label: 'Priority', synonyms: ['task priority', '优先级'], field: 'priority', type: 'string' },
    { name: 'priority_rank', label: 'Urgency', synonyms: ['priority rank', 'importance', '紧急程度'], field: 'priority_rank', type: 'number' },
    { name: 'type', label: 'Type', synonyms: ['task type', '任务类型'], field: 'type', type: 'string' },
    { name: 'due_date', label: 'Due Date', synonyms: ['deadline', 'due', '截止日期'], field: 'due_date', type: 'date' },
    { name: 'is_overdue', label: 'Overdue', synonyms: ['late', 'past due', '逾期'], field: 'is_overdue', type: 'boolean' },
    { name: 'is_completed', label: 'Completed', synonyms: ['done', 'finished', '已完成'], field: 'is_completed', type: 'boolean' },
  ],
  measures: [
    { name: 'task_count', label: 'Tasks', synonyms: ['number of tasks', 'to-dos', '任务数'], aggregate: 'count' },
    { name: 'avg_progress', label: 'Avg Progress', synonyms: ['average progress', 'percent complete', '平均进度'], aggregate: 'avg', field: 'progress_percent', format: '0.0%' },
  ],
});
