// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ObjectQL } from '@objectstack/objectql';
import { InMemoryDriver } from '@objectstack/driver-memory';
import quoteHooks from '../src/objects/quote.hook';
import { Contract } from '../src/objects/contract.object';
import { Quote } from '../src/objects/quote.object';
import { PAYMENT_TERMS_OPTIONS } from '../src/objects/_picklists';
import type { HookApi } from '../src/objects/_hook-api';
import { makeHarness, makeCtx, hookNamed, type Rec } from './helpers/hook-harness';
import { makeSandboxEngine, runHookBody } from './helpers/action-sandbox';

/**
 * An accepted quote's payment terms reach the contract it drafts (#873).
 *
 * ### What was wrong
 *
 * `_picklists.ts` declares `PAYMENT_TERMS_OPTIONS` a set shared by Quote and
 * Contract, and justifies the sharing in so many words: *"an accepted quote's
 * terms carry over to the contract, so the contract vocabulary must cover every
 * quote value."* `crm_contract.payment_terms` repeats the same rationale. No
 * such carry-over existed. `quote_on_accepted` drafted the contract from
 * `status`, the term months, the dates, the value, the type, the description
 * and the four lookups — and never `payment_terms` — so the contract took
 * `crm_contract.payment_terms`'s own option default `net_30`, on every accepted
 * quote, whatever the customer had negotiated.
 *
 * That is a rationale the code did not honour, and it was expensive in one
 * direction only: a quote negotiated at `due_on_receipt` (or net_15 / net_60 /
 * net_90) produced a contract silently saying 30 days, with nothing marking the
 * value as defaulted. The rep who closed the deal cannot fix it either —
 * `sales-rep.profile.ts` gives them `allowEdit: false` on `crm_contract` — and
 * the value does not stay put: `src/flows/billing-handoff.flow.ts` POSTs the
 * contract's `payment_terms` to the billing system when the contract activates,
 * so the defaulted term becomes an invoicing term.
 *
 * ### What is asserted here
 *
 * 1. the negotiated term is carried — the case the card is about;
 * 2. a quote that chose NO term still lands on the contract's own default, so
 *    the change is strictly additive (the maintainer's Q2 ruling: pass through,
 *    do not invent a way to distinguish "chose net_30" from "chose nothing");
 * 3. the vocabulary really is a superset — every quote value is accepted by
 *    `crm_contract`, measured against a real ObjectQL rather than read off the
 *    two `options:` arrays;
 * 4. the shipped body does the same inside QuickJS, where `undefined` does not
 *    survive the JSON hop.
 *
 * Cases 1 and 2 are asserted twice: once on the document the hook hands the
 * engine (a harness cannot tell an omitted key from a defaulted one) and once
 * on the row a real `crm_contract` insert produces (a document cannot tell you
 * what the engine's default actually is). Neither layer alone can state the
 * claim.
 *
 * ⚠️ Not this file's subject: #714 — the same hook once passed boolean `false`
 * into a lookup and the whole chain died. That is the chain not running; this
 * is the chain running and dropping a value. The fixtures below always give the
 * quote a contact so #714's refusal path (`crm_contract.crm_contact` is
 * required while `crm_quote.crm_contact` is not) never masks what is measured.
 */

type AnyRec = Record<string, any>;

const hook = hookNamed(quoteHooks, 'quote_on_accepted');
const USER = { id: 'user_1' };

/** Every value a quote can hold, straight from the shared vocabulary. */
const QUOTE_TERMS = PAYMENT_TERMS_OPTIONS.map((o) => o.value);

/** The value `crm_contract.payment_terms` falls to when nothing is written. */
const CONTRACT_DEFAULT = 'net_30';

/**
 * Accept a quote and return the contract document the hook handed the engine.
 *
 * `quote` is the accepting write's payload, `stored` the row it updates — the
 * hook reads a field from the patch first and the previous row second, and a
 * real acceptance is usually a `{ status }` patch over a quote whose terms were
 * set long before, so both sides have to be exercised.
 */
const draftFor = async (quote: Rec, stored: Rec = {}): Promise<Rec> => {
  const h = makeHarness({ crm_contract: [], crm_opportunity: [] });
  await hook.handler(makeCtx({
    event: 'afterUpdate',
    input: { id: 'q1', status: 'accepted', total_price: 1_000, crm_account: 'acc1', crm_contact: 'con1', ...quote },
    previous: { id: 'q1', status: 'presented', ...stored },
    user: USER,
    api: h.api as HookApi,
  }));
  const [call] = h.callsFor('crm_contract', 'insert');
  expect(call, 'the hook drafted no contract at all').toBeTruthy();
  return call!.args[0] as Rec;
};

describe('the negotiated payment terms reach the drafted contract', () => {
  it('carries `due_on_receipt` — the case the shared vocabulary was created for', async () => {
    // The whole point of `due_on_receipt` being in the CONTRACT's options.
    const doc = await draftFor({}, { payment_terms: 'due_on_receipt' });
    expect(
      doc.payment_terms,
      'a quote negotiated at due_on_receipt drafted a contract on the net_30 default',
    ).toBe('due_on_receipt');
  });

  it.each(QUOTE_TERMS)('carries `%s` off the quote it was already stored on', async (term) => {
    expect((await draftFor({}, { payment_terms: term })).payment_terms).toBe(term);
  });

  it('prefers the accepting write’s own value when it carries one', async () => {
    // A rep who re-terms the quote in the same write that accepts it.
    const doc = await draftFor({ payment_terms: 'net_90' }, { payment_terms: 'net_15' });
    expect(doc.payment_terms).toBe('net_90');
  });
});

