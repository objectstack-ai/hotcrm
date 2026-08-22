// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { P } from '@objectstack/spec';
import { ObjectSchema, Field } from '@objectstack/spec/data';
import {
  EVENT_STATUS_OPTIONS,
  EVENT_TYPE_OPTIONS,
  RELATED_TO_TYPE_OPTIONS,
} from './_picklists';

/**
 * Event — a first-class interaction record (#592).
 *
 * # Why this object exists
 *
 * The CRM could not answer *"what happened with this customer, and when?"*.
 * `crm_task.type` offered a `meeting` value with no start time, no end time,
 * no location and no attendees, and `log_meeting` stuffed the attendee list
 * into a JSON string inside `sys_activity.metadata` — a payload no list view
 * can filter, no dataset can group by, and no report can count.
 *
 * `crm_event` is the queryable half of that story: one row per interaction
 * that occupies a slot on someone's calendar, whether it already happened (a
 * logged call) or is booked for next Tuesday (a scheduled meeting).
 *
 * # The Task / Event split
 *
 * `crm_task` stays what it was — something a rep still *owes* someone, due on
 * a date. `crm_event` is something that *occurs*, between two timestamps, with
 * people in the room. The two objects deliberately do NOT merge: a to-do list
 * sorted by due date and a calendar scaled by duration are different surfaces,
 * and every CRM that collapsed them ended up with a "duration" column that is
 * null on 90% of rows.
 *
 * Emails are the third shape and stay out: an email is not a calendar slot, so
 * `send_email` keeps writing `sys_email` + `sys_activity` (it does now also
 * stamp contact recency — see `contact.actions.ts`).
 *
 * # `status` is what makes the churn signal honest
 *
 * Only a `held` event bumps `crm_account.last_activity_date` /
 * `crm_lead.last_contacted_date` (see `event.hook.ts`). A meeting *booked* for
 * next quarter is not an interaction that happened, and letting it reset the
 * recency clock is precisely how an "at risk" report learns to lie.
 */
