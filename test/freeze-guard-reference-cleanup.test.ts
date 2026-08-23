// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ObjectKernel } from '@objectstack/core';
import { DefaultDatasourcePlugin, AppPlugin } from '@objectstack/runtime';
import { ObjectQLPlugin } from '@objectstack/objectql';
import { MetadataPlugin } from '@objectstack/metadata';
import stack from '../objectstack.config';
import leadHooks from '../src/objects/lead.hook';
import { REFUSAL_CODES } from '../src/objects/_refusal';
import oppHooks from '../src/objects/opportunity.hook';
import quoteHooks from '../src/objects/quote.hook';
import { hookNamed, makeCtx, makeHarness, type Rec } from './helpers/hook-harness';
import { extractSandboxBody } from './helpers/action-sandbox';

/**
 * A frozen record must not make the people it references undeletable (#720).
 *
 * ### The defect
 *
 * The engine implements `deleteBehavior: 'set_null'` by UPDATING the row that
 * HOLDS the lookup. So "delete the contact" reaches the holder's `beforeUpdate`
 * as `{ <link>: null }` — and this app's three freeze/lock guards
 * (`lead_automation`, `opportunity_lifecycle`, `quote_workflow`) refused it,
 * because they are written to stop USER edits to settled records and a cascade
 * looks exactly like one. The consequence was not a wording problem:
 *
 *   - a contact whose only referent was a CLOSED opportunity could never be
 *     deleted, and `crm_contact.crm_account` is a master-detail with
 *     `deleteBehavior: 'cascade'`, so that contact's ACCOUNT could not be
 *     deleted either — a GDPR erasure request with no way to carry it out;
 *   - the two escapes on offer were destroying sales history (delete the
 *     closed deal) or asking an admin for a system write.
 *
 * Maintainer's ruling of 2026-08-11 on #720 is Option A: the guards yield to
 * the engine's reference-cleanup write shape, and the yield must be narrow.
 *
 * ### The measurement the yield rests on
 *
 * Taken on `@objectstack/*` 17.0.0-rc.6 (the issue was filed against rc.2), by
 * instrumenting each of the three handlers on the real kernel below:
 *
 *     input   = { id, <link>: null, updated_at, updated_by }
 *     user    = { id: <the caller> }            ← the CALLER, not a system id
 *     session = { userId: <the caller>, isSystem: true }
 *     provenance = undefined
 *
 * All three objects produce that same shape, which is why one predicate serves
 * all three and no per-object differentiation was needed.
 *
 * A marker DOES exist, and it is deliberately out of reach: the engine tags its
 * own cleanup write with `__referentialFieldClear: true` on the internal
 * operation context (`ObjectQL.cascadeDeleteRelations`), but `buildSession`
 * copies a fixed allow-list of keys into `ctx.session` and the `__`-prefixed
 * operation-private keys are not among them (that stripping is a rule, not an
 * oversight — see the `__` convention note in `@objectstack/core`). Preferring a
 * first-class marker over shape-sniffing was the instruction; the marker is not
 * offered to hooks, so the WRITE SHAPE is the only evidence there is. If a
 * future platform release surfaces one, the drift pin at the bottom of this
 * file is where to start, and switching to it is strictly better.
 *
 * ### Why the narrowness is pinned in both directions
 *
 * The yield is not "tolerate null". A write passes only when EVERY one of its
 * non-system changes is a declared link going from a value to `null`. One
 * business field alongside the null, or a link repointed to a new value, and
 * the freeze refuses exactly as before. Both directions are asserted here,
 * because a suite that goes green by dropping the refusals would look identical
 * to one that goes green by fixing the bug.
 *
 * ### On the refusal envelope
 *
 * This block used to record the opposite of what it records now, and the change
 * is the point. Measured on rc.6, every refusal these guards raised reached the
 * caller as a bare `Error` with `code` and `status` both `undefined`; the
 * envelope was pinned as the absent thing it measurably was, and the pin was
 * declared a tripwire rather than an endorsement. #1075 landed the envelope, so
 * the tripwire fired and this is its strengthened form: the same wording pins
 * (PR #719 wrote that contract and it is unchanged) PLUS the `code`/`status`
 * these guards now carry. All three freeze guards refuse with the same class —
 * the record's own state froze the field the write touched — so all three
 * assert `RECORD_LOCKED` / 409 from `REFUSAL_CODES.locked`.
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

const rowsOf = (object: string, id: string): Promise<AnyRec[]> =>
  ql.find(object, { where: { id } }, { context: SYS });

const rowOf = async (object: string, id: string): Promise<AnyRec> => {
  const [row] = await rowsOf(object, id);
  expect(row, `${object}/${id} is gone`).toBeTruthy();
  return row;
};

/** A unique suffix per fixture — `crm_contact.email` is globally unique. */
let seq = 0;
const uniq = (): string => `${++seq}`;

