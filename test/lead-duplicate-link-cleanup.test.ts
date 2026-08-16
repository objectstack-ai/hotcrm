// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ObjectKernel } from '@objectstack/core';
import { DefaultDatasourcePlugin, AppPlugin } from '@objectstack/runtime';
import { ObjectQLPlugin } from '@objectstack/objectql';
import { MetadataPlugin } from '@objectstack/metadata';
import stack from '../objectstack.config';

/**
 * A lead flagged as a duplicate must not make the record it duplicates
 * undeletable (#1072).
 *
 * ### The defect
 *
 * `lead_duplicate_check` stamps a duplicate link automatically at intake: any
 * NEW lead whose normalized email matches an existing contact gets
 * `duplicate_of_type: 'crm_contact'` + `duplicate_of_contact` + a `suspected`
 * status. `lead.object.ts` pairs the discriminator with the lookup it names
 * through `requiredWhen`, and neither lookup declares a `deleteBehavior`, so
 * both take the spec default `set_null` — which the engine implements by
 * UPDATING the row that holds the lookup. Deleting the survivor therefore
 * nulled one half of the pair and left the other behind, the lead broke its own
 * rule on the write the engine had just made, and the whole delete rolled back:
 *
 *     DELETE-CONTACT-WITH-OPEN-DUPLICATE-LEAD: Duplicate Of Contact is required
 *     DELETE-ACCOUNT-WITH-OPEN-DUPLICATE-LEAD: Duplicate Of Contact is required
 *     DELETE-SURVIVOR-LEAD:                    Duplicate Of Lead is required
 *
 * Not dormant and not rare: no conversion, no freeze, no user action — a lead
 * that merely re-uses an existing contact's email is enough, which is precisely
 * the case the dedupe exists to catch. And because `crm_contact.crm_account` is
 * a master-detail with `deleteBehavior: 'cascade'`, the ACCOUNT above that
 * contact could not be deleted either. Same GDPR "delete this person" impact as
 * #696 / #711 / #720, and the same shape of unhelpful message — an error naming
 * a field on an object the caller never addressed.
 *
 * This is the #696 / #711 construction (a `set_null` clear that leaves the
 * holder in breach of its own rule), NOT #720's (a hook refusing the write).
 * #720's fix does not reach it, and the boundary test in
 * `freeze-guard-reference-cleanup.test.ts` — which pinned the refusal above as
 * "today's truth, expected to flip when that finding lands" — is flipped by
 * this file's change.
 *
 * ### The fix, and what it is NOT
 *
 * The discriminator may not outlive the lookup it names. `lead_duplicate_check`
 * retires the claim WHOLE — `duplicate_of_type` and `duplicate_status` go with
 * the link — on any `beforeUpdate` that leaves the named lookup blank.
 *
 * The card's other two candidates were rejected on their own terms:
 * `deleteBehavior: 'cascade'` would destroy a first-class record because a flag
 * on it pointed at a deleted one, and loosening the `requiredWhen` would weaken
 * a rule that is correct at authoring time — the lenient-consumer shape this
 * repo refuses. So the second describe block below is not decoration: it is the
 * only thing separating this fix from the loosening, and it asserts that a
 * write which STATES a type without naming a record is still refused, on insert
 * and on update alike.
 *
 * ### The second rule on the same path (#1164)
 *
 * Retiring the claim clears the pairing but trips
 * `duplicate_disqualification_requires_survivor` on a lead a human had already
 * closed as a duplicate — a second rule, on the same erasure path, refusing the
 * same delete with a different sentence. That case is now cleared too, and by
 * the opposite move: the claim STANDS on such a lead and the pairing stands
 * down for it. What still refuses "closed as a duplicate of nobody" is
 * `lead_duplicate_check` job 1d, because with the pairing down only a hook can
 * separate an erased pointer from one that never existed. The last two describe
 * blocks are the two halves of that trade.
 *
 * ### What the hook deliberately does not ask
 *
 * It never asks whether the null came from the engine. Measured on 17.0.0 GA by
 * instrumenting a `beforeUpdate` on `crm_lead`, the engine's cleanup and a
 * user's hand-clear of the same lookup are indistinguishable:
 *
 *     cascade   input = { id, duplicate_of_contact: null, updated_at, updated_by }
 *     hand edit input = { id, duplicate_of_contact: null, updated_at, updated_by }
 *     both:     user = { id: <caller> }   session = { userId: <caller>, isSystem: true }
 *
 * The survivor is still readable at that moment (a `count` on its id returns 1
 * on both paths), so existence is no evidence either. Rather than sniff a shape
 * that carries no answer, the hook asks a question that needs no provenance —
 * "is the pair still whole?" — and answers both callers the same correct way.
 * The consequence is pinned explicitly below (`a hand-clear of the lookup
 * retires the claim too`) so that it reads as the measured trade it is.
 *
 * ### On the refusal envelope
 *
 * Measured end to end on 17.0.0 GA: both refusals in this file arrive as
 * `ValidationError` with `code: 'VALIDATION_FAILED'` and no `status`. That is
 * asserted as the thing it measurably is — a failure there means the platform
 * changed its error envelope, which is news to act on, not a regression to
 * paper over.
 */

