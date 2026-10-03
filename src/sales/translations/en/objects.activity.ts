// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { ObjectTranslationData } from '@objectstack/spec/system';

/**
 * English (en) — `objects` translations for the ACTIVITY family:
 * the interaction log — tasks, events, and who attended.
 *
 * Roster: `crm_task`, `crm_event`, `crm_event_attendee`.
 *
 * SPLIT AXIS (#1311): translation NAMESPACE first, then CRM DOMAIN FAMILY.
 * Everything that is not `objects` lives in `./app.ts`; `objects` — 69-78% of
 * every bundle — is one file per CRM domain family, and a detail object
 * follows its master. A new row goes in the file for ITS family, never in
 * whichever file is already open: that is how one file re-grows past the 70%
 * advisory band `pnpm hygiene` prints. Full rule and rationale:
 * `src/translations/en.ts`.
 */
export const activity: Record<string, ObjectTranslationData> = {
  crm_task: {
    label: 'Task',
    pluralLabel: 'Tasks',
    fields: {
      subject: { label: 'Subject' },
      description: { label: 'Description' },
      status: {
        label: 'Status',
        options: {
          not_started: 'Not Started', in_progress: 'In Progress', waiting: 'Waiting',
          completed: 'Completed', deferred: 'Deferred',
        },
      },
      priority: {
        label: 'Priority',
        options: { low: 'Low', normal: 'Normal', high: 'High', urgent: 'Urgent' },
      },
      type: {
        label: 'Task Type',
        options: {
          call: 'Call', email: 'Email', meeting: 'Meeting',
          follow_up: 'Follow-up', demo: 'Demo', other: 'Other',
        },
      },
      due_date: { label: 'Due Date' },
      reminder_date: { label: 'Reminder Date/Time' },
      completed_date: { label: 'Completed Date' },
      owner_id: { label: 'Assigned To' },
      related_to_type: {
        label: 'Related To Type',
        options: {
          crm_account: 'Account', crm_contact: 'Contact', crm_opportunity: 'Opportunity',
          crm_lead: 'Lead', crm_case: 'Case',
        },
      },
      related_to_account: { label: 'Related Account' },
      related_to_contact: { label: 'Related Contact' },
      related_to_opportunity: { label: 'Related Opportunity' },
      related_to_lead: { label: 'Related Lead' },
      related_to_case: { label: 'Related Case' },
      is_recurring: { label: 'Recurring Task' },
      recurrence_type: {
        label: 'Recurrence Type',
        options: { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' },
      },
      recurrence_interval: { label: 'Recurrence Interval' },
      recurrence_end_date: { label: 'Recurrence End Date' },
      is_completed: { label: 'Is Completed' },
      is_overdue: { label: 'Is Overdue' },
      progress_percent: { label: 'Progress (%)' },
      priority_rank: { label: 'Priority Rank' },
      reminder_sent: { label: 'Reminder Sent' },
    },
    _views: {
      all_tasks: { label: 'All Tasks' },
      task_board: { label: 'Task Board' },
      task_calendar: { label: 'Task Schedule' },
      task_gantt: { label: 'Execution Plan' },
      task_timeline: { label: 'Worklog Timeline' },
      my_open_tasks: { label: 'My Open Tasks' },
      todays_tasks: { label: '📅 My Priority Tasks' },
      overdue_tasks: { label: '⏰ Open Tasks · Most Overdue First' },
    },
    _sections: {
      basic: { label: 'Task Information' },
      scheduling: { label: 'Scheduling' },
      related: { label: 'Related Records' },
      recurrence: { label: 'Recurrence' },
      effort: { label: 'Progress & Effort' },
      system: { label: 'System' },
      // Form section names on task.view.ts (#1100)
      task: { label: 'Task' },
      related_records: { label: 'Related Records' },
      recurrence_and_effort: { label: 'Recurrence & Effort' },
    },
  },
  crm_event: {
    label: 'Event',
    pluralLabel: 'Events',
    description: 'Meetings, calls and other scheduled interactions with customers',
    fields: {
      subject: { label: 'Subject' },
      description: { label: 'Description' },
      type: {
        label: 'Event Type',
        options: {
          meeting: 'Meeting', call: 'Call', demo: 'Demo',
          webinar: 'Webinar', onsite_visit: 'Onsite Visit', other: 'Other',
        },
      },
      status: {
        label: 'Status',
        options: {
          planned: 'Planned', held: 'Held', cancelled: 'Cancelled', no_show: 'No Show',
        },
      },
      owner_id: { label: 'Assigned To' },
      start_datetime: { label: 'Start' },
      end_datetime: { label: 'End' },
      all_day: { label: 'All Day Event' },
      duration_minutes: { label: 'Duration (minutes)' },
      location: { label: 'Location', help: 'Room, address, or meeting link' },
      related_to_type: {
        label: 'Related To Type',
        options: {
          crm_account: 'Account', crm_contact: 'Contact', crm_opportunity: 'Opportunity',
          crm_lead: 'Lead', crm_case: 'Case',
        },
      },
      related_to_account: { label: 'Related Account' },
      related_to_contact: { label: 'Related Contact' },
      related_to_opportunity: { label: 'Related Opportunity' },
      related_to_lead: { label: 'Related Lead' },
      related_to_case: { label: 'Related Case' },
      outcome_notes: { label: 'Outcome Notes', help: 'What was agreed, and what happens next' },
    },
    _views: {
      all_events: { label: 'All Events' },
      event_calendar: { label: 'Event Calendar' },
      event_timeline: { label: 'Team Schedule' },
      my_events: { label: 'My Calendar' },
      upcoming_events: { label: '📅 Upcoming · Soonest First' },
      held_events: { label: '✅ Interaction History' },
    },
    _sections: {
      basic: { label: 'Event Information' },
      schedule: { label: 'Schedule' },
      related: { label: 'Related Records' },
      outcome: { label: 'Outcome' },
      // Form section names on event.view.ts (#1100). `related_records`,
      // not `related` — `related` is already the fieldGroup key above.
      event: { label: 'Event' },
      related_records: { label: 'Related Records' },
    },
  },
  crm_event_attendee: {
    label: 'Event Attendee',
    pluralLabel: 'Event Attendees',
    description: 'A person invited to or present at an event',
    fields: {
      attendee_number: { label: 'Attendee Number' },
      crm_event: { label: 'Event' },
      attendee_type: {
        label: 'Attendee Type',
        options: { contact: 'Contact', lead: 'Lead', user: 'User', external: 'External' },
      },
      crm_contact: { label: 'Contact', help: 'Set when the attendee is an existing customer contact' },
      crm_lead: { label: 'Lead', help: 'Set when the attendee is still an unconverted lead' },
      sys_user: { label: 'User', help: 'Set when the attendee is a colleague' },
      external_name: {
        label: 'External Attendee',
        help: 'Name of an attendee who is in no CRM object — set when Attendee Type is External',
      },
      response: {
        label: 'Response',
        options: {
          no_response: 'No Response', accepted: 'Accepted',
          declined: 'Declined', tentative: 'Tentative',
        },
      },
      is_organizer: { label: 'Organizer' },
      invited_date: { label: 'Invited' },
    },
    _views: {
      all_event_attendees: { label: 'Event Attendees' },
    },
    _sections: {
      basic: { label: 'Attendee' },
      response: { label: 'Invitation' },
      // Form section names on event_attendee.view.ts (#1100) — same English
      // text as the fieldGroups above, but a distinct key: `attendee` /
      // `invitation` are not `basic` / `response`.
      attendee: { label: 'Attendee' },
      invitation: { label: 'Invitation' },
    },
  },
};
