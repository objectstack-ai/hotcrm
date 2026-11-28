// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { hotcrmStack } from './helpers/verify-stack';

/**
 * Confirming again refuses a Total Price below what the order has already
 * invoiced or received (hotcrm#2827), on the shipped app booted by
 * `@objectstack/verify`.
 *
 * Since hotcrm#2826 a Confirmed order's amount is locked, so a lowered total
 * reaches Confirmed only by going back to Draft and confirming again. That
 * move, and only that move, is judged: a first confirm, and any edit of an
 * order already Confirmed, are not. The rules are the Order to Cash module's,
 * added to the order through its `objectExtensions` entry
 * (`src/o2c/extensions/sales-order.extension.ts`).
 */

type Rec = Record<string, any>;
const num = (v: unknown): number => Number(v ?? 0);
const today = (): string => new Date().toISOString().slice(0, 10);

const RECEIVED =
  "This order's Total Price is below what was already received (Received). Deal with the overpayment or the invoices first, then confirm.";
const INVOICED =
  "This order's Total Price is below what was already invoiced (Invoiced). Cancel or correct the invoices first, then confirm.";

const RECEIVED_ZH = '本订单的总金额低于已回款金额（已回款）。请先处理多收的款项或发票，再确认订单。';

let verify: VerifyStack;
let admin: string;
let account: Rec;
let k = 0;

const call = async (method: string, path: string, body?: Rec): Promise<{ status: number; body: Rec }> => {
  const res = await verify.apiAs(admin, method, path, body);
  return { status: res.status, body: (await res.json().catch(() => ({}))) as Rec };
};
const patch = (id: string, body: Rec) => call('PATCH', `/data/crm_sales_order/${id}`, body);
const stored = async (id: string): Promise<Rec> => (await verify.rows('crm_sales_order', { id }))[0]!;
const settle = (check: () => Promise<void>): Promise<void> => vi.waitFor(check, { timeout: 15_000, interval: 100 });

/** A Confirmed order whose total is `subtotal` (no discount, tax or shipping). */
const confirmedOrder = async (subtotal: number): Promise<Rec> => {
  const res = await call('POST', '/data/crm_sales_order', {
    name: `Reconfirm order ${++k}`, crm_account: account.id, order_date: today(), subtotal,
  });
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  const id = res.body.id ?? res.body.record?.id;
  const confirmed = await patch(id, { status: 'confirmed' });
  expect(confirmed.status, JSON.stringify(confirmed.body)).toBe(200);
  return stored(id);
};
const pay = async (order: Rec, amount: number): Promise<void> => {
  await verify.hooks.run('crm_payment', 'insert', { crm_sales_order: order.id, payment_date: today(), amount }, { as: admin });
  await settle(async () => expect(num((await stored(order.id)).received_amount)).toBe(amount));
};
const invoice = async (order: Rec, amount: number): Promise<void> => {
  await verify.hooks.run('crm_invoice', 'insert', {
    invoice_number: `INV-RECONFIRM-${++k}`, crm_sales_order: order.id, issue_date: today(), amount,
  }, { as: admin });
  await settle(async () => expect(num((await stored(order.id)).invoiced_amount)).toBe(amount));
};
/** Back to Draft, and the total set to `subtotal`. */
const draftAt = async (order: Rec, subtotal: number): Promise<void> => {
  expect((await patch(order.id, { status: 'draft' })).status).toBe(200);
  const res = await patch(order.id, { subtotal });
  expect(res.status, JSON.stringify(res.body)).toBe(200);
  expect(num((await stored(order.id)).total_price), 'fixture: the total is the subtotal').toBe(subtotal);
};
const refused = (res: { status: number; body: Rec }, message: string): void => {
  expect(res.status, JSON.stringify(res.body)).toBe(400);
  expect(res.body.code).toBe('VALIDATION_FAILED');
  // On Total Price, the field to change, so the form shows it there.
  expect(res.body.fields?.[0]).toMatchObject({ field: 'total_price', code: 'rule_violation', message });
};

beforeAll(async () => {
  verify = await hotcrmStack();
  admin = await verify.signIn();
  account = await verify.hooks.run('crm_account', 'insert', { name: 'Reconfirm Floor Corp', type: 'customer', industry: 'technology' }, { as: admin });
}, 180_000);

describe('confirming again with a total below the order\'s figures (#2827)', () => {
  it('10,000 received, back in Draft at 8,000: confirming is refused and the order stays Draft; at 12,000 it confirms and Unpaid reads 2,000', async () => {
    const order = await confirmedOrder(10_000);
    await pay(order, 10_000);
    await draftAt(order, 8_000);

    refused(await patch(order.id, { status: 'confirmed' }), RECEIVED);
    expect((await stored(order.id)).status).toBe('draft');
    // In Chinese, from the Order to Cash module's own pack.
    const zh = await verify.raw(`/api/v1/data/crm_sales_order/${order.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${admin}`, 'accept-language': 'zh-CN' },
      body: JSON.stringify({ status: 'confirmed' }),
    });
    refused({ status: zh.status, body: (await zh.json()) as Rec }, RECEIVED_ZH);

    await draftAt(order, 12_000);
    const res = await patch(order.id, { status: 'confirmed' });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    await settle(async () => {
      const after = await stored(order.id);
      expect([after.status, num(after.total_price), num(after.unpaid_amount)]).toEqual(['confirmed', 12_000, 2_000]);
    });
  }, 90_000);

  it('9,000 invoiced, back in Draft at 5,000: confirming is refused, naming the invoices', async () => {
    const order = await confirmedOrder(10_000);
    await invoice(order, 9_000);
    await draftAt(order, 5_000);

    refused(await patch(order.id, { status: 'confirmed' }), INVOICED);
    expect((await stored(order.id)).status).toBe('draft');

    // A total equal to what was invoiced is not below it.
    await draftAt(order, 9_000);
    expect((await patch(order.id, { status: 'confirmed' })).status).toBe(200);
  }, 90_000);

  it('lowering the total and confirming in one write is judged on the new total', async () => {
    const order = await confirmedOrder(10_000);
    await pay(order, 10_000);
    expect((await patch(order.id, { status: 'draft' })).status).toBe(200);

    refused(await patch(order.id, { subtotal: 8_000, status: 'confirmed' }), RECEIVED);
    const after = await stored(order.id);
    expect([after.status, num(after.total_price)]).toEqual(['draft', 10_000]);
  }, 90_000);

  it('a first confirm, with nothing invoiced or received, is not judged', async () => {
    const order = await confirmedOrder(500);
    expect((await stored(order.id)).status).toBe('confirmed');
  }, 60_000);

  it('an order already Confirmed below its figures is not judged on its next edit or its next move', async () => {
    const order = await confirmedOrder(10_000);
    await pay(order, 10_000);
    // A system write still moves a Confirmed order's amount (#2826): the
    // shape of an order that sat below its figures before this rule.
    await verify.hooks.run('crm_sales_order', 'update', { id: order.id, subtotal: 8_000 }, { system: true });
    expect(num((await stored(order.id)).total_price)).toBe(8_000);

    const edit = await patch(order.id, { fulfillment_status: 'shipped' });
    expect(edit.status, JSON.stringify(edit.body)).toBe(200);
    const complete = await patch(order.id, { status: 'completed' });
    expect(complete.status, JSON.stringify(complete.body)).toBe(200);
  }, 90_000);
});
