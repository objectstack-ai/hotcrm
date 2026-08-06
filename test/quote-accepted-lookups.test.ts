// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ObjectQL } from '@objectstack/objectql';
import { InMemoryDriver } from '@objectstack/driver-memory';
import quoteHooks from '../src/objects/quote.hook';
import { Contract } from '../src/objects/contract.object';
import type { HookApi } from '../src/objects/_hook-api';
import { makeHarness, makeCtx, hookNamed, type Rec } from './helpers/hook-harness';
import { makeSandboxEngine, runHookBody } from './helpers/action-sandbox';

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
 * engine, not against the row a stub stored, because the stubs in
 * `hook-harness.ts` / `action-sandbox.ts` accept values the kernel does not —
 * `crm_contact: false` stored perfectly well in both of them, which is why the
 * existing coverage was green throughout. The real verdicts are pinned against
 * a real ObjectQL in the last describe of this file.
 */

type AnyRec = Record<string, any>;

const hook = hookNamed(quoteHooks, 'quote_on_accepted');
const USER = { id: 'user_1' };

/** The lookups on the drafted contract, in the order the schema declares them. */
const LOOKUPS = ['crm_account', 'crm_contact', 'crm_opportunity', 'owner_id'] as const;

/** Accept a quote whose links are exactly `quote` — nothing is defaulted in. */
const accept = (api: HookApi, quote: Rec): Promise<unknown> =>
  hook.handler(makeCtx({
    event: 'afterUpdate',
    input: { id: 'q1', status: 'accepted', total_price: 1_000, owner_id: 'rep1', ...quote },
    previous: { id: 'q1', status: 'presented' },
    user: USER,
    api,
  }));

/** The document the hook handed `crm_contract.insert`. */
const draftedContract = (h: ReturnType<typeof makeHarness>): Rec => {
  const [call] = h.callsFor('crm_contract', 'insert');
  expect(call, 'the hook drafted no contract at all').toBeTruthy();
  return call!.args[0] as Rec;
};