type AnyRec = Record<string, any>;

process.env.OS_REGISTRY_LOG ??= 'silent';

const SYS = { isSystem: true } as AnyRec;

let kernel: AnyRec;
let ql: AnyRec;
/** The context a REST `DELETE` runs under: a real user id. */
let userCtx: AnyRec;

const insert = (object: string, doc: AnyRec): Promise<AnyRec> =>
  ql.insert(object, doc, { context: SYS });

/** Delete as the user; `null` when it went through, else the refusal message. */
const deleteAndCatch = async (object: string, id: string): Promise<string | null> => {
  try {
    await ql.delete(object, { where: { id }, context: userCtx });
    return null;
  } catch (e) {
    return (e as Error).message;
  }
};

/** Update as the user; `null` when it went through, else the Error. */
const updateAndCatch = (object: string, doc: AnyRec): Promise<Error | null> =>
  ql.update(object, doc, { context: userCtx }).then(
    () => null,
    (e: Error) => e,
  );

const rowsOf = (object: string, id: string): Promise<AnyRec[]> =>
  ql.find(object, { where: { id } }, { context: SYS });

const rowOf = async (object: string, id: string): Promise<AnyRec> => {
  const [row] = await rowsOf(object, id);
  expect(row, `${object}/${id} is gone`).toBeTruthy();
  return row;
};

/**
 * The envelope floor for the pairing refusals — message wording (which IS the
 * contract the form and the API caller see) on top of the `code`/`status` the
 * platform measurably carries. `toThrow()` alone would stay green against a
 * driver throwing a bare `Error`, which is the failure this pins shut.
 */
const expectValidationRefusal = (err: unknown, wording: string): void => {
  expect(err, `expected a refusal containing ${JSON.stringify(wording)}`).toBeInstanceOf(Error);
  const e = err as AnyRec;
  expect(e.message).toContain(wording);
  expect([e.code, e.status]).toEqual(['VALIDATION_FAILED', undefined]);
};

/** A unique suffix per fixture — `crm_contact.email` is globally unique. */
let seq = 0;
const uniq = (): string => `${++seq}`;

beforeAll(async () => {
  kernel = new ObjectKernel({ logger: { level: 'silent' } } as never);
  await kernel.use(new DefaultDatasourcePlugin({ driver: 'memory', config: {} } as never));
  await kernel.use(new MetadataPlugin({ watch: false, artifactWatch: false, environmentId: 'proj_1072' } as never));
  await kernel.use(new ObjectQLPlugin({ environmentId: 'proj_1072' } as never));
  // The app's own metadata is the subject — objects and hooks exactly as
  // `objectstack.config.ts` declares them. A unit test of the handler cannot
  // show any of this: only the engine decides that `set_null` reaches the lead
  // as a `beforeUpdate` at all, and the value of the change is that these
  // DELETEs complete.
  await kernel.use(new AppPlugin(stack as never, undefined as never, { skipSeedData: true } as never));
  await kernel.bootstrap();
  ql = kernel.getService('objectql');

  const user = await insert('sys_user', { name: 'Erasure Rep', email: 'rep@dupe-cleanup.test' });
  userCtx = { userId: user.id, isSystem: true } as AnyRec;
}, 180_000);