export const Event = ObjectSchema.create({
  name: 'crm_event',
  label: 'Event',
  pluralLabel: 'Events',
  icon: 'calendar-days',
  description: 'Meetings, calls and other scheduled interactions with customers',

  // ADR-0090 D1/D7: OWD is an authored decision. Mirrors `crm_task`: an event
  // is a personal activity record, owned by the rep who ran it.
  sharingModel: 'private',

  fieldGroups: [
    { key: 'basic',    label: 'Event Information', icon: 'info' },
    { key: 'schedule', label: 'Schedule',          icon: 'calendar' },
    { key: 'related',  label: 'Related Records',   icon: 'link' },
    { key: 'outcome',  label: 'Outcome',           icon: 'clipboard-check', defaultExpanded: false },
  ],

  fields: {
    // Platform ownership anchor — canonical note in `account.object.ts` (#548).
    owner_id: Field.lookup('sys_user', {
      label: 'Assigned To',
      group: 'basic',
      system: true,
      readonly: false,
      trackHistory: true,
    }),

    // ─── Event Information ────────────────────────────────────────────
    subject: Field.text({
      group: 'basic',
      label: 'Subject',
      required: true,
      storage: { notNull: true },
      searchable: true,
      maxLength: 255,
    }),

    type: Field.select({
      group: 'basic',
      label: 'Event Type',
      required: true,
      storage: { notNull: true },
      // Field-level default, not just the option flag: the option `default`
      // only preselects in some form surfaces, so a quick-create opened from a
      // related list left this required field blank (same defect crm_task.status
      // carries a note about).
      defaultValue: 'meeting',
      options: [...EVENT_TYPE_OPTIONS],
    }),

    status: Field.select({
      group: 'basic',
      label: 'Status',
      required: true,
      storage: { notNull: true },
      trackHistory: true,
      defaultValue: 'planned',
      options: [...EVENT_STATUS_OPTIONS],
    }),

    description: Field.markdown({
      group: 'basic',
      label: 'Description',
    }),

    // ─── Schedule ─────────────────────────────────────────────────────
    start_datetime: Field.datetime({
      group: 'schedule',
      label: 'Start',
      required: true,
      storage: { notNull: true },
    }),

    end_datetime: Field.datetime({
      group: 'schedule',
      label: 'End',
    }),

    all_day: Field.boolean({
      group: 'schedule',
      label: 'All Day Event',
      defaultValue: false,
    }),

    // Derived in `event.hook.ts` from start/end. NOT `readonly`: the field is
    // also what the activity actions supply directly when a rep logs a call
    // that took 20 minutes, and a readonly field is stripped from any write
    // whose CALLER supplied the key (#2948) — including an action body running
    // under the rep's own context. Derivation inside this object's own
    // before-hook is unaffected either way (the strip keys off the caller's
    // payload, not the post-hook document), so leaving it writable costs
    // nothing and keeps `log_call` honest.
    duration_minutes: Field.number({
      group: 'schedule',
      label: 'Duration (minutes)',
      min: 0,
      scale: 0,
    }),

    location: Field.text({
      group: 'schedule',
      label: 'Location',
      maxLength: 255,
      description: 'Room, address, or meeting link',
    }),

    // ─── Related Records (polymorphic, same shape as crm_task) ─────────
    related_to_type: Field.select({
      group: 'related',
      label: 'Related To Type',
      options: [...RELATED_TO_TYPE_OPTIONS],
    }),

    related_to_account: Field.lookup('crm_account', {
      group: 'related',
      label: 'Related Account',
    }),

    related_to_contact: Field.lookup('crm_contact', {
      group: 'related',
      label: 'Related Contact',
    }),

    related_to_opportunity: Field.lookup('crm_opportunity', {
      group: 'related',
      label: 'Related Opportunity',
    }),

    related_to_lead: Field.lookup('crm_lead', {
      group: 'related',
      label: 'Related Lead',
    }),

    related_to_case: Field.lookup('crm_case', {
      group: 'related',
      label: 'Related Case',
    }),

    // ─── Outcome ──────────────────────────────────────────────────────
    outcome_notes: Field.markdown({
      group: 'outcome',
      label: 'Outcome Notes',
      description: 'What was agreed, and what happens next',
    }),

    // No `is_past` / `is_upcoming` boolean. A write-time snapshot of "has this
    // happened yet" is stale the moment the clock passes it, and the app has
    // already been burnt by exactly that (`crm_task.is_overdue` — see the
    // `overdue_tasks` view's label note). `status` is the authored, non-decaying
    // signal, and the upcoming/past views filter on it and sort by
    // `start_datetime` instead.
  },

  // Dead object-level enable.* flags removed in @objectstack 12 (ADR-0049);
  // only the live API surface remains. History → Field.trackHistory (ADR-0052).
  //
  // No `enable.files`: attachments are a REVIEWED set (see the canonical note
  // in `src/objects/index.ts` and the ledger in
  // `test/collaboration-capabilities.test.ts`), and `crm_event` follows
  // `crm_task` — an activity record, not a document home. Meeting decks belong
  // to the account or the opportunity the meeting was about. Enabling it here
  // is a decision to take on its own, not a rider on this object's creation.
  enable: {
    apiEnabled: true,
  },

  indexes: [
    { fields: ['start_datetime'] },
    { fields: ['owner_id'] },
    { fields: ['status'] },
    { fields: ['related_to_account'] },
    { fields: ['related_to_opportunity'] },
  ],

  // ADR-0079: `nameField` names the real field holding the record title.
  nameField: 'subject',
  highlightFields: ['subject', 'type', 'status', 'start_datetime', 'owner_id'],
  searchableFields: ['subject', 'location'],

  // Predicates below are TOTAL: every `record.x` read is `has()`-guarded, so the
  // rule returns a verdict even when the merged record has no such key. See
  // AGENTS.md "Validation predicates must be TOTAL" and
  // test/object-validation-predicates.test.ts, which fails the build otherwise.
  validations: [
    {
      name: 'end_after_start',
      type: 'script',
      severity: 'error',
      message: 'The end time must be after the start time',
      // BOTH guards, on both operands, because they answer different hazards
      // (AGENTS.md "Validation predicates must be TOTAL"):
      //   · `has(...)`  — absent key. On a driver that stores only the columns
      //     a row was written with, an absent `end_datetime` aborts the whole
      //     predicate under strict CEL, and from 17.0.0-rc.2 that abort REJECTS
      //     the save rather than skipping the rule (#4649).
      //   · `!= null`   — present-but-null. `dyn<null> < dyn` aborts too, and
      //     `has()` says nothing about it.
      // An ordering comparison needs both; neither substitutes for the other.
      condition: P`has(record.start_datetime) && has(record.end_datetime) && record.start_datetime != null && record.end_datetime != null && !isBlank(record.end_datetime) && record.end_datetime < record.start_datetime`,
    },
    {
      name: 'related_to_required',
      type: 'script',
      severity: 'warning',
      message: 'At least one related record should be selected',
      condition: P`(!has(record.related_to_account) || isBlank(record.related_to_account)) && (!has(record.related_to_contact) || isBlank(record.related_to_contact)) && (!has(record.related_to_opportunity) || isBlank(record.related_to_opportunity)) && (!has(record.related_to_lead) || isBlank(record.related_to_lead)) && (!has(record.related_to_case) || isBlank(record.related_to_case))`,
    },
  ],
});
