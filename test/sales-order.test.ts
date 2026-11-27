// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { SalesOrder } from '../src/sales/objects/sales_order.object';
import { SalesOrderLine } from '../src/sales/objects/sales_order_line.object';
import { QuoteLineItem } from '../src/revenue/objects/quote_line_item.object';
import salesOrderHooks from '../src/sales/objects/sales_order.hook';
import * as profiles from '../src/sales/profiles';
import { CrmApp } from '../src/sales/apps/crm.app';
import { packageStacks } from '../objectstack.composition';
import { salesOrders } from '../src/sales/data/sales_order.seed';
import { salesOrdersZhCN } from '../src/sales/data/sales_order.zh-CN.seed';
import { contracts } from '../src/sales/data/contract.seed';
import { contractsZhCN } from '../src/sales/data/contract.zh-CN.seed';
import { hotcrmStack, signUpPerson, type Person } from './helpers/verify-stack';

/**
 * The sales order and its lines (REQ-0010, hotcrm#2555).
 *
 * The model (an order under the account, its lines under the order, the quote
 * line's ten fields, no currency field), where it is reached (Sales and Order
 * to Cash navigation), who holds it (what each set holds on the quote, finance
 * reads), and, on the booted stack, the behaviour the card's "Done when"
 * names: an order with lines created by hand, totals that follow the lines, a
 * confirmed order that refuses line changes, and a line typed with no product.
 */

type Rec = Record<string, any>;
const fields = (o: { fields: Record<string, Rec> }) => o.fields as Record<string, Rec>;

describe('the order model', () => {
  it('sits under the account, as the quote and the contract do', () => {
    expect(SalesOrder.sharingModel).toBe('controlled_by_parent');
    const account = fields(SalesOrder).crm_account!;
    expect(account.type).toBe('master_detail');
    expect(account.reference).toBe('crm_account');
    expect(account.relatedListColumns, 'the Orders list on the account page').toBeDefined();
    expect(fields(SalesOrder).crm_contract!.relatedListColumns, 'the Orders list on the contract page').toBeDefined();
    expect(fields(SalesOrder).crm_contract!.required ?? false, 'the contract is optional').toBe(false);
  });

  it('carries the fields the card lists, and no currency field (REQ-0012)', () => {
    const names = Object.keys(fields(SalesOrder));
    for (const f of [
      'order_number', 'name', 'owner_id', 'crm_account', 'crm_contact', 'crm_opportunity', 'order_date', 'status',
      'crm_contract', 'customer_po_number', 'external_ref', 'subtotal', 'discount', 'discount_amount', 'tax',
      'shipping_handling', 'total_price', 'payment_terms', 'billing_address', 'shipping_address',
      'fulfillment_status', 'shipped_date', 'description',
    ]) expect(names, f).toContain(f);
    expect(names.filter((n) => /currency/.test(n))).toEqual([]);
    expect(fields(SalesOrder).external_ref!.unique).toBe(true);
    expect(fields(SalesOrder).external_ref!.required ?? false).toBe(false);
    expect(fields(SalesOrder).payment_terms!.picklist).toBe('payment_terms');
    expect((fields(SalesOrder).status!.options as Rec[]).map((o) => o.value)).toEqual(['draft', 'confirmed', 'completed', 'cancelled']);
    expect((fields(SalesOrder).fulfillment_status!.options as Rec[]).map((o) => o.value)).toEqual(['not_shipped', 'partially_shipped', 'shipped']);
  });

  it('gives a line the quote line\'s ten fields, under the order', () => {
    const quoteLine = Object.keys(fields(QuoteLineItem)).filter((f) => f !== 'crm_quote').sort();
    const orderLine = Object.keys(fields(SalesOrderLine)).filter((f) => f !== 'crm_sales_order').sort();
    expect(orderLine).toEqual(quoteLine);
    expect(quoteLine).toHaveLength(10);
    expect(SalesOrderLine.sharingModel).toBe('controlled_by_parent');
    expect(fields(SalesOrderLine).crm_sales_order!.type).toBe('master_detail');
    // The product is optional: with the quote-and-product module disabled the
    // picker is empty and the line is typed (the card's accepted limit).
    expect(fields(SalesOrderLine).crm_product!.required ?? false).toBe(false);
    expect(fields(SalesOrderLine).product_title!.readonly ?? false).toBe(false);
  });
});

