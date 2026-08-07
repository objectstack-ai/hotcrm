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
 * `sharingModel: 'controlled_by_parent'` (ADR-0055). The relation resolver
 * accepts the REQUIRED `crm_event` lookup as the parent, so no master-detail
 * conversion is needed — same construction as `crm_campaign_member`.
 *
 * The INTENT of that model is "reads are filtered to attendees whose
 * `crm_event` the caller can read, and adding or updating an attendee requires
 * edit access to that event", and as of 17.0.0-rc.4 that is what the platform
 * does. MEASURED on 17.0.0-rc.4 and pinned by
 * `test/parent-derived-reach.test.ts`: master accessibility resolves through
 * the same paths a direct read of the event takes — ownership scope and
 * `sys_record_share` grants folded in, not the master's row-level security
 * policies alone. `crm_event` is `private` and reps hold it `own`-only, so a
 * rep's attendee rows are the attendees of their own calendar. The parent-write
 * gate derives the same way and refuses a child of an event the caller cannot
 * edit.
 *
 * The gap was at its widest here until 17.0.0-rc.3, and this note said so
 * (#694): the derivation consulted master RLS policies ONLY, under a SYSTEM
 * context, and HotCRM authors none on `crm_event`, so every attendee row of
 * every meeting reached every holder of object-level read on this object.
 * objectstack-ai/objectstack#5386 fixed that upstream and it shipped in rc.4;
 * the guard test named above was written to go red the day the platform
 * narrowed, and it did.
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

    // Deliberately left on the spec default, and NOT cascaded with the party
    // lookups below (#711). Because it is REQUIRED, the engine escalates the
    // stored `set_null` to a refusal at delete time, with a message that names
    // the real obstacle instead of an unrelated rule — measured on
    // 17.0.0-rc.2: "Cannot delete crm_event (...): 3 dependent
    // crm_event_attendee record(s) reference it via crm_event (crm_event is
    // required, so it cannot be cleared)." That is the correct answer on this
    // side, for the same reason `crm_campaign_member.crm_campaign` keeps it
    // (#696): a meeting's attendee list is the meeting's historical record, not
    // a per-person artefact. `test/event-attendee-cascade.test.ts` pins the
    // resolved value so a copy-paste of the three cascades cannot reach here.
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

    // `deleteBehavior: 'cascade'` on ALL THREE party lookups (#711, the same
    // construction and the same defect as #696/`crm_campaign_member`). A lookup
    // defaults to `set_null`, and that default made every person who had ever
    // been logged as a meeting attendee permanently undeletable: deleting the
    // party cleared this column, the row the engine had just edited instantly
    // violated `attendee_resolves` below, and the whole delete rolled back with
    // an error naming an object the caller never addressed. Measured on
    // 17.0.0-rc.2, before the fix:
    //
    //   DELETE lead    -> "An attendee must point at a Contact, a Lead, a User,
    //                      or name an external guest"  (lead survives)
    //   DELETE contact -> same        DELETE user -> same
    //
    // `external_name` is the rule's fourth escape hatch, but it is blank on
    // every row the product actually writes (`src/actions/global.actions.ts`
    // logs attendees with a party reference and never an external name), so it
    // rescues nothing in practice.
    //
    // Cascade rather than `restrict`: an attendee row is a JUNCTION whose whole
    // meaning is "this person was in this room". Once the person is gone the
    // row denotes nothing, and the query it exists to serve ("meetings this
    // person attended") has lost its subject. `restrict` would produce an
    // accurate message but keep the person undeletable until someone deleted
    // their attendance by hand, and undeletable PEOPLE is the impact being
    // fixed. Cascade also leaves no reachable state in which a stored attendee
    // row breaks its own object's rule.
    crm_contact: Field.lookup('crm_contact', {
      group: 'basic',
      label: 'Contact',
      deleteBehavior: 'cascade',
      description: 'Set when the attendee is an existing customer contact',
    }),

    crm_lead: Field.lookup('crm_lead', {
      group: 'basic',
      label: 'Lead',
      deleteBehavior: 'cascade',
      description: 'Set when the attendee is still an unconverted lead',
    }),

    // `sys_user` gets the SAME answer as the two CRM parties, and it was the one
    // worth a second look rather than a copy-paste (#711 raises it explicitly).
    // What decided it, measured rather than assumed:
    //
    //  · Deleting a user is a real, reachable operation. Generic CRUD delete on
    //    the identity table is off (`sys_user` ships `apiMethods: ['get',
    //    'list', 'update', 'bulk']`), but better-auth's own routes —
    //    `/api/v1/auth/delete-user`, which the platform's `sys_user` object
    //    surfaces as the "Delete My Account" record action, and
    //    `/api/v1/auth/admin/remove-user` — resolve `user` to `sys_user` and
    //    land on `dataEngine.delete(...)`, i.e. the SAME ObjectQL delete that
    //    runs the referential pass. So `set_null` here is not dormant: it broke
    //    account erasure for any colleague who had ever attended a meeting.
    //  · The app's shipped stance is already "a deleted user's references
    //    degrade". HotCRM holds 15 lookups on `sys_user`; the other 14 (every
    //    `owner_id`, plus `renewal_owner` and `product_manager`) are `set_null`
    //    and NO validation rule reads any of them — the rule below is the only
    //    one in the app that reads a user reference at all, which is precisely
    //    why this is the only lookup where the default misbehaved. `restrict`
    //    here would make this junction the ONE app row able to veto a platform
    //    identity erasure — an app object holding a `protection: { lock:
    //    'full' }`, better-auth-managed table hostage, surfacing as an opaque
    //    failure from an auth route. That is the layering inversion, not the fix.
    //  · The cost of cascade is bounded and is the right half to lose: the
    //    meeting itself (`crm_event` — subject, times, outcome notes) survives
    //    untouched; only the per-person row goes, and it goes because the
    //    person's identity record was erased. Deactivation, not deletion, is
    //    the ordinary offboarding path (the platform ships ban/unban for that),
    //    and it touches nothing here.
    sys_user: Field.lookup('sys_user', {
      group: 'basic',
      label: 'User',
      deleteBehavior: 'cascade',
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
