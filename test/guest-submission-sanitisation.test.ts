// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import { ObjectKernel } from '@objectstack/core';
import { DefaultDatasourcePlugin, AppPlugin } from '@objectstack/runtime';
import { ObjectQLPlugin } from '@objectstack/objectql';
import { MetadataPlugin } from '@objectstack/metadata';
import {
  SecurityPlugin,
  appDefaultPermissionSetName,
  buildContextForUser,
} from '@objectstack/plugin-security';
import { SharingServicePlugin } from '@objectstack/plugin-sharing';
import { tenancyProbe } from './helpers/tenancy-probe';
import stack from '../objectstack.config';

/**
 * What a guest (web-to-case / web-to-lead) submission ACTUALLY stores — pinned
 * against the real engine (#1133).
 *
 * ### Why this file exists
 *
 * `case_sha_defaults` and `lead_automation` each open with a guest branch that
 * defaults a few fields and then removes the ones a public submitter must not
 * write — internal staff notes, the resolution, the escalation flag, the
 * ownership anchor, and on `crm_lead` the whole conversion and duplicate
 * surface. Both branches expressed the removal as `delete input.<field>`, and
 * MEASURED against the shipped stack every one of those deletes was a SILENT
 * NO-OP: a submission carrying `internal_notes` / `resolution` /
 * `is_escalated` / `owner_id` stored them verbatim, while the ASSIGNMENTS two
 * lines above (`origin = 'web'`, `lead_source = 'web'`) landed. A security
 * control that reads as enforced and does nothing.
 *
 * The discriminator that makes this readable rather than inferred is
 * `crm_case.origin`: it declares no `defaultValue` anywhere, so a stored
 * `origin: "web"` can only have come from the first statement of the very
 * branch whose next statements were the deletes. Same branch, same `input`
 * object, same call. `crm_lead` has the same one in `lead_source`, and a
 * sharper second one — see the duplicate-link case below.
 *
 * ### The mechanism (measured, not assumed)
 *
 * ObjectQL hands a hook `ctx.input` as `{ data, options }` and swaps in a
 * flat-record Proxy over it (`installFlatInput`, `@objectstack/objectql`
 * `src/hook-wrappers.ts`). The Proxy traps `get` / `set` / `has` / `ownKeys` /
 * `getOwnPropertyDescriptor` and routes every one into `data` — but declares no
 * `deleteProperty` trap, so a `delete` falls back to
 * `Reflect.deleteProperty(wrapper, key)` one level ABOVE the record and removes
 * a key that was never there. Driven directly through `wrapDeclarativeHook`,
 * `delete input.x` returns `true`, `'x' in input` stays `true`, `input.x` still
 * reads the caller's value, and `Object.keys(input)` still lists it. Assigning
 * a key and then deleting it leaves the ASSIGNED value — which is what rules
 * out the "the engine merges caller data over hook input" reading: there is no
 * merge, only a delete aimed one level too high.
 *
 * That is a platform-level trap and is reported upstream separately. The repair
 * pinned here is app-side and stands either way: assign the safe value, because
 * assignment is the operation measured to survive.
 *
 * ### How to read a failure here
 *
 * Every case below asserts STORED VALUES, and each carries a positive control
 * (`origin` / `lead_source`) that fails if the guest branch did not run at all
 * — so none of them can pass by the submission being rejected, by the object
 * being unreachable, or by the branch being deleted. `a trusted write keeps the
 * internal fields` is the negative control in the other direction: it fails if
 * the sanitisation ever stops being guest-scoped and starts blanking staff
 * edits.
 *
 * ⚠️ If a case here goes red because a value came back as the planted string,
 * the control has gone inert again — do not relax the assertion.
 */

type AnyRec = Record<string, any>;

process.env.OS_REGISTRY_LOG ??= 'silent';

/**
 * A genuinely anonymous caller: no user id AND no `isSystem`. Both are needed.
 * A userless-but-system context (`{ isSystem: true }`, which is what every
 * fixture in this repo writes through) is NOT a guest — it is the most trusted
 * caller there is, and treating it as one blanks the owner of every seeded row.
 * The engine's context builder is what separates them: a system context reaches
 * a hook as `session: { isSystem: true }`, an anonymous one carries no session.
 */
