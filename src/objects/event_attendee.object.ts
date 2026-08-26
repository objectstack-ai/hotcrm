// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { expression } from '@objectstack/spec';
import { ObjectSchema, Field } from '@objectstack/spec/data';
import { ATTENDEE_RESPONSE_OPTIONS } from './_picklists';

/**
 * The ways an attendee row can name a person — ONE declaration, not two lists
 * that happen to line up (#740).
 *
 * `attendee_type` is the discriminator and each of the four columns below is a
 * resolution; before #740 the two were authored separately and had drifted
 * apart. `external_name` was one of the four resolutions `attendee_resolves`
 * accepted, and `attendee_type` had no value for it — so an external guest
 * could only be STORED MISLABELLED. Measured on 17.0.0-rc.6, before the fix,
 * against the real engine (`test/attendee-type-resolution.test.ts` now pins the
 * other direction):
 *
 *     insert { attendee_type: "contact", external_name: "the prospect's lawyer" }
 *       -> ACCEPTED   (row claims to be a Contact and points at no contact)
 *     insert { external_name: "no type given" }        // type omitted
 *       -> ACCEPTED as attendee_type: "contact"        (the field default)
 *     insert { attendee_type: "external", external_name: "Jane Roe" }
 *       -> ValidationError: Attendee Type must be one of: contact, lead, user
 *
 * The Console's attendee form reaches all three; `src/actions/global.actions.ts`
 * never writes `external_name`, which is why the defect was live but dormant.
 *
 * Deriving BOTH the picklist and the two rules from this table is the point: a
 * fifth resolution cannot be added without its type, and a type cannot be added
 * without saying which column it names — the failure #740 records is not
 * expressible in this shape. Everything downstream (options, `attendee_resolves`,
 * `attendee_type_exclusive`) is generated below; nothing repeats the pairing.
 *
 * Adding a row here is a user-visible picklist change: it needs a label in all
 * four locale packs (`test/i18n-references.test.ts` fails otherwise) and a
 * changeset.
 */
export const ATTENDEE_RESOLUTIONS = [
  { value: 'contact',  column: 'crm_contact',   label: 'Contact',  color: '#4169E1' },
  { value: 'lead',     column: 'crm_lead',      label: 'Lead',     color: '#FFA500' },
  { value: 'user',     column: 'sys_user',      label: 'User',     color: '#00AA00' },
  { value: 'external', column: 'external_name', label: 'External', color: '#8A8A8A' },
] as const;

/** A new attendee row is a Contact until the author says otherwise. */
export const DEFAULT_ATTENDEE_TYPE = 'contact';

// The predicate fragments below are the TOTAL shapes from the house rule in
// `test/object-validation-predicates.test.ts`: every `record.x` read carries its
// own `has(record.x)` in the same expression, so the rule returns a verdict on a
// merged record with absent keys instead of aborting (and, from 17.0.0-rc.2,
// rejecting the write it could not judge).
const blank = (f: string) => `(!has(record.${f}) || isBlank(record.${f}))`;
const filled = (f: string) => `(has(record.${f}) && !isBlank(record.${f}))`;
const typeIs = (v: string) => `(has(record.attendee_type) && record.attendee_type == "${v}")`;
const typeIsNot = (v: string) => `(has(record.attendee_type) && record.attendee_type != "${v}")`;

/**
 * Violation predicates — validations fire when the condition is TRUE.
 *
 * They are the two halves of "declared = enforced", split so each condition
 * carries its own wording: a row missing the party its type names is a
 * different mistake from a row naming a party its type does not.
 *
 * A record whose `attendee_type` is absent satisfies neither (every fragment is
 * `has()`-guarded on it), which is deliberate: "no type at all" is the REQUIRED
 * field's job — `Attendee Type is required` names the real obstacle, and a
 * second rule saying so would only shadow it.
 */
const RESOLVES_CONDITION = ATTENDEE_RESOLUTIONS
  .map((r) => `(${typeIs(r.value)} && ${blank(r.column)})`)
  .join(' || ');

