// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { P } from '@objectstack/spec';
import { ObjectSchema, Field } from '@objectstack/spec/data';
import { ATTENDEE_RESPONSE_OPTIONS } from './_picklists';

/**
 * Event Attendee — who was in the room (#592).
 *
 * # Why a junction object, and not multi-value lookups
 *
 * The acceptance criterion is "attendees are queryable RECORDS, not JSON
 * strings", and three properties decide the shape:
 *
 *  1. **Attendees are heterogeneous.** A customer meeting has internal people
 *     (`sys_user`), existing customers (`crm_contact`) and prospects
 *     (`crm_lead`) in it. A `Field.lookup(..., { multiple: true })` points at
 *     exactly ONE object, so a multi-lookup design needs three parallel
 *     multi-lookups and no way to order or de-duplicate across them.
 *  2. **An attendee carries its own attributes.** `response` (accepted /
 *     declined / tentative) and `is_organizer` belong to the *pairing* of a
 *     person and an event, not to either side. A multi-value lookup stores a
 *     bare id array with nowhere to hang them, which is how the old design
 *     ended up smuggling the whole list into a JSON string in the first place.
 *  3. **A junction is queryable the way the issue asks for.** "Meetings this
 *     rep attended", "contacts who declined twice this quarter" and "accounts
 *     whose champion has not attended anything in 90 days" are all `find()`
 *     calls on this object. Against an id array inside a multi-value column
 *     they are not expressible in ObjectQL at all.
 *
 * This mirrors `crm_campaign_member`, the app's existing junction, down to the
 * autonumber `nameField` and the `controlled_by_parent` OWD.
 *
 * # Access derives from the event
 *
 * `sharingModel: 'controlled_by_parent'` (ADR-0055): reads are filtered to
 * attendees whose `crm_event` the caller can read, and adding or updating an
 * attendee requires edit access to that event. The relation resolver accepts
 * the REQUIRED `crm_event` lookup as the parent, so no master-detail
 * conversion is needed — same construction as `crm_campaign_member`. An
 * attendee row is therefore never more visible than the meeting it belongs to.
 */
export const EventAttendee = ObjectSchema.create({
  name: 'crm_event_attendee',
  label: 'Event Attendee',
  pluralLabel: 'Event Attendees',
  icon: 'users',
  description: 'A person invited to or present at an event',

  sharingModel: 'controlled_by_parent',

  // ADR-0079: junction rows have no derivable text title; point the canonical
  // nameField at the stored autonumber explicitly (autonumber is not in the
  // auto-derivation whitelist).
  nameField: 'attendee_number',

  highlightFields: ['crm_event', 'attendee_type', 'response', 'is_organizer'],

  fieldGroups: [
    { key: 'basic',    label: 'Attendee',   icon: 'user' },
    { key: 'response', label: 'Invitation', icon: 'mail-check' },
  ],

  fields: {
    attendee_number: Field.autonumber({
      group: 'basic',
      label: 'Attendee Number',
      format: 'EA-{00000}',
    }),

    crm_event: Field.lookup('crm_event', {
      group: 'basic',
      label: 'Event',
      required: true,
      storage: { notNull: true },
    }),

    // The discriminator says which of the three person lookups below is the
    // live one. It is authored rather than derived so a query can filter
    // "internal attendees only" without three OR'd null checks.
    attendee_type: Field.select({
      group: 'basic',
      label: 'Attendee Type',
      required: true,
      storage: { notNull: true },
      defaultValue: 'contact',
      options: [
        { label: 'Contact', value: 'contact', color: '#4169E1', default: true },
        { label: 'Lead',    value: 'lead',    color: '#FFA500' },
        { label: 'User',    value: 'user',    color: '#00AA00' },
      ],
    }),

    crm_contact: Field.lookup('crm_contact', {
      group: 'basic',
      label: 'Contact',
      description: 'Set when the attendee is an existing customer contact',
    }),

    crm_lead: Field.lookup('crm_lead', {
      group: 'basic',
      label: 'Lead',
      description: 'Set when the attendee is still an unconverted lead',
    }),

    sys_user: Field.lookup('sys_user', {
      group: 'basic',
      label: 'User',
      description: 'Set when the attendee is a colleague',
    }),

    // Free text is the LAST resort, not the default: it exists only for the
    // genuinely unmodelled guest (a prospect's lawyer who is in no CRM object),
    // and the `attendee_resolves` rule below makes it insufficient on its own
    // for the three modelled types. It is not a place to paste a list.
    external_name: Field.text({
      group: 'basic',
      label: 'External Attendee',
      maxLength: 255,
      description: 'Name of an attendee who is not a CRM record',
    }),

    response: Field.select({
      group: 'response',
      label: 'Response',
      required: true,
      storage: { notNull: true },
      trackHistory: true,
      defaultValue: 'no_response',
      options: [...ATTENDEE_RESPONSE_OPTIONS],
    }),

    is_organizer: Field.boolean({
      group: 'response',
      label: 'Organizer',
      defaultValue: false,
    }),

    // NOT `readonly`: written by the activity actions on insert, and 16.x/17.x
    // strip a readonly key the CALLER supplied (#2948) — the same reason
    // `crm_campaign_member.added_date` is open.
    invited_date: Field.datetime({
      group: 'response',
      label: 'Invited',
    }),
  },

  indexes: [
    { fields: ['crm_event'] },
    { fields: ['crm_contact'] },
    { fields: ['sys_user'] },
  ],

  // Predicates below are TOTAL: every `record.x` read is `has()`-guarded, so the
  // rule returns a verdict even when the merged record has no such key. See
  // AGENTS.md "Validation predicates must be TOTAL" and
  // test/object-validation-predicates.test.ts, which fails the build otherwise.
  validations: [
    {
      name: 'attendee_resolves',
      type: 'script',
      severity: 'error',
      message:
        'An attendee must point at a Contact, a Lead, a User, or name an external guest',
      condition: P`(!has(record.crm_contact) || isBlank(record.crm_contact)) && (!has(record.crm_lead) || isBlank(record.crm_lead)) && (!has(record.sys_user) || isBlank(record.sys_user)) && (!has(record.external_name) || isBlank(record.external_name))`,
    },
  ],
});