afterAll(async () => {
  await kernel?.shutdown?.();
});

/** An account + contact + a NEW lead the intake dedupe flags against it. */
const buildContactCase = async (): Promise<AnyRec> => {
  const n = uniq();
  const account = await insert('crm_account', {
    name: `Dupe Corp ${n}`, type: 'customer', industry: 'technology',
  });
  const contact = await insert('crm_contact', {
    first_name: 'Dee', last_name: 'Dupe', crm_account: account.id,
    email: `dee.${n}@dupe-cleanup.test`,
  });
  // Same address ⇒ `lead_duplicate_check` links the lead to this contact.
  const lead = await insert('crm_lead', {
    first_name: 'Dee', last_name: 'Dupe', company: 'Dupe Inc', status: 'new',
    lead_source: 'web', email: `dee.${n}@dupe-cleanup.test`,
  });

  const flagged = await rowOf('crm_lead', lead.id);
  expect(flagged.duplicate_of_type, 'the intake dedupe did not flag this lead').toBe('crm_contact');
  expect(flagged.duplicate_of_contact).toBe(contact.id);
  expect(flagged.duplicate_status).toBe('suspected');

  return { n, account, contact, lead };
};

// ───────────────────────────────────────── the reported repro, end to end ──

describe('a lead stops claiming a duplicate once the record it named is gone', () => {
  it('deletes the contact an OPEN suspected-duplicate lead points at', async () => {
    const { contact, lead } = await buildContactCase();

    expect(await deleteAndCatch('crm_contact', contact.id)).toBeNull();
    expect(await rowsOf('crm_contact', contact.id)).toHaveLength(0);

    // The lead itself survives — it is a first-class record, not a junction,
    // which is why `deleteBehavior: 'cascade'` was the wrong answer here. Only
    // the claim is gone.
    const row = await rowOf('crm_lead', lead.id);
    expect(row.duplicate_of_contact ?? null).toBeNull();
    expect(row.duplicate_of_type ?? null).toBeNull();
    expect(row.duplicate_status ?? null).toBeNull();
    // …and nothing else moved.
    expect(row.first_name).toBe('Dee');
    expect(row.company).toBe('Dupe Inc');
    expect(row.status).toBe('new');
    expect(row.is_converted ?? false).toBe(false);
  });

  it('then deletes the account above that contact (the second half of the repro)', async () => {
    const { account, contact } = await buildContactCase();

    expect(await deleteAndCatch('crm_contact', contact.id)).toBeNull();
    expect(await deleteAndCatch('crm_account', account.id)).toBeNull();
    expect(await rowsOf('crm_account', account.id)).toHaveLength(0);
  });

  it('deletes the account directly, cascading through the contact', async () => {
    // The path a caller actually takes for an erasure request: one
    // `DELETE crm_account/{A}`, which cascades to its contacts (master-detail)
    // and runs the duplicate-link cleanup on each. One call, the whole chain.
    const { account, contact, lead } = await buildContactCase();

    expect(await deleteAndCatch('crm_account', account.id)).toBeNull();
    expect(await rowsOf('crm_account', account.id)).toHaveLength(0);
    expect(await rowsOf('crm_contact', contact.id)).toHaveLength(0);

    const row = await rowOf('crm_lead', lead.id);
    expect(row.duplicate_of_type ?? null).toBeNull();
    expect(row.duplicate_of_contact ?? null).toBeNull();
    expect(row.duplicate_status ?? null).toBeNull();
  });

  it('deletes the survivor in the lead↔lead case', async () => {
    const n = uniq();
    const survivor = await insert('crm_lead', {
      first_name: 'Sam', last_name: 'Same', company: 'Same Inc', status: 'new',
      lead_source: 'web', email: `sam.${n}@dupe-cleanup.test`,
    });
    const dupe = await insert('crm_lead', {
      first_name: 'Sam', last_name: 'Same', company: 'Same Inc', status: 'new',
      lead_source: 'web', email: `sam.${n}@dupe-cleanup.test`,
    });
    const flagged = await rowOf('crm_lead', dupe.id);
    expect(flagged.duplicate_of_type).toBe('crm_lead');
    expect(flagged.duplicate_of_lead).toBe(survivor.id);

    expect(await deleteAndCatch('crm_lead', survivor.id)).toBeNull();
    expect(await rowsOf('crm_lead', survivor.id)).toHaveLength(0);

    const row = await rowOf('crm_lead', dupe.id);
    expect(row.duplicate_of_type ?? null).toBeNull();
    expect(row.duplicate_of_lead ?? null).toBeNull();
    expect(row.duplicate_status ?? null).toBeNull();
  });

  it('deletes the contact a CONVERTED lead was flagged against', async () => {
    // Hook ORDER is the subject here, and it is load-bearing:
    // `lead_automation` (priority 200) refuses user edits to a converted lead
    // and yields only to a write whose every non-system change is a declared
    // LOOKUP going value→null (#720). `duplicate_of_type` and
    // `duplicate_status` are neither — so if the retirement block ran before
    // that lock instead of after it (priority 300), the lock would refuse the
    // very cleanup #720 fixed it to allow, and this delete would fail.
    const { contact, lead } = await buildContactCase();
    await ql.update('crm_lead', {
      id: lead.id, is_converted: true, status: 'converted', converted_date: '2026-02-01',
    }, { context: SYS });

    expect(await deleteAndCatch('crm_contact', contact.id)).toBeNull();

    const row = await rowOf('crm_lead', lead.id);
    expect(row.duplicate_of_type ?? null).toBeNull();
    expect(row.duplicate_status ?? null).toBeNull();
    // The conversion itself is untouched: the lock still protects what it is for.
    expect(row.is_converted).toBe(true);
    expect(row.status).toBe('converted');
  });

  it('retires a human-CONFIRMED claim too, and keeps the verdict off the record', async () => {
    // `confirmed` is a human's verdict, not the machine's guess — but it is a
    // verdict ABOUT a record that no longer exists, so it goes with the link.
    // Nothing is lost: `duplicate_status` declares `trackHistory: true`.
    const { contact, lead } = await buildContactCase();
    await ql.update('crm_lead', { id: lead.id, duplicate_status: 'confirmed' }, { context: SYS });

    expect(await deleteAndCatch('crm_contact', contact.id)).toBeNull();

    const row = await rowOf('crm_lead', lead.id);
    expect(row.duplicate_status ?? null).toBeNull();
    expect(row.duplicate_of_type ?? null).toBeNull();
  });

  it('a hand-clear of the lookup retires the claim too — the measured trade', async () => {
    // Not an oversight and not a second behaviour: the engine's cleanup and
    // this write are byte-identical (see the file header), so no hook can treat
    // them differently. Stating it as a test is what stops a later reader from
    // "fixing" it into a refusal that would also refuse the erasure path.
    const { lead } = await buildContactCase();

    expect(await updateAndCatch('crm_lead', { id: lead.id, duplicate_of_contact: null })).toBeNull();

    const row = await rowOf('crm_lead', lead.id);
    expect(row.duplicate_of_type ?? null).toBeNull();
    expect(row.duplicate_status ?? null).toBeNull();
  });
});

