// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { ExpressionEngine } from '@objectstack/formula';
import { Contract } from '../src/sales/objects/contract.object';
import { ContractPrintPage } from '../src/sales/pages/contract_print.page';
import { hotcrmStack, signUpPerson, type Person } from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * A framework contract's quota (hotcrm#2807, maintainer ruling 2026-11-26:
 * 「框架合同汇总挂在下面的订单：已下单金额、剩余额度。超额默认警告」), against a
 * booted stack, through the REST data door the console saves through.
 *
 *  1. The contract shows what its orders add up to (Order Amount, every
 *     linked order's tax-inclusive total) and what is left of its value
 *     (Remaining Quota).
 *  2. Linking an order, or raising a linked order's total, so that the orders
 *     go over the contract value WARNS: the answer carries the
 *     `framework_quota_exceeded` warning and the order is saved.
 *  3. A write that does not add to the order's share is not judged, so an
 *     order already over is not nagged on every edit and lowering it is free.
 *  4. Order and Other contracts, and orders with no contract, carry no quota.
 */

let verify: VerifyStack;
let manager: Person;
let rep: Person;
beforeAll(async () => {
  verify = await hotcrmStack();
  manager = await signUpPerson(verify, 'manager@framework-quota.test', {
    name: 'Quota Manager', positions: ['crm_sales_manager'], permissionSets: ['sales_manager'],
  });
  rep = await signUpPerson(verify, 'rep@framework-quota.test', {
    name: 'Quota Rep', positions: ['crm_sales_rep'], permissionSets: ['sales_rep'],
  });
}, 120_000);

let k = 0;
const parties = async (): Promise<{ account: string; contact: string }> => {
  const [account] = await verify.seed('crm_account', [{ name: `Quota Co ${++k}`, type: 'prospect', owner_id: rep.id }]);
  const [contact] = await verify.seed('crm_contact', [{
    first_name: 'Quinn', last_name: `Quota ${k}`, email: `quinn${k}@framework-quota.test`, crm_account: account!.id, owner_id: rep.id,
  }]);
  return { account: String(account!.id), contact: String(contact!.id) };
};

/** A draft contract of `form` at 1 000, created by the manager. */
const contractOf = async (form: 'framework' | 'other', at: { account: string; contact: string }): Promise<string> => {
  const c = await verify.hooks.run('crm_contract', 'insert', {
    name: `Quota ${form} ${k}`, crm_account: at.account, crm_contact: at.contact, contract_form: form, contract_value: 1_000,
    start_date: '2026-01-01', end_date: '2027-01-01', contract_term_months: 12,
  }, { as: manager.token }) as Rec;
  return String(c.id);
};

/** The REST answer of a write, as the console reads it. */
const save = async (method: 'POST' | 'PATCH', path: string, body: Rec): Promise<{ status: number; body: Rec }> => {
  const res = await verify.apiAs(rep.token, method, path, body);
  return { status: res.status, body: await res.json() as Rec };
};
const newOrder = (at: { account: string; contact: string }, fields: Rec) =>
  save('POST', '/data/crm_sales_order', { name: `Quota order ${++k}`, crm_account: at.account, crm_contact: at.contact, ...fields });
const quotaWarnings = (answer: { body: Rec }) =>
  ((answer.body.warnings ?? []) as Rec[]).filter((w) => w.rule === 'framework_quota_exceeded');
const contractRow = async (id: string): Promise<Rec> => {
  const res = await verify.apiAs(rep.token, 'GET', `/data/crm_contract/${id}`);
  expect(res.status).toBe(200);
  return (await res.json() as Rec).record;
};

describe('a framework contract shows its Order Amount and Remaining Quota', () => {
  it('starts with nothing ordered and the whole value left, and counts each linked order', async () => {
    const at = await parties();
    const id = await contractOf('framework', at);
    let c = await contractRow(id);
    expect(Number(c.order_amount)).toBe(0);
    expect(Number(c.remaining_quota)).toBe(1_000);

    // Subtotal 300 + tax 30: the tax-inclusive total is what counts (#2804).
    const first = await newOrder(at, { crm_contract: id, subtotal: 300, tax: 30 });
    expect(first.status).toBe(201);
    expect(quotaWarnings(first)).toEqual([]);
    await vi.waitFor(async () => expect(Number((await contractRow(id)).order_amount)).toBe(330), { timeout: 5_000 });
    c = await contractRow(id);
    expect(Number(c.remaining_quota)).toBe(670);
  });

  it('shows both on a framework contract, the Order Amount alone on an order contract, neither on Other', () => {
    const visible = (field: string, form: string) =>
      ExpressionEngine.evaluate((Contract.fields as Rec)[field].visibleWhen, { record: { contract_form: form } } as never);
    expect([visible('order_amount', 'framework'), visible('remaining_quota', 'framework')]).toEqual([
      { ok: true, value: true }, { ok: true, value: true },
    ]);
    expect([visible('order_amount', 'order'), visible('remaining_quota', 'order')].map((r) => r.ok && r.value)).toEqual([true, false]);
    expect([visible('order_amount', 'other'), visible('remaining_quota', 'other')].map((r) => r.ok && r.value)).toEqual([false, false]);
  });

  it('shows no Remaining Quota while the orders are not yet counted', () => {
    const left = (record: Rec) =>
      ExpressionEngine.evaluate((Contract.fields as Rec).remaining_quota.expression, { record } as never);
    expect(left({ contract_form: 'framework', contract_value: 1_000, order_amount: null })).toEqual({ ok: true, value: null });
    expect(left({ contract_form: 'framework', contract_value: 1_000, order_amount: 1_250 })).toEqual({ ok: true, value: -250 });
  });

  it('keeps the running totals off the printed contract', () => {
    // The print page prints the `value` group whole; the totals are their own group.
    for (const f of ['order_amount', 'order_amount_differs', 'remaining_quota']) {
      expect((Contract.fields as Rec)[f].group, f).toBe('orders');
    }
    expect(JSON.stringify(ContractPrintPage)).not.toContain('"orders"');
  });
});

describe('going over a framework contract warns, and the save goes through', () => {
  let at: { account: string; contact: string };
  let id: string;
  let order: string;
  beforeAll(async () => {
    at = await parties();
    id = await contractOf('framework', at);
    const placed = await newOrder(at, { crm_contract: id, subtotal: 600 });
    expect(placed.status).toBe(201);
    order = String(placed.body.id);
    await vi.waitFor(async () => expect(Number((await contractRow(id)).order_amount)).toBe(600), { timeout: 5_000 });
  });

  it('warns when a newly linked order takes the orders over the value, and saves it', async () => {
    const over = await newOrder(at, { crm_contract: id, subtotal: 500 });
    expect(over.status).toBe(201);
    expect(quotaWarnings(over)).toEqual([expect.objectContaining({ severity: 'warning', field: 'crm_contract' })]);
    expect(over.body.record.crm_contract).toBe(id);
    await vi.waitFor(async () => expect(Number((await contractRow(id)).remaining_quota)).toBe(-100), { timeout: 5_000 });
  });

  it('warns when linking an existing order to the contract takes it over', async () => {
    const loose = await newOrder(at, { subtotal: 50 });
    expect(quotaWarnings(loose)).toEqual([]);
    const linked = await save('PATCH', `/data/crm_sales_order/${loose.body.id}`, { crm_contract: id });
    expect(linked.status).toBe(200);
    expect(quotaWarnings(linked)).toHaveLength(1);
  });

  it('warns when a linked order\'s total goes up, and not on an edit that leaves it as it was', async () => {
    const raised = await save('PATCH', `/data/crm_sales_order/${order}`, { tax: 10 });
    expect(raised.status).toBe(200);
    expect(Number(raised.body.record.total_price)).toBe(610);
    expect(quotaWarnings(raised)).toHaveLength(1);

    const unrelated = await save('PATCH', `/data/crm_sales_order/${order}`, { description: 'Delivery in two parts' });
    expect(unrelated.status).toBe(200);
    expect(quotaWarnings(unrelated)).toEqual([]);
  });

  it('does not warn when a linked order\'s total comes down, though the contract is still over', async () => {
    const lowered = await save('PATCH', `/data/crm_sales_order/${order}`, { tax: 0 });
    expect(lowered.status).toBe(200);
    expect(quotaWarnings(lowered)).toEqual([]);
  });

  it('shows a line that takes the order over on the contract\'s Remaining Quota', async () => {
    // A line's save reaches the order through the roll-up's own write, whose
    // answer no person reads; the contract's figure is the sign that stays.
    const fresh = await parties();
    const cid = await contractOf('framework', fresh);
    const placed = await newOrder(fresh, { crm_contract: cid });
    expect(placed.status).toBe(201);
    const line = await save('POST', '/data/crm_sales_order_line', {
      crm_sales_order: placed.body.id, product_title: 'Implementation days', quantity: 12, unit_price: 100,
    });
    expect(line.status).toBe(201);
    await vi.waitFor(async () => expect(Number((await contractRow(cid)).remaining_quota)).toBe(-200), { timeout: 5_000 });
  });
});

describe('only a framework contract has a quota', () => {
  it('does not warn for an order over an Other contract\'s value, or with no contract', async () => {
    const at = await parties();
    const other = await contractOf('other', at);
    const onOther = await newOrder(at, { crm_contract: other, subtotal: 5_000 });
    expect(onOther.status).toBe(201);
    expect(quotaWarnings(onOther)).toEqual([]);
    const none = await newOrder(at, { subtotal: 5_000 });
    expect(none.status).toBe(201);
    expect(quotaWarnings(none)).toEqual([]);
  });
});