beforeAll(async () => {
  kernel = new ObjectKernel({ logger: { level: 'silent' } } as never);
  await kernel.use(new DefaultDatasourcePlugin({ driver: 'memory', config: {} } as never));
  await kernel.use(new MetadataPlugin({ watch: false, artifactWatch: false, environmentId: 'proj_720' } as never));
  await kernel.use(new ObjectQLPlugin({ environmentId: 'proj_720' } as never));
  // The app's own metadata is the subject — objects and hooks exactly as
  // `objectstack.config.ts` declares them (the rig `cascade-guard-messages`
  // uses, which is the rig #720 was measured with).
  await kernel.use(new AppPlugin(stack as never, undefined as never, { skipSeedData: true } as never));
  await kernel.bootstrap();
  ql = kernel.getService('objectql');

  const user = await insert('sys_user', { name: 'Erasure Rep', email: 'rep@freeze-cleanup.test' });
  userCtx = { userId: user.id, isSystem: true } as AnyRec;
}, 180_000);

afterAll(async () => {
  await kernel?.shutdown?.();
});

// ───────────────────────────────────────── the reported repro, end to end ──

/**
 * #720's own repro, both halves of it. A unit test of the predicate cannot show
 * this: only the engine decides which guard the cascade reaches, and the value
 * of the change is that these two DELETEs complete.
 */
describe('deleting a contact a CLOSED opportunity points at', () => {
  /** Account A with contact C, plus a closed-won deal elsewhere that points at C. */
  const build = async (stage: 'closed_won' | 'closed_lost' = 'closed_won') => {
    const n = uniq();
    const account = await insert('crm_account', {
      name: `Erasure Corp ${n}`, type: 'customer', industry: 'technology',
    });
    const contact = await insert('crm_contact', {
      first_name: 'Ada', last_name: 'Lovelace',
      crm_account: account.id, email: `ada.${n}@freeze-cleanup.test`,
    });
    // The deal sits on ANOTHER account so the account delete is not refused by
    // `account_protection` first; it is CLOSED so `contact_integrity` (which
    // counts OPEN work) does not answer either, and the contact's fate is
    // decided by the opportunity's freeze — the reported case exactly.
    const elsewhere = await insert('crm_account', {
      name: `Elsewhere ${n}`, type: 'customer', industry: 'technology',
    });
    const opportunity = await insert('crm_opportunity', {
      name: `Closed Deal ${n}`, crm_account: elsewhere.id, primary_contact: contact.id,
      stage, ...(stage === 'closed_won' ? { win_reason: 'better_price' } : { loss_reason: 'price' }),
      amount: 25_000, close_date: '2026-01-01',
    });
    return { account, contact, opportunity };
  };

  it('deletes the contact, and clears the frozen deal’s link instead of refusing', async () => {
    const { contact, opportunity } = await build();

    expect(await deleteAndCatch('crm_contact', contact.id)).toBeNull();
    expect(await rowsOf('crm_contact', contact.id)).toHaveLength(0);

    // The deal itself survives, still closed, with only the link gone — the
    // history change the ruling accepted, and nothing more.
    const opp = await rowOf('crm_opportunity', opportunity.id);
    expect(opp.primary_contact ?? null).toBeNull();
    expect(opp.stage).toBe('closed_won');
    expect(opp.amount).toBe(25_000);
    expect(opp.win_reason).toBe('better_price');
    expect(opp.name).toBe(`Closed Deal ${opportunity.name.split(' ').pop()}`);
  });

  it('then deletes the account the contact belonged to (the second half of the repro)', async () => {
    const { account, contact } = await build();
    expect(await deleteAndCatch('crm_contact', contact.id)).toBeNull();
    expect(await deleteAndCatch('crm_account', account.id)).toBeNull();
    expect(await rowsOf('crm_account', account.id)).toHaveLength(0);
  });

  it('deletes the account directly, cascading through the contact', async () => {
    // The path a caller actually takes: `DELETE crm_account/{A}` cascades to
    // its contacts (master-detail), and each of those runs the cleanup that
    // used to be refused. One call, the whole chain.
    const { account, contact, opportunity } = await build('closed_lost');

    expect(await deleteAndCatch('crm_account', account.id)).toBeNull();
    expect(await rowsOf('crm_account', account.id)).toHaveLength(0);
    expect(await rowsOf('crm_contact', contact.id)).toHaveLength(0);

    const opp = await rowOf('crm_opportunity', opportunity.id);
    expect(opp.primary_contact ?? null).toBeNull();
    expect(opp.stage).toBe('closed_lost');
  });

  it('deletes a campaign a closed opportunity was attributed to', async () => {
    const n = uniq();
    const account = await insert('crm_account', {
      name: `Campaigned Corp ${n}`, type: 'customer', industry: 'technology',
    });
    const campaign = await insert('crm_campaign', {
      name: `Spring Push ${n}`, type: 'email', status: 'completed',
      start_date: '2026-01-01', end_date: '2026-02-01',
    });
    const opportunity = await insert('crm_opportunity', {
      name: `Attributed Deal ${n}`, crm_account: account.id, crm_campaign: campaign.id,
      stage: 'closed_won', win_reason: 'better_price', amount: 1000, close_date: '2026-01-01',
    });

    expect(await deleteAndCatch('crm_campaign', campaign.id)).toBeNull();
    expect((await rowOf('crm_opportunity', opportunity.id)).crm_campaign ?? null).toBeNull();
  });
});