// ─────────────────────────────────── the pairing rule has NOT been loosened ──

/**
 * The other direction. A suite that went green by relaxing the `requiredWhen`
 * would look identical to one that went green by fixing the bug, so every way
 * of asserting "a type with no record named" is still refused is pinned here.
 */
describe('the type↔lookup pairing still bites', () => {
  it('refuses an INSERT that names a type and no record', async () => {
    const err = await ql
      .insert('crm_lead', {
        first_name: 'Nan', last_name: 'None', company: 'None Inc', status: 'new',
        email: `nan.${uniq()}@dupe-cleanup.test`, duplicate_of_type: 'crm_contact',
      }, { context: userCtx })
      .then(() => null, (e: Error) => e);

    expectValidationRefusal(err, 'Duplicate Of Contact is required');
  });

  it('refuses an UPDATE that names a type and no record', async () => {
    const lead = await insert('crm_lead', {
      first_name: 'Ned', last_name: 'None', company: 'None Inc', status: 'new',
      email: `ned.${uniq()}@dupe-cleanup.test`,
    });

    expectValidationRefusal(
      await updateAndCatch('crm_lead', { id: lead.id, duplicate_of_type: 'crm_lead' }),
      'Duplicate Of Lead is required',
    );
    expect((await rowOf('crm_lead', lead.id)).duplicate_of_type ?? null).toBeNull();
  });

  it('refuses a write that STATES a type and blanks its lookup in one payload', async () => {
    // The retirement stands down whenever the write carries its own non-blank
    // discriminator: that is an author's claim, and swallowing it would be the
    // loosening wearing a different hat — the record would silently keep no
    // claim at all where the caller asked for one.
    const { lead } = await buildContactCase();

    expectValidationRefusal(
      await updateAndCatch('crm_lead', {
        id: lead.id, duplicate_of_type: 'crm_contact', duplicate_of_contact: null,
      }),
      'Duplicate Of Contact is required',
    );
    // Refused for real, not merely announced: the live claim is untouched.
    const row = await rowOf('crm_lead', lead.id);
    expect(row.duplicate_of_type).toBe('crm_contact');
    expect(row.duplicate_status).toBe('suspected');
  });

  it('leaves a live claim alone when a DIFFERENT contact is deleted', async () => {
    const { lead, contact } = await buildContactCase();
    const other = await buildContactCase();

    expect(await deleteAndCatch('crm_contact', other.contact.id)).toBeNull();

    const row = await rowOf('crm_lead', lead.id);
    expect(row.duplicate_of_type).toBe('crm_contact');
    expect(row.duplicate_of_contact).toBe(contact.id);
    expect(row.duplicate_status).toBe('suspected');
  });

  it('leaves a live claim alone across an unrelated edit', async () => {
    const { lead, contact } = await buildContactCase();

    expect(await updateAndCatch('crm_lead', { id: lead.id, status: 'contacted' })).toBeNull();

    const row = await rowOf('crm_lead', lead.id);
    expect(row.status).toBe('contacted');
    expect(row.duplicate_of_type).toBe('crm_contact');
    expect(row.duplicate_of_contact).toBe(contact.id);
    expect(row.duplicate_status).toBe('suspected');
  });

  it('leaves a live claim alone when the UNNAMED lookup is cleaned up', async () => {
    // A lead can carry both lookups; only the one the discriminator names is
    // part of the claim. Clearing the other must not retire anything — the
    // record still duplicates the contact it says it does.
    const { lead, contact } = await buildContactCase();
    const stray = await insert('crm_lead', {
      first_name: 'Str', last_name: 'Ay', company: 'Stray Inc', status: 'new',
      email: `stray.${uniq()}@dupe-cleanup.test`,
    });
    await ql.update('crm_lead', { id: lead.id, duplicate_of_lead: stray.id }, { context: SYS });

    expect(await deleteAndCatch('crm_lead', stray.id)).toBeNull();

    const row = await rowOf('crm_lead', lead.id);
    expect(row.duplicate_of_lead ?? null).toBeNull();
    expect(row.duplicate_of_type).toBe('crm_contact');
    expect(row.duplicate_of_contact).toBe(contact.id);
    expect(row.duplicate_status).toBe('suspected');
  });
});

