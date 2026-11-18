// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import {
  hotcrmStack, signUpPerson, switchFlow, systemUpdate, flowRuns, today, committedFile, type Person,
} from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * An accepted quote creates an order (REQ-0010 rule 1, hotcrm#2558):
 * `quote_accepted_order` (`src/revenue/flows/quote-accepted-order.flow.ts`).
 *
 * Driven through the real door on the shipped app: a sales rep builds a quote
 * with two lines and header pricing, presents it and accepts it. The order is
 * read back as stored, so the totals are the ones `sales_order_workflow` and
 * `sales_order_total_rollup` derived from what the flow copied.
 */

let verify: VerifyStack;
let rep: Person;
beforeAll(async () => {
  verify = await hotcrmStack();
  rep = await signUpPerson(verify, 'rep@quote-accepted-order.test', {
    name: 'Order Rep', positions: ['crm_sales_rep'], permissionSets: ['sales_rep'],
  });
}, 120_000);

let n = 0;
interface Fixture { id: string; account: string; contact: string; opportunity: string }

/** A presented quote: two lines (one discounted), a header discount, tax, shipping and terms. */
const presentedQuote = async (): Promise<Fixture> => {
  const k = ++n;
  const create = async (object: string, doc: Rec) =>
    String((await verify.hooks.run(object, 'insert', doc, { as: rep.token })).id);
  const account = await create('crm_account', { name: `Order Co ${k}` });
  const contact = await create('crm_contact', {
    first_name: 'Ora', last_name: `Der ${k}`, email: `ora${k}@quote-order.test`, crm_account: account,
  });
  const opportunity = await create('crm_opportunity', {
    name: `Order deal ${k}`, crm_account: account, stage: 'proposal', amount: 5_000, close_date: '2030-06-30',
  });
  const id = await create('crm_quote', {
    name: `Order quote ${k}`, crm_account: account, crm_contact: contact, crm_opportunity: opportunity,
    quote_date: today(), expiration_date: '2030-12-31', discount: 5, tax: 120.5, shipping_handling: 40,
    payment_terms: 'net_60', description: `What Order Co ${k} is buying.`,
    signed_copy: await committedFile(verify, rep.id),
  });
  const [widget, service] = await verify.seed('crm_product', [
    { name: `Order widget ${k}`, list_price: 1_000, is_active: true },
    { name: `Order service ${k}`, list_price: 800, is_active: true },
  ]);
  await create('crm_quote_line_item', { crm_quote: id, crm_product: widget.id, quantity: 3, unit_price: 950 });
  await create('crm_quote_line_item', { crm_quote: id, crm_product: service.id, quantity: 2, unit_price: 800, discount: 12.5 });
  for (const status of ['in_review', 'presented']) {
    await verify.hooks.run('crm_quote', 'update', { id, status }, { as: rep.token });
  }
  return { id, account, contact, opportunity };
};

const accept = (id: string) => verify.hooks.run('crm_quote', 'update', { id, status: 'accepted' }, { as: rep.token });

/** The orders whose Source Quote is `quoteId`, once the flow has had its run. */
const ordersOf = (quoteId: string) => verify.rows('crm_sales_order', { crm_quote: quoteId });
const waitForOrder = (quoteId: string): Promise<Rec> =>
  vi.waitFor(async () => {
    const orders = await ordersOf(quoteId);
    expect(orders, 'the accepted quote created no order').toHaveLength(1);
    return orders[0]!;
  }, { timeout: 15_000, interval: 50 });

describe('accepting a quote creates one draft order with the quote\'s header and lines', () => {
  let quote: Rec;
  let order: Rec;
  let fixture: Fixture;
  beforeAll(async () => {
    fixture = await presentedQuote();
    await accept(fixture.id);
    order = await waitForOrder(fixture.id);
    [quote] = await verify.rows('crm_quote', { id: fixture.id });
  }, 60_000);

  it('is a draft order of the same account, contact, deal and owner, naming its quote', () => {
    expect(order).toMatchObject({
      status: 'draft', order_date: today(), name: quote.name,
      crm_account: fixture.account, crm_contact: fixture.contact, crm_opportunity: fixture.opportunity,
      owner_id: rep.id, created_by: rep.id, crm_quote: fixture.id,
      payment_terms: 'net_60', description: quote.description,
    });
  });

  it('copies every line one to one', async () => {
    const lines = await verify.rows('crm_sales_order_line', { crm_sales_order: order.id });
    const quoteLines = await verify.rows('crm_quote_line_item', { crm_quote: fixture.id });
    const shape = (l: Rec) => ({
      crm_product: l.crm_product, product_title: l.product_title, quantity: l.quantity, unit_price: l.unit_price, discount: l.discount ?? 0,
    });
    expect(lines.map(shape).sort((a, b) => String(a.product_title).localeCompare(String(b.product_title))))
      .toEqual(quoteLines.map(shape).sort((a, b) => String(a.product_title).localeCompare(String(b.product_title))));
    expect(lines.map((l) => l.line_number).sort()).toEqual([1, 2]);
  });

  it('carries the same totals', async () => {
    const [stored] = await verify.rows('crm_sales_order', { id: order.id });
    for (const field of ['subtotal', 'discount', 'discount_amount', 'tax', 'shipping_handling', 'total_price']) {
      expect(stored![field], field).toBe(quote[field]);
    }
    // 3 × 950 + 2 × 800 × 0.875 = 4250; −5 % = 4037.5; + 120.5 + 40.
    expect(stored!.total_price).toBe(4_198);
  });

  it('drafts no contract', async () => {
    expect(await verify.rows('crm_contract', { crm_opportunity: fixture.opportunity })).toHaveLength(0);
  });
});

describe('one order per accepted quote, however often the status is written', () => {
  it('a re-acceptance and a repeated Accepted write leave exactly one order', async () => {
    const q = await presentedQuote();
    await accept(q.id);
    const first = await waitForOrder(q.id);
    // A system write may take the quote off Accepted and back (an import, a
    // correction); a person cannot, the freeze refuses them.
    await systemUpdate(verify, 'crm_quote', { id: q.id, status: 'presented' });
    await systemUpdate(verify, 'crm_quote', { id: q.id, status: 'accepted' });
    await systemUpdate(verify, 'crm_quote', { id: q.id, status: 'accepted', internal_notes: 'again' });
    await vi.waitFor(async () => {
      expect((await flowRuns(verify, 'quote_accepted_order', q.id)).length, 'the second acceptance never ran the flow').toBeGreaterThanOrEqual(2);
    }, { timeout: 15_000, interval: 50 });
    const orders = await ordersOf(q.id);
    expect(orders.map((o) => o.id), 'a second order was created for the same quote').toEqual([first.id]);
    expect(await verify.rows('crm_sales_order_line', { crm_sales_order: first.id })).toHaveLength(2);
  });

  it('the Source Quote is not a person\'s to move', async () => {
    const q = await presentedQuote();
    await accept(q.id);
    const order = await waitForOrder(q.id);
    const other = await presentedQuote();
    await verify.hooks.run('crm_sales_order', 'update', { id: order.id, crm_quote: other.id }, { as: rep.token }).catch(() => undefined);
    const [stored] = await verify.rows('crm_sales_order', { id: order.id });
    expect(stored!.crm_quote).toBe(q.id);
  });
});

describe('an administrator can switch the order flow off', () => {
  it('switched off, an accepted quote creates no order; switched on again, the next one does', async () => {
    await switchFlow(verify, 'quote_accepted_order', false);
    try {
      const off = await presentedQuote();
      await accept(off.id);
      // The close-won leg runs on every acceptance; once it has, the order
      // flow has had the same chance.
      await vi.waitFor(async () => {
        const [opp] = await verify.rows('crm_opportunity', { id: off.opportunity });
        expect(opp!.stage).toBe('closed_won');
      }, { timeout: 15_000, interval: 50 });
      expect(await ordersOf(off.id)).toHaveLength(0);
    } finally {
      await switchFlow(verify, 'quote_accepted_order', true);
    }
    const on = await presentedQuote();
    await accept(on.id);
    await waitForOrder(on.id);
  });
});