describe('deleting an opportunity an ACCEPTED quote points at', () => {
  it('deletes the deal, and leaves the settled quote settled', async () => {
    const n = uniq();
    const account = await insert('crm_account', {
      name: `Quoted Corp ${n}`, type: 'customer', industry: 'technology',
    });
    const opportunity = await insert('crm_opportunity', {
      name: `Quoted Deal ${n}`, crm_account: account.id,
      stage: 'negotiation', amount: 1000, close_date: '2026-12-01',
    });
    // Since #1017 a quote cannot reach `accepted` without a recipient, so the
    // contact is load-bearing fixture, not decoration.
    const contact = await insert('crm_contact', {
      first_name: 'Quinn', last_name: 'Reyes', crm_account: account.id,
      email: `quinn.${n}@freeze-cleanup.test`,
    });
    const quote = await insert('crm_quote', {
      name: `Q-${n}`, crm_account: account.id, crm_opportunity: opportunity.id,
      crm_contact: contact.id, status: 'draft',
      quote_date: '2026-01-01', expiration_date: '2026-02-01',
    });
    await ql.update('crm_quote', { id: quote.id, status: 'accepted' }, { context: SYS });

    expect(await deleteAndCatch('crm_opportunity', opportunity.id)).toBeNull();
    expect(await rowsOf('crm_opportunity', opportunity.id)).toHaveLength(0);

    const row = await rowOf('crm_quote', quote.id);
    expect(row.crm_opportunity ?? null).toBeNull();
    expect(row.status).toBe('accepted');
    expect(row.crm_contact).toBe(contact.id);
  });
});