// ─────────────────────────────── the second rule on the same path (#1164) ──

/**
 * A lead already DISQUALIFIED as a duplicate — the case this file previously
 * pinned as still refused, now cleared.
 *
 * `duplicate_disqualification_requires_survivor` is a second, independent rule:
 * closing a lead with `disqualification_reason: 'duplicate'` requires
 * `duplicate_of_type` AND `duplicate_status: 'confirmed'` (#598). Note what it
 * does NOT reference — the lookup. So the two rules deadlocked: the pointer was
 * erased, the pairing demanded it back, #1072's cleanup dropped the type to
 * satisfy the pairing, and dropping the type tripped this rule. Satisfying
 * either broke the other, and the delete rolled back with a different sentence.
 *
 * The fix breaks the deadlock at the pairing, not at the verdict: on a lead
 * closed as a duplicate the claim STANDS (`duplicate_of_type` +
 * `duplicate_status`), and `requiredWhen` stands down for it. The residue reads
 * "confirmed duplicate of a contact" with the pointer gone — which is what an
 * erasure leaves behind. Nothing is rewritten, no field or option value is
 * invented, and `duplicate_disqualification_requires_survivor` is untouched.
 *
 * The price is stated in the next describe block, and it is the whole reason
 * this fix is not a loosening: with the pairing down, only a HOOK can still
 * tell "the pointer was erased" from "this claim never named anyone" — the two
 * are the same record — so `lead_duplicate_check` job 1d does, and #598's
 * invariant is enforced there instead. Both directions are pinned.
 */
