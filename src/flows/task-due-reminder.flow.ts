// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type * as Automation from '@objectstack/spec/automation';
type Flow = Automation.Flow;

/**
 * Task Due Reminder — scheduled time-based reminders.
 *
 * The task schema carries `reminder_date` (and `due_date`), and the calendar /
 * gantt views can *display* them — but nothing watched the clock, so a reminder
 * never actually fired. This flow adds the missing *time* dimension: it sweeps
 * tasks whose `reminder_date` has arrived (and that are still open and not yet
 * reminded), notifies the owner on the inbox + email channels, and stamps
 * `reminder_sent` so the same task is never alerted twice.
 *
 * Mirrors `case_sla_monitor` (scheduled trigger + get_record + loop + notify +
 * update_record), which is the established pattern for time-based sweeps here.
 *
 */
export const TaskDueReminderFlow: Flow = {
  name: 'task_due_reminder',
  label: 'Task Due Reminder',
  description: 'Hourly sweep: notify owners of tasks whose reminder time has arrived.',
  type: 'schedule',
  status: 'active',

  variables: [],

  nodes: [
    {
      id: 'start', type: 'start', label: 'Start (hourly)',
      config: { schedule: '0 * * * *' },
    },
    {
      id: 'query_due', type: 'get_record', label: 'Find Tasks Due for Reminder',
      config: {
        objectName: 'crm_task',
        // De-dup via `reminder_date` itself: the sweep notifies tasks whose
        // reminder time has arrived, then CLEARS reminder_date (see mark_sent),
        // so the row no longer matches `$lte` next tick. We do NOT filter on the
        // `reminder_sent` boolean here — empirically, a where-clause on that
        // (newly added) boolean column returns zero rows at runtime in this
        // engine build, while the long-standing `is_completed` boolean works.
        // Reusing the verified `$lte` + `is_completed` predicates keeps the
        // sweep reliable; `reminder_sent` is still stamped for the audit trail.
        filter: {
          is_completed: false,
          reminder_date: { $lte: '{NOW()}' },
        },
        limit: 500,
        outputVariable: 'reminderList',
      },
    },
    {
      // The loop body MUST be nested in `config.body` — a flat-graph loop
      // (body omitted, iterator wired via outer edges) does NOT iterate or bind
      // the iterator variable in the runtime (legacy no-op path), so
      // `{currentTask.*}` resolves empty. Verified empirically.
      id: 'loop_tasks', type: 'loop', label: 'For Each Due Task',
      config: {
        collection: '{reminderList}',
        iteratorVariable: 'currentTask',
        body: {
          nodes: [
            {
              id: 'notify_owner', type: 'notify', label: 'Notify Owner',
              config: {
                to: ['{currentTask.owner}'],
                channels: ['inbox', 'email'],
                severity: 'warning',
                topic: 'task_reminder',
                title: 'Task reminder: {currentTask.subject}',
                body: 'Your task "{currentTask.subject}" is due (reminder set for {currentTask.reminder_date}).',
                actionUrl: '/crm_task/{currentTask.id}',
              },
            },
            {
              id: 'mark_sent', type: 'update_record', label: 'Mark Reminder Sent',
              config: {
                objectName: 'crm_task',
                filter: { id: '{currentTask.id}' },
                // Clearing reminder_date is what de-dups (the row stops matching
                // the sweep's `$lte` next tick); reminder_sent is the audit flag.
                fields: { reminder_sent: true, reminder_date: null },
              },
            },
          ],
          edges: [
            { id: 'b1', source: 'notify_owner', target: 'mark_sent', type: 'default' },
          ],
        },
      },
    },
    { id: 'end', type: 'end', label: 'End' },
  ],

  edges: [
    { id: 'e1', source: 'start', target: 'query_due', type: 'default' },
    { id: 'e2', source: 'query_due', target: 'loop_tasks', type: 'default' },
    { id: 'e3', source: 'loop_tasks', target: 'end', type: 'default' },
  ],
};
