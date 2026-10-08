// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import {
  hotcrmStack, signUpPerson, recordEngineWrites, systemUpdate, today, type Person,
} from './helpers/verify-stack';

/**
 * `quote_on_accepted` and the links the quote does not have (#714).
 *
 * ### What went wrong
 *
 * The hook read its ids with `(typeof input.x === 'string' && input.x) ||
 * (typeof previous?.x === 'string' && previous.x)`. When NEITHER operand holds
 * — a quote carrying no contact, or no opportunity — that expression is not
 * `undefined`, it is boolean **`false`**, and `false` went into the contract
 * document as the content of a lookup.
 *
 * What the engine then did depends on the deployment's ADR-0104 value-shape
 * posture, and BOTH outcomes are wrong. Measured on 17.0.0-rc.3 (pinned by
 * `the engine's own verdict on a lookup value` below):
 *
 * | posture | what happens to `crm_contact: false` |
 * | --- | --- |
 * | warn-first (default; gate not yet run) | admitted, `[value-shape] … accepted for now` warning, `false` PERSISTED into a reference column |
 * | strict (after `os migrate value-shapes --apply`, or `OS_DATA_VALUE_SHAPE_STRICT_ENABLED=1`) | `ValidationError: Primary Contact has an invalid lookup value: Invalid input: expected string, received boolean` |
 *
 * The issue was filed against rc.2, where strict was the only behaviour: the
 * ValidationError aborted the handler, so no contract was drafted AND the
 * close-won leg that sits after the insert never ran. `async: true` +
 * `onError: 'log'` meant the accepting PATCH still answered 200 — the user saw
 * a won-looking quote, an open opportunity and no contract, with the only
 * evidence in a server log.
 *
 * ### What is asserted here
 *
 * 1. no lookup in the drafted contract ever carries a non-string — an absent
 *    link is an ABSENT KEY;
 * 2. the two legs are independent: a contract that refuses to draft no longer
 *    decides whether the opportunity is won;
 * 3. a leg that fails is still REPORTED (the handler throws), so `onError:
 *    'log'` has something true to log instead of nothing at all.
 *
 * Assertion (1) is written against the document the hook actually hands the
 * engine, read off the real engine's own `insert` on a real acceptance — the
 * shipped app booted through `@objectstack/verify`'s handle, a sales manager
 * accepting a quote they own (see `beforeAll` for why not a rep). A stub that
 * stored what the kernel refuses is why the old coverage stayed green through
 * #714; there is no stub here. The engine's own verdicts on the old document
 * are pinned in the last describe.
 *
 * ⚠️ One input no longer exists: since #1017 a quote cannot be PRESENTED or
 * ACCEPTED without a contact (`crm_quote.crm_contact` is `requiredWhen` either
 * status), so "a quote with no contact" never reaches this hook on a real
 * install — the acceptance itself is refused, synchronously, against the field.
 * That refusal is pinned below where the contact-less cases used to be; the
 * absent-link rule is driven through the link that IS still optional, the
 * opportunity, and an owner cleared from the quote.
 */

type AnyRec = Record<string, any>;
type Rec = AnyRec;

/** The lookups on the drafted contract, in the order the schema declares them. */
const LOOKUPS = ['crm_account', 'crm_contact', 'crm_opportunity', 'owner_id'] as const;

let verify: VerifyStack;
let manager: Person;
beforeAll(async () => {
  verify = await hotcrmStack();
  // A sales MANAGER accepts: on 17.7.0 a sales rep's acceptance cannot draft a
  // contract at all (`crm_contract.allowCreate: false`, and the hook writes as
  // the caller) — reported as a finding, see `quote-accepted-draft-defaults`.
  manager = await signUpPerson(verify, 'manager@quote-accepted-lookups.test', {
    name: 'Lookup Manager', positions: ['sales_manager'], permissionSets: ['sales_manager'],
  });
}, 120_000);

