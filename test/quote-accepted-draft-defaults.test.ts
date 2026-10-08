// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { extractHookBody } from '@objectstack/cli/hook-body';
import type { VerifyStack } from '@objectstack/verify';
import quoteHooks from '../src/revenue/objects/quote.hook';
import { Contract } from '../src/revenue/objects/contract.object';
import { Quote } from '../src/revenue/objects/quote.object';
import {
  hotcrmStack, signUpPerson, recordEngineWrites, today, type Person,
} from './helpers/verify-stack';

/**
 * The auto-drafted contract's defaults are DECLARED defaults (#1129).
 *
 * ### What was decided
 *
 * `quote_on_accepted` supplies `contract_term_months`, `start_date` and
 * `contract_type` because `crm_contract` requires all three and a quote can
 * express none of them. The maintainer's 2026-08-31 ruling settled what those
 * values *are*: an auto-drafted contract is a STARTING DRAFT an admin
 * completes, not a faithful transcription of what was sold — so the values
 * stay exactly as they were, and what changes is that nothing marked them as
 * placeholders. That was the same complaint #873 recorded about
 * `payment_terms`, one field over, and it cost a real drift.
 *
 * The ruling also settled the other half in the same stroke: the quote's
 * `shipping_terms`, `billing_address`, `shipping_address` and `description` are
 * deliberately NOT copied. Decided, not overlooked.
 *
 * ### What is pinned here
 *
 * 1. the three values themselves, so "the ruling kept them" is a measurement
 *    and a later quiet re-tune is a red test rather than a diff nobody reads;
 * 2. the claim the provenance comment rests on — `crm_contract.contract_type`
 *    really does declare six values with **no** default of its own, which is
 *    what makes this hook the only thing that ever picks one;
 * 3. the four quote fields that deliberately reach nothing, and the structural
 *    facts the comment states about them (two have no counterpart column at
 *    all; `billing_address` has one; the contract's `description` is occupied
 *    by the draft's provenance sentence);
 * 4. that `DRAFT_CONTRACT_DEFAULTS` stays handler-local: an L2 body ships
 *    body-only with no module scope, so a module-scope block would pass every
 *    assertion above and `ReferenceError` in production. `os lint --strict`
 *    (`pnpm lint`) refuses that shape as `hook-body/not-lowerable`.
 *
 * Every draft below is a real one: the shipped app booted through
 * `@objectstack/verify`'s handle, a sales rep presenting and then accepting a
 * quote, and `quote_on_accepted` (an `async` afterUpdate hook) drafting the
 * contract through the engine. The document read is the one the hook handed
 * `crm_contract.insert`, as the engine received it.
 *
 * ⚠️ Not this file's subject: the negotiated `payment_terms` carry-over
 * (#873, `quote-accepted-payment-terms.test.ts`) and the `false`-into-a-lookup
 * chain break (#714, `quote-accepted-lookups.test.ts`). Fixtures here always
 * give the quote a contact so #714's refusal path never masks what is measured.
 */

type AnyRec = Record<string, any>;

type Rec = Record<string, any>;

/** The values the ruling kept, spelled out here rather than imported. */
const RULED_TERM_MONTHS = 12;
const RULED_CONTRACT_TYPE = 'subscription';

/** The six types `crm_contract` offers, in declaration order. */
const CONTRACT_TYPES = ['subscription', 'service', 'license', 'partnership', 'nda', 'msa'];

/**
 * Twelve calendar months on from an ISO date — the same rule the hook's
 * `addMonths` applies (JS month arithmetic, including the day-overflow that
 * turns 29 Feb into 1 Mar), computed from the date parts rather than by
 * calling the hook's own helper, so this is an independent expectation.
 */
const twelveMonthsOn = (iso: string): string => {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d!));
  dt.setUTCMonth(dt.getUTCMonth() + RULED_TERM_MONTHS);
  return dt.toISOString().slice(0, 10);
};

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
  rep = await signUpPerson(verify, 'manager@quote-accepted-draft-defaults.test', {
    name: 'Quote Manager', positions: ['sales_manager'], permissionSets: ['sales_manager'],
  });
}, 120_000);

let deal = 0;
/** The last quote `draftFor` accepted, as stored just before acceptance. */
let lastQuote: Rec = {};
/**
 * A rep presents a quote carrying `stored`, then accepts it in a write carrying
 * `quote`; returns the contract document `quote_on_accepted` handed the engine.
 * The account, contact and opportunity are the rep's own, fresh per draft.
 */
const draftFor = async (quote: Rec = {}, stored: Rec = {}): Promise<Rec> => {
  const n = ++deal;
  const create = async (object: string, doc: Rec) =>
    String((await verify.hooks.run(object, 'insert', doc, { as: rep.token })).id);
  const account = await create('crm_account', { name: `Draft Defaults Co ${n}` });
  const contact = await create('crm_contact', {
    first_name: 'Dee', last_name: `Faults ${n}`, email: `dee${n}@draft-defaults.test`, crm_account: account,
  });
  const opportunity = await create('crm_opportunity', {
    name: `Draft deal ${n}`, crm_account: account, stage: 'proposal', amount: 1_000, close_date: '2030-06-30',
  });
  const id = await create('crm_quote', {
    name: `Draft quote ${n}`, crm_account: account, crm_contact: contact, crm_opportunity: opportunity,
    quote_date: today(), expiration_date: '2030-12-31', ...stored,
  });
  for (const status of ['in_review', 'presented']) {
    await verify.hooks.run('crm_quote', 'update', { id, status }, { as: rep.token });
  }
  lastQuote = (await verify.rows('crm_quote', { id }))[0]!;
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
    return insert.args[1] as Rec;
  } finally {
    engine.restore();
  }
};

