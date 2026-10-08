// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { hotcrmStack, signUpPerson, type Person } from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * quote_generation at runtime — the shipped app booted through
 * `@objectstack/verify`'s handle, a sales rep starting the screen flow on
 * their own opportunity (`flows.run`) and submitting its screen
 * (`flows.resume`), the quote and the opportunity read back off the engine.
 *
 * Guards the P0 CPQ fix: the flow's `recordId` input contract, the priced
 * create_quote (subtotal / discount_amount / total from the opportunity), the
 * account/contact carry-over, the stage → proposal advance, and that a
 * contact-LESS opportunity can still draft a quote (crm_quote.crm_contact was
 * relaxed to optional).
 *
 */

let verify: VerifyStack;
let rep: Person;
let k = 0;
beforeAll(async () => {
  verify = await hotcrmStack();
  rep = await signUpPerson(verify, 'rep@flow-quote.test', {
    name: 'Quote Rep', positions: ['sales_rep'], permissionSets: ['sales_rep'],
  });
}, 120_000);

/**
 * The rep's own opportunity, on their own account (and contact, unless
 * `primary_contact: null`), as it stands when its quote is drafted.
 *
 * The deal itself is written as the system, owned by the rep: a deal of
 * $100K or more is put under `opportunity_approval_on_create` when a rep
 * creates it, and LOCKED until a manager decides — and measured on 17.7.0, a
 * quote started on a locked deal is created and then the run fails on the
 * stage advance (reported as a finding). The pricing this file pins is the
 * same either side of an approval, so the deal is the one a quote is drafted
 * on: no approval pending.
 */
async function opportunity(opp: Rec): Promise<Rec> {
  const n = ++k;
  const create = (object: string, doc: Rec) => verify.hooks.run(object, 'insert', doc, { as: rep.token });
  const account = await create('crm_account', { name: `Quote Co ${n}` });
  const contact = opp.primary_contact === null ? null : await create('crm_contact', {
    first_name: 'Quinn', last_name: `Buyer ${n}`, email: `quinn${n}@flow-quote.test`, crm_account: account.id,
  });
  const [deal] = await verify.seed('crm_opportunity', [{
    stage: 'qualification', close_date: '2030-06-30', ...opp,
    crm_account: account.id, primary_contact: contact?.id ?? null, owner_id: rep.id,
  }]);
  return deal!;
}

/** Start the screen flow on `oppId`, submit `screen`, and return the quote it drafted. */
async function runQuote(oppId: string, screen: Rec): Promise<Rec[]> {
  const run = await verify.flows.run('quote_generation', { recordId: oppId }, { as: rep.token });
  await verify.flows.resume(run, screen, { as: rep.token });
  return verify.rows('crm_quote', { crm_opportunity: oppId });
}