let deal = 0;
interface QuoteFixture {
  id: string;
  account: string;
  contact?: string;
  opportunity?: string;
}
/** A presented quote carrying exactly the links named — nothing is defaulted in. */
const presentedQuote = async (links: { contact?: boolean; opportunity?: boolean; owner?: boolean } = {}): Promise<QuoteFixture> => {
  const n = ++deal;
  const create = async (object: string, doc: Rec) =>
    String((await verify.hooks.run(object, 'insert', doc, { as: manager.token })).id);
  const account = await create('crm_account', { name: `Lookup Co ${n}` });
  const contact = links.contact === false ? undefined : await create('crm_contact', {
    first_name: 'Lou', last_name: `Kup ${n}`, email: `lou${n}@quote-lookups.test`, crm_account: account,
  });
  const opportunity = links.opportunity === false ? undefined : await create('crm_opportunity', {
    name: `Lookup deal ${n}`, crm_account: account, stage: 'proposal', amount: 1_000, close_date: '2030-06-30',
  });
  const id = await create('crm_quote', {
    name: `Lookup quote ${n}`, crm_account: account, quote_date: today(), expiration_date: '2030-12-31',
    ...(contact ? { crm_contact: contact } : {}), ...(opportunity ? { crm_opportunity: opportunity } : {}),
  });
  // A quote's total is the rollup of its lines: one line at 1,000.
  const [product] = await verify.seed('crm_product', [{ name: `Lookup widget ${n}`, list_price: 1_000, is_active: true }]);
  await create('crm_quote_line_item', { crm_quote: id, crm_product: product.id, quantity: 1, unit_price: 1_000 });
  await verify.hooks.run('crm_quote', 'update', { id, status: 'in_review' }, { as: manager.token });
  if (contact) await verify.hooks.run('crm_quote', 'update', { id, status: 'presented' }, { as: manager.token });
  if (links.owner === false) await systemUpdate(verify, 'crm_quote', { id, owner_id: null });
  return { id, account, contact, opportunity };
};

/**
 * Accept `q` as the manager, with `fault` staging an engine refusal, and wait
 * for the `async` hook to finish its legs. Returns what the engine received.
 */
const accept = async (q: QuoteFixture, fault?: Parameters<typeof recordEngineWrites>[1]) => {
  const engine = recordEngineWrites(verify, fault);
  const logger = (verify.kernel as AnyRec).logger as AnyRec;
  const reports = vi.spyOn(logger, 'error');
  try {
    await verify.hooks.run('crm_quote', 'update', { id: q.id, status: 'accepted' }, { as: manager.token });
    // `quote_on_accepted` is `async: true`: it finishes after the accepting
    // write returned, and it is done once its contract leg has settled and —
    // when the quote has an opportunity — its close-won leg has too.
    const legs = await vi.waitFor(() => {
      const [contract] = engine.of('crm_contract', 'insert');
      expect(contract, 'the hook drafted no contract at all').toBeTruthy();
      const won = engine.of('crm_opportunity', 'update');
      if (q.opportunity) expect(won.length, 'the close-won leg never ran').toBeGreaterThan(0);
      return { contract: contract!, won };
    }, { timeout: 10_000, interval: 25 });
    const outcomes = await Promise.all([legs.contract, ...legs.won].map((w) => w.settled));
    // The hook re-throws its collected failures, and `onError: 'log'` reports
    // them on the engine's logger — read off it once the handler has thrown.
    const failures = () => reports.mock.calls
      .filter(([message]) => String(message).includes('[hook] handler failed'))
      .map(([, , meta]) => String((meta as AnyRec)?.error ?? ''));
    if (outcomes.some((o) => !o.ok)) {
      await vi.waitFor(() => expect(failures().length, 'the failed leg was never reported').toBeGreaterThan(0),
        { timeout: 10_000, interval: 25 });
    }
    return { doc: legs.contract.args[1] as Rec, contract: legs.contract, engine, reported: failures() };
  } finally {
    reports.mockRestore();
    engine.restore();
  }
};

/** The stored opportunity, read fresh. */
const opportunity = async (id: string) => (await verify.rows('crm_opportunity', { id }))[0]!;

