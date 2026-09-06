// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { makeFlowHarness, type FlowHarness, type Rec } from './helpers/flow-harness';
import { QuoteGenerationFlow } from '../src/flows/quote-generation.flow';

/**
 * quote_generation flow runtime harness — runs the REAL automation engine
 * against the SHARED in-memory data engine in `test/helpers/flow-harness.ts`
 * (same recipe as flow-conversion.test.ts).
 *
 * Guards the P0 CPQ fix: the flow's `recordId` input contract, the priced
 * create_quote (subtotal / discount_amount / total from the opportunity), the
 * account/contact carry-over, the stage → proposal advance, and that a
 * contact-LESS opportunity can still draft a quote (crm_quote.crm_contact was
 * relaxed to optional).
 *
 * The private data engine this file used to carry is gone (#1479): it matched
 * with `===` only, so any range operator selected nothing silently, and it
 * stored only the columns a row was written with rather than the declared shape
 * the shipped app's driver returns.
 */

const makeQuote = (seed: Record<string, Rec[]>): FlowHarness =>
  makeFlowHarness({ quote_generation: QuoteGenerationFlow }, seed);

async function runQuote(h: FlowHarness, oppId: string, screen: Rec) {
  const runId = await h.run('quote_generation', { recordId: oppId });
  await h.resume(runId!, screen);
}

describe('quote_generation flow — runtime', () => {
  it('prices the quote from the opportunity and advances the stage to proposal', async () => {
    const h = makeQuote({
      crm_opportunity: [{
        id: 'opp_1', name: 'Globex Deal', amount: 200000,
        crm_account: 'acc_1', primary_contact: 'con_1', stage: 'qualification',
      }],
    });
    await runQuote(h, 'opp_1', { quoteName: 'Q-1', expirationDays: 30, discount: 10 });

    expect(h.store.crm_quote?.length, 'one quote created').toBe(1);
    const q = h.store.crm_quote[0];
    expect(q.name).toBe('Q-1');
    expect(q.crm_opportunity).toBe('opp_1');
    expect(q.crm_account).toBe('acc_1');
    expect(q.crm_contact).toBe('con_1');
    expect(q.status).toBe('draft');
    // Pricing: subtotal = amount; 10% off → discount_amount 20000, total 180000.
    expect(q.subtotal).toBe(200000);
    expect(q.discount_amount).toBe(20000);
    expect(q.total_price).toBe(180000);
    // Opportunity advanced.
    expect(h.store.crm_opportunity[0].stage).toBe('proposal');
  });

  /**
   * Regression pin for #1206 — the money fields carry the FIELD'S SCALE, not a
   * raw IEEE-754 product.
   *
   * ⛔ This pin asserts the VALUE, and it has to. The harness's in-memory data
   * engine does not enforce field scale, so a pin that merely asserted "the run
   * did not fail" would be green both before and after the fix and would pin
   * nothing at all. Against the real driver the pre-fix value is what the
   * insert was REJECTED for — `Total Price must have at most 2 decimal places
   * (got 11)` — and the rejection never reached the seller, so the value here
   * is the only evidence the fix works.
   *
   * Both discounts are the issue's own measurements on a 180,000 opportunity,
   * and between them they cover both edited expressions: at 30% only
   * `total_price` is inexact (125999.99999999999), at 70% the tail moves to
   * `discount_amount` (125999.99999999999) and `total_price` becomes
   * 54000.00000000001. A discount whose hundredth is a dyadic rational — the
   * 10% and 0% the two cases above use — is exact either way and cannot catch
   * this.
   */
  it('rounds discount_amount and total_price to the fields\' 2-decimal scale (#1206)', async () => {
    const at = async (discount: number) => {
      const h = makeQuote({
        crm_opportunity: [{
          id: 'opp_3', name: 'Initech Deal', amount: 180000,
          crm_account: 'acc_3', primary_contact: 'con_3', stage: 'qualification',
        }],
      });
      await runQuote(h, 'opp_3', { quoteName: `Q-${discount}`, expirationDays: 30, discount });
      expect(h.store.crm_quote?.length, `quote created at ${discount}%`).toBe(1);
      return h.store.crm_quote[0];
    };

    // 180000 * (1 - 30/100) === 125999.99999999999 before the fix.
    const q30 = await at(30);
    expect(q30.subtotal).toBe(180000);
    expect(q30.discount_amount).toBe(54000);
    expect(q30.total_price).toBe(126000);

    // 180000 * (70/100) === 125999.99999999999 and 180000 * (1 - 70/100)
    // === 54000.00000000001 before the fix — both fields, one run.
    const q70 = await at(70);
    expect(q70.subtotal).toBe(180000);
    expect(q70.discount_amount).toBe(126000);
    expect(q70.total_price).toBe(54000);
  });

  it('drafts a quote even for a contact-less opportunity (crm_contact optional)', async () => {
    const h = makeQuote({
      crm_opportunity: [{
        id: 'opp_2', name: 'No-Contact Deal', amount: 50000,
        crm_account: 'acc_2', primary_contact: null, stage: 'qualification',
      }],
    });
    await runQuote(h, 'opp_2', { quoteName: 'Q-2', expirationDays: 15, discount: 0 });

    expect(h.store.crm_quote?.length, 'quote still created without a contact').toBe(1);
    const q = h.store.crm_quote[0];
    expect(q.crm_account).toBe('acc_2');
    expect(q.subtotal).toBe(50000);
    expect(q.total_price).toBe(50000); // 0% discount
    expect(q.crm_contact == null, 'contact left empty').toBe(true);
  });
});
