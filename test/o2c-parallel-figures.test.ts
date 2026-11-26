// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { hotcrmStack, flowRuns } from './helpers/verify-stack';

/**
 * Invoices and payments run in parallel (the 2026-11-26 ruling, hotcrm#2806),
 * on the shipped app booted by `@objectstack/verify`:
 *
 * - **Unpaid and Uninvoiced** replace the Receivable Balance. On the order and
 *   the contract each is the row's amount less Received, and less Invoiced,
 *   never below 0; the account sums each deal's own figure — its confirmed or
 *   completed orders, and its signed contracts that no order names — so a
 *   deal paid above its amount hides nothing another deal owes. The figures
 *   are stored computed fields, and the summary recompute that moves Received
 *   or Invoiced writes the row, which recomputes them, and that write in turn
 *   moves the account's halves: the two platform facts the card asked to
 *   confirm first (a formula can take `max`; the account totals a field of the
 *   order, here a stored one, since a `formula` stores nothing to total).
 * - **Overdue** is measured on the payment plan: the step's Open is stored,
 *   so the Overdue Payment Plans view can filter on it.
 * - **A confirmed order with no plan gets one step**: the order's total, due
 *   today plus its payment terms; an order with a step gets none. When the
 *   total changes, a lone step with nothing received follows it; otherwise
 *   the order shows Payment Plan Differs.
 */

type Rec = Record<string, any>;
const num = (v: unknown): number => Number(v ?? 0);
const day = (offset: number): string => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};

let verify: VerifyStack;
let admin: string;
let k = 0;

const insert = (object: string, doc: Rec): Promise<Rec> => verify.hooks.run(object, 'insert', doc, { as: admin });
const update = (object: string, doc: Rec): Promise<Rec> => verify.hooks.run(object, 'update', doc, { as: admin });
const row = async (object: string, id: string): Promise<Rec> => (await verify.rows(object, { id }))[0]!;
const settle = async (check: () => Promise<void>): Promise<void> => vi.waitFor(check, { timeout: 15_000, interval: 100 });

/** An order with the given subtotal (no discount, tax or shipping: the total is the subtotal). */
const order = (account: Rec, subtotal: number, extra: Rec = {}): Promise<Rec> =>
  insert('crm_sales_order', {
    name: `Parallel order ${++k}`, crm_account: account.id, status: 'confirmed', order_date: day(0),
    subtotal, payment_terms: 'net_30', ...extra,
  });

beforeAll(async () => {
  verify = await hotcrmStack();
  admin = await verify.signIn();
}, 180_000);