describe('an absent link is an absent key, never a boolean', () => {
  it('a quote with NO contact cannot be accepted — the gate sits on the quote now (#1017)', async () => {
    // Where #714's reproduction (account + opportunity, no contact) used to
    // draft a contact-less contract the engine then refused, the accepting
    // write itself is refused against the field, and the hook never runs.
    const q = await presentedQuote({ contact: false });
    const engine = recordEngineWrites(verify);
    try {
      await expect(verify.hooks.run('crm_quote', 'update', { id: q.id, status: 'accepted' }, { as: manager.token }))
        .rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
      expect(engine.of('crm_contract', 'insert'), 'a contract was drafted for a refused acceptance').toHaveLength(0);
    } finally {
      engine.restore();
    }
    expect((await opportunity(q.opportunity!)).stage).toBe('proposal');
  });

  it('drafts a contract for a quote with NO opportunity — and writes no crm_opportunity', async () => {
    const q = await presentedQuote({ opportunity: false });
    const { doc, contract } = await accept(q);

    expect(
      Object.prototype.hasOwnProperty.call(doc, 'crm_opportunity'),
      'crm_opportunity must be OMITTED, not written as false/null',
    ).toBe(false);
    expect(doc.crm_contact).toBe(q.contact);
    // Everything the contract needs from the quote is still there.
    expect(doc.crm_account).toBe(q.account);
    expect(doc.contract_value).toBe(1_000);
    expect(doc.status).toBe('draft');
    expect((await contract.settled).ok, 'the engine refused the drafted contract').toBe(true);
  });

  it.each([
    ['no opportunity', { opportunity: false }],
    ['no opportunity, and no owner either', { opportunity: false, owner: false }],
  ] as const)('every lookup it DOES write is a record id — quote with %s', async (_label, links) => {
    const { doc } = await accept(await presentedQuote(links));
    for (const field of LOOKUPS) {
      if (!Object.prototype.hasOwnProperty.call(doc, field)) continue;
      expect(
        typeof doc[field],
        `${field} reached the engine as ${JSON.stringify(doc[field])}, which is not a record id`,
      ).toBe('string');
      expect(doc[field], `${field} reached the engine empty`).not.toBe('');
    }
  });
});

describe('a contract that will not draft does not decide whether the deal is won', () => {
  /**
   * The engine refuses the contract insert — staged on the real engine with
   * the refusal a contact-less contract used to meet (`crm_contract.crm_contact`
   * is `required + notNull`), since a real contact-less quote can no longer be
   * accepted (see above).
   */
  const refuseContracts = (message: string) =>
    (op: string, object: string) => (op === 'insert' && object === 'crm_contract' ? new Error(message) : undefined);

  it('still pushes the linked opportunity to closed_won', async () => {
    const q = await presentedQuote();
    const { contract, reported } = await accept(q, refuseContracts('Primary Contact is required'));
    expect((await contract.settled).ok, 'the staged refusal did not land').toBe(false);

    // …and the deal the quote won is won. This is the half of #714 that made
    // the whole chain look dead: the close-won leg used to sit AFTER the insert
    // in one straight line, so the throw took it with it.
    const opp = await opportunity(q.opportunity!);
    expect(opp.stage, 'the accepted quote left its opportunity open').toBe('closed_won');
    expect(opp.win_reason).toBe('quote_accepted');

    // The failure is reported — `onError: 'log'` needs something true to log.
    expect(reported.join('\n')).toMatch(
      new RegExp(`could not draft the contract for quote ${q.id}: Primary Contact is required`),
    );
  });

  it('reports the close-won failure too, without hiding the contract it did draft', async () => {
    const q = await presentedQuote();
    const { contract, reported } = await accept(q, (op, object) =>
      (op === 'update' && object === 'crm_opportunity' ? new Error('write rejected') : undefined));

    expect(reported.join('\n')).toMatch(new RegExp(`could not close-won opportunity ${q.opportunity}: write rejected`));
    const outcome = await contract.settled;
    expect(outcome.ok, 'the contract leg was dragged down with the other').toBe(true);
    expect(await verify.rows('crm_contract', { id: ((outcome as AnyRec).value as AnyRec).id })).toHaveLength(1);
  });
});

describe('the shipped hook behaves the same on a real acceptance', () => {
  /**
   * These ran the lowered body in QuickJS, where `undefined` must DROP the key
   * on the way to the engine and a rejection from the engine facade must be
   * catchable inside the VM. The handle runs hooks in-process (it has no door
   * that runs a hook's LOWERED body — reported upstream). On a real acceptance
   * the quote carries its contact (a contact-less quote can no longer be
   * accepted, see the first describe), so no lookup is absent here; what is
   * asserted is that every lookup the engine received is a record id, and a
   * refused contract caught so the deal is still won. The omission itself is
   * pinned above, on a quote with no opportunity.
   */
  it('still wins the deal when the contract refuses, every lookup it wrote a record id', async () => {
    const q = await presentedQuote();
    const { doc, contract } = await accept(q, (op, object) =>
      (op === 'insert' && object === 'crm_contract' ? new Error('Primary Contact is required') : undefined));
    expect((await contract.settled).ok).toBe(false);
    // The quote's owner is the one link a real quote may lack besides the
    // opportunity; this one carries every link, so every key is a record id.
    for (const field of LOOKUPS) expect(typeof doc[field], field).toBe('string');
    expect(doc.crm_opportunity).toBe(q.opportunity);
    expect((await opportunity(q.opportunity!)).stage).toBe('closed_won');
  });
});

// ─────────────────────── the engine's own verdict on the old document ──