describe('the drafted contract carries the placeholder defaults the ruling kept', () => {
  it('drafts a 12-month term — the value with nothing behind it, unchanged', async () => {
    expect((await draftFor()).contract_term_months).toBe(RULED_TERM_MONTHS);
  });

  it('drafts `subscription`, on every accepted quote', async () => {
    // The card's headline reading: five of the six contract types are
    // unreachable on the auto-draft path, and that is a deliberate placeholder
    // rather than a claim about the deal.
    expect((await draftFor()).contract_type).toBe(RULED_CONTRACT_TYPE);
    expect((await draftFor({}, { name: 'Renewal for Acme' })).contract_type).toBe(RULED_CONTRACT_TYPE);
  });

  it('starts the term on the acceptance date and derives `end_date` from it', async () => {
    // `start_date` is the one default that is not a literal — it is whatever
    // day the quote was accepted, which is not necessarily the day the
    // customer's term begins. Read twice so a midnight rollover mid-test is
    // not a flake.
    const before = today();
    const doc = await draftFor();
    const after = today();
    expect([before, after]).toContain(doc.start_date as string);
    expect(
      doc.end_date,
      'end_date must stay DERIVED from start_date + the declared term, not become a fourth guess',
    ).toBe(twelveMonthsOn(doc.start_date as string));
  });
});

describe('the claim the provenance comment rests on', () => {
  /**
   * "This hardcode is the only thing that ever picks a contract type" is only
   * true while `crm_contract.contract_type` has no default of its own. If a
   * default is ever added, the comment becomes false and the hook's line stops
   * being the sole picker — so the claim is measured off the object, not
   * recalled.
   */
  const contractType = (Contract as AnyRec).fields.contract_type;

  it('declares six contract types', () => {
    expect(contractType.options.map((o: AnyRec) => o.value)).toEqual(CONTRACT_TYPES);
  });

  it('declares NO default for them — neither spelling', () => {
    expect(contractType.defaultValue, 'contract_type gained a field-level default').toBeUndefined();
    expect(
      contractType.options.filter((o: AnyRec) => o.default),
      'contract_type gained an option-level default',
    ).toEqual([]);
  });

  it('requires the term the hook supplies, so the hook cannot simply omit it', () => {
    const term = (Contract as AnyRec).fields.contract_term_months;
    expect(term.required).toBe(true);
    expect(term.storage?.notNull).toBe(true);
    expect(term.defaultValue).toBeUndefined();
  });
});

describe('what the draft deliberately does NOT carry (the ruling’s other half)', () => {
  const QUOTE_ONLY = {
    shipping_terms: 'FOB destination, freight prepaid',
    shipping_address: { street: '1 Shipping Way', city: 'Portland', country: 'US' },
    billing_address: { street: '2 Billing Road', city: 'Portland', country: 'US' },
    description: 'Two-year pilot, renegotiated down to a single site.',
  };

  it.each(['shipping_terms', 'shipping_address', 'billing_address'])(
    'writes no `%s` key on the contract',
    async (field) => {
      const doc = await draftFor({}, QUOTE_ONLY);
      expect(
        Object.prototype.hasOwnProperty.call(doc, field),
        `${field} is deliberately not copied (#1129) — copying it is option A, and unfreezes with it`,
      ).toBe(false);
    },
  );

  it('keeps the provenance sentence in `description` rather than the quote’s prose', async () => {
    // `quote_number` is an engine-issued autonumber, so the sentence names the
    // number this quote was issued.
    const doc = await draftFor({}, { ...QUOTE_ONLY, name: 'Acme pilot' });
    expect(lastQuote.quote_number, 'the engine issued no quote number').toMatch(/^QTE-\d+$/);
    expect(doc.description).toBe(`Auto-drafted from accepted quote ${lastQuote.quote_number} - Acme pilot`);
    expect(doc.description as string).not.toContain('Two-year pilot');
  });

  it('states the structural half of that comment truthfully', () => {
    // Two of the four have nowhere to land at all; `billing_address` does have
    // a counterpart column and is left for the admin completing the draft.
    // If that ever stops being true the comment needs rewriting, not the test.
    const contractFields = Object.keys((Contract as AnyRec).fields);
    const quoteFields = Object.keys((Quote as AnyRec).fields);
    for (const f of ['shipping_terms', 'shipping_address', 'billing_address', 'description']) {
      expect(quoteFields, `crm_quote lost ${f}`).toContain(f);
    }
    expect(contractFields).not.toContain('shipping_terms');
    expect(contractFields).not.toContain('shipping_address');
    expect(contractFields).toContain('billing_address');
    expect(contractFields).toContain('description');
  });
});

describe('the SHIPPED body carries the declared defaults body-only', () => {
  /**
   * The runtime ships a lowered, body-only source with no module scope. A
   * `DRAFT_CONTRACT_DEFAULTS` hoisted out of the handler would be a
   * `ReferenceError` there (and `os lint --strict` refuses it as
   * `hook-body/not-lowerable`); this reads the body the build ships, through the
   * platform's own extractor, and finds the defaults declared inside it.
   */
  it('reads the declared defaults body-only, with no module scope', () => {
    const hook = (quoteHooks as Rec[]).find((h) => h.name === 'quote_on_accepted')!;
    const { source } = extractHookBody(hook.handler, "hook 'quote_on_accepted'");
    expect(source).toMatch(/\bconst DRAFT_CONTRACT_DEFAULTS\b/);
    expect(source).toMatch(new RegExp(`contract_term_months:\\s*${RULED_TERM_MONTHS}\\b`));
    expect(source).toMatch(new RegExp(`contract_type:\\s*['"]${RULED_CONTRACT_TYPE}['"]`));
  });
});