describe('Unpaid and Uninvoiced', () => {
  let account: Rec;
  let first: Rec;
  let second: Rec;
  let draft: Rec;

  beforeAll(async () => {
    account = await insert('crm_account', { name: 'Parallel Figures Corp', type: 'customer', industry: 'technology' });
    first = await order(account, 1000);
    second = await order(account, 500);
    draft = await order(account, 700, { status: 'draft' });
    await insert('crm_payment', { crm_sales_order: first.id, payment_date: day(0), amount: 300 });
    // Paid above its amount: the order reads 0 unpaid, and the excess hides
    // nothing the first order still owes.
    await insert('crm_payment', { crm_sales_order: second.id, payment_date: day(0), amount: 800 });
    await insert('crm_invoice', { invoice_number: `INV-PAR-${++k}`, crm_sales_order: first.id, issue_date: day(0), amount: 400 });
    await insert('crm_invoice', { invoice_number: `INV-PAR-${++k}`, crm_sales_order: first.id, issue_date: day(0), amount: 9999, status: 'cancelled' });
  });

  it('the order reads its amount less Received, and less Invoiced (issued only), never below 0', async () => {
    const a = await row('crm_sales_order', first.id);
    expect(num(a.total_price), 'fixture: the total is the subtotal').toBe(1000);
    expect([num(a.received_amount), num(a.unpaid_amount)]).toEqual([300, 700]);
    expect([num(a.invoiced_amount), num(a.uninvoiced_amount)]).toEqual([400, 600]);
    const b = await row('crm_sales_order', second.id);
    expect([num(b.received_amount), num(b.unpaid_amount)], 'paid above its amount: 0, not -300').toEqual([800, 0]);
    expect(num(b.uninvoiced_amount)).toBe(500);
  });

  it('the account sums each confirmed or completed order\'s own figure, not invoiced minus received', async () => {
    const a = await row('crm_account', account.id);
    // 700 + 0 (the overpaid order counts 0, not -300); the draft is not owed yet.
    expect(num(a.unpaid_amount)).toBe(700);
    expect(num(a.uninvoiced_amount)).toBe(600 + 500);
    expect(num(a.received_amount), 'Received is every payment, as before').toBe(1100);
    expect(num((await row('crm_sales_order', draft.id)).unpaid_amount), 'the draft shows its own figure').toBe(700);
  });

  it('a payment moves the order and the account at once', async () => {
    await insert('crm_payment', { crm_sales_order: first.id, payment_date: day(0), amount: 200 });
    expect(num((await row('crm_sales_order', first.id)).unpaid_amount)).toBe(500);
    expect(num((await row('crm_account', account.id)).unpaid_amount)).toBe(500);
  });

  it('the order\'s amount moving moves Unpaid, on the order and the account', async () => {
    await update('crm_sales_order', { id: first.id, subtotal: 1500 });
    const a = await row('crm_sales_order', first.id);
    expect(num(a.total_price)).toBe(1500);
    expect(num(a.unpaid_amount)).toBe(1000);
    expect(num((await row('crm_account', account.id)).unpaid_amount)).toBe(1000);
  });

  it('cancelling an order takes it out of the account', async () => {
    await update('crm_sales_order', { id: second.id, status: 'cancelled' });
    expect(num((await row('crm_account', account.id)).uninvoiced_amount)).toBe(1100);
  });

  describe('a signed contract that no order names (the seeded Initech agreement)', () => {
    // Initech's EXPIRED service agreement (60,000) predates orders: four steps
    // of 15,000, all invoiced, 39,000 received (`src/o2c/data/o2c.seed.ts`).
    // Initech's one order is a draft and names no contract.
    let contract: Rec;
    let initech: Rec;

    beforeAll(async () => {
      [contract] = await verify.rows('crm_contract', { description: 'Initial service agreement, pending renewal discussion.' });
      expect(contract, 'fixture: the seeded Initech agreement').toBeTruthy();
      initech = await row('crm_account', contract!.crm_account);
    });

    it('counts on the account through the contract', async () => {
      const c = await row('crm_contract', contract.id);
      expect(c.status).toBe('expired');
      expect([num(c.unpaid_amount), num(c.uninvoiced_amount), num(c.order_count)]).toEqual([21000, 0, 0]);
      const a = await row('crm_account', initech.id);
      expect([num(a.unpaid_amount), num(a.uninvoiced_amount)], 'the draft order is not counted').toEqual([21000, 0]);
    });

    it('once an order names it, the deal counts through the order and never twice', async () => {
      const placed = await order(initech, 2000, { crm_contract: contract.id, status: 'draft' });
      expect(num((await row('crm_contract', contract.id)).order_count)).toBe(1);
      // The draft order is not owed yet, and the contract now counts through it.
      expect(num((await row('crm_account', initech.id)).unpaid_amount)).toBe(0);
      await update('crm_sales_order', { id: placed.id, status: 'confirmed' });
      // The contract's payments named no order, so the order owes all 2000.
      expect(num((await row('crm_account', initech.id)).unpaid_amount)).toBe(2000);
    });
  });
});

describe('overdue on the payment plan', () => {
  it('the step\'s Open is stored, and the overdue view\'s filter finds a past step with money open', async () => {
    const account = await insert('crm_account', { name: 'Parallel Overdue Corp', type: 'customer', industry: 'technology' });
    const o = await order(account, 900, { status: 'draft' });
    const late = await insert('crm_billing_milestone', { name: `Late ${++k}`, crm_sales_order: o.id, planned_amount: 600, planned_date: day(-10) });
    const paid = await insert('crm_billing_milestone', { name: `Paid ${++k}`, crm_sales_order: o.id, planned_amount: 300, planned_date: day(-10) });
    await insert('crm_payment', { crm_sales_order: o.id, crm_billing_milestone: late.id, payment_date: day(0), amount: 100 });
    await insert('crm_payment', { crm_sales_order: o.id, crm_billing_milestone: paid.id, payment_date: day(0), amount: 300 });
    expect(num((await row('crm_billing_milestone', late.id)).open_amount)).toBe(500);
    expect(num((await row('crm_billing_milestone', paid.id)).open_amount)).toBe(0);
    const overdue = await verify.rows('crm_billing_milestone', {
      crm_sales_order: o.id, planned_date: { $lt: day(0) }, open_amount: { $gt: 0 },
    });
    expect(overdue.map((r) => r.id)).toEqual([late.id]);
  });
});

