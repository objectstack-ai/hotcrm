// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import quoteHooks from '../src/objects/quote.hook';
import { Contract } from '../src/objects/contract.object';
import { Quote } from '../src/objects/quote.object';
import type { HookApi } from '../src/objects/_hook-api';
import { makeHarness, makeCtx, hookNamed, today, type Rec } from './helpers/hook-harness';
import { makeSandboxEngine, runHookBody } from './helpers/action-sandbox';

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
 * 4. the same defaults through the REAL QuickJS body runner. This is the one
 *    leg that can fail for a reason the refactor introduced: an L2 body ships
 *    body-only with no module scope, so `DRAFT_CONTRACT_DEFAULTS` has to be
 *    handler-local. A module-scope block would pass every assertion above and
 *    `ReferenceError` in production.
 *
 * ⚠️ Not this file's subject: the negotiated `payment_terms` carry-over
 * (#873, `quote-accepted-payment-terms.test.ts`) and the `false`-into-a-lookup
 * chain break (#714, `quote-accepted-lookups.test.ts`). Fixtures here always
 * give the quote a contact so #714's refusal path never masks what is measured.
 */

type AnyRec = Record<string, any>;

const hook = hookNamed(quoteHooks, 'quote_on_accepted');
const USER = { id: 'user_1' };

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

/** Accept a quote and return the contract document the hook handed the engine. */
const draftFor = async (quote: Rec = {}, stored: Rec = {}): Promise<Rec> => {
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
    const doc = await draftFor({}, { ...QUOTE_ONLY, quote_number: 'QTE-0006', name: 'Acme pilot' });
    expect(doc.description).toBe('Auto-drafted from accepted quote QTE-0006 - Acme pilot');
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

describe('the SHIPPED body produces the same defaults inside QuickJS', () => {
  /**
   * `hook.handler(ctx)` keeps its closure; the runtime ships a lowered,
   * body-only source with no module scope. A `DRAFT_CONTRACT_DEFAULTS` hoisted
   * out of the handler would be a `ReferenceError` here and nowhere else.
   */
  it('reads the declared defaults body-only, with no module scope', async () => {
    const sandbox = makeSandboxEngine({ crm_contract: [], crm_opportunity: [] });
    const before = today();
    await runHookBody(hook, {
      event: 'afterUpdate',
      input: { id: 'q_1', status: 'accepted', crm_account: 'acc_1', crm_contact: 'con_1', total_price: 1_000 },
      previous: { id: 'q_1', status: 'presented' },
      user: USER,
      engine: sandbox,
    });
    const after = today();
    const [doc] = sandbox.inserted('crm_contract');
    expect(doc, 'the body never reached the contract insert').toBeTruthy();
    expect(doc!.contract_term_months).toBe(RULED_TERM_MONTHS);
    expect(doc!.contract_type).toBe(RULED_CONTRACT_TYPE);
    expect([before, after]).toContain(doc!.start_date as string);
    expect(doc!.end_date).toBe(twelveMonthsOn(doc!.start_date as string));
  });
});
