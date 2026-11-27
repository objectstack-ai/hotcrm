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
      // No order: the base is the Contract Value, 60,000 (39,000 received, 60,000 invoiced).
      expect(num(c.contract_value)).toBe(60000);
      expect([num(c.unpaid_amount), num(c.uninvoiced_amount), num(c.order_count)]).toEqual([21000, 0, 0]);
      const a = await row('crm_account', initech.id);
      expect([num(a.unpaid_amount), num(a.uninvoiced_amount)], 'the draft order is not counted').toEqual([21000, 0]);
    });

    it('once an order names it, the deal counts through the order and never twice', async () => {
      const placed = await order(initech, 2000, { crm_contract: contract.id, status: 'draft' });
      // A Draft is not yet ordered (hotcrm#2806): the contract keeps its
      // Contract Value and still counts on the account itself.
      let c = await row('crm_contract', contract.id);
      expect([num(c.order_count), num(c.order_amount), num(c.unpaid_amount)]).toEqual([0, 0, 21000]);
      expect(num((await row('crm_account', initech.id)).unpaid_amount)).toBe(21000);
      await update('crm_sales_order', { id: placed.id, status: 'confirmed' });
      c = await row('crm_contract', contract.id);
      expect(num(c.order_count)).toBe(1);
      // Confirmed, the deal counts through the order: the contract's payments
      // named no order, so the order owes all 2000.
      expect(num((await row('crm_account', initech.id)).unpaid_amount)).toBe(2000);
      // The contract now has a confirmed order, so its own base is what was
      // ordered (2000), not its 60,000 value: 39,000 received leaves nothing unpaid.
      expect([num(c.order_amount), num(c.unpaid_amount), num(c.uninvoiced_amount)]).toEqual([2000, 0, 0]);
    });
  });
});

/**
 * A contract with orders owes what was ordered under it, not its value (the
 * maintainer's ruling of 2026-11-27 on hotcrm#2806): a framework contract
 * worth 1,000,000 with 600,000 of confirmed orders and 100,000 invoiced on
 * those orders reads Uninvoiced 500,000, and so does its account. Invoices
 * and payments entered on an order take the order's contract on save, so the
 * contract's Invoiced and Received count them without naming the contract.
 */
describe('a contract with orders owes what was ordered', () => {
  let account: Rec;
  let contract: Rec;
  let orders: Rec[];
  let invoices: Rec[];

  beforeAll(async () => {
    account = await insert('crm_account', { name: 'Framework Figures Corp', type: 'customer', industry: 'technology' });
    const contact = await insert('crm_contact', {
      first_name: 'Fran', last_name: `Framework ${++k}`, email: `fran${k}@o2c-parallel.test`, crm_account: account.id,
    });
    contract = await insert('crm_contract', {
      name: `Framework ${k}`, crm_account: account.id, crm_contact: contact.id, contract_form: 'framework',
      contract_value: 1_000_000, start_date: '2026-01-01', end_date: '2027-01-01', contract_term_months: 12,
    });
    orders = [
      await order(account, 400_000, { crm_contract: contract.id }),
      await order(account, 200_000, { crm_contract: contract.id }),
    ];
    // Entered on the orders alone: neither names the contract.
    invoices = [
      await insert('crm_invoice', { invoice_number: `INV-FW-${++k}`, crm_sales_order: orders[0]!.id, issue_date: day(0), amount: 60_000 }),
      await insert('crm_invoice', { invoice_number: `INV-FW-${++k}`, crm_sales_order: orders[1]!.id, issue_date: day(0), amount: 40_000 }),
    ];
  });

  it('an invoice entered on an order takes the order\'s contract, so the contract counts it once', async () => {
    for (const i of invoices) expect((await row('crm_invoice', i.id)).crm_contract).toBe(contract.id);
    const c = await row('crm_contract', contract.id);
    expect([num(c.order_count), num(c.order_amount), num(c.invoiced_amount)]).toEqual([2, 600_000, 100_000]);
  });

  it('the contract reads Uninvoiced 500,000 and Unpaid 600,000, from what was ordered, not its 1,000,000 value', async () => {
    const c = await row('crm_contract', contract.id);
    expect([num(c.uninvoiced_amount), num(c.unpaid_amount)]).toEqual([500_000, 600_000]);
  });

  it('the account reads Uninvoiced 500,000 through the orders', async () => {
    const a = await row('crm_account', account.id);
    expect([num(a.uninvoiced_amount), num(a.unpaid_amount)]).toEqual([500_000, 600_000]);
  });

  it('a payment on an order moves the contract and the account alike', async () => {
    const p = await insert('crm_payment', { crm_sales_order: orders[0]!.id, payment_date: day(0), amount: 50_000 });
    expect((await row('crm_payment', p.id)).crm_contract).toBe(contract.id);
    expect(num((await row('crm_contract', contract.id)).unpaid_amount)).toBe(550_000);
    expect(num((await row('crm_account', account.id)).unpaid_amount)).toBe(550_000);
  });

  it('a third order raises the base: the contract owes the new ordered amount', async () => {
    await order(account, 100_000, { crm_contract: contract.id });
    const c = await row('crm_contract', contract.id);
    expect([num(c.order_amount), num(c.uninvoiced_amount)]).toEqual([700_000, 600_000]);
  });

  it('a contract with no order keeps its Contract Value as the base', async () => {
    const contact = await insert('crm_contact', {
      first_name: 'Nora', last_name: `No Orders ${++k}`, email: `nora${k}@o2c-parallel.test`, crm_account: account.id,
    });
    const bare = await insert('crm_contract', {
      name: `No orders ${k}`, crm_account: account.id, crm_contact: contact.id, contract_form: 'framework',
      contract_value: 1_000_000, start_date: '2026-01-01', end_date: '2027-01-01', contract_term_months: 12,
    });
    await insert('crm_invoice', { invoice_number: `INV-FW-${++k}`, crm_contract: bare.id, issue_date: day(0), amount: 100_000 });
    const c = await row('crm_contract', bare.id);
    expect([num(c.order_count), num(c.uninvoiced_amount), num(c.unpaid_amount)]).toEqual([0, 900_000, 1_000_000]);
  });

  it('an order given its contract after its invoices passes the contract to them', async () => {
    const late = await order(account, 30_000);
    const inv = await insert('crm_invoice', { invoice_number: `INV-FW-${++k}`, crm_sales_order: late.id, issue_date: day(0), amount: 30_000 });
    expect((await row('crm_invoice', inv.id)).crm_contract ?? null).toBeNull();
    await update('crm_sales_order', { id: late.id, crm_contract: contract.id });
    await settle(async () => expect((await row('crm_invoice', inv.id)).crm_contract).toBe(contract.id));
    await settle(async () => {
      const c = await row('crm_contract', contract.id);
      // Ordered 730,000; invoiced 130,000.
      expect([num(c.order_amount), num(c.invoiced_amount), num(c.uninvoiced_amount)]).toEqual([730_000, 130_000, 600_000]);
    });
  });
});