describe('a confirmed order gets a payment plan', () => {
  let account: Rec;
  beforeAll(async () => {
    account = await insert('crm_account', { name: 'Parallel Plan Corp', type: 'customer', industry: 'technology' });
  });
  const stepsOf = (orderId: string) => verify.rows('crm_billing_milestone', { crm_sales_order: orderId });

  it('confirming an order with no plan creates one step: the total, due today plus its terms', async () => {
    const o = await order(account, 800, { status: 'draft', payment_terms: 'net_30' });
    await update('crm_sales_order', { id: o.id, status: 'confirmed' });
    await settle(async () => expect(await stepsOf(o.id)).toHaveLength(1));
    const [step] = await stepsOf(o.id);
    expect(num(step!.planned_amount)).toBe(800);
    expect(String(step!.planned_date).slice(0, 10)).toBe(day(30));
    expect(step!.name).toBe(o.name);
    expect(step!.crm_account, 'the row stamp gives it the order\'s account').toBe(account.id);
  });

  it('Due on Receipt is the same day', async () => {
    const o = await order(account, 50, { status: 'draft', payment_terms: 'due_on_receipt' });
    await update('crm_sales_order', { id: o.id, status: 'confirmed' });
    await settle(async () => expect(await stepsOf(o.id)).toHaveLength(1));
    expect(String((await stepsOf(o.id))[0]!.planned_date).slice(0, 10)).toBe(day(0));
  });

  it('an order with a step of its own gets none, and confirming again adds none', async () => {
    const o = await order(account, 1000, { status: 'draft' });
    await insert('crm_billing_milestone', { name: `Advance ${++k}`, crm_sales_order: o.id, planned_amount: 300, planned_date: day(5) });
    await update('crm_sales_order', { id: o.id, status: 'confirmed' });
    await settle(async () => expect(await flowRuns(verify, 'sales_order_confirmed_plan_step', o.id)).toHaveLength(1));
    expect(await stepsOf(o.id)).toHaveLength(1);
    await update('crm_sales_order', { id: o.id, status: 'draft' });
    await update('crm_sales_order', { id: o.id, status: 'confirmed' });
    await settle(async () => expect(await flowRuns(verify, 'sales_order_confirmed_plan_step', o.id)).toHaveLength(2));
    expect(await stepsOf(o.id)).toHaveLength(1);
  });

  it('the total moving moves a lone step with nothing received; otherwise the order shows Payment Plan Differs', async () => {
    const o = await order(account, 1000, { status: 'draft' });
    await update('crm_sales_order', { id: o.id, status: 'confirmed' });
    await settle(async () => expect(await stepsOf(o.id)).toHaveLength(1));
    await update('crm_sales_order', { id: o.id, status: 'draft' });
    await update('crm_sales_order', { id: o.id, subtotal: 1200 });
    await settle(async () => expect(num((await stepsOf(o.id))[0]!.planned_amount)).toBe(1200));
    expect((await row('crm_sales_order', o.id)).plan_differs ?? null).toBeNull();

    const [step] = await stepsOf(o.id);
    await insert('crm_payment', { crm_sales_order: o.id, crm_billing_milestone: step!.id, payment_date: day(0), amount: 100 });
    await update('crm_sales_order', { id: o.id, subtotal: 1300 });
    await settle(async () => expect(await flowRuns(verify, 'sales_order_amount_plan_step', o.id)).toHaveLength(2));
    expect(num((await stepsOf(o.id))[0]!.planned_amount), 'something received: the plan is left alone').toBe(1200);
    expect((await row('crm_sales_order', o.id)).plan_differs).toBe(true);
  });
});