describe('where orders are reached', () => {
  it('Orders follows Contracts in the Sales group of the Sales app', () => {
    const sales = (CrmApp.navigation as Rec[]).find((n) => n.id === 'group_sales')!;
    const children = (sales.children as Rec[]).map((c) => c.id);
    expect(children.indexOf('nav_sales_order')).toBe(children.indexOf('nav_contract') + 1);
  });

  it('Orders sits beside Contracts and Accounts in the Order to Cash app, through the app package\'s contribution', () => {
    const app = packageStacks.find((s: Rec) => s.manifest?.type === 'app') as Rec;
    const o2c = (app.manifest.navigationContributions as Rec[]).find((c) => c.app === 'crm_o2c' && c.group === 'group_customers')!;
    expect(o2c.items.map((i: Rec) => i.id)).toEqual(['nav_contract', 'nav_sales_order', 'nav_account']);
  });
});

describe('who holds orders', () => {
  const sets = Object.values(profiles) as Rec[];
  // Read every order, write none. `project_manager` since hotcrm#2561: a
  // project may name the order it delivers (test/project-source-order.test.ts).
  const READ_ONLY = ['ar_accountant', 'finance_controller', 'project_manager'];

  it.each(sets.filter((p) => !READ_ONLY.includes(p.name)).map((p) => [p.name, p] as const))(
    '%s holds on orders what it holds on quotes, and on order lines what it holds on quote lines',
    (_n, p) => {
      expect(p.objects.crm_sales_order).toEqual(p.objects.crm_quote);
      expect(p.objects.crm_sales_order_line).toEqual(p.objects.crm_quote_line_item);
    },
  );

  it.each(READ_ONLY.map((n) => [n] as const))('%s reads every order and edits none', (n) => {
    const p = sets.find((s) => s.name === n)!;
    expect(p.objects.crm_sales_order).toMatchObject({ allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false, viewAllRecords: true, modifyAllRecords: false });
    expect(p.objects.crm_sales_order_line).toMatchObject({ allowCreate: false, allowRead: true, allowEdit: false, allowDelete: false });
  });
});