const GUEST = {} as AnyRec;
/** The trusted write / read-back channel. */
const SYS = { isSystem: true } as AnyRec;

/**
 * `crm_case`'s declared field map, read off the compiled stack rather than
 * imported from the object file — this is the shape the app ships, which is
 * what a retirement claim has to be made against (#1428).
 */
const caseFields: AnyRec =
  ((stack as AnyRec).objects as AnyRec[]).find((o) => o.name === 'crm_case')?.fields ?? {};

let kernel: AnyRec;
let ql: AnyRec;
const id: Record<string, string> = {};
let agentCtx: AnyRec;

const insertAs = async (context: AnyRec, object: string, doc: AnyRec): Promise<string> => {
  const row = await ql.insert(object, doc, { context });
  return String(row?.id ?? row?.record?.id);
};
const rowById = async (object: string, rowId: string): Promise<AnyRec> => {
  const found = await ql.findOne(object, { where: { id: rowId } }, { context: SYS });
  return (found ?? {}) as AnyRec;
};

beforeAll(async () => {
  kernel = new ObjectKernel({ logger: { level: 'silent' } } as never);
  await kernel.use(new DefaultDatasourcePlugin({ driver: 'memory', config: {} } as never));
  await kernel.use(
    new MetadataPlugin({ watch: false, artifactWatch: false, environmentId: 'proj_test' } as never),
  );
  await kernel.use(new ObjectQLPlugin({ environmentId: 'proj_test' } as never));
  await kernel.use(new AppPlugin(stack as never, undefined as never, { skipSeedData: true } as never));
  await kernel.use(
    new SecurityPlugin({
      fallbackPermissionSet: appDefaultPermissionSetName((stack as AnyRec).permissions),
    } as never),
  );
  // 17.2.0: declared sharing rules are only seeded once this stack states its
  // tenancy posture — see `test/helpers/tenancy-probe.ts` for the measurement.
  // Mounted BEFORE SharingServicePlugin, which reads the posture during its own
  // boot.
  await kernel.use(tenancyProbe('single') as never);
  await kernel.use(new SharingServicePlugin());
  await kernel.bootstrap();
  ql = kernel.getService('objectql');

  // The FIRST human user is auto-promoted to platform admin at boot. Burn that
  // promotion on a throwaway so the agent below is an ordinary user whose
  // writes go through the same enforcement a real staff edit would.
  await insertAs(SYS, 'sys_user', { name: 'Platform Admin', email: 'admin@guest-sanitisation.test' });
  id.agent = await insertAs(SYS, 'sys_user', { name: 'Service Agent', email: 'agent@guest-sanitisation.test' });

  // Pool membership for `case_auto_assign`: it is what makes "the guest's
  // planted owner did not survive" provable by a POSITIVE value (the case is
  // owned by the real agent) rather than by an absence.
  await insertAs(SYS, 'sys_user_position', { user_id: id.agent, position: 'service_agent' });
  const sets = await ql.find('sys_permission_set', { where: {} }, { context: SYS });
  const agentSet = (sets as AnyRec[]).find((s) => s.name === 'service_agent');
  await insertAs(SYS, 'sys_user_permission_set', {
    user_id: id.agent,
    permission_set_id: agentSet?.id,
  });

  agentCtx = await buildContextForUser(ql, id.agent);
}, 120_000);

