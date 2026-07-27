// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type * as Automation from '@objectstack/spec/automation';
type Flow = Automation.Flow;

/**
 * Schedule Follow-up — one screen, one task, straight off the lead header.
 *
 * The gap this closes: `log_call` / `log_meeting` record what already happened,
 * but nothing put the NEXT touch on the rep's list. Filing that follow-up meant
 * leaving the lead, opening the Related tab, finding the Tasks block and
 * re-picking the lead as the parent — four steps for the single most common
 * thing a rep does after a call.
 *
 * Implemented as a SCREEN FLOW rather than a `type: 'modal'` action: modal
 * actions are non-functional in 16.1.0 (the console resolves the action's
 * `target` as an object name and the submit dies on
 * `GET /api/v1/meta/object/<target>` → 400, even though the spec defines
 * `target` for modals as "the modal/page name to open"). Flow-typed actions
 * are the mechanism that demonstrably works today — `convert_lead` uses it.
 */
export const ScheduleFollowUpFlow: Flow = {
  name: 'schedule_followup',
  label: 'Schedule Follow-up',
  description: 'Create the next follow-up task on a lead, already linked and owned.',
  type: 'screen',
  status: 'active',

  variables: [
    // MUST be `recordId` — the console's flow-action contract seeds only that
    // name (and its camelCase object alias); a custom name arrives undefined.
    { name: 'recordId', type: 'text', isInput: true, isOutput: false },
    { name: 'subject', type: 'text', isInput: true, isOutput: false },
    { name: 'dueDate', type: 'date', isInput: true, isOutput: false },
    { name: 'activityType', type: 'text', isInput: true, isOutput: false },
    { name: 'priority', type: 'text', isInput: true, isOutput: false },
    { name: 'notes', type: 'text', isInput: true, isOutput: false },
  ],

  nodes: [
    { id: 'start', type: 'start', label: 'Start', config: { objectName: 'crm_lead' } },
    {
      id: 'screen_1', type: 'screen', label: 'Schedule Follow-up',
      config: {
        fields: [
          { name: 'subject', label: 'What is the next step?', type: 'text', required: true },
          { name: 'dueDate', label: 'Due Date', type: 'date', required: true },
          {
            name: 'activityType', label: 'Activity Type', type: 'select',
            options: [
              { label: 'Call', value: 'call' },
              { label: 'Email', value: 'email' },
              { label: 'Meeting', value: 'meeting' },
              { label: 'Demo', value: 'demo' },
              { label: 'Follow-up', value: 'follow_up' },
            ],
          },
          {
            name: 'priority', label: 'Priority', type: 'select',
            options: [
              { label: 'Low', value: 'low' },
              { label: 'Normal', value: 'normal' },
              { label: 'High', value: 'high' },
              { label: 'Urgent', value: 'urgent' },
            ],
          },
          { name: 'notes', label: 'Notes', type: 'textarea' },
        ],
      },
    },
    {
      id: 'get_lead', type: 'get_record', label: 'Get Lead Record',
      config: { objectName: 'crm_lead', filter: { id: '{recordId}' }, outputVariable: 'leadRecord' },
    },
    {
      id: 'create_task', type: 'create_record', label: 'Create Follow-up Task',
      config: {
        objectName: 'crm_task',
        fields: {
          subject: '{subject}',
          due_date: '{dueDate}',
          type: '{activityType}',
          priority: '{priority}',
          description: '{notes}',
          status: 'not_started',
          owner: '{$User.Id}',
          // Polymorphic parent: both halves are required for the lead's
          // Related tab to pick the task up.
          related_to_type: 'crm_lead',
          related_to_lead: '{recordId}',
        },
        outputVariable: 'createdTask',
      },
    },
    {
      // Keep the lead's own follow-up date in step with the task that was just
      // filed, so the Hot Leads view (sorted by next_followup_date) reflects
      // the commitment the rep actually made.
      id: 'stamp_lead', type: 'update_record', label: 'Stamp Next Follow-up Date',
      config: {
        objectName: 'crm_lead',
        filter: { id: '{recordId}' },
        fields: { next_followup_date: '{dueDate}' },
      },
    },
    { id: 'end', type: 'end', label: 'End' },
  ],

  edges: [
    { id: 'e1', source: 'start', target: 'screen_1', type: 'default' },
    { id: 'e2', source: 'screen_1', target: 'get_lead', type: 'default' },
    { id: 'e3', source: 'get_lead', target: 'create_task', type: 'default' },
    { id: 'e4', source: 'create_task', target: 'stamp_lead', type: 'default' },
    { id: 'e5', source: 'stamp_lead', target: 'end', type: 'default' },
  ],
};