describe('a quote that chose no terms is left exactly as it is today', () => {
  it('writes NO payment_terms key at all', async () => {
    const doc = await draftFor({}, {});
    expect(
      Object.prototype.hasOwnProperty.call(doc, 'payment_terms'),
      'payment_terms must be OMITTED so the contract’s own default applies',
    ).toBe(false);
  });

  it.each([
    ['an empty string', ''],
    ['null', null],
    ['a non-string', 42],
  ])('writes no key for %s either — never a junk value', async (_label, value) => {
    const doc = await draftFor({}, { payment_terms: value });
    expect(Object.prototype.hasOwnProperty.call(doc, 'payment_terms')).toBe(false);
  });
});

// ─────────────────────────── the engine's own verdict, not the harness's ──

describe('what a real crm_contract does with those documents', () => {
  /**
   * The harness stores whatever it is handed, so it can say the key is absent
   * but never what absence RESOLVES to — and the claim under test is about a
   * default. These four verdicts are measured against a real ObjectQL carrying
   * the app's real `crm_contract` metadata, the same way #714's are.
   */
  const stub = (name: string) => ({
    name,
    fields: { id: { type: 'text' }, name: { type: 'text' }, stage: { type: 'text' } },
  });

  let ql: AnyRec;
  let api: AnyRec;

  beforeAll(async () => {
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

  afterAll(async () => { await ql?.close(); });

  const insertDraftFor = async (stored: Rec): Promise<Rec> =>
    api.object('crm_contract').insert(await draftFor({}, stored));

  it('stores the negotiated term instead of the default', async () => {
    const row = await insertDraftFor({ payment_terms: 'due_on_receipt' });
    expect(row.payment_terms).toBe('due_on_receipt');
    // Read back rather than trusting the insert's echo — a default applied on
    // read would look identical on the returned row alone.
    const read = await api.object('crm_contract').findOne({ where: { id: row.id } });
    expect(read?.payment_terms).toBe('due_on_receipt');
  });

  it('falls to net_30 when the quote carried nothing — the unchanged case', async () => {
    // This is what EVERY accepted quote used to produce, and it is still what a
    // term-less one produces. Pinned so the "strictly additive" claim is a
    // measurement rather than an argument.
    const row = await insertDraftFor({});
    expect(row.payment_terms).toBe(CONTRACT_DEFAULT);
  });

  it.each(QUOTE_TERMS)('accepts `%s` — the superset claim, measured', async (term) => {
    const row = await insertDraftFor({ payment_terms: term });
    expect(row.payment_terms).toBe(term);
  });

  it('rejects a value outside the vocabulary, so the case above is not vacuous', async () => {
    // If the select were unenforced, "the contract accepts every quote value"
    // would be true of any string and would prove nothing about the superset.
    const doc = { ...(await draftFor({}, {})), payment_terms: 'net_45' };
    await expect(api.object('crm_contract').insert(doc)).rejects.toThrow(
      /Payment Terms must be one of: net_15, net_30, net_60, net_90, due_on_receipt/,
    );
  });
});

// ───────────────────────────────── the same body, inside the real sandbox ──

describe('the SHIPPED body behaves the same inside QuickJS', () => {
  /**
   * `hook.handler(ctx)` above keeps its closure; the runtime ships a lowered,
   * body-only source across a JSON boundary — where `undefined` does not
   * survive at all. Both halves of this change depend on that boundary: the
   * carried value must cross it, and the absent one must drop the key.
   */
  const acceptInSandbox = async (previous: Rec): Promise<Rec> => {
    const sandbox = makeSandboxEngine({ crm_contract: [], crm_opportunity: [] });
    await runHookBody(hook, {
      event: 'afterUpdate',
      input: { id: 'q_1', status: 'accepted', crm_account: 'acc_1', crm_contact: 'con_1', total_price: 1_000 },
      previous: { id: 'q_1', status: 'presented', ...previous },
      user: USER,
      engine: sandbox,
    });
    const [doc] = sandbox.inserted('crm_contract');
    expect(doc, 'the body never reached the contract insert').toBeTruthy();
    return doc!;
  };

  it('carries due_on_receipt across the VM boundary', async () => {
    expect((await acceptInSandbox({ payment_terms: 'due_on_receipt' })).payment_terms)
      .toBe('due_on_receipt');
  });

  it('sends no payment_terms key when the quote has none', async () => {
    const doc = await acceptInSandbox({});
    expect(Object.prototype.hasOwnProperty.call(doc, 'payment_terms')).toBe(false);
  });
});

// ─────────────────────────────────── the claim the comments make, pinned ──

describe('the rationale the shared vocabulary is justified by', () => {
  /**
   * #873 was filed against a COMMENT: two files justified sharing the
   * vocabulary with a copy that did not exist. Reinstating the copy without
   * pinning it leaves the next reader in the same position — a stated invariant
   * with nothing holding it up.
   */
  it('both objects really do declare the same vocabulary', () => {
    const values = (o: AnyRec): string[] => o.fields.payment_terms.options.map((x: AnyRec) => x.value);
    expect(values(Contract as AnyRec)).toEqual(QUOTE_TERMS);
    expect(values(Quote as AnyRec)).toEqual(QUOTE_TERMS);
  });

  it('names the hook that performs the carry-over, in both places that claim it', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const dir = join(process.cwd(), 'src', 'objects');
    for (const file of ['_picklists.ts', 'contract.object.ts']) {
      expect(
        readFileSync(join(dir, file), 'utf8'),
        `${file} claims an accepted quote's terms carry over but does not say what performs it`,
      ).toContain('quote_on_accepted');
    }
  });
});