describe('crm_case — guest submission sanitisation', () => {
  it('overwrites every internal field the guest branch claims to strip', async () => {
    const caseId = await insertAs(GUEST, 'crm_case', {
      subject: 'Printer is on fire',
      description: 'It is definitely on fire.',
      // Everything below is planted by the submitter and must not survive.
      owner_id: 'planted_user',
      internal_notes: 'PLANTED-NOTES',
      resolution: 'PLANTED-RESOLUTION',
      is_escalated: true,
      escalation_reason: 'PLANTED-REASON',
      is_closed: true,
      // ⚠️ `customer_rating: 5` / `customer_feedback: 'PLANTED-FEEDBACK'` used
      // to be planted here too (#1505). They are NOT any more, and their
      // absence is a measurement rather than a tidy-up — see the block below
      // this insert.
    });
    const stored = await rowById('crm_case', caseId);

    // Positive control: the branch RAN. `crm_case.origin` declares no
    // `defaultValue`, so this value has exactly one possible source — the first
    // statement of the guest branch itself.
    expect(stored.origin).toBe('web');

    expect(stored.internal_notes).toBeNull();
    expect(stored.resolution).toBeNull();
    expect(stored.is_escalated).toBe(false);

    // #1505, reconciled with #1428. The plant path is closed BY CONSTRUCTION
    // rather than by a hook assignment: the maintainer ruled the satisfaction
    // survey out under ADR-0049 enforce-or-remove, `crm_case` declares neither
    // column, and the guest branch no longer names them.
    //
    // ⚠️ MEASURED while making that change, and it is why the two keys are gone
    // from the payload above rather than left in as a stronger plant: this
    // engine REFUSES an undeclared write outright. Re-running this case with
    // them still in the doc failed the whole insert with
    //
    //   Error: Unknown field 'customer_rating' on object 'crm_case'
    //     ❯ undeclaredWriteFieldErrors @objectstack/objectql
    //
    // — before the hooks, before sharing, before security. So a submitter
    // naming a retired column no longer gets a case with the value dropped;
    // they get no case at all. Keeping the plant would have made this case
    // assert the refusal instead of the sanitisation it exists for, and it
    // would have taken the four assertions above down with it.
    //
    // ⚠️ The assertion is ABSENCE, not `toBeNull()`, and the difference is the
    // whole point of reconciling the two cards. A nulled field and a field that
    // does not exist are different facts, and `toBeNull()` reads as green
    // against both — so it would keep passing on the day someone re-declares
    // `customer_rating` and forgets to strip it, which is exactly the hole
    // #1505 was filed for. Both halves are checked: the SCHEMA, so this cannot
    // pass merely because a driver dropped an unknown key on the way in, and
    // the STORED ROW, so a re-declared column cannot arrive carrying a value.

    // Anti-vacuum for the schema half: an empty or mis-read field map would let
    // every `not.toHaveProperty` below pass by describing nothing at all.
    expect(Object.keys(caseFields).length).toBeGreaterThan(20);
    expect(caseFields, 'caseFields is not crm_case').toHaveProperty('resolution');

    for (const retired of ['customer_rating', 'customer_feedback']) {
      expect(
        caseFields,
        `crm_case re-declares ${retired}. #1428 retired it under ADR-0049 — if it is ` +
          'coming back, it needs a writer, a profile entry and a surface decided first ' +
          '(#1428 carries the ruling). ⛔ Do not relax this into a null check.',
      ).not.toHaveProperty(retired);
      expect(
        stored,
        `${retired} reached the stored row. The column is retired, so this is a ` +
          're-declaration that skipped the guest branch — ⛔ do not relax the assertion.',
      ).not.toHaveProperty(retired);
    }

    // The planted owner is gone, and `case_auto_assign` — which runs after this
    // strip, and only on a case the strip left ownerless — placed the case on
    // the real service agent instead.
    expect(stored.owner_id).not.toBe('planted_user');
    expect(stored.owner_id).toBe(id.agent);
  }, 60_000);

  it('derives is_closed from status rather than letting a guest state it', async () => {
    const caseId = await insertAs(GUEST, 'crm_case', {
      subject: 'Cannot log in',
      description: 'Password reset loops.',
      is_closed: true, // the flag every triage consumer keys on
    });
    const stored = await rowById('crm_case', caseId);

    expect(stored.origin).toBe('web'); // positive control
    expect(stored.status).toBe('new');
    // Derived from the stored status, not taken from the payload. A stored
    // `is_closed: true` on a `new` case would park it out of the pinned
    // `unassigned_triage` view and out of `case_unassigned_triage_sharing`.
    expect(stored.is_closed).toBe(false);
  }, 60_000);

  it('a trusted write keeps the internal fields', async () => {
    // The negative control. Same object, same columns, an authenticated agent
    // instead of a guest: nothing is blanked. Without this, every assertion
    // above would still pass if the sanitisation lost its `isGuestSubmission`
    // guard and started blanking staff edits too.
    const caseId = await insertAs(agentCtx, 'crm_case', {
      subject: 'Escalated by an agent',
      description: 'Raised internally.',
      internal_notes: 'STAFF-NOTES',
      resolution: 'STAFF-RESOLUTION',
      is_escalated: true,
      escalation_reason: 'Customer is a strategic account',
    });
    const stored = await rowById('crm_case', caseId);

    expect(stored.internal_notes).toBe('STAFF-NOTES');
    expect(stored.resolution).toBe('STAFF-RESOLUTION');
    expect(stored.is_escalated).toBe(true);
    // #1505's half of this control was `customer_rating` / `customer_feedback`:
    // an authenticated agent logging a rating had to keep it, or the strip had
    // stopped being guest-scoped. #1428 retired both columns, so there is no
    // staff-authored value left to control for — the three fields above carry
    // the same guarantee, each with a distinct planted value.
  }, 60_000);
});