describe('a lead already disqualified as a duplicate', () => {
  /** A disqualified-as-duplicate lead over a real contact — the erasure case. */
  const buildDisqualifiedCase = async (): Promise<AnyRec> => {
    const built = await buildContactCase();
    await ql.update('crm_lead', {
      id: built.lead.id, duplicate_status: 'confirmed', status: 'unqualified',
      disqualification_reason: 'duplicate',
    }, { context: SYS });
    return built;
  };

  it('deletes the contact it was disqualified against, and keeps the verdict', async () => {
    const { contact, lead } = await buildDisqualifiedCase();

    expect(await deleteAndCatch('crm_contact', contact.id)).toBeNull();
    expect(await rowsOf('crm_contact', contact.id)).toHaveLength(0);

    const row = await rowOf('crm_lead', lead.id);
    // The pointer is gone — that is the erasure.
    expect(row.duplicate_of_contact ?? null).toBeNull();
    // The verdict is NOT: the lead still says it was closed as a confirmed
    // duplicate of a contact. Rewriting that would be option 2 of the card.
    expect(row.status).toBe('unqualified');
    expect(row.disqualification_reason).toBe('duplicate');
    expect(row.duplicate_of_type).toBe('crm_contact');
    expect(row.duplicate_status).toBe('confirmed');
  });

  it('then deletes the account above that contact', async () => {
    const { account, contact } = await buildDisqualifiedCase();

    expect(await deleteAndCatch('crm_contact', contact.id)).toBeNull();
    expect(await deleteAndCatch('crm_account', account.id)).toBeNull();
    expect(await rowsOf('crm_account', account.id)).toHaveLength(0);
  });

  it('deletes the account directly, cascading through the contact', async () => {
    // The second half of the reported repro, and the path an erasure request
    // actually takes: one DELETE on the account, cascading (master-detail) to
    // the contact and through to the lead's claim.
    const { account, contact, lead } = await buildDisqualifiedCase();

    expect(await deleteAndCatch('crm_account', account.id)).toBeNull();
    expect(await rowsOf('crm_account', account.id)).toHaveLength(0);
    expect(await rowsOf('crm_contact', contact.id)).toHaveLength(0);

    const row = await rowOf('crm_lead', lead.id);
    expect(row.duplicate_of_contact ?? null).toBeNull();
    expect(row.duplicate_of_type).toBe('crm_contact');
    expect(row.duplicate_status).toBe('confirmed');
  });

  it('deletes the survivor in the lead↔lead case too', async () => {
    const n = uniq();
    const survivor = await insert('crm_lead', {
      first_name: 'Sid', last_name: 'Same', company: 'Same Inc', status: 'new',
      lead_source: 'web', email: `sid.${n}@dupe-cleanup.test`,
    });
    const dupe = await insert('crm_lead', {
      first_name: 'Sid', last_name: 'Same', company: 'Same Inc', status: 'new',
      lead_source: 'web', email: `sid.${n}@dupe-cleanup.test`,
    });
    expect((await rowOf('crm_lead', dupe.id)).duplicate_of_lead).toBe(survivor.id);
    await ql.update('crm_lead', {
      id: dupe.id, duplicate_status: 'confirmed', status: 'unqualified',
      disqualification_reason: 'duplicate',
    }, { context: SYS });

    expect(await deleteAndCatch('crm_lead', survivor.id)).toBeNull();
    expect(await rowsOf('crm_lead', survivor.id)).toHaveLength(0);

    const row = await rowOf('crm_lead', dupe.id);
    expect(row.duplicate_of_lead ?? null).toBeNull();
    expect(row.duplicate_of_type).toBe('crm_lead');
    expect(row.duplicate_status).toBe('confirmed');
  });

  it('leaves the lead editable afterwards — the residue is not a dead end', async () => {
    // The failure mode a narrower fix produces: a row that satisfies nothing it
    // is checked against, so every later save is refused for a pointer nobody
    // can restore. An ordinary edit must simply work.
    const { contact, lead } = await buildDisqualifiedCase();
    expect(await deleteAndCatch('crm_contact', contact.id)).toBeNull();

    expect(await updateAndCatch('crm_lead', { id: lead.id, description: 'erased' })).toBeNull();
    expect((await rowOf('crm_lead', lead.id)).description).toBe('erased');
  });

  it('lets the claim be re-pointed at a surviving record', async () => {
    const { contact, lead } = await buildDisqualifiedCase();
    expect(await deleteAndCatch('crm_contact', contact.id)).toBeNull();
    const replacement = await buildContactCase();

    expect(await updateAndCatch('crm_lead', {
      id: lead.id, duplicate_of_type: 'crm_contact', duplicate_of_contact: replacement.contact.id,
    })).toBeNull();
    expect((await rowOf('crm_lead', lead.id)).duplicate_of_contact).toBe(replacement.contact.id);
  });

  it('retires the stale type when the lead stops being a duplicate', async () => {
    // The carve-out lapses with the verdict. Re-opening the lead hands the pair
    // back to `requiredWhen`, so the type standing over an erased pointer has to
    // go with the verdict — otherwise this write would be refused for a pointer
    // that cannot be restored, which is the original bug in a new place.
    const { contact, lead } = await buildDisqualifiedCase();
    expect(await deleteAndCatch('crm_contact', contact.id)).toBeNull();

    expect(await updateAndCatch('crm_lead', {
      id: lead.id, status: 'new', disqualification_reason: 'other',
    })).toBeNull();

    const row = await rowOf('crm_lead', lead.id);
    expect(row.status).toBe('new');
    expect(row.duplicate_of_type ?? null).toBeNull();
    expect(row.duplicate_status ?? null).toBeNull();
  });
});