describe('an absent link is an absent key, never a boolean', () => {
  it('drafts a contract for a quote with NO contact — and writes no crm_contact', async () => {
    const h = makeHarness({
      crm_contract: [],
      crm_opportunity: [{ id: 'opp1', stage: 'proposal' }],
    });
    // The reproduction from the issue: account + opportunity, no contact.
    await accept(h.api, { crm_account: 'acc1', crm_opportunity: 'opp1' }).catch(() => {});

    const doc = draftedContract(h);
    expect(
      Object.prototype.hasOwnProperty.call(doc, 'crm_contact'),
      'crm_contact must be OMITTED, not written as false/null',
    ).toBe(false);
    expect(doc.crm_opportunity).toBe('opp1');
  });

  it('drafts a contract for a quote with NO opportunity — and writes no crm_opportunity', async () => {
    const h = makeHarness({ crm_contract: [], crm_opportunity: [] });
    await accept(h.api, { crm_account: 'acc1', crm_contact: 'con1' });

    const doc = draftedContract(h);
    expect(
      Object.prototype.hasOwnProperty.call(doc, 'crm_opportunity'),
      'crm_opportunity must be OMITTED, not written as false/null',
    ).toBe(false);
    expect(doc.crm_contact).toBe('con1');
    // Everything the contract needs from the quote is still there.
    expect(doc.crm_account).toBe('acc1');
    expect(doc.contract_value).toBe(1_000);
    expect(doc.status).toBe('draft');
  });

  it.each([
    ['no contact', { crm_account: 'acc1', crm_opportunity: 'opp1' }],
    ['no opportunity', { crm_account: 'acc1', crm_contact: 'con1' }],
    ['neither', { crm_account: 'acc1' }],
    ['no owner either', { crm_account: 'acc1', owner_id: undefined }],
  ])('every lookup it DOES write is a record id — quote with %s', async (_label, quote) => {
    const h = makeHarness({
      crm_contract: [],
      crm_opportunity: [{ id: 'opp1', stage: 'proposal' }],
    });
    await accept(h.api, quote).catch(() => {});

    const doc = draftedContract(h);
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
   * A harness whose `crm_contract.insert` refuses the way the kernel refuses a
   * contact-less contract. This is the shape the CPQ chain meets every time a
   * quote is accepted without a recipient — `crm_quote.crm_contact` is
   * deliberately optional while `crm_contract.crm_contact` is `required +
   * notNull` — and the refusal is pinned against a real ObjectQL below.
   */
  const refusingContracts = (h: ReturnType<typeof makeHarness>, message: string): HookApi => ({
    object: (name: string) => {
      const repo = h.api.object(name);
      if (name !== 'crm_contract') return repo;
      return { ...repo, insert: async () => { throw new Error(message); } };
    },
  });

  it('still pushes the linked opportunity to closed_won', async () => {
    const h = makeHarness({
      crm_contract: [],
      crm_opportunity: [{ id: 'opp1', stage: 'proposal' }],
    });
    const api = refusingContracts(h, 'Primary Contact is required');

    // The failure is reported — `onError: 'log'` needs something true to log.
    await expect(accept(api, { crm_account: 'acc1', crm_opportunity: 'opp1' }))
      .rejects.toThrow(/could not draft the contract for quote q1: Primary Contact is required/);

    // …and the deal the quote won is won. This is the half of #714 that made
    // the whole chain look dead: the close-won leg used to sit AFTER the insert
    // in one straight line, so the throw took it with it.
    const opp = h.rows('crm_opportunity')[0]!;
    expect(opp.stage, 'the accepted quote left its opportunity open').toBe('closed_won');
    expect(opp.win_reason).toBe('quote_accepted');
  });

  it('reports the close-won failure too, without hiding the contract it did draft', async () => {
    const h = makeHarness({
      crm_contract: [],
      crm_opportunity: [{ id: 'opp1', stage: 'proposal' }],
    });
    const api: HookApi = {
      object: (name: string) => {
        const repo = h.api.object(name);
        if (name !== 'crm_opportunity') return repo;
        return { ...repo, update: async () => { throw new Error('write rejected'); } };
      },
    };

    await expect(accept(api, { crm_account: 'acc1', crm_contact: 'con1', crm_opportunity: 'opp1' }))
      .rejects.toThrow(/could not close-won opportunity opp1: write rejected/);
    expect(h.rows('crm_contract'), 'the contract leg was dragged down with the other').toHaveLength(1);
  });
});

describe('the SHIPPED body behaves the same inside QuickJS', () => {
  /**
   * `hook.handler(ctx)` above keeps the closure; the runtime runs a lowered
   * body-only source across a JSON boundary. Two things this change relies on
   * only exist there: `undefined` must DROP the key on the way to the engine,
   * and a rejection from the engine facade must be catchable inside the VM.
   */
  it('omits the absent lookup and still wins the deal when the contract refuses', async () => {
    const sandbox = makeSandboxEngine({ crm_opportunity: [{ id: 'opp_1', stage: 'proposal' }] });
    const passThrough = sandbox.engine.insert as (o: string, d: Rec) => Promise<Rec>;
    const seen: Rec[] = [];
    sandbox.engine.insert = async (object: string, data: Rec) => {
      if (object !== 'crm_contract') return passThrough(object, data);
      seen.push(data);
      throw new Error('Primary Contact is required');
    };

    await expect(runHookBody(hook, {
      event: 'afterUpdate',
      // No `crm_contact` — the issue's reproduction, run as the artifact ships it.
      input: { id: 'q_1', status: 'accepted', crm_account: 'acc_1', crm_opportunity: 'opp_1', total_price: 1_000 },
      previous: { id: 'q_1', status: 'presented' },
      user: USER,
      engine: sandbox,
    })).rejects.toThrow(/could not draft the contract/);

    const doc = seen[0]!;
    expect(doc, 'the body never reached the contract insert').toBeTruthy();
    expect(Object.prototype.hasOwnProperty.call(doc, 'crm_contact')).toBe(false);
    expect(doc.crm_opportunity).toBe('opp_1');
    expect(sandbox.rows('crm_opportunity')[0]!.stage).toBe('closed_won');
  });
});

// ─────────────────────── the stand-ins' verdicts are the kernel's verdicts ──

describe("the engine's own verdict on a lookup value", () => {
  /**
   * Everything above runs against a stub, and a stub that accepts what the
   * kernel rejects proves nothing — `crm_contact: false` stored happily in both
   * of this repo's harnesses, which is exactly why #714 shipped. So the four
   * verdicts the fix depends on are measured here against a real ObjectQL
   * carrying the app's REAL `crm_contract` metadata.
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
  const stub = (name: string) => ({
    name,
    fields: { id: { type: 'text' }, name: { type: 'text' }, stage: { type: 'text' } },
  });

  let ql: AnyRec;
  let api: AnyRec;
  let previousStrict: string | undefined;

  beforeAll(async () => {
    previousStrict = process.env[STRICT];
    process.env[STRICT] = '1';
    ql = await ObjectQL.create({
      datasources: { default: new InMemoryDriver({ persistence: false }) },
      objects: {
        crm_contract: Contract as never,
        crm_account: stub('crm_account'),
        crm_contact: stub('crm_contact'),
        crm_opportunity: stub('crm_opportunity'),
        sys_user: stub('sys_user'),
      } as never,
    });
    api = ql.createContext({ isSystem: true });
  }, 60_000);

  afterAll(async () => {
    if (previousStrict === undefined) delete process.env[STRICT];
    else process.env[STRICT] = previousStrict;
    await ql?.close();
  });

  /** The contract document the hook builds today, for the given quote links. */
  const hookDocFor = async (quote: Rec): Promise<Rec> => {
    const h = makeHarness({ crm_contract: [], crm_opportunity: [] });
    await accept(h.api, quote).catch(() => {});
    return draftedContract(h);
  };

  const insertAndCatch = async (doc: Rec): Promise<string | null> => {
    try {
      await api.object('crm_contract').insert(doc);
      return null;
    } catch (e) {
      return (e as Error).message;
    }
  };

  it('rejects the boolean the hook used to send — the exact #714 ValidationError', async () => {
    const doc = await hookDocFor({ crm_account: 'acc_1', crm_contact: 'con_1' });
    // The pre-fix document, reconstructed: the two `&&` chains that found
    // nothing evaluated to `false` and the value went in as-is.
    const message = await insertAndCatch({ ...doc, crm_contact: false, crm_opportunity: false });
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
    const doc = await hookDocFor({ crm_account: 'acc_1', crm_contact: 'con_1' });
    expect(await insertAndCatch(doc)).toBeNull();
  });

  it('rejects a contact-less contract by NAME — the schema conflict, not a shape error', async () => {
    // `crm_quote.crm_contact` is optional by design; `crm_contract.crm_contact`
    // is `required + notNull`. After the fix the refusal is this truthful one
    // instead of "received boolean", and it no longer takes close-won with it —
    // but the CPQ chain still ends here for a contact-less quote, which is what
    // `content/docs/sales/quotes.mdx` already tells reps ("what the quote does
    // not carry, acceptance cannot pass on"). Pinned so that a later change to
    // either schema has to come past this assertion.
    const doc = await hookDocFor({ crm_account: 'acc_1', crm_opportunity: 'opp_1' });
    expect(await insertAndCatch(doc)).toMatch(/Primary Contact is required/);
  });

  it('admits the same boolean under the warn-first default — silently storing it', async () => {
    // Why the fix matters even where nothing throws: without the strict gate,
    // `false` is not refused, it is KEPT. `os migrate value-shapes` is what
    // later finds these rows, and by then they are data.
    delete process.env[STRICT];
    try {
      const doc = await hookDocFor({ crm_account: 'acc_1', crm_contact: 'con_1' });
      const row = await api.object('crm_contract').insert({ ...doc, crm_opportunity: false });
      expect(row.crm_opportunity).toBe(false);
    } finally {
      process.env[STRICT] = '1';
    }
  });
});