describe('quote_generation flow — runtime', () => {
  it('prices the quote from the opportunity and advances the stage to proposal', async () => {
    const opp = await opportunity({ name: 'Globex Deal', amount: 200000 });
    const quotes = await runQuote(opp.id, { quoteName: 'Q-1', expirationDays: 30, discount: 10 });

    expect(quotes.length, 'one quote created').toBe(1);
    const q = quotes[0]!;
    expect(q.name).toBe('Q-1');
    expect(q.crm_opportunity).toBe(opp.id);
    expect(q.crm_account).toBe(opp.crm_account);
    expect(q.crm_contact).toBe(opp.primary_contact);
    expect(q.status).toBe('draft');
    // Pricing: subtotal = amount; 10% off → discount_amount 20000, total 180000.
    expect(q.subtotal).toBe(200000);
    expect(q.discount_amount).toBe(20000);
    expect(q.total_price).toBe(180000);
    // Opportunity advanced.
    expect((await verify.rows('crm_opportunity', { id: opp.id }))[0]!.stage).toBe('proposal');
  });

  /**
   * Regression pin for #1206 — the money fields carry whole cents, not a raw
   * IEEE-754 product.
   *
   * ⛔ This pin asserts the VALUE, and it has to. The engine enforces no decimal
   * places on these fields today, so a pin that merely asserted "the run did
   * not fail" would be green both before and after the fix and would pin
   * nothing at all. When #1206 was filed the real driver REJECTED the pre-fix
   * value — `Total Price must have at most 2 decimal places (got 11)`, from the
   * fields' since-retired `scale: 2` — and the rejection never reached the
   * seller. Currency fields declare no `scale` now (#1965), so the real driver
   * accepts that value and stores its tail; either way the value here is the
   * only evidence the rounding works.
   *
   * Both discounts are measured on a 180,000 opportunity, and between them they
   * cover both edited expressions: at 30% (the issue's own measurement) only
   * `total_price` is inexact (125999.99999999999); at 34% both are
   * (61200.00000000001 and 118799.99999999999). The issue's second measurement,
   * 70%, is above the 60% ceiling `crm_quote` enforces, so no real quote can
   * carry it. A discount whose hundredth is a dyadic rational — the
   * 10% and 0% the two cases above use — is exact either way and cannot catch
   * this.
   */
  it('rounds discount_amount and total_price to whole cents (#1206)', async () => {
    const at = async (discount: number) => {
      const opp = await opportunity({ name: 'Initech Deal', amount: 180000 });
      const quotes = await runQuote(opp.id, { quoteName: `Q-${discount}`, expirationDays: 30, discount });
      expect(quotes.length, `quote created at ${discount}%`).toBe(1);
      return quotes[0]!;
    };

    // 180000 * (1 - 30/100) === 125999.99999999999 before the fix.
    const q30 = await at(30);
    expect(q30.subtotal).toBe(180000);
    expect(q30.discount_amount).toBe(54000);
    expect(q30.total_price).toBe(126000);

    // Both fields, one run. The issue measured this at 70%, which a real quote
    // cannot carry: `crm_quote` refuses a discount above 60% ("Discount cannot
    // exceed 60%"). 34% is the legal discount with the same property —
    // 180000 * (34/100) === 61200.00000000001 and 180000 * (1 - 34/100)
    // === 118799.99999999999 before the fix.
    const q34 = await at(34);
    expect(q34.subtotal).toBe(180000);
    expect(q34.discount_amount).toBe(61200);
    expect(q34.total_price).toBe(118800);
  });

  it('drafts a quote even for a contact-less opportunity (crm_contact optional)', async () => {
    const opp = await opportunity({ name: 'No-Contact Deal', amount: 50000, primary_contact: null });
    const quotes = await runQuote(opp.id, { quoteName: 'Q-2', expirationDays: 15, discount: 0 });

    expect(quotes.length, 'quote still created without a contact').toBe(1);
    const q = quotes[0]!;
    expect(q.crm_account).toBe(opp.crm_account);
    expect(q.subtotal).toBe(50000);
    expect(q.total_price).toBe(50000); // 0% discount
    expect(q.crm_contact == null, 'contact left empty').toBe(true);
  });
});

/**
 * The two pricing expressions are CEL value envelopes (#1984), and CEL divides
 * an int by an int as INTEGERS. `round()` returns an int, so `round(x * 100) /
 * 100` silently drops the cents there; only the decimal divisor `/ 100.0`
 * keeps them. The pins above cannot see that: every amount they use prices to
 * whole units. 1,234.56 at 10% is 123.456 → 123.46 with the decimal divisor
 * and 123 with an integer one, and the total 1,111.104 → 1,111.10 vs 1,111 —
 * so these go red if either divisor loses its `.0`.
 */
describe('quote_generation flow — CEL pricing (#1984)', () => {
  const quoteAt = async (amount: unknown, screen: Rec) => {
    const opp = await opportunity({ name: 'Cents Deal', amount, primary_contact: null });
    const quotes = await runQuote(opp.id, { quoteName: 'Q-4', expirationDays: 30, ...screen });
    expect(quotes.length, 'quote created').toBe(1);
    return quotes[0]!;
  };

  it('keeps the cents: both divisors are decimal, not integer division', async () => {
    const q = await quoteAt(1234.56, { discount: 10 });
    expect(q.discount_amount).toBe(123.46);
    expect(q.total_price).toBe(1111.1);
  });

  // The template dialect read a cleared discount as 0. A bare `double(discount)`
  // ERRORS on null, which would fail the quote instead — the guard keeps the
  // old pricing: no discount, full price.
  it.each([null, ''])('prices a cleared discount (%j) as no discount', async (discount) => {
    const q = await quoteAt(180000, { discount });
    expect(q.discount_amount).toBe(0);
    expect(q.total_price).toBe(180000);
  });
});
