// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { Contract } from '../src/revenue/objects/contract.object';
import { Quote } from '../src/revenue/objects/quote.object';
import { PAYMENT_TERMS_OPTIONS } from '../src/sales/objects/_picklists';
import {
  hotcrmStack, signUpPerson, recordEngineWrites, today, type Person,
} from './helpers/verify-stack';

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
 * the value does not stay put: `src/revenue/flows/billing-handoff-contract-activated.flow.ts` POSTs the
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
 *    `crm_contract`, measured on the real engine rather than read off the two
 *    `options:` arrays;
 * 4. the same two legs again, read as the STORED contract row.
 *
 * Every draft is a real one: the shipped app booted through
 * `@objectstack/verify`'s handle, a sales rep presenting and accepting a quote,
 * and the `async` hook drafting the contract through the engine. Cases 1 and 2
 * are asserted twice: once on the document the hook handed the engine (an
 * omitted key and a defaulted one look alike on a stored row) and once on the
 * row the engine stored (a document cannot tell you what the engine's default
 * actually is). Neither layer alone can state the claim.
 *
 * ⚠️ What a real quote can hold decides which "no terms" shapes exist: a quote
 * inserted with no terms takes `crm_quote.payment_terms`'s own default
 * (`net_30`), so "the quote chose nothing" is a quote whose terms were CLEARED
 * after it was created (to `null`, or to an empty string); a non-string value
 * is refused by the select and never reaches a quote at all.
 *
 * ⚠️ Not this file's subject: #714 — the same hook once passed boolean `false`
 * into a lookup and the whole chain died. That is the chain not running; this
 * is the chain running and dropping a value. The fixtures below always give the
 * quote a contact so #714's refusal path (`crm_contract.crm_contact` is
 * required while `crm_quote.crm_contact` is not) never masks what is measured.
 */

type AnyRec = Record<string, any>;

type Rec = Record<string, any>;

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
let verify: VerifyStack;
let rep: Person;
beforeAll(async () => {
  verify = await hotcrmStack();
  // The acceptor is a sales MANAGER. On 17.7.0 a sales rep may mark a quote
  // Accepted (`crm_quote.allowEdit`) but holds `crm_contract.allowCreate:
  // false`, and `quote_on_accepted` writes as the caller — so a rep's
  // acceptance closes the deal and the engine refuses the draft, which the
  // hook's `onError: 'log'` keeps silent. Reported as a finding; this file's
  // subject is what the draft CARRIES, so it runs as the persona whose
  // acceptance drafts one.
  rep = await signUpPerson(verify, 'manager@quote-accepted-payment-terms.test', {
    name: 'Quote Manager', positions: ['sales_manager'], permissionSets: ['sales_manager'],
  });
}, 120_000);

let deal = 0;
/**
 * A rep presents a quote whose stored terms are `stored.payment_terms`, then
 * accepts it in a write carrying `quote`. Returns the contract document
 * `quote_on_accepted` handed the engine and the row the engine stored.
 *
 * A stored `null` / `''` is written by the rep CLEARING the terms after the
 * quote exists — the only way a real quote holds no terms (see the header).
 */
const accepted = async (quote: Rec, stored: Rec = {}): Promise<{ doc: Rec; row: Rec }> => {
  const n = ++deal;
  const create = async (object: string, doc: Rec) =>
    String((await verify.hooks.run(object, 'insert', doc, { as: rep.token })).id);
  const account = await create('crm_account', { name: `Terms Co ${n}` });
  const contact = await create('crm_contact', {
    first_name: 'Tess', last_name: `Terms ${n}`, email: `tess${n}@payment-terms.test`, crm_account: account,
  });
  const { payment_terms: storedTerms, ...storedRest } = stored;
  const cleared = 'payment_terms' in stored && (storedTerms === null || storedTerms === '');
  const id = await create('crm_quote', {
    name: `Terms quote ${n}`, crm_account: account, crm_contact: contact,
    quote_date: today(), expiration_date: '2030-12-31',
    ...storedRest, ...(cleared || storedTerms === undefined ? {} : { payment_terms: storedTerms }),
  });
  if (cleared) await verify.hooks.run('crm_quote', 'update', { id, payment_terms: storedTerms }, { as: rep.token });
  for (const status of ['in_review', 'presented']) {
    await verify.hooks.run('crm_quote', 'update', { id, status }, { as: rep.token });
  }
  const engine = recordEngineWrites(verify);
  try {
    await verify.hooks.run('crm_quote', 'update', { id, status: 'accepted', ...quote }, { as: rep.token });
    // `quote_on_accepted` is `async: true` — it runs after the accepting write returned.
    const insert = await vi.waitFor(() => {
      const [call] = engine.of('crm_contract', 'insert');
      expect(call, 'the hook drafted no contract at all').toBeTruthy();
      return call!;
    }, { timeout: 10_000, interval: 25 });
    const outcome = await insert.settled;
    expect(outcome.ok, `the engine refused the drafted contract: ${String((outcome as Rec).error)}`).toBe(true);
    const stored_ = (await verify.rows('crm_contract', { id: ((outcome as Rec).value as Rec).id }))[0]!;
    return { doc: insert.args[1] as Rec, row: stored_ };
  } finally {
    engine.restore();
  }
};