/**
 * Only confirmed and completed orders are ordered (hotcrm#2806, the
 * maintainer's ruling of 2026-11-27): a Draft or a Cancelled order counts in
 * no framework contract's Order Amount, Remaining Quota, Unpaid or
 * Uninvoiced; confirming the Draft counts it. An order contract still shows
 * its order's amount whatever its status but Cancelled (#2804).
 */
describe('Draft and Cancelled orders count nowhere on a framework contract', () => {
  let account: Rec;
  let contract: Rec;
  let draft: Rec;

  beforeAll(async () => {
    account = await insert('crm_account', { name: 'Draft Orders Corp', type: 'customer', industry: 'technology' });
    const contact = await insert('crm_contact', {
      first_name: 'Dora', last_name: `Draft ${++k}`, email: `dora${k}@o2c-parallel.test`, crm_account: account.id,
    });
    contract = await insert('crm_contract', {
      name: `Framework drafts ${k}`, crm_account: account.id, crm_contact: contact.id, contract_form: 'framework',
      contract_value: 1_000_000, start_date: '2026-01-01', end_date: '2027-01-01', contract_term_months: 12,
    });
    await order(account, 300_000, { crm_contract: contract.id });
    draft = await order(account, 200_000, { crm_contract: contract.id, status: 'draft' });
    const cancelled = await order(account, 150_000, { crm_contract: contract.id, status: 'draft' });
    await update('crm_sales_order', { id: cancelled.id, status: 'cancelled' });
  });

  it('counts the confirmed order alone in Order Amount, Remaining Quota, Unpaid and Uninvoiced', async () => {
    const c = await row('crm_contract', contract.id);
    expect([num(c.order_count), num(c.order_amount), num(c.remaining_quota)]).toEqual([1, 300_000, 700_000]);
    expect([num(c.unpaid_amount), num(c.uninvoiced_amount)]).toEqual([300_000, 300_000]);
    expect(num(c.order_amount_shown), 'a framework contract shows what was ordered').toBe(300_000);
    expect(num(c.linked_order_amount), 'the Draft is linked, the Cancelled order is not').toBe(500_000);
    const a = await row('crm_account', account.id);
    expect([num(a.unpaid_amount), num(a.uninvoiced_amount)]).toEqual([300_000, 300_000]);
  });

  it('confirming the Draft counts it everywhere', async () => {
    await update('crm_sales_order', { id: draft.id, status: 'confirmed' });
    const c = await row('crm_contract', contract.id);
    expect([num(c.order_count), num(c.order_amount), num(c.remaining_quota)]).toEqual([2, 500_000, 500_000]);
    expect([num(c.unpaid_amount), num(c.uninvoiced_amount), num(c.order_amount_shown)]).toEqual([500_000, 500_000, 500_000]);
    expect(num((await row('crm_account', account.id)).uninvoiced_amount)).toBe(500_000);
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
