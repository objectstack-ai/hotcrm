// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ObjectQL } from '@objectstack/objectql';
import { InMemoryDriver } from '@objectstack/driver-memory';
import { SysUser } from '@objectstack/platform-objects';
import stack from '../objectstack.config';

/**
 * Deleting a person who attended a meeting must work (#711).
 *
 * ### The bug this file exists to keep dead
 *
 * `crm_event_attendee` is the same construction as `crm_campaign_member` and
 * carried the same defect (#696 / `test/campaign-member-cascade.test.ts`) — it
 * was simply outside that fix's file surface. The object declares a severity
 * `error` rule, `attendee_resolves`, that rejects an attendee row naming
 * neither a Contact, a Lead, a User, nor an external guest; all three party
 * lookups used to take `Field.lookup`'s SPEC DEFAULT for `deleteBehavior`,
 * which is `set_null`.
 *
 * So the engine's own referential pass turned every party delete into a
 * self-defeating sequence: `cascadeDeleteRelations` cleared the attendee row's
 * party column, the row it had just edited instantly broke the rule the same
 * object declares, and the whole delete rolled back. Measured before the fix on
 * 17.0.0-rc.2, on this exact harness:
 *
 *     DELETE lead    ERROR: An attendee must point at a Contact, a Lead,
 *                           a User, or name an external guest
 *     lead survives? true
 *     DELETE contact ERROR: (same)      contact survives? true
 *     DELETE user    ERROR: (same)      user survives?    true
 *
 * `external_name` is the fourth resolution, but it rescues nothing in practice:
 * `src/actions/global.actions.ts` logs attendees with a party reference and
 * never with an external name, so every row the product actually writes has it
 * blank. Anyone logged as a meeting attendee was therefore undeletable, with an
 * error naming an object the caller never addressed — the same GDPR "delete
 * this person" impact as #696.
 *
 * #740 rewrote both the rule and its message: `attendee_resolves` now requires
 * the column `attendee_type` NAMES (and its sibling `attendee_type_exclusive`
 * refuses any other), so the quoted 17.0.0-rc.2 measurements above are history,
 * not the current wording. Nothing about the cascade decision changes — the
 * rule is still severity `error` and still reads all four columns, so a
 * `set_null` party lookup would break a stored row exactly as before.
 *
 * ### The fix, and why cascade on the USER lookup too
 *
 * `deleteBehavior: 'cascade'` on all three party lookups. An attendee row is a
 * JUNCTION whose whole meaning is "this person was in this room"; once the
 * person is gone the row denotes nothing and the query it exists to serve
 * ("meetings this person attended") has lost its subject.
 *
 * `sys_user` was the one worth deciding rather than copying, and three measured
 * facts decided it:
 *
 *  1. **Deleting a user is reachable.** Generic CRUD delete on the identity
 *     table is off — the platform's `sys_user` ships
 *     `apiMethods: ['get', 'list', 'update', 'bulk']` and `userActions:
 *     { edit: true }` — but better-auth's own routes are not generic CRUD.
 *     `plugin-auth`'s ObjectQL adapter maps the `user` model to `sys_user` and
 *     implements `delete` as `dataEngine.delete(...)`, i.e. the same ObjectQL
 *     delete that runs the referential pass. `/api/v1/auth/delete-user` (which
 *     the platform object surfaces as its "Delete My Account" record action)
 *     and `/api/v1/auth/admin/remove-user` both land there. `set_null` here was
 *     not dormant: it broke account erasure for any colleague who had ever sat
 *     in a logged meeting.
 *  2. **"A deleted user's references degrade" is already this app's stance.**
 *     EVERY other `sys_user` lookup in HotCRM — every `owner_id`, plus
 *     `crm_product.product_manager` — is
 *     `set_null`, and NO validation rule reads any of them. Swept over the
 *     built stack (rule conditions are `{ dialect, source }`, so the source
 *     string is what has to be searched): this object's rules are the only ones
 *     in the app that read a user reference at all — `attendee_resolves`, and
 *     since #740 `attendee_type_exclusive` beside it — which is exactly why this
 *     is the only lookup where the `set_null` default misbehaved. `restrict`
 *     would make this junction the ONE app row able to veto a platform identity
 *     erasure, on a `protection: { lock: 'full' }`, better-auth-managed table,
 *     surfacing as an opaque failure from an auth route. That is a layering
 *     inversion, not a fix.
 *  3. **The cost of cascade is the right half to lose.** The meeting itself
 *     survives untouched — only the per-person row goes, because the person's
 *     identity record was erased. Deactivation, not deletion, is the ordinary
 *     offboarding path (the platform ships ban / unban for that) and it touches
 *     nothing here.
 *
 * `restrict` was the serious alternative on all three lookups: it produces an
 * accurate message (the platform's own "N dependent record(s) reference it"),
 * and it removes the broken state just as cascade does, since the parent delete
 * is refused before any row is edited. It was rejected because the impact being
 * fixed is undeletable PEOPLE, not confusing text — `restrict` trades one
 * undeletable person for a manual delete-their-attendance chore.
 *
 * The `crm_event` side is deliberately NOT cascaded; see the last structural
 * test and the last end-to-end test for what it does instead, and why.
 *
 * ### The family is closed
 *
 * The construction — a severity `error` rule reading an OPTIONAL lookup that
 * takes the `set_null` default — was swept across the built stack after this
 * change. It now returns nothing: `crm_campaign_member` (#696) and
 * `crm_event_attendee` (this) were the only two, and both cascade. The sweep
 * was run non-vacuous first (the same query against `cascade` lists exactly
 * those two objects), because the naive version silently matches nothing: a
 * rule's `condition` is a `{ dialect, source }` object, so `String(condition)`
 * is `"[object Object]"` and every `includes()` on it is false.
 */