describe('deleting a record a CONVERTED lead points at', () => {
  const build = async () => {
    const n = uniq();
    const account = await insert('crm_account', {
      name: `Globex ${n}`, type: 'customer', industry: 'technology',
    });
    const contact = await insert('crm_contact', {
      first_name: 'Bo', last_name: 'Chen', crm_account: account.id,
      email: `bo.${n}@freeze-cleanup.test`,
    });
    const opportunity = await insert('crm_opportunity', {
      name: `Globex New Business ${n}`, crm_account: account.id, primary_contact: contact.id,
      stage: 'negotiation', amount: 5000, close_date: '2026-12-01',
    });
    // NB: the lead's email deliberately does NOT match the contact's. An
    // intake match makes `lead_duplicate_check` stamp `duplicate_of_type` +
    // `duplicate_of_contact`, and that pairing has its own delete-blocking
    // defect, which is neither this fix's nor masked by it — see the boundary
    // test at the end of this describe.
    const lead = await insert('crm_lead', {
      first_name: 'Bo', last_name: 'Chen', company: 'Globex', status: 'new',
      lead_source: 'web', email: `bo.lead.${n}@freeze-cleanup.test`,
    });
    // The conversion is a SYSTEM write (the flow's), which the lock always let
    // through — it is user edits it refuses.
    await ql.update('crm_lead', {
      id: lead.id, is_converted: true, status: 'converted',
      converted_account: account.id, converted_contact: contact.id,
      converted_opportunity: opportunity.id, converted_date: '2026-02-01',
    }, { context: SYS });
    return { lead, account, contact, opportunity };
  };

  it('deletes the converted opportunity, and the lead stays converted and locked', async () => {
    const { lead, opportunity } = await build();

    expect(await deleteAndCatch('crm_opportunity', opportunity.id)).toBeNull();
    expect(await rowsOf('crm_opportunity', opportunity.id)).toHaveLength(0);

    const row = await rowOf('crm_lead', lead.id);
    expect(row.converted_opportunity ?? null).toBeNull();
    // Only the one link moved: the conversion itself is still recorded.
    expect(row.is_converted).toBe(true);
    expect(row.status).toBe('converted');
    expect(row.converted_account).toBeTruthy();
    expect(row.converted_contact).toBeTruthy();
  });

  it('tears the whole conversion down, and the lead keeps saying it converted', async () => {
    const { lead, account, contact, opportunity } = await build();

    // `account_protection` counts OPEN opportunities, so the deal goes first —
    // its own guard, unrelated to this fix and deliberately left alone.
    expect(await deleteAndCatch('crm_opportunity', opportunity.id)).toBeNull();
    expect(await deleteAndCatch('crm_account', account.id)).toBeNull();
    expect(await rowsOf('crm_account', account.id)).toHaveLength(0);
    expect(await rowsOf('crm_contact', contact.id)).toHaveLength(0);

    const row = await rowOf('crm_lead', lead.id);
    expect(row.converted_account ?? null).toBeNull();
    expect(row.converted_contact ?? null).toBeNull();
    expect(row.converted_opportunity ?? null).toBeNull();
    expect(row.is_converted).toBe(true);
    expect(row.status).toBe('converted');
  });

  /**
   * The boundary of this fix, pinned so nobody reads it as wider than it is.
   *
   * `lead_duplicate_check` stamps `duplicate_of_type: 'crm_contact'` +
   * `duplicate_of_contact` on any new lead whose email matches an existing
   * contact — and `duplicate_of_contact` carries
   * `requiredWhen has(record.duplicate_of_type) && … == "crm_contact"`. So the
   * engine's cleanup nulled the lookup while the discriminator stayed behind,
   * and the record's own rule refused the write. That is the #696 / #711
   * construction (a `set_null` clear that violates the holder's own rule), NOT
   * the freeze-guard construction this card fixes, and it was fully independent
   * of it: an OPEN, unconverted lead blocked the same delete the same way, on a
   * path where no freeze guard runs at all.
   *
   * What this test pins forever is that none of the three freeze guards is the
   * one answering. The `Duplicate Of Contact is required` line WAS today's
   * truth and was expected to flip to a clean delete when that finding landed;
   * it landed as #1072, so the assertion is flipped — `lead_duplicate_check`
   * now retires `duplicate_of_type` + `duplicate_status` with the link. The
   * fix's own coverage lives in `test/lead-duplicate-link-cleanup.test.ts`;
   * what remains asserted HERE is only the part this file is responsible for —
   * that no freeze guard speaks for that path.
   */
  it('leaves the duplicate-pairing blocker to its own fix, and stops answering for it', async () => {
    const n = uniq();
    const account = await insert('crm_account', {
      name: `Dupe Corp ${n}`, type: 'customer', industry: 'technology',
    });
    const contact = await insert('crm_contact', {
      first_name: 'Dee', last_name: 'Dupe', crm_account: account.id,
      email: `dee.${n}@freeze-cleanup.test`,
    });
    // Same email ⇒ the intake dedupe flags the lead against this contact.
    const lead = await insert('crm_lead', {
      first_name: 'Dee', last_name: 'Dupe', company: 'Dupe Inc', status: 'new',
      lead_source: 'web', email: `dee.${n}@freeze-cleanup.test`,
    });
    const flagged = await rowOf('crm_lead', lead.id);
    expect(flagged.duplicate_of_type, 'the intake dedupe did not flag this lead').toBe('crm_contact');
    expect(flagged.duplicate_of_contact).toBe(contact.id);

    const message = await deleteAndCatch('crm_contact', contact.id);

    // Not one of this card's guards — whatever else happens.
    expect(message ?? '').not.toContain('is locked');
    expect(message ?? '').not.toContain('and frozen');
    expect(message ?? '').not.toContain('Cannot edit converted lead');
    // Since #1072 the pairing no longer refuses either: the delete completes,
    // and the lead stops claiming to duplicate anything.
    expect(message).toBeNull();
    expect(await rowsOf('crm_contact', contact.id)).toHaveLength(0);
    const cleared = await rowOf('crm_lead', lead.id);
    expect(cleared.duplicate_of_type ?? null).toBeNull();
    expect(cleared.duplicate_of_contact ?? null).toBeNull();
  });
});