const EXCLUSIVE_CONDITION = ATTENDEE_RESOLUTIONS
  .map((r) => `(${filled(r.column)} && ${typeIsNot(r.value)})`)
  .join(' || ');

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

    // The discriminator says which of the four columns below is the live one.
    // It is authored rather than derived so a query can filter "internal
    // attendees only" without four OR'd null checks — and that filter is
    // exactly what a mislabelled row used to break (#740), which is why the
    // options are generated from the resolution table rather than retyped.
    attendee_type: Field.select({
      group: 'basic',
      label: 'Attendee Type',
      required: true,
      storage: { notNull: true },
      defaultValue: DEFAULT_ATTENDEE_TYPE,
      options: ATTENDEE_RESOLUTIONS.map((r) => ({
        label: r.label,
        value: r.value,
        color: r.color,
        ...(r.value === DEFAULT_ATTENDEE_TYPE ? { default: true } : {}),
      })),
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
    // (The message above is the pre-#740 wording, kept verbatim because it is
    // what was measured on 17.0.0-rc.2. `attendee_resolves` says something
    // narrower now — see the rules at the bottom of this file.)
    //
    // `external_name` is the fourth resolution, but it is blank on every row the
    // product actually writes (`src/actions/global.actions.ts` logs attendees
    // with a party reference and never an external name), so it rescues nothing
    // in practice. #740 gave it its own `attendee_type` value rather than a
    // second job; it still rescues nothing here, and now it cannot be reached
    // by a row that calls itself a Contact either.
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
    //    degrade". EVERY other `sys_user` lookup in HotCRM (every `owner_id`,
    //    plus `product_manager`) is `set_null`
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
    // genuinely unmodelled guest (a prospect's lawyer who is in no CRM object).
    // Since #740 it is the resolution of ONE attendee type — `external` — and
    // the rules below enforce that both ways: an `external` row must fill it,
    // and no other type may. It is not a place to paste a list, and it is not a
    // note field to hang off a Contact row.
    external_name: Field.text({
      group: 'basic',
      label: 'External Attendee',
      maxLength: 255,
      description: 'Name of an attendee who is in no CRM object — set when Attendee Type is External',
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
  //
  // Both rules are GENERATED from `ATTENDEE_RESOLUTIONS` at the top of this
  // file (`expression(..., 'cel')` is the same envelope the ``P`…` `` tag
  // produces; the tag JSON-quotes an interpolated string, so it cannot splice a
  // source fragment). The pairing is declared once and read twice — see the
  // note up there for why that is the fix and not a style choice.
  validations: [
    // The type's own column must be filled. Until #740 this rule accepted ANY
    // of the four resolutions regardless of the type, which is what let a row
    // say `contact` while pointing at no contact.
    {
      name: 'attendee_resolves',
      type: 'script',
      severity: 'error',
      message:
        'An attendee must fill the party its Attendee Type names — a Contact row needs a Contact, an External row needs an External Attendee name',
      condition: expression(RESOLVES_CONDITION, 'cel'),
    },
    // …and no other column may be filled. The separate rule is deliberate: one
    // condition, one wording. Folding both into `attendee_resolves` would make
    // its message a lie for half the rows it rejects, and "you filled the wrong
    // column" is not the same instruction as "you filled nothing".
    //
    // This also retires a documented cost of #711: a row naming two parties was
    // removed when EITHER was deleted, "accepted because no such row is
    // reachable today". It is now unwritable, so the question cannot arise —
    // `test/event-attendee-cascade.test.ts` pins the refusal where it used to
    // pin the double-cascade.
    {
      name: 'attendee_type_exclusive',
      type: 'script',
      severity: 'error',
      message:
        'An attendee names exactly one party — clear every party column its Attendee Type does not name',
      condition: expression(EXCLUSIVE_CONDITION, 'cel'),
    },
  ],
});