type AnyRec = Record<string, any>;

const objects: AnyRec[] = (stack as any).objects ?? [];
const byName = (n: string) => objects.find((o) => o.name === n) as AnyRec;

const EVENT_ATTENDEE = byName('crm_event_attendee');

/**
 * The rule's exact text, so a reworded message cannot quietly pass.
 *
 * #740 rewrote it. The old wording — "must point at a Contact, a Lead, a User,
 * or name an external guest", quoted verbatim in the measurements above because
 * that is what 17.0.0-rc.2 printed — described a rule that accepted any of the
 * four resolutions regardless of `attendee_type`. The rule now requires the
 * column the type NAMES, so the message names it too.
 */
const RULE_MESSAGE = /must fill the party its Attendee Type names/i;

// ───────────────────────────────────────────────── the declaration ──

describe('crm_event_attendee declares cascade on all three party lookups', () => {
  /**
   * A structural pin, deliberately kept next to the end-to-end run below: the
   * hazard is a MISSING key, and a missing key is invisible in review because
   * the spec quietly fills in `set_null`. Asserting the RESOLVED value catches
   * both a deletion of the declaration and a future spec default flip.
   */
  it.each(['crm_contact', 'crm_lead', 'sys_user'])('%s cascades', (field) => {
    expect(EVENT_ATTENDEE.fields[field].type).toBe('lookup');
    expect(EVENT_ATTENDEE.fields[field].deleteBehavior).toBe('cascade');
  });

  it('still declares the rule that the cascade keeps satisfiable', () => {
    const rule = (EVENT_ATTENDEE.validations ?? []).find(
      (v: AnyRec) => v.name === 'attendee_resolves',
    );
    expect(rule).toBeDefined();
    expect(rule.severity).toBe('error');
  });

  /**
   * The EVENT side is deliberately not cascade. `crm_event` is a REQUIRED
   * lookup, and the engine escalates a `set_null` default on a required lookup
   * to a refusal at delete time — with a message that names the real obstacle
   * (see the last end-to-end test). That is the correct answer there, for the
   * same reason `crm_campaign_member.crm_campaign` keeps it (#696): a meeting's
   * attendee list is the meeting's historical record, not a per-person
   * artefact. Pinned so a copy-paste of the three lines above cannot reach here
   * and start shredding meeting history.
   */
  it('leaves the required event lookup on the default', () => {
    expect(EVENT_ATTENDEE.fields.crm_event.required).toBe(true);
    expect(EVENT_ATTENDEE.fields.crm_event.deleteBehavior).toBe('set_null');
  });
});

// ─────────────────────────────────────────── on the real engine ──

