// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type * as Automation from '@objectstack/spec/automation';
type Flow = Automation.Flow;

/**
 * Urgent task alert — record-change flow on task insert.
 *
 * Migrated from the removed `notify_on_urgent` object workflow (7.7 dropped
 * `workflows[]`). When an urgent, not-yet-completed task is created, notify its
 * owner.
 */
export const TaskUrgentAlertFlow: Flow = {
  name: 'task_urgent_alert',
  label: 'Urgent Task Alert',
  description: 'On new urgent task: notify the owner.',
  type: 'record_change',
  status: 'active',
  variables: [],
  nodes: [
    {
      id: 'start', type: 'start', label: 'Start (task created)',
      config: {
        objectName: 'crm_task',
        triggerType: 'record-after-create',
        condition: 'record.priority == "urgent" && record.is_completed != true',
      },
    },
    {
      id: 'notify_owner', type: 'notify', label: 'Notify Owner',
      config: {
        to: ['{record.owner}'],
        channels: ['inbox', 'email'],
        severity: 'warning',
        topic: 'urgent_task',
        title: 'Urgent task: {record.subject}',
        body: 'An urgent task "{record.subject}" was assigned to you and needs attention.',
        actionUrl: '/crm_task/{record.id}',
      },
    },
    { id: 'end', type: 'end', label: 'End' },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'notify_owner', type: 'default' },
    { id: 'e2', source: 'notify_owner', target: 'end', type: 'default' },
  ],
};
