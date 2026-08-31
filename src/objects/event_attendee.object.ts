// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { expression } from '@objectstack/spec';
import { ObjectSchema, Field } from '@objectstack/spec/data';
import { ATTENDEE_RESPONSE_OPTIONS } from './_picklists';

/**
 * The ways an attendee row can name a person — ONE declaration, not two lists
 * that happen to line up.
 *
 * `attendee_type` is the discriminator and each of the four columns below is a
 * resolution. ⛔ Authoring the two separately lets them drift, and the failure
 * is silent: a type with no matching resolution means an external guest can
 * only be STORED MISLABELLED (a row claiming to be a Contact while pointing at
 * no contact is ACCEPTED, and an omitted type falls to the field default).
 *
 * Deriving BOTH the picklist and the two rules from this table is the point: a
 * fifth resolution cannot be added without its type, and a type cannot be added
 * without saying which column it names — the failure is not expressible in this
 * shape. Everything downstream (options, `attendee_resolves`,
 * `attendee_type_exclusive`) is generated below; nothing repeats the pairing.
 * `test/attendee-type-resolution.test.ts` pins it.
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
 * `requiredWhen` for one party column — the SAME correspondence the two rules
 * enforce, asked one layer earlier so the form marks the column the chosen type
 * names instead of letting the save discover it is empty. Derived from
 * `ATTENDEE_RESOLUTIONS` like everything else here: a fifth resolution gets its
 * hint for free and cannot get it wrong.
 *
 * This is a HINT, not the contract. `attendee_resolves` and
 * `attendee_type_exclusive` at the bottom of this file are the contract every
 * writer meets — REST, ObjectQL, seeds, flows — and nothing here relaxes
 * either. ⚠️ `requiredWhen` is a transition gate, not an invariant: it asks the
 * write in front of it for the column, it does not state a property of stored
 * rows. The duplication is deliberate and visible — a REST insert omitting the
 * named column answers twice, once per layer, and the accepted set is
 * unchanged.
 *
 * ⚠️ The predicate is TOTAL (`has()`-guarded via `typeIs`), the same house rule
 * AGENTS.md states for every authored CEL predicate. `requiredWhen` fails
 * CLOSED in the Console — an unevaluable predicate demands nothing — so an
 * unguarded one would read as enforced here and require nothing at the form.
 *
 * # ⛔ Why there is no `visibleWhen` beside it
 *
 * ⚠️ Platform constraint, measured in the browser on 17.1.0: the Console hides
 * a populated field WITHOUT clearing it and submits the stale value anyway.
 * Fill Contact, then change the type to Lead — the Contact column leaves the
 * DOM, its value stays in form state, and the write carries it:
 *
 *     POST  {"attendee_type":"lead", …, "crm_contact":"AEwPffbkMvx-OlC4",
 *                                       "crm_lead":"0AM_zbdjuLcXMdnL"}
 *     400   An attendee names exactly one party — clear every party column
 *           its Attendee Type does not name
 *
 * — so the row is refused, correctly, by a message naming a column no longer on
 * screen to clear. On the EDIT path it is a dead end rather than a puzzle:
 * retyping a stored `contact` row to `user` re-sends the stored `crm_contact`
 * on every attempt, and the Console offers no way to empty it. Today's form is
 * worse-looking and strictly more usable: the offending column is visible, so
 * the error can be acted on.
 *
 * Nothing in `@objectstack/spec` 17.1.0 or the shipped Console clears a value
 * when its field goes invisible — no `clearOnHide`-shaped key exists on either
 * surface — so `visibleWhen` here cannot be paired into safety from this repo.
 * The half that would need to change is upstream; it is the same
 * fail-open/stale-state family as the note in `src/views/lead.view.ts`. ⛔ Do
 * not add `visibleWhen` to these four columns until a hidden field stops being
 * submitted; the rules above will keep refusing the row, but the person in
 * front of the form will have no way to fix it.
 */
const partyFormHints = (column: string) => {
  const resolution = ATTENDEE_RESOLUTIONS.find((r) => r.column === column);
  if (!resolution) {
    throw new Error(`No attendee resolution declares the column "${column}"`);
  }
  return {
    requiredWhen: expression(typeIs(resolution.value), 'cel'),
  };
};