/**
 * End-to-end over a real ObjectQL — the only place the interaction is visible.
 * `cascadeDeleteRelations` is engine behaviour driven by metadata; no
 * metadata-only assertion can show that a delete now succeeds, and no hook
 * harness runs the referential pass at all.
 *
 * `InMemoryDriver` is used for the same reason `object-validation-predicates`
 * uses it: it stores only the columns a row was written with, so the merged
 * record handed to the validator has ABSENT keys — the shape that made the rule
 * fire in the first place.
 *
 * `sys_user` is the PLATFORM object, imported rather than stubbed: the whole
 * user-side decision rests on a real account erasure reaching this same delete
 * path, so a local stand-in would be assuming what the test is meant to show.
 * (It resolves at the repo root because `.npmrc` pins `node-linker=hoisted`;
 * `test/parent-derived-reach.test.ts` reaches for platform packages the same
 * way.)
 */
describe('deleting a person who attended a meeting', () => {
  let ql: AnyRec;
  let api: AnyRec;

  beforeEach(async () => {
    ql = (await ObjectQL.create({
      datasources: { default: new InMemoryDriver({ persistence: false }) },
      objects: {
        crm_event_attendee: EVENT_ATTENDEE,
        crm_event: byName('crm_event'),
        crm_contact: byName('crm_contact'),
        crm_lead: byName('crm_lead'),
        crm_account: byName('crm_account'),
        sys_user: SysUser,
      } as never,
    })) as never;
    api = ql.createContext({ isSystem: true });
  });
  afterEach(async () => {
    await ql?.close();
  });

  const newEvent = (subject = 'Quarterly Business Review') =>
    api.object('crm_event').insert({
      subject,
      type: 'meeting',
      status: 'planned',
      start_datetime: '2026-02-01T09:00:00.000Z',
      end_datetime: '2026-02-01T10:00:00.000Z',
    });

  const newLead = (email = 'wei.zhang@acme.test') =>
    api.object('crm_lead').insert({
      first_name: 'Wei',
      last_name: 'Zhang',
      company: 'ACME',
      status: 'new',
      lead_source: 'web',
      email,
    });

  const newContact = async (email = 'li.wang@acme.test') => {
    const account = await api.object('crm_account').insert({
      name: `ACME ${email}`,
      type: 'customer',
      industry: 'technology',
    });
    return api.object('crm_contact').insert({
      first_name: 'Li',
      last_name: 'Wang',
      crm_account: account.id,
      email,
    });
  };

  const newUser = (email = 'chen.hu@objectos.ai') =>
    api.object('sys_user').insert({ name: 'Chen Hu', email });

  const attendees = () => api.object('crm_event_attendee').find({ where: {} });

  it('deletes a lead who attended several meetings, and takes their attendance with it', async () => {
    const [qbr, demo] = await Promise.all([newEvent('QBR'), newEvent('Demo')]);
    const lead = await newLead();
    for (const event of [qbr, demo]) {
      await api.object('crm_event_attendee').insert({
        crm_event: event.id,
        attendee_type: 'lead',
        crm_lead: lead.id,
        response: 'no_response',
      });
    }
    expect(await attendees()).toHaveLength(2);

    // The assertion that WAS the bug: this used to reject with
    // "An attendee must point at a Contact, a Lead, a User, or name an
    // external guest" — an object the caller never addressed.
    await expect(
      api.object('crm_lead').delete({ where: { id: lead.id } }),
    ).resolves.not.toThrow();

    expect(await api.object('crm_lead').find({ where: { id: lead.id } })).toHaveLength(0);
    expect(await attendees()).toHaveLength(0);
  });

  it('deletes an attending contact the same way', async () => {
    const event = await newEvent();
    const contact = await newContact();
    await api.object('crm_event_attendee').insert({
      crm_event: event.id,
      attendee_type: 'contact',
      crm_contact: contact.id,
      response: 'accepted',
    });

    await expect(
      api.object('crm_contact').delete({ where: { id: contact.id } }),
    ).resolves.not.toThrow();

    expect(await api.object('crm_contact').find({ where: { id: contact.id } })).toHaveLength(0);
    expect(await attendees()).toHaveLength(0);
  });

  /**
   * The colleague case — the one #711 flagged for a second look. It is the same
   * verdict as the two CRM parties, and it is pinned separately (not folded
   * into an `it.each`) because it is the case a future reader is most likely to
   * want to revisit: this is where a decision to switch `sys_user` to
   * `restrict` would have to change a green test on purpose.
   *
   * `is_organizer: true` is on the row deliberately — organising the meeting is
   * the strongest form of "their attendance is history worth keeping", and the
   * answer is still that the row goes when the identity record is erased. The
   * meeting itself survives, asserted below.
   */
  it('deletes a colleague who attended — and organised — a meeting, keeping the meeting', async () => {
    const event = await newEvent('Internal sync');
    const user = await newUser();
    await api.object('crm_event_attendee').insert({
      crm_event: event.id,
      attendee_type: 'user',
      sys_user: user.id,
      response: 'accepted',
      is_organizer: true,
    });

    await expect(
      api.object('sys_user').delete({ where: { id: user.id } }),
    ).resolves.not.toThrow();

    expect(await api.object('sys_user').find({ where: { id: user.id } })).toHaveLength(0);
    expect(await attendees()).toHaveLength(0);
    // The bounded cost, asserted rather than asserted-about: the meeting record
    // is untouched. Only the per-person row went.
    expect(await api.object('crm_event').find({ where: { id: event.id } })).toHaveLength(1);
  });

  it('leaves every attendee row that named somebody else alone', async () => {
    const event = await newEvent();
    const lead = await newLead();
    const bystanderLead = await newLead('bystander@acme.test');
    const contact = await newContact();
    const user = await newUser();

    await api.object('crm_event_attendee').insert({
      crm_event: event.id, attendee_type: 'lead', crm_lead: lead.id, response: 'no_response',
    });
    // The rows that must SURVIVE: the other two party TYPES, a different record
    // of the SAME type, and the external guest who is in no CRM object at all.
    // A cascade that keyed off the object rather than the id would take the
    // same-type one; one that keyed off the object alone would take more.
    const keepContact = await api.object('crm_event_attendee').insert({
      crm_event: event.id, attendee_type: 'contact', crm_contact: contact.id, response: 'accepted',
    });
    const keepUser = await api.object('crm_event_attendee').insert({
      crm_event: event.id, attendee_type: 'user', sys_user: user.id, response: 'accepted',
    });
    const keepLead = await api.object('crm_event_attendee').insert({
      crm_event: event.id, attendee_type: 'lead', crm_lead: bystanderLead.id, response: 'tentative',
    });
    // `attendee_type: 'external'` since #740 — this row used to be filed under
    // `contact` with no contact on it, which is the mislabelling that issue
    // fixed, and it is now refused outright.
    const keepGuest = await api.object('crm_event_attendee').insert({
      crm_event: event.id, attendee_type: 'external', external_name: "the prospect's lawyer",
      response: 'no_response',
    });

    await api.object('crm_lead').delete({ where: { id: lead.id } });

    const remaining = (await attendees()).map((r: AnyRec) => r.id).sort();
    expect(remaining).toEqual(
      [keepContact.id, keepUser.id, keepLead.id, keepGuest.id].sort(),
    );
  });

  /**
   * The fourth resolution, the one that makes this object differ from
   * `crm_campaign_member` at all: a guest who is in no CRM object is named in
   * free text, under `attendee_type: 'external'` since #740. Two things are
   * pinned — that such a row is ACCEPTED (the escape hatch is live, not
   * decorative), and that it is untouched by any party delete (it references
   * nothing to cascade from). It is also why the bug was never total: a
   * hand-authored external-guest row was always deletable-around.
   * `src/actions/global.actions.ts` never writes one, so no row the product
   * produces was rescued by it.
   */
  it('accepts and keeps an external-guest row, which names no CRM record at all', async () => {
    const event = await newEvent();
    const lead = await newLead();
    const contact = await newContact();
    const user = await newUser();

    const guest = await api.object('crm_event_attendee').insert({
      crm_event: event.id,
      attendee_type: 'external',
      external_name: 'Jane Roe (outside counsel)',
      response: 'accepted',
    });
    for (const [type, key, party] of [
      ['lead', 'crm_lead', lead],
      ['contact', 'crm_contact', contact],
      ['user', 'sys_user', user],
    ] as const) {
      await api.object('crm_event_attendee').insert({
        crm_event: event.id, attendee_type: type, [key]: party.id, response: 'no_response',
      });
    }
    expect(await attendees()).toHaveLength(4);

    await api.object('crm_lead').delete({ where: { id: lead.id } });
    await api.object('crm_contact').delete({ where: { id: contact.id } });
    await api.object('sys_user').delete({ where: { id: user.id } });

    expect((await attendees()).map((r: AnyRec) => r.id)).toEqual([guest.id]);
  });

  it('still refuses an attendee row that names nobody — the rule is intact, not neutered', async () => {
    const event = await newEvent();
    await expect(
      api.object('crm_event_attendee').insert({
        crm_event: event.id, attendee_type: 'contact', response: 'no_response',
      }),
    ).rejects.toThrow(RULE_MESSAGE);
  });

  /**
   * The one semantic cost of cascading on all three lookups — RETIRED by #740,
   * and pinned here in the shape that retired it.
   *
   * This test used to assert the cost: a row naming two parties was removed
   * when EITHER was deleted, even though the other still existed. It was
   * accepted on the ground that "no such row is reachable today", since the
   * activity actions push one party per attendee entry — a reachability
   * argument, which is the weakest kind, and exactly the kind #740 came back
   * for on the `external_name` side.
   *
   * `attendee_type_exclusive` makes the row UNWRITABLE instead, so the
   * double-cascade question can no longer arise: there is nothing to cascade
   * twice. The assertion is the refusal plus the empty table — a rule that
   * rejected the write but left a row behind would be worse than the cost it
   * replaced.
   */
  it('refuses a two-party row outright, so the double-cascade question cannot arise', async () => {
    const event = await newEvent();
    const contact = await newContact();
    const user = await newUser();

    await expect(
      api.object('crm_event_attendee').insert({
        crm_event: event.id,
        attendee_type: 'contact',
        crm_contact: contact.id,
        sys_user: user.id,
        response: 'accepted',
      }),
    ).rejects.toThrow(/names exactly one party/i);

    expect(await attendees()).toHaveLength(0);

    // And the single-party row it was a corruption of still writes, still
    // cascades: the tightening removed a shape, not the behaviour around it.
    await api.object('crm_event_attendee').insert({
      crm_event: event.id, attendee_type: 'user', sys_user: user.id, response: 'accepted',
    });
    await api.object('sys_user').delete({ where: { id: user.id } });
    expect(await attendees()).toHaveLength(0);
    expect(await api.object('crm_contact').find({ where: { id: contact.id } })).toHaveLength(1);
  });

  /**
   * The event side, pinned end-to-end so the structural assertion above has a
   * behaviour behind it. Deleting a meeting that still has attendees is
   * REFUSED, and — the point of leaving it alone — the refusal names the real
   * obstacle and the field it lives on, instead of an unrelated validation rule
   * on an object the caller never addressed. Clear the attendees and the
   * meeting deletes.
   */
  it('still refuses to delete a meeting that has attendees, naming the real obstacle', async () => {
    const event = await newEvent();
    const contact = await newContact();
    const row = await api.object('crm_event_attendee').insert({
      crm_event: event.id, attendee_type: 'contact', crm_contact: contact.id, response: 'accepted',
    });

    await expect(
      api.object('crm_event').delete({ where: { id: event.id } }),
      // ObjectStack 17.0.0-rc.6 reworded the DELETE_RESTRICTED message to speak
      // in display labels ("… 1 Event Attendee record(s) through “Event” …")
      // instead of API names. The assertion still pins what the test is about:
      // the message must name the dependent object and the field that blocks.
    ).rejects.toThrow(/still referenced by \d+ Event Attendee record\(s\) through .Event./i);
    // Not the party rule, which is what the caller used to be told.
    await expect(
      api.object('crm_event').delete({ where: { id: event.id } }),
    ).rejects.not.toThrow(RULE_MESSAGE);

    expect(await api.object('crm_event').find({ where: { id: event.id } })).toHaveLength(1);

    await api.object('crm_event_attendee').delete({ where: { id: row.id } });
    await expect(
      api.object('crm_event').delete({ where: { id: event.id } }),
    ).resolves.not.toThrow();
    expect(await api.object('crm_event').find({ where: { id: event.id } })).toHaveLength(0);
  });
});