// ─────────────────────────── the guarded surface has NOT shrunk, end to end ──

/**
 * The other direction, through the same kernel: what the freeze exists for is
 * still refused, with the sentence PR #719 wrote, unchanged.
 */
describe('an ordinary user edit to a settled record is still refused', () => {
  it('refuses a business-field edit on a closed opportunity', async () => {
    const n = uniq();
    const account = await insert('crm_account', {
      name: `Settled Corp ${n}`, type: 'customer', industry: 'technology',
    });
    const opportunity = await insert('crm_opportunity', {
      name: `Settled Deal ${n}`, crm_account: account.id,
      stage: 'closed_won', win_reason: 'better_price', amount: 1000, close_date: '2026-01-01',
    });

    const err = await ql
      .update('crm_opportunity', { id: opportunity.id, amount: 5 }, { context: userCtx })
      .then(() => null, (e: Error) => e);

    expect(err, 'a user edit to a frozen deal must still be refused').toBeInstanceOf(Error);
    // `crm_opportunity.nameField` is `name`, so the name alone titles the
    // record everywhere; the id used to be appended and matched nothing (#1243).
    expect(err!.message).toContain(`Opportunity Settled Deal ${n} is closed (closed_won)`);
    expect(err!.message).not.toContain(opportunity.id);
    expect(err!.message).toContain('only description, next_step, notes may be edited');
    expect(err!.message).toContain('Attempted: amount');
    // Refused for real, not merely announced.
    expect((await rowOf('crm_opportunity', opportunity.id)).amount).toBe(1000);
  });

  it('refuses a hand edit that repoints a frozen quote’s link to another record', async () => {
    const n = uniq();
    const account = await insert('crm_account', {
      name: `Repoint Corp ${n}`, type: 'customer', industry: 'technology',
    });
    const contact = await insert('crm_contact', {
      first_name: 'Rae', last_name: 'Point', crm_account: account.id,
      email: `rae.${n}@freeze-cleanup.test`,
    });
    const other = await insert('crm_opportunity', {
      name: `Other Deal ${n}`, crm_account: account.id,
      stage: 'negotiation', amount: 1, close_date: '2026-12-01',
    });
    const quote = await insert('crm_quote', {
      name: `QR-${n}`, crm_account: account.id, crm_contact: contact.id,
      status: 'draft', quote_date: '2026-01-01', expiration_date: '2026-02-01',
    });
    await ql.update('crm_quote', { id: quote.id, status: 'accepted' }, { context: SYS });

    const err = await ql
      .update('crm_quote', { id: quote.id, crm_opportunity: other.id }, { context: userCtx })
      .then(() => null, (e: Error) => e);

    expect(err, 'repointing a link is an edit, not a cleanup').toBeInstanceOf(Error);
    // `crm_quote.display_title` is `quote_number - name`, and this runs against
    // a real engine, so the number is the one the autonumber sequence issued
    // (#1243). Matching it loosely keeps the assertion about the SHAPE rather
    // than about which position this quote took in the sequence.
    expect(err!.message).toMatch(new RegExp(`Quote QTE-\\d+ - QR-${n} is accepted`));
    expect(err!.message).not.toContain(quote.id);
    expect(err!.message).toContain('only internal_notes may be edited');
    expect(err!.message).toContain('Attempted: crm_opportunity');
  });
});

// ─────────────────────────────────── the predicate, both directions, by unit ──

/**
 * The same narrowness at handler level, where every neighbouring shape can be
 * enumerated cheaply. `expectRefusal` carries the envelope floor: the message
 * wording (the contract PR #719 wrote) plus the `code`/`status` this app's hook
 * refusals measurably carry — see the note in the file header.
 */