// ──────────────────── a duplicate disqualification still names somebody (#598) ──

/**
 * The other direction, and the reason the change above is not the loosening
 * #1072 refused. With the pairing standing down for a disqualified lead, the
 * ONLY thing left between this repo and "a lead may be closed as a duplicate of
 * nobody" is `lead_duplicate_check` job 1d. Every route to that state is pinned
 * shut here.
 *
 * The refusal arrives as `duplicate_disqualification_requires_survivor` — the
 * #598 rule itself, with its own wording and envelope — because the hook clears
 * the unbacked discriminator rather than inventing a second sentence.
 */
describe('a duplicate disqualification still has to name a record', () => {
  it('refuses an INSERT that closes a lead as a duplicate of nobody', async () => {
    const err = await ql
      .insert('crm_lead', {
        first_name: 'Ida', last_name: 'None', company: 'None Inc',
        status: 'unqualified', disqualification_reason: 'duplicate',
        email: `ida.${uniq()}@dupe-cleanup.test`,
        duplicate_of_type: 'crm_contact', duplicate_status: 'confirmed',
      }, { context: userCtx })
      .then(() => null, (e: Error) => e);

    expectValidationRefusal(err, 'Disqualifying a lead as Duplicate requires naming the surviving record');
  });

  it('refuses an UPDATE that closes a lead as a duplicate of nobody', async () => {
    const lead = await insert('crm_lead', {
      first_name: 'Uma', last_name: 'None', company: 'None Inc', status: 'new',
      email: `uma.${uniq()}@dupe-cleanup.test`,
    });

    expectValidationRefusal(
      await updateAndCatch('crm_lead', {
        id: lead.id, status: 'unqualified', disqualification_reason: 'duplicate',
        duplicate_of_type: 'crm_lead', duplicate_status: 'confirmed',
      }),
      'Disqualifying a lead as Duplicate requires naming the surviving record',
    );
    expect((await rowOf('crm_lead', lead.id)).status).toBe('new');
  });

  it('refuses re-pointing an erased claim at a kind without naming the record', async () => {
    // The residue is not a licence to restate the claim emptily: a write that
    // says "actually, a lead" and names none is an assertion, not an erasure.
    const { contact, lead } = await buildContactCase();
    await ql.update('crm_lead', {
      id: lead.id, duplicate_status: 'confirmed', status: 'unqualified',
      disqualification_reason: 'duplicate',
    }, { context: SYS });
    expect(await deleteAndCatch('crm_contact', contact.id)).toBeNull();

    expectValidationRefusal(
      await updateAndCatch('crm_lead', { id: lead.id, duplicate_of_type: 'crm_lead' }),
      'Disqualifying a lead as Duplicate requires naming the surviving record',
    );
    // Refused for real: the erased-but-recorded verdict is untouched.
    const row = await rowOf('crm_lead', lead.id);
    expect(row.duplicate_of_type).toBe('crm_contact');
    expect(row.duplicate_status).toBe('confirmed');
  });

  it('still refuses a duplicate disqualification that names no kind at all', async () => {
    // #598's original complaint, unchanged and untouched by this card: the rule
    // itself was not relaxed.
    const lead = await insert('crm_lead', {
      first_name: 'Ora', last_name: 'None', company: 'None Inc', status: 'new',
      email: `ora.${uniq()}@dupe-cleanup.test`,
    });

    expectValidationRefusal(
      await updateAndCatch('crm_lead', {
        id: lead.id, status: 'unqualified', disqualification_reason: 'duplicate',
      }),
      'Disqualifying a lead as Duplicate requires naming the surviving record',
    );
  });

  it('keeps the pairing itself intact for every lead that is NOT disqualified', async () => {
    // The carve-out is keyed on `disqualification_reason == "duplicate"` and on
    // nothing else. An open lead — the state the intake dedupe produces, and the
    // bulk of the rows — is refused by `requiredWhen` exactly as before.
    const lead = await insert('crm_lead', {
      first_name: 'Pia', last_name: 'Open', company: 'Open Inc', status: 'new',
      email: `pia.${uniq()}@dupe-cleanup.test`,
    });

    expectValidationRefusal(
      await updateAndCatch('crm_lead', { id: lead.id, duplicate_of_type: 'crm_contact' }),
      'Duplicate Of Contact is required',
    );
    // …and a lead disqualified for some OTHER reason is not carved out either.
    expectValidationRefusal(
      await updateAndCatch('crm_lead', {
        id: lead.id, status: 'unqualified', disqualification_reason: 'not_a_fit',
        duplicate_of_type: 'crm_contact',
      }),
      'Duplicate Of Contact is required',
    );
  });
});