describe("the engine's own verdict on a lookup value", () => {
  /**
   * The four verdicts the fix depends on, from the real engine carrying the
   * app's REAL `crm_contract` metadata — the booted stack, written through the
   * system door (`seed`), so no grant decides the answer.
   *
   * Strict value shapes are switched on for this describe. That is not an
   * artificial setting: it is what `os migrate value-shapes --apply` records on
   * a real deployment (docs/MAINTENANCE.md §3.2), it is what the rc.2
   * acceptance run in #714 met, and the warn-first default is a migration
   * grace period, not the destination. The warn-first outcome is asserted too,
   * because "admitted" there is not "fine" — it persists `false` into a
   * reference column.
   */
  const STRICT = 'OS_DATA_VALUE_SHAPE_STRICT_ENABLED';
  let previousStrict: string | undefined;
  let withContact: QuoteFixture;
  let withoutContact: Rec;

  beforeAll(async () => {
    previousStrict = process.env[STRICT];
    process.env[STRICT] = '1';
    withContact = await presentedQuote({ opportunity: false });
    withoutContact = await presentedQuote({ contact: false, opportunity: false });
  }, 60_000);

  afterAll(() => {
    if (previousStrict === undefined) delete process.env[STRICT];
    else process.env[STRICT] = previousStrict;
  });

  /** The document the hook built on a real acceptance of a quote with no opportunity. */
  let builtDoc: Rec | undefined;
  const hookDoc = async (): Promise<Rec> => (builtDoc ??= (await accept(withContact)).doc);

  const insertAndCatch = async (doc: Rec): Promise<string | null> => {
    try {
      await verify.seed('crm_contract', [doc]);
      return null;
    } catch (e) {
      return (e as Error).message;
    }
  };

  it('rejects the boolean the hook used to send — the exact #714 ValidationError', async () => {
    // The pre-fix document, reconstructed: the two `&&` chains that found
    // nothing evaluated to `false` and the value went in as-is.
    const message = await insertAndCatch({ ...(await hookDoc()), crm_contact: false, crm_opportunity: false });
    expect(message).toMatch(
      /Primary Contact has an invalid lookup value: Invalid input: expected string, received boolean/,
    );
    expect(message).toMatch(
      /Related Opportunity has an invalid lookup value: Invalid input: expected string, received boolean/,
    );
  });

  it('accepts the document the hook builds when the quote has no opportunity', async () => {
    // Straight from the hook — the leg the fix RESTORES. Before it, this same
    // quote produced `crm_opportunity: false` and was refused outright.
    expect(await insertAndCatch({ ...(await hookDoc()) })).toBeNull();
  });

  it('rejects a contact-less contract by NAME — the schema conflict, not a shape error', async () => {
    // `crm_contract.crm_contact` is `required + notNull`. The CPQ chain can no
    // longer reach this with a contact-less QUOTE (see the first describe), but
    // the contract's own refusal is the contract the quote gate protects, and a
    // later change to either schema has to come past this assertion.
    const { crm_contact: _dropped, ...contactless } = await hookDoc();
    expect(withoutContact.contact).toBeUndefined();
    expect(await insertAndCatch(contactless)).toMatch(/Primary Contact is required/);
  });

  it('admits the same boolean under the warn-first posture — silently storing it', async () => {
    // Why the fix matters even where nothing throws: without the strict gate,
    // `false` is not refused, it is KEPT. `os migrate value-shapes` is what
    // later finds these rows, and by then they are data.
    //
    // ⚠️ Measured on 17.7.0: with neither switch set, the posture is the
    // deployment's own recorded one, and a freshly booted database is already
    // strict — so warn-first is the window of a deployment that has NOT been
    // migrated, asked for here the way such a deployment runs:
    // `OS_ALLOW_LAX_VALUE_SHAPES=1`.
    const LAX = 'OS_ALLOW_LAX_VALUE_SHAPES';
    const doc = await hookDoc();
    delete process.env[STRICT];
    process.env[LAX] = '1';
    try {
      const [row] = await verify.seed('crm_contract', [{ ...doc, crm_opportunity: false }]);
      // Persisted, as the datasource represents a boolean in a text reference
      // column: `false` on a sparse document store, `'0'` on SQLite.
      const [stored] = await verify.rows('crm_contract', { id: row.id });
      expect(stored!.crm_opportunity, 'the boolean was dropped rather than kept').not.toBeNull();
      expect(String(stored!.crm_opportunity)).toMatch(/^(false|0)$/);
    } finally {
      delete process.env[LAX];
      process.env[STRICT] = '1';
    }
  });
});