/** The contract document the hook handed the engine. */
const draftFor = async (quote: Rec, stored: Rec = {}): Promise<Rec> => (await accepted(quote, stored)).doc;

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
    const doc = await draftFor({}, { payment_terms: null });
    expect(
      Object.prototype.hasOwnProperty.call(doc, 'payment_terms'),
      'payment_terms must be OMITTED so the contract’s own default applies',
    ).toBe(false);
  });

  it.each([
    ['an empty string', ''],
    ['null', null],
  ])('writes no key for %s either — never a junk value', async (_label, value) => {
    const doc = await draftFor({}, { payment_terms: value });
    expect(Object.prototype.hasOwnProperty.call(doc, 'payment_terms')).toBe(false);
  });

  it('a non-string never reaches a quote to be carried — the select refuses it', async () => {
    // The third junk shape the hook guards against cannot be stored on a real
    // quote: `crm_quote.payment_terms` is a select, and the engine refuses a
    // number on every write, so the contract can never be handed one.
    const [account] = await verify.seed('crm_account', [{ name: 'Junk Terms Co' }]);
    await expect(verify.hooks.run('crm_quote', 'insert', {
      name: 'Junk terms quote', crm_account: account.id, quote_date: today(), expiration_date: '2030-12-31',
      payment_terms: 42,
    }, { as: rep.token })).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
  });
});

// ─────────────────────────── the engine's own verdict, not the harness's ──

describe('what a real crm_contract does with those documents', () => {
  /**
   * The row the engine STORED for each draft — the contract's own default
   * applied (or not) by the engine itself, read back off the database.
   */
  it('stores the negotiated term instead of the default', async () => {
    const { row } = await accepted({}, { payment_terms: 'due_on_receipt' });
    expect(row.payment_terms).toBe('due_on_receipt');
  });

  it('falls to net_30 when the quote carried nothing — the unchanged case', async () => {
    // This is what EVERY accepted quote used to produce, and it is still what a
    // term-less one produces. Pinned so the "strictly additive" claim is a
    // measurement rather than an argument.
    const { row } = await accepted({}, { payment_terms: null });
    expect(row.payment_terms).toBe(CONTRACT_DEFAULT);
  });

  it.each(QUOTE_TERMS)('accepts `%s` — the superset claim, measured', async (term) => {
    const { row } = await accepted({}, { payment_terms: term });
    expect(row.payment_terms).toBe(term);
  });

  it('rejects a value outside the vocabulary, so the case above is not vacuous', async () => {
    // If the select were unenforced, "the contract accepts every quote value"
    // would be true of any string and would prove nothing about the superset.
    const { doc } = await accepted({}, { payment_terms: null });
    await expect(verify.seed('crm_contract', [{ ...doc, payment_terms: 'net_45' }])).rejects.toThrow(
      /Payment Terms must be one of: net_15, net_30, net_60, net_90, due_on_receipt/,
    );
  });
});

// ─────────────────────────────── the same legs, read as the engine received them ──

describe('the shipped hook hands the engine the same document on a real acceptance', () => {
  /**
   * These ran the lowered body in QuickJS, where `undefined` does not survive
   * the JSON hop. The handle runs hooks in-process (it has no door that runs a
   * hook's LOWERED body — reported upstream), so what is read here is the
   * document the engine actually received on a real acceptance: the carried
   * term present, an absent one absent.
   */
  it('carries due_on_receipt across to the engine', async () => {
    expect((await draftFor({}, { payment_terms: 'due_on_receipt' })).payment_terms).toBe('due_on_receipt');
  });

  it('sends no payment_terms key when the quote has none', async () => {
    const doc = await draftFor({}, { payment_terms: null });
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
    // The two files sit in different packages since the ADR-0130 layout: the
    // picklist vocabulary is a shared source and lives in the app package,
    // `crm_contract` is revenue's. Both still make the claim, so both are read.
    for (const file of [
      'src/sales/objects/_picklists.ts',
      'src/revenue/objects/contract.object.ts',
    ]) {
      expect(
        readFileSync(join(process.cwd(), file), 'utf8'),
        `${file} claims an accepted quote's terms carry over but does not say what performs it`,
      ).toContain('quote_on_accepted');
    }
  });
});