/**
 * Event Attendee — who was in the room.
 *
 * # Why a junction object, and not multi-value lookups
 *
 * "Attendees are queryable RECORDS, not JSON strings", and three properties
 * decide the shape:
 *
 *  1. **Attendees are heterogeneous.** A customer meeting has internal people
 *     (`sys_user`), existing customers (`crm_contact`) and prospects
 *     (`crm_lead`) in it. A `Field.lookup(..., { multiple: true })` points at
 *     exactly ONE object, so a multi-lookup design needs three parallel
 *     multi-lookups and no way to order or de-duplicate across them.
 *  2. **An attendee carries its own attributes.** `response` and `is_organizer`
 *     belong to the *pairing* of a person and an event, not to either side. A
 *     multi-value lookup stores a bare id array with nowhere to hang them.
 *  3. **A junction is queryable.** "Meetings this rep attended", "contacts who
 *     declined twice this quarter" and "accounts whose champion has not
 *     attended anything in 90 days" are all `find()` calls on this object.
 *     Against an id array inside a multi-value column they are not expressible
 *     in ObjectQL at all.
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
 * Reads are filtered to attendees whose `crm_event` the caller can read, and
 * adding or updating an attendee requires edit access to that event. ⚠️ That
 * derivation resolves through the same paths a direct read of the event takes —
 * ownership scope and `sys_record_share` grants folded in, not the master's
 * row-level security policies alone. The distinction is not academic: an
 * earlier platform version consulted master RLS policies ONLY, under a SYSTEM
 * context, and HotCRM authors none on `crm_event` — so every attendee row of
 * every meeting reached every holder of object-level read.
 * `test/parent-derived-reach.test.ts` pins the narrow behaviour and was written
 * to go red the day the platform changed it.
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

    // ⚠️ Deliberately left on the spec default, and NOT cascaded with the party
    // lookups below. Because it is REQUIRED, the engine escalates the stored
    // `set_null` to a refusal at delete time, with a message naming the real
    // obstacle instead of an unrelated rule: "Cannot delete crm_event (...): 3
    // dependent crm_event_attendee record(s) reference it via crm_event
    // (crm_event is required, so it cannot be cleared)." That is the correct
    // answer on this side, for the same reason `crm_campaign_member.crm_campaign`
    // keeps it: a meeting's attendee list is the meeting's historical record,
    // not a per-person artefact. `test/event-attendee-cascade.test.ts` pins the
    // resolved value so a copy-paste of the three cascades cannot reach here.
    crm_event: Field.lookup('crm_event', {
      group: 'basic',
      label: 'Event',
      required: true,
      storage: { notNull: true },
    }),

    // The discriminator says which of the four columns below is the live one. It
    // is authored rather than derived so a query can filter "internal attendees
    // only" without four OR'd null checks. The options are GENERATED from the
    // resolution table rather than retyped — see the note at the top of this
    // file for why the pairing is declared once.
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

    // ⛔ `deleteBehavior: 'cascade'` on ALL THREE party lookups, not the default.
    //
    // ⚠️ Platform constraint: a lookup defaults to `set_null`, and the engine
    // implements `set_null` by UPDATING the row that holds it. On a column a
    // validation rule reads, that makes the referenced party permanently
    // UNDELETABLE: clearing this column leaves the row the engine just edited in
    // violation of `attendee_resolves` below, and the whole delete rolls back
    // with an error naming an object the caller never addressed. The same
    // construction bites `crm_campaign_member`.
    //
    // `external_name` is the fourth resolution, but it is blank on every row the
    // product actually writes (`src/actions/global.actions.ts` logs attendees
    // with a party reference and never an external name), so it rescues nothing.
    //
    // Cascade rather than `restrict`: an attendee row is a JUNCTION whose whole
    // meaning is "this person was in this room". Once the person is gone the row
    // denotes nothing, and the query it exists to serve ("meetings this person
    // attended") has lost its subject. `restrict` would produce an accurate
    // message but keep the person undeletable until someone deleted their
    // attendance by hand, and undeletable PEOPLE is the impact being fixed.
    // Cascade also leaves no reachable state in which a stored attendee row
    // breaks its own object's rule.
    crm_contact: Field.lookup('crm_contact', {
      group: 'basic',
      label: 'Contact',
      deleteBehavior: 'cascade',
      description: 'Set when the attendee is an existing customer contact',
      ...partyFormHints('crm_contact'),
    }),

    crm_lead: Field.lookup('crm_lead', {
      group: 'basic',
      label: 'Lead',
      deleteBehavior: 'cascade',
      description: 'Set when the attendee is still an unconverted lead',
      ...partyFormHints('crm_lead'),
    }),

    // `sys_user` gets the SAME answer as the two CRM parties, and it was worth a
    // second look rather than a copy-paste:
    //
    //  · Deleting a user is a real, reachable operation. Generic CRUD delete on
    //    the identity table is off (`sys_user` ships `apiMethods: ['get',
    //    'list', 'update', 'bulk']`), but better-auth's own routes —
    //    `/api/v1/auth/delete-user`, which the platform's `sys_user` object
    //    surfaces as the "Delete My Account" record action, and
    //    `/api/v1/auth/admin/remove-user` — resolve `user` to `sys_user` and
    //    land on `dataEngine.delete(...)`, i.e. the SAME ObjectQL delete that
    //    runs the referential pass. So `set_null` here is not dormant: it breaks
    //    account erasure for any colleague who ever attended a meeting.
    //  · The app's shipped stance is already "a deleted user's references
    //    degrade". EVERY other `sys_user` lookup in HotCRM (every `owner_id`,
    //    plus `product_manager`) is `set_null` and NO validation rule reads any
    //    of them — the rule below is the only one in the app that reads a user
    //    reference at all, which is precisely why this is the only lookup where
    //    the default misbehaves. `restrict` here would make this junction the
    //    ONE app row able to veto a platform identity erasure — an app object
    //    holding a `protection: { lock: 'full' }`, better-auth-managed table
    //    hostage, surfacing as an opaque failure from an auth route. That is a
    //    layering inversion, not a fix.
    //  · The cost of cascade is bounded and is the right half to lose: the
    //    meeting itself (`crm_event` — subject, times, outcome notes) survives
    //    untouched; only the per-person row goes, and it goes because the
    //    person's identity record was erased. Deactivation, not deletion, is the
    //    ordinary offboarding path (the platform ships ban/unban), and it
    //    touches nothing here.
    sys_user: Field.lookup('sys_user', {
      group: 'basic',
      label: 'User',
      deleteBehavior: 'cascade',
      description: 'Set when the attendee is a colleague',
      ...partyFormHints('sys_user'),
    }),

    // Free text is the LAST resort, not the default: it exists only for the
    // genuinely unmodelled guest (a prospect's lawyer who is in no CRM object).
    // It is the resolution of ONE attendee type — `external` — and the rules
    // below enforce that both ways: an `external` row must fill it, and no
    // other type may. It is not a place to paste a list, and not a note field
    // to hang off a Contact row.
    external_name: Field.text({
      group: 'basic',
      label: 'External Attendee',
      maxLength: 255,
      description: 'Name of an attendee who is in no CRM object — set when Attendee Type is External',
      ...partyFormHints('external_name'),
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

    // ⛔ NOT `readonly`: written by the activity actions on insert, and the
    // engine strips a readonly key the CALLER supplied — the same reason
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

  // ⚠️ Predicates below are TOTAL: every `record.x` read is `has()`-guarded, so
  // the rule returns a verdict even when the merged record has no such key. See
  // AGENTS.md "Validation predicates must be TOTAL" and
  // test/object-validation-predicates.test.ts, which fails the build otherwise.
  //
  // Both rules are GENERATED from `ATTENDEE_RESOLUTIONS` at the top of this
  // file. ⚠️ `expression(..., 'cel')` is the same envelope the ``P`…` `` tag
  // produces, but the tag JSON-quotes an interpolated string and so cannot
  // splice a source fragment — which is why these use the function form. The
  // pairing is declared once and read twice; see the note up there.
  validations: [
    // The type's own column must be filled.
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