const expectRefusal = (err: unknown, wording: RegExp): void => {
  expect(err, `expected a refusal matching ${wording}`).toBeInstanceOf(Error);
  const e = err as AnyRec;
  expect(e.message).toMatch(wording);
  // The envelope, asserted as a PAIR on purpose. A `code` without a `status` is
  // not half a fix: `resolveThrownHttpError` reads `status` first, and a code
  // alone falls through to 500 / INTERNAL_ERROR — a deliberate refusal filed as
  // a server fault. Reading them together is what makes that failure visible.
  expect([e.code, e.status]).toEqual([REFUSAL_CODES.locked.code, REFUSAL_CODES.locked.status]);
};

const runGuard = (hook: AnyRec, input: Rec, previous: Rec): Promise<unknown> =>
  hook.handler(
    makeCtx({
      event: 'beforeUpdate',
      input,
      previous,
      user: { id: 'usr_1' },
      api: makeHarness().api,
    }),
  );

const refusalOf = (hook: AnyRec, input: Rec, previous: Rec): Promise<unknown> =>
  runGuard(hook, input, previous).then(() => null, (e: Error) => e);

interface GuardCase {
  label: string;
  hook: AnyRec;
  /** A settled record of this object, as `previous`. */
  previous: Rec;
  /** A declared link on it, and a second value to repoint it to. */
  link: string;
  other: string;
  /** A business field the freeze protects, and a value that changes it. */
  businessField: string;
  businessValue: unknown;
  /** The refusal the guard raises for a genuine edit. */
  refusal: RegExp;
}

const GUARDS: GuardCase[] = [
  {
    label: 'opportunity_lifecycle',
    hook: hookNamed(oppHooks, 'opportunity_lifecycle'),
    previous: { id: 'o1', name: 'Acme Renewal', stage: 'closed_won', primary_contact: 'c1', amount: 10 },
    link: 'primary_contact',
    other: 'c2',
    businessField: 'amount',
    businessValue: 1,
    refusal: /Opportunity Acme Renewal is closed \(closed_won\); only .* may be edited/,
  },
  {
    label: 'quote_workflow',
    hook: hookNamed(quoteHooks, 'quote_workflow'),
    previous: { id: 'q1', name: 'Q-1001', status: 'accepted', crm_opportunity: 'o1', total_price: 100 },
    link: 'crm_opportunity',
    other: 'o2',
    businessField: 'total_price',
    businessValue: 1,
    refusal: /Quote Q-1001 is accepted; only internal_notes may be edited/,
  },
  {
    label: 'lead_automation',
    hook: hookNamed(leadHooks, 'lead_automation'),
    previous: {
      id: 'lead_1', is_converted: true, status: 'converted', company: 'Acme',
      first_name: 'Ada', last_name: 'Lovelace', converted_opportunity: 'opp_1', rating: 1,
    },
    link: 'converted_opportunity',
    other: 'opp_2',
    businessField: 'company',
    businessValue: 'Globex',
    refusal: /Cannot edit converted lead Ada Lovelace - Acme/,
  },
];

describe.each(GUARDS)('$label yields to the cleanup shape and nothing else', (guard) => {
  const { hook, previous, link, other, businessField, businessValue, refusal } = guard;

  it('lets a lone link clear through', async () => {
    await expect(runGuard(hook, { id: previous.id, [link]: null }, previous)).resolves.toBeUndefined();
  });

  it('lets a clear carrying the engine’s audit columns through', async () => {
    // The payload measured on rc.6 — the audit hook stamps these before the
    // freeze runs, and they must not count as an edit.
    await expect(
      runGuard(
        hook,
        { id: previous.id, [link]: null, updated_at: '2026-08-11T00:00:00.000Z', updated_by: 'usr_1' },
        previous,
      ),
    ).resolves.toBeUndefined();
  });

  it('still refuses the same clear when a business field rides along', async () => {
    const err = await refusalOf(
      hook,
      { id: previous.id, [link]: null, [businessField]: businessValue },
      previous,
    );
    expectRefusal(err, refusal);
    expect((err as Error).message).toContain(businessField);
  });

  it('still refuses a link repointed to another record', async () => {
    expectRefusal(await refusalOf(hook, { id: previous.id, [link]: other }, previous), refusal);
  });

  it('still refuses a plain business-field edit', async () => {
    expectRefusal(await refusalOf(hook, { id: previous.id, [businessField]: businessValue }, previous), refusal);
  });

  it('does not yield for a null on a field that is not a declared link', async () => {
    // "Everything in this write is null" is NOT the shape — the shape is
    // "everything in this write is a declared LINK going value→null".
    expectRefusal(
      await refusalOf(hook, { id: previous.id, [businessField]: null }, previous),
      refusal,
    );
  });

  it('does not yield when the link was already empty', async () => {
    // Nothing to clean up: the engine only clears links that point somewhere,
    // so a null over an absent value is a hand edit that invented one.
    const { [link]: _dropped, ...withoutLink } = previous;
    expectRefusal(await refusalOf(hook, { id: previous.id, [link]: null }, withoutLink), refusal);
  });
});

