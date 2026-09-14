// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * English (en) — values shared by more than one part of this bundle.
 *
 * SPLIT AXIS (#1311): translation NAMESPACE first, then CRM DOMAIN FAMILY.
 * Everything that is not `objects` lives in `./app.ts`; `objects` — 69-78% of
 * every bundle — is one file per CRM domain family, and a detail object
 * follows its master. A new row goes in the file for ITS family, never in
 * whichever file is already open: that is how one file re-grows past the 70%
 * advisory band `pnpm hygiene` prints. Full rule and rationale:
 * `src/translations/en.ts`.
 *
 * Every constant here is spread into object rows that live in MORE THAN ONE
 * family file, so it cannot sit in any one of them. A value used by exactly
 * one family lives in that family's file instead — that split is mechanical,
 * not a judgement call.
 */

/**
 * The activity family (#592) — `log_call`, `log_meeting` and
 * `schedule_meeting` are registered once PER OBJECT (lead, contact, account,
 * opportunity, case), because a body action with no `objectName` lands under a
 * dispatcher key nothing probes (#509). The labels are identical on every one
 * of them, so they are declared once here and spread into each object's
 * `_actions` — fifteen hand-copied blocks per locale is how a translation set
 * drifts.
 */
export const activityActions = {
  log_call: {
    label: 'Log a Call',
    successMessage: 'Call logged successfully!',
    params: {
      subject: { label: 'Call Subject' },
      duration: { label: 'Duration (minutes)' },
      attendee_contacts: { label: 'Contact Attendees' },
      attendee_users: { label: 'Internal Attendees' },
      notes: { label: 'Call Notes' },
    },
  },
  log_meeting: {
    label: 'Log a Meeting',
    successMessage: 'Meeting logged successfully!',
    params: {
      subject: { label: 'Meeting Subject' },
      duration: { label: 'Duration (minutes)' },
      attendee_contacts: { label: 'Contact Attendees' },
      attendee_users: { label: 'Internal Attendees' },
      notes: { label: 'Meeting Notes' },
    },
  },
  schedule_meeting: {
    label: 'Schedule a Meeting',
    successMessage: 'Meeting scheduled!',
    params: {
      subject: { label: 'Meeting Subject' },
      start_date: { label: 'Start Date (UTC)' },
      start_time: { label: 'Start Time (UTC)' },
      location: { label: 'Location' },
      duration: { label: 'Duration (minutes)' },
      attendee_contacts: { label: 'Contact Attendees' },
      attendee_users: { label: 'Internal Attendees' },
      notes: { label: 'Agenda' },
    },
  },
};
