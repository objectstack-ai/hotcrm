// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { P } from '@objectstack/spec';
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
  // A record-change flow fired by a SYSTEM write carries no trigger user
  // either (ADR-0049, #1888, #3760), and most urgent tasks in this app are
  // machine-written: `case_status_side_effects` opens the escalation follow-up
  // task, and the scheduled sweeps create their own — none of those writes
  // carries a session.
  //
  // Measured honestly on 17.0.0-rc.2: this flow has NO data node (start →
  // notify → end), so the refusal does not reach it today and declaring
  // `system` changes nothing observable. Declared for the same reason as
  // `contact_welcome` — see the fuller note there: the recorded decision is
  // that record-change automation runs as the platform, so a data node added
  // later inherits an elevation that was reasoned about rather than one
  // discovered as a production refusal. No data operation exists to scope, so
  // elevating the user-driven runs costs nothing.
  runAs: 'system',
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
        // TOTALITY (#633): `has(...)` on every read. Both fields are `required`
        // AND defaulted today, so this predicate measured total as authored —
        // but that is a property of `crm_task`'s schema, not of the predicate.
        // Drop either default and the flow goes silently inert on
        // driver-memory / driver-mongodb, with nothing to catch it. An absent
        // `status` is not `completed`, so it must not suppress the alert.
        condition: P`has(record.priority) && record.priority == "urgent"
          && (!has(record.status) || record.status != "completed")`,
      },
    },
    {
      id: 'notify_owner', type: 'notify', label: 'Notify Owner',
      config: {
        recipients: ['{record.owner_id}'],
        channels: ['inbox', 'email'],
        severity: 'warning',
        topic: 'urgent_task',
        title: 'Urgent task: {record.subject}',
        message: 'An urgent task "{record.subject}" was assigned to you and needs attention.',
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