describe('an order on the booted stack', () => {
  let verify: VerifyStack;
  let rep: Person;
  let manager: Person;
  let k = 0;

  beforeAll(async () => {
    verify = await hotcrmStack();
    rep = await signUpPerson(verify, 'rep@sales-order.test', {
      name: 'Order Rep', positions: ['crm_sales_rep'], permissionSets: ['sales_rep'],
    });
    manager = await signUpPerson(verify, 'manager@sales-order.test', {
      name: 'Order Manager', positions: ['crm_sales_manager'], permissionSets: ['sales_manager'],
    });
  }, 180_000);

  const call = async (method: string, path: string, body?: Rec): Promise<{ status: number; body: Rec }> => {
    const res = await verify.apiAs(rep.token, method, path, body);
    return { status: res.status, body: (await res.json().catch(() => ({}))) as Rec };
  };
  const stored = async (object: string, id: string): Promise<Rec> => (await verify.rows(object, { id }))[0]!;
  const draftOrder = async (): Promise<Rec> => {
    const [account] = await verify.seed('crm_account', [{ name: `Order Co ${++k}`, owner_id: rep.id }]);
    const res = await call('POST', '/data/crm_sales_order', { name: `Order ${k}`, crm_account: account!.id });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    return stored('crm_sales_order', res.body.id ?? res.body.record?.id);
  };
  const addLine = (order: string, line: Rec) => call('POST', '/data/crm_sales_order_line', { crm_sales_order: order, ...line });

  it('runs the four order hooks this file exercises', () => {
    // The cases below drive each through the booted engine:
    // sales_order_workflow (the line lock, the header's derived figures),
    // sales_order_line_fill (title and price from the product, the typed
    // line's missing price), sales_order_line_number (each order counts from
    // 1) and sales_order_total_rollup (the subtotal follows the lines).
    expect((salesOrderHooks as Rec[]).map((h) => h.name)).toEqual([
      'sales_order_workflow', 'sales_order_line_fill', 'sales_order_line_number', 'sales_order_total_rollup',
    ]);
  });

  it('starts as Draft on today, and its totals follow its lines', async () => {
    const order = await draftOrder();
    expect(order.status).toBe('draft');
    expect(order.order_date).toBe(new Date().toISOString().slice(0, 10));
    const [product] = await verify.seed('crm_product', [{ name: `Order Product ${k}`, product_code: `SO-${k}`, is_active: true, list_price: 7_500 }]);

    const typed = await addLine(order.id, { product_title: 'Cable kit', quantity: 3, unit_price: 100 });
    expect(typed.status, JSON.stringify(typed.body)).toBe(201);
    const picked = await addLine(order.id, { crm_product: product!.id, quantity: 2 });
    expect(picked.status, JSON.stringify(picked.body)).toBe(201);
    const line = await stored('crm_sales_order_line', picked.body.id ?? picked.body.record?.id);
    // The product's name and list price, and the sales price defaults to it.
    expect([line.product_title, line.list_price, line.unit_price, line.line_number]).toEqual([`Order Product ${k}`, 7_500, 7_500, 2]);
    expect((await stored('crm_sales_order', order.id)).subtotal).toBe(15_300);

    const patched = await call('PATCH', `/data/crm_sales_order/${order.id}`, { discount: 10, tax: 100 });
    expect(patched.status).toBe(200);
    let after = await stored('crm_sales_order', order.id);
    expect([after.subtotal, after.discount_amount, after.total_price]).toEqual([15_300, 1_530, 13_870]);

    expect((await call('PATCH', `/data/crm_sales_order_line/${typed.body.id ?? typed.body.record?.id}`, { quantity: 5 })).status).toBe(200);
    after = await stored('crm_sales_order', order.id);
    expect([after.subtotal, after.discount_amount, after.total_price]).toEqual([15_500, 1_550, 14_050]);
  }, 60_000);

  it('a line with no product says what to type', async () => {
    const order = await draftOrder();
    const noPrice = await addLine(order.id, { product_title: 'Typed, no price' });
    expect(noPrice.status).toBe(400);
    expect(JSON.stringify(noPrice.body)).toContain('Enter a Sales Price for this line, or choose a product to take its list price.');
    const noTitle = await addLine(order.id, { unit_price: 10 });
    expect(noTitle.status).toBe(400);
    expect(JSON.stringify(noTitle.body)).toContain('Choose a product or type a Product Title');
  }, 60_000);

  it('a confirmed order refuses line changes until it is back at Draft', async () => {
    const order = await draftOrder();
    const first = await addLine(order.id, { product_title: 'Line A', quantity: 1, unit_price: 200 });
    const lineId = first.body.id ?? first.body.record?.id;
    expect((await call('PATCH', `/data/crm_sales_order/${order.id}`, { status: 'confirmed' })).status).toBe(200);

    const sentence = `Order ${order.name} is Confirmed, so its lines can no longer be added, changed or removed. Move it back to Draft to change them.`;
    for (const res of [
      await addLine(order.id, { product_title: 'Late', unit_price: 1 }),
      await call('PATCH', `/data/crm_sales_order_line/${lineId}`, { quantity: 9 }),
      await call('DELETE', `/data/crm_sales_order_line/${lineId}`),
    ]) {
      expect(res.status, JSON.stringify(res.body)).toBe(409);
      expect(res.body.code).toBe('RECORD_LOCKED');
      expect(JSON.stringify(res.body)).toContain(sentence);
    }
    // The order's own fields stay open.
    expect((await call('PATCH', `/data/crm_sales_order/${order.id}`, { fulfillment_status: 'partially_shipped' })).status).toBe(200);
    expect((await stored('crm_sales_order', order.id)).subtotal).toBe(200);

    expect((await call('PATCH', `/data/crm_sales_order/${order.id}`, { status: 'draft' })).status).toBe(200);
    expect((await call('DELETE', `/data/crm_sales_order_line/${lineId}`)).status).toBe(200);
    // The lines are what it sums: none left reads 0.
    const after = await stored('crm_sales_order', order.id);
    expect([after.subtotal, after.total_price]).toEqual([0, 0]);
  }, 60_000);

  it('Completed and Cancelled are final, and Draft does not jump to Completed', async () => {
    const order = await draftOrder();
    const jump = await call('PATCH', `/data/crm_sales_order/${order.id}`, { status: 'completed' });
    expect(jump.status).toBe(400);
    expect((await call('PATCH', `/data/crm_sales_order/${order.id}`, { status: 'cancelled' })).status).toBe(200);
    expect((await call('PATCH', `/data/crm_sales_order/${order.id}`, { status: 'draft' })).status).toBe(400);
  }, 60_000);

  describe('the header amount locks once the order leaves Draft (#2826)', () => {
    const AMOUNT: Array<[string, number]> = [['subtotal', 999], ['discount', 5], ['tax', 70], ['shipping_handling', 30]];
    const patch = (id: string, body: Rec) => call('PATCH', `/data/crm_sales_order/${id}`, body);
    const figures = async (id: string): Promise<number[]> => {
      const o = await stored('crm_sales_order', id);
      return [o.subtotal, o.discount ?? 0, o.tax ?? 0, o.shipping_handling ?? 0, o.total_price];
    };
    /** A Draft order with no lines, its amount typed, then moved to `status`. */
    const typedOrder = async (...path: string[]): Promise<Rec> => {
      const order = await draftOrder();
      expect((await patch(order.id, { subtotal: 1_000, discount: 10, tax: 50, shipping_handling: 20 })).status).toBe(200);
      for (const status of path) expect((await patch(order.id, { status })).status, status).toBe(200);
      return stored('crm_sales_order', order.id);
    };

    it('a Confirmed order refuses a person\'s edit of each amount field, and keeps every other field open', async () => {
      const order = await typedOrder('confirmed');
      const before = await figures(order.id);
      expect(before).toEqual([1_000, 10, 50, 20, 970]);
      const sentence = `Order ${order.name} is Confirmed, so its amount can no longer be changed. Send it back to Draft first.`;
      for (const [field, value] of AMOUNT) {
        const res = await patch(order.id, { [field]: value });
        expect(res.status, `${field}: ${JSON.stringify(res.body)}`).toBe(409);
        expect(res.body.code, field).toBe('RECORD_LOCKED');
        expect(JSON.stringify(res.body), field).toContain(sentence);
      }
      // Moving it back to Draft and changing the amount in one write is refused too.
      const both = await patch(order.id, { status: 'draft', tax: 70 });
      expect(both.status, JSON.stringify(both.body)).toBe(409);
      expect(await figures(order.id)).toEqual(before);
      expect((await stored('crm_sales_order', order.id)).status).toBe('confirmed');
      // A form that sends the unchanged figures back, and the other fields, save.
      const same = await patch(order.id, { subtotal: 1_000, discount: 10, tax: 50, shipping_handling: 20, fulfillment_status: 'shipped' });
      expect(same.status, JSON.stringify(same.body)).toBe(200);
    }, 60_000);

    it.each([
      ['Completed', ['confirmed', 'completed']],
      ['Cancelled', ['cancelled']],
    ] as const)('a %s order refuses it, with no way back', async (label, path) => {
      const order = await typedOrder(...path);
      for (const [field, value] of AMOUNT) {
        const res = await patch(order.id, { [field]: value });
        expect(res.status, `${field}: ${JSON.stringify(res.body)}`).toBe(409);
        expect(res.body.code, field).toBe('RECORD_LOCKED');
        expect(JSON.stringify(res.body), field).toContain(`Order ${order.name} is ${label}, so its amount can no longer be changed.`);
        expect(JSON.stringify(res.body), field).not.toContain('Draft');
      }
      expect(await figures(order.id)).toEqual([1_000, 10, 50, 20, 970]);
    }, 60_000);

    it('a system write still changes a Confirmed order\'s amount, and its total follows', async () => {
      const order = await typedOrder('confirmed');
      await verify.hooks.run('crm_sales_order', 'update', { id: order.id, tax: 80, shipping_handling: 0 }, { system: true });
      expect(await figures(order.id)).toEqual([1_000, 10, 80, 0, 980]);
      // The seed's own shape: a line put on a confirmed order by the system rolls up.
      const [line] = await verify.seed('crm_sales_order_line', [{ crm_sales_order: order.id, product_title: 'Seeded', quantity: 2, unit_price: 250 }]);
      expect(line).toBeTruthy();
      expect((await figures(order.id))[0]).toBe(500);
    }, 60_000);

    it('back in Draft the amount is editable again, and confirming again keeps the new total', async () => {
      const order = await typedOrder('confirmed');
      expect((await patch(order.id, { status: 'draft' })).status).toBe(200);
      for (const [field, value] of AMOUNT) {
        const res = await patch(order.id, { [field]: value });
        expect(res.status, `${field}: ${JSON.stringify(res.body)}`).toBe(200);
      }
      // 999 − 49.95 + 70 + 30
      expect(await figures(order.id)).toEqual([999, 5, 70, 30, 1_049.05]);
      expect((await patch(order.id, { status: 'confirmed' })).status).toBe(200);
      expect(await figures(order.id)).toEqual([999, 5, 70, 30, 1_049.05]);
      expect((await patch(order.id, { tax: 0 })).status).toBe(409);
    }, 60_000);

    it('on an order with lines, Subtotal is the lines\' sum: a typed one is refused, the sum and the other inputs save', async () => {
      const order = await draftOrder();
      expect((await addLine(order.id, { product_title: 'Line S', quantity: 4, unit_price: 125 })).status).toBe(201);
      expect((await stored('crm_sales_order', order.id)).subtotal).toBe(500);

      const typed = await patch(order.id, { subtotal: 750 });
      expect(typed.status, JSON.stringify(typed.body)).toBe(400);
      expect(typed.body.code).toBe('VALIDATION_FAILED');
      expect(JSON.stringify(typed.body)).toContain(`Order ${order.name} has lines, so its Subtotal is the sum of its lines and cannot be typed. Change the lines instead.`);
      expect((await patch(order.id, { subtotal: null })).status).toBe(400);
      expect((await stored('crm_sales_order', order.id)).subtotal).toBe(500);

      // The sum itself, and the Draft order's other inputs, save; the total follows.
      expect((await patch(order.id, { subtotal: 500, tax: 25 })).status).toBe(200);
      expect(await figures(order.id)).toEqual([500, 0, 25, 0, 525]);
      // A line change still moves it: the rollup's own write is the sum.
      const lines = await verify.rows('crm_sales_order_line', { crm_sales_order: order.id });
      expect((await call('PATCH', `/data/crm_sales_order_line/${lines[0]!.id}`, { quantity: 2 })).status).toBe(200);
      expect(await figures(order.id)).toEqual([250, 0, 25, 0, 275]);
    }, 60_000);

    it('an order with no lines still takes a typed Subtotal', async () => {
      const order = await draftOrder();
      const res = await patch(order.id, { subtotal: 1_234, tax: 6 });
      expect(res.status, JSON.stringify(res.body)).toBe(200);
      expect(await figures(order.id)).toEqual([1_234, 0, 6, 0, 1_240]);
    }, 60_000);
  });

  describe('an order carries only a contract of its own account (#2728)', () => {
    const sentence = "This contract belongs to another account. An order can only carry a contract of its own Account: choose one of this account's contracts, or clear Contract.";
    /** A draft contract under `account`, with the contact it requires. */
    const contractOf = async (account: string): Promise<Rec> => {
      const [contact] = await verify.seed('crm_contact', [
        { first_name: 'Con', last_name: `Tract ${++k}`, email: `con${k}@order-contract.test`, crm_account: account },
      ]);
      const [contract] = await verify.seed('crm_contract', [{
        crm_account: account, crm_contact: contact!.id, status: 'draft', start_date: '2030-01-01',
        end_date: '2030-12-31', name: 'Fixture Contract', contract_term_months: 12, contract_value: 1_000, description: `Order contract ${k}`,
      }]);
      return contract!;
    };
    const refused = (res: { status: number; body: Rec }) => {
      expect(res.status, JSON.stringify(res.body)).toBe(400);
      expect(res.body.code).toBe('VALIDATION_FAILED');
      // On Contract, the field to correct, so the form shows it there.
      expect(res.body.fields?.[0]).toMatchObject({ field: 'crm_contract', code: 'rule_violation', message: sentence });
    };

    it("refuses another account's contract on create, on a contract change and on an account change", async () => {
      const order = await draftOrder();
      const [other] = await verify.seed('crm_account', [{ name: `Other Co ${++k}`, owner_id: rep.id }]);
      const theirs = await contractOf(other!.id);
      const ours = await contractOf(order.crm_account);

      refused(await call('POST', '/data/crm_sales_order', { name: `Order ${++k}`, crm_account: order.crm_account, crm_contract: theirs.id }));
      refused(await call('PATCH', `/data/crm_sales_order/${order.id}`, { crm_contract: theirs.id }));
      expect((await stored('crm_sales_order', order.id)).crm_contract ?? null).toBeNull();

      // Its own account's contract saves as before; moving the order to
      // another account then has to take the contract with it.
      expect((await call('PATCH', `/data/crm_sales_order/${order.id}`, { crm_contract: ours.id })).status).toBe(200);
      refused(await call('PATCH', `/data/crm_sales_order/${order.id}`, { crm_account: other!.id }));
      expect((await call('PATCH', `/data/crm_sales_order/${order.id}`, { crm_account: other!.id, crm_contract: theirs.id })).status).toBe(200);
      const after = await stored('crm_sales_order', order.id);
      expect([after.crm_account, after.crm_contract]).toEqual([other!.id, theirs.id]);
    }, 60_000);

    it('saves an order with no contract, and with its own account\'s contract', async () => {
      const order = await draftOrder();
      const ours = await contractOf(order.crm_account);
      const created = await call('POST', '/data/crm_sales_order', { name: `Order ${++k}`, crm_account: order.crm_account, crm_contract: ours.id });
      expect(created.status, JSON.stringify(created.body)).toBe(201);
      expect((await call('PATCH', `/data/crm_sales_order/${order.id}`, { customer_po_number: `PO-${k}` })).status).toBe(200);
    }, 60_000);

    it.each([
      ['en', salesOrders, contracts],
      ['zh-CN', salesOrdersZhCN, contractsZhCN],
    ] as const)('every %s seeded order under a contract is under its own account\'s contract', (_locale, orders, ctrs) => {
      // A seed names its references by seed identity: the account by name,
      // the contract by its description.
      const accountOf = new Map((ctrs.records as Rec[]).map((c) => [String(c.description), String(c.crm_account)]));
      const under = (orders.records as Rec[]).filter((o) => o.crm_contract != null);
      expect(under.length, 'the renewal order is the seed\'s order under a contract').toBeGreaterThan(0);
      for (const o of under) expect(accountOf.get(String(o.crm_contract)), String(o.name)).toBe(String(o.crm_account));
    });
  });

  it('the manager deletes a confirmed order, and its lines go with it', async () => {
    const order = await draftOrder();
    await addLine(order.id, { product_title: 'Line B', quantity: 1, unit_price: 50 });
    expect((await call('PATCH', `/data/crm_sales_order/${order.id}`, { status: 'confirmed' })).status).toBe(200);
    // A rep holds no delete on orders (the quote's grant); the manager does.
    expect((await call('DELETE', `/data/crm_sales_order/${order.id}`)).status).toBe(403);
    const res = await verify.apiAs(manager.token, 'DELETE', `/data/crm_sales_order/${order.id}`);
    expect(res.status, await res.clone().text()).toBe(200);
    expect(await verify.rows('crm_sales_order_line', { crm_sales_order: order.id })).toEqual([]);
  }, 60_000);
});