describe('crm_lead — guest submission sanitisation', () => {
  it('overwrites every conversion and ownership field the guest branch claims to strip', async () => {
    const leadId = await insertAs(GUEST, 'crm_lead', {
      first_name: 'Ada',
      last_name: 'Lovelace',
      company: 'Analytical Engines Ltd',
      email: 'ada@analytical-engines.test',
      // Planted conversion state: a lead that claims to have already converted
      // is locked against further edits by `lead_automation`'s converted guard.
      is_converted: true,
      converted_date: '2026-01-01',
      owner_id: 'planted_user',
    });
    const stored = await rowById('crm_lead', leadId);

    // Positive control: the branch ran (`lead_source` is its own assignment).
    expect(stored.lead_source).toBe('web');

    expect(stored.is_converted).toBe(false);
    expect(stored.converted_date).toBeNull();
    expect(stored.converted_account).toBeNull();
    expect(stored.converted_contact).toBeNull();
    expect(stored.converted_opportunity).toBeNull();
    expect(stored.owner_id).not.toBe('planted_user');
  }, 60_000);

  it('a guest cannot park a duplicate verdict or a link of their choosing', async () => {
    // The consequence #598 named, asserted on stored values. `lead_duplicate_check`
    // stands down on a record that already carries a verdict, so a submitter who
    // can post `duplicate_status: 'confirmed'` turns the dedupe off for their own
    // submission — and the link beside it can name any record id they care to
    // guess.
    //
    // What this case does NOT assert is that the dedupe then ran and wrote its
    // own `suspected` verdict. It cannot: an anonymous submission holds the
    // `guest_portal` grant, which is INSERT-only on `crm_lead` and denies the
    // reads that check needs, so `lead_duplicate_check` swallows the denial by
    // design and a guest's duplicate lands unflagged. Asserting `suspected` here
    // would pin a fiction. The security property is that the guest's own verdict
    // does not survive, and that is what is measured.
    const second = await insertAs(GUEST, 'crm_lead', {
      first_name: 'Grace', last_name: 'Hopper', company: 'Mark II',
      email: 'grace@hopper.test',
      duplicate_status: 'confirmed',
      duplicate_of_type: 'crm_contact',
      duplicate_of_contact: 'planted-record-id',
    });
    const stored = await rowById('crm_lead', second);

    expect(stored.lead_source).toBe('web'); // positive control

    expect(stored.duplicate_status).toBeNull();
    expect(stored.duplicate_of_type).toBeNull();
    expect(stored.duplicate_of_contact).toBeNull();
    expect(stored.duplicate_of_lead).toBeNull();
  }, 60_000);

  it('a planted type discriminator no longer reaches validation', async () => {
    // The sharpest measurement on this object, and the one that flipped when
    // the deletes became assignments. `duplicate_of_lead` carries
    // `requiredWhen record.duplicate_of_type == "crm_lead"`, so a submission
    // naming a type with no partner used to be REFUSED outright — the engine
    // validating a key the guest branch believed it had already removed.
    const leadId = await insertAs(GUEST, 'crm_lead', {
      first_name: 'Alan', last_name: 'Turing', company: 'NPL',
      email: 'alan@npl.test',
      duplicate_of_type: 'crm_lead', // no `duplicate_of_lead` alongside it
    });
    const stored = await rowById('crm_lead', leadId);

    expect(stored.lead_source).toBe('web'); // positive control
    expect(stored.duplicate_of_type).toBeNull();
  }, 60_000);
});
