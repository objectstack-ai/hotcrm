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
        // Gate on the `status` enum, not the `is_completed` boolean: on
        // SQLite/libsql booleans persist as integer 1, so `is_completed != true`
        // is `1 != true` = always true and the guard never trips (cf. the same
        // hazard documented in case_escalation).
        condition: 'record.priority == "urgent" && record.status != "completed"',
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