// ──────────────────────────────────────────────── one predicate, three copies ──

/**
 * The three guards carry the SAME predicate, verbatim, and it has to be that
 * way: a hook body runs body-only inside QuickJS (see
 * `test/action-sandbox.test.ts`), so it cannot call an imported helper — a
 * shared module-scope predicate would be `undefined` at runtime in the shipped
 * artifact. Sharing by copy is only as good as a guard against drift, so this
 * pins the copies against each other, the same way the actions' shared
 * `actor_name` block is pinned.
 */
describe('the reference-cleanup predicate is one block in three places', () => {
  const CANONICAL = [
    'const isReferenceCleanup = violating.every((k) => REFERENCE_FIELDS.has(k) && input[k] === null && previous?.[k] != null);',
    'if (isReferenceCleanup) return;',
  ].join(' ');

  /** A body with comments stripped and whitespace flattened. */
  const normalise = (source: string): string =>
    source
      .split('\n')
      .filter((line) => !line.trim().startsWith('//'))
      .join('\n')
      .replace(/\s+/g, ' ');

  const bodyOf = (hook: AnyRec): string =>
    normalise(extractSandboxBody(hook.handler, `hook '${hook.name}'`).source);

  it.each(GUARDS.map((g) => g.label))('%s carries the canonical predicate', (label) => {
    const guard = GUARDS.find((g) => g.label === label)!;
    expect(
      bodyOf(guard.hook),
      `${label} no longer carries the shared #720 predicate verbatim — a second ` +
        'spelling of "is this write a reference cleanup?" is a second thing to get wrong',
    ).toContain(CANONICAL);
  });

  it('is the only spelling anywhere in the app’s hooks', async () => {
    const { allHooks } = (await import('../src/hooks')) as AnyRec;
    const divergent = (allHooks as AnyRec[])
      .filter((h) => {
        const body = bodyOf(h);
        return body.includes('isReferenceCleanup') && !body.includes(CANONICAL);
      })
      .map((h) => h.name as string);
    expect(divergent, `these hooks spell the cleanup predicate differently: ${divergent.join(', ')}`)
      .toEqual([]);
  });

  /**
   * The predicate is only as narrow as its field list is complete: a lookup
   * added to one of these objects and not to `REFERENCE_FIELDS` would go on
   * blocking deletes exactly as before, silently.
   */
  it.each([
    ['crm_opportunity', 'opportunity_lifecycle'],
    ['crm_quote', 'quote_workflow'],
    ['crm_lead', 'lead_automation'],
  ])('%s: REFERENCE_FIELDS lists every declared lookup', (objectName, hookName) => {
    const guard = GUARDS.find((g) => g.label === hookName)!;
    const source = extractSandboxBody(guard.hook.handler, hookName).source;
    const literal = /const REFERENCE_FIELDS = new Set\(\[([\s\S]*?)\]\)/.exec(source);
    expect(literal, `${hookName} declares no REFERENCE_FIELDS`).toBeTruthy();
    const listed = [...literal![1].matchAll(/["']([^"']+)["']/g)].map((m) => m[1]).sort();

    const object = ((stack as AnyRec).objects as AnyRec[]).find((o) => o.name === objectName)!;
    const declared = Object.entries(object.fields as Record<string, AnyRec>)
      .filter(([, f]) => f.type === 'lookup' || f.type === 'master_detail')
      // `owner_id` is framework-managed: every guard already treats it as a
      // system column, so it never reaches the predicate.
      .map(([name]) => name)
      .filter((name) => name !== 'owner_id')
      .sort();

    expect(listed).toEqual(declared);
  });
});
