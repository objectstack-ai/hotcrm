// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { BillingMilestone } from '../src/o2c/objects/billing_milestone.object';
import { Invoice } from '../src/o2c/objects/invoice.object';
import { Payment } from '../src/o2c/objects/payment.object';
import { ContractAccountExtensions, SalesOrderExtensions } from '../src/o2c/extensions';
import { InvoiceImportMapping, PaymentImportMapping } from '../src/o2c/mappings';
import { BillingMilestoneViews, InvoiceViews, PaymentViews } from '../src/o2c/views';
import { SalesOrder } from '../src/sales/objects/sales_order.object';
import { hotcrmStack, signUpPerson, type Person } from './helpers/verify-stack';

/**
 * Order to Cash step B3 (REQ-0010 rules 4–5, hotcrm#2560): plan steps,
 * invoices and payments may cite a sales order, and the order page shows what
 * is planned, invoiced and received against it.
 *
 * - The shape: an optional `crm_sales_order` lookup on each of the three
 *   objects (its related list is the order page's tab), a plan step that
 *   names an order or a contract, the order's three figures contributed by
 *   the module with the contract's own definitions, an Order column in both
 *   imports.
 * - On the booted stack: an order with no contract carries a plan, an invoice
 *   and a payment, and its figures and the account's agree; a row under an
 *   order under a framework contract takes the contract, so the order shows
 *   its own figures and the contract the total under it; the invoice's due
 *   date reads the contract's terms, else the order's, else stays typed; a
 *   mismatch of account or contract is refused, envelope asserted; an import
 *   names the order by its number or its external reference; and with the
 *   module disabled the order is served without the figures and still works.
 */

type Rec = Record<string, any>;
const num = (v: unknown): number => Number(v ?? 0);
const FIGURES = ['planned_amount', 'invoiced_amount', 'received_amount'] as const;

describe('the shape', () => {
  const objects = [
    ['crm_billing_milestone', BillingMilestone, 'cascade'],
    ['crm_invoice', Invoice, 'restrict'],
    ['crm_payment', Payment, 'restrict'],
  ] as const;

  it.each(objects)('%s cites an order through an optional lookup beside the contract, which fills the account', (_name, object, onDelete) => {
    const field = object.fields.crm_sales_order as Rec;
    expect(field.type).toBe('lookup');
    expect(field.reference).toBe('crm_sales_order');
    expect(field.required ?? false).toBe(false);
    expect(field.storage?.notNull ?? false, 'a new column, nullable').toBe(false);
    expect(field.group).toBe((object.fields.crm_contract as Rec).group);
    expect(field.dependsOn, 'as the contract lookup: a dependsOn hides the order the order page prefills').toBe((object.fields.crm_contract as Rec).dependsOn);
    expect(field.lookupAutofill).toContainEqual({ target: 'crm_account', source: 'crm_account', overwrite: true });
    expect(field.deleteBehavior, 'as the contract lookup on the same object').toBe((object.fields.crm_contract as Rec).deleteBehavior);
    expect(field.deleteBehavior).toBe(onDelete);
    expect(field.relatedListColumns, 'the tab on the order page').toBeDefined();
  });

  it('the three list views show the order', () => {
    for (const views of [BillingMilestoneViews, InvoiceViews, PaymentViews]) {
      const columns = (views.list!.columns as Array<{ field: string }>).map((c) => c.field);
      expect(columns).toContain('crm_sales_order');
    }
  });

  it('a plan step names an order or a contract; the contract-only rule is gone', () => {
    const names = (BillingMilestone.validations ?? []).map((v: Rec) => v.name);
    expect(names).toContain('billing_milestone_source');
    expect(names).not.toContain('billing_milestone_contract');
  });

  it('the order\'s figures are the contract\'s definitions over the order, in the order\'s Pricing section', () => {
    const [ext] = SalesOrderExtensions;
    expect(ext!.extend).toBe('crm_sales_order');
    // Unpaid, Uninvoiced and Payment Plan Differs since hotcrm#2806, pinned in
    // `test/o2c-parallel-figures.test.ts`.
    expect(Object.keys(ext!.fields).sort()).toEqual([...FIGURES, 'unpaid_amount', 'uninvoiced_amount', 'plan_differs'].sort());
    const declared = new Set((SalesOrder.fieldGroups ?? []).map((g: Rec) => g.key));
    const contract = ContractAccountExtensions.find((e) => e.extend === 'crm_contract')!.fields as Rec;
    for (const f of FIGURES) {
      const field = (ext!.fields as Rec)[f];
      expect(field.group).toBe('pricing');
      expect(declared.has(field.group), 'a section the order declares').toBe(true);
      expect(field.summaryOperations).toEqual({ ...contract[f].summaryOperations, relationshipField: 'crm_sales_order' });
    }
  });

  it.each([InvoiceImportMapping, PaymentImportMapping])('$name carries an optional Order column', (mapping) => {
    expect((mapping.fieldMapping as Rec[]).find((e) => e.target === 'crm_sales_order')).toMatchObject({ source: 'Order', transform: 'lookup' });
  });
});

describe('on the booted stack', () => {
  let verify: VerifyStack;
  let admin: string;
  let finance: Person;
  let k = 0;

  const insert = (object: string, doc: Rec, as: string = admin): Promise<Rec> => verify.hooks.run(object, 'insert', doc, { as });
  const row = async (object: string, id: string): Promise<Rec> => (await verify.rows(object, { id }))[0]!;
  const figures = async (object: string, id: string): Promise<number[]> => {
    const r = await row(object, id);
    return ['planned_amount', 'invoiced_amount', 'received_amount'].map((f) => num(r[f]));
  };
  /** Refused with the ADR envelope, and the message naming what it should. */
  const refusedNaming = async (attempt: Promise<unknown>, ...names: string[]): Promise<void> => {
    const err = (await attempt.then(() => null, (e: unknown) => e)) as Rec | null;
    expect(err, 'the write is refused').not.toBeNull();
    expect(err).toMatchObject({ code: 'VALIDATION_FAILED', status: 400 });
    for (const name of names) expect(String(err!.message)).toContain(name);
  };

  let globex: Rec; // seeded: no contract, Net 60
  let acmeOrder: Rec; // seeded: under Acme's activated contract, Net 30
  let acmeContract: Rec;
  let wayne: Rec; // Wayne's contract, Net 60, account Wayne

  beforeAll(async () => {
    verify = await hotcrmStack();
    admin = await verify.signIn();
    finance = await signUpPerson(verify, 'fin@o2c-sales-order.test', {
      name: 'Order Finance', positions: ['crm_ar_accountant'], permissionSets: ['ar_accountant'],
    });
    [globex] = await verify.rows('crm_sales_order', { name: 'Globex Seat Expansion Order' });
    [acmeOrder] = await verify.rows('crm_sales_order', { name: 'Acme Annual Renewal 2025 Order' });
    [wayne] = await verify.rows('crm_contract', { payment_terms: 'net_60' });
    expect(globex && acmeOrder && wayne, 'fixture: the seeded orders and Wayne\'s contract').toBeTruthy();
    expect(globex.crm_contract ?? null, 'fixture: Globex\'s order has no contract').toBeNull();
    acmeContract = await row('crm_contract', acmeOrder.crm_contract);
    expect(acmeContract.crm_account).toBe(acmeOrder.crm_account);
  }, 180_000);

  describe('the seeded order with no contract', () => {
    it('carries a plan, an invoice and a payment, and its page reads what they count', async () => {
      const [i] = await verify.rows('crm_invoice', { invoice_number: 'INV-01024' });
      const [p] = await verify.rows('crm_payment', { erp_ref: 'TRX-151360' });
      expect(i.crm_sales_order).toBe(globex.id);
      expect(i.crm_account).toBe(globex.crm_account);
      expect(p.crm_sales_order, 'the payment took its plan step\'s order').toBe(globex.id);
      // Invoices and payments run in parallel (hotcrm#2806): neither names the other.
      expect(p.crm_invoice ?? null).toBeNull();
      expect(i.crm_billing_milestone ?? null).toBeNull();
      expect(await figures('crm_sales_order', globex.id)).toEqual([22464, 11232, 11232]);
    });
  });

  describe('an order with no contract', () => {
    let account: Rec;
    let order: Rec;
    let accountBefore: Rec;
    let step: Rec;
    let inv: Rec;
    let pay: Rec;

    beforeAll(async () => {
      account = await insert('crm_account', { name: 'Order Only Corp', type: 'customer', industry: 'technology' });
      order = await insert('crm_sales_order', {
        name: 'Order Only Hardware', crm_account: account.id, status: 'confirmed', order_date: '2026-10-01', payment_terms: 'net_15',
      });
      accountBefore = await row('crm_account', account.id);
      step = await insert('crm_billing_milestone', {
        name: `On delivery ${++k}`, crm_sales_order: order.id, planned_amount: 5000, planned_date: '2026-11-01',
      });
      inv = await insert('crm_invoice', {
        invoice_number: `INV-SO-${++k}`, crm_sales_order: order.id, crm_billing_milestone: step.id, issue_date: '2026-10-05', amount: 4000,
      }, finance.token);
      await insert('crm_invoice', {
        invoice_number: `INV-SO-${++k}`, crm_sales_order: order.id, issue_date: '2026-10-05', due_date: '2026-10-20', amount: 700, status: 'cancelled',
      }, finance.token);
      pay = await insert('crm_payment', { crm_invoice: inv.id, payment_date: '2026-10-10', amount: 2500 }, finance.token);
      // An advance on the order itself, set against no invoice yet.
      await insert('crm_payment', { crm_sales_order: order.id, payment_date: '2026-10-11', amount: 300 }, finance.token);
    }, 120_000);

    it('a plan step naming only the order is accepted and lands under the order\'s account', async () => {
      const s = await row('crm_billing_milestone', step.id);
      expect(s.crm_account).toBe(account.id);
      expect(s.crm_contract ?? null).toBeNull();
    });

    it('the invoice takes the order\'s payment terms for its due date (no contract to read)', async () => {
      const i = await row('crm_invoice', inv.id);
      expect(i.crm_account).toBe(account.id);
      expect(String(i.due_date).slice(0, 10)).toBe('2026-10-20');
    });

    it('a payment naming only its invoice takes the invoice\'s order and step', async () => {
      const p = await row('crm_payment', pay.id);
      expect(p.crm_sales_order).toBe(order.id);
      expect(p.crm_billing_milestone).toBe(step.id);
      expect(p.crm_account).toBe(account.id);
    });

    it('the order reads planned, invoiced (issued only) and received, and the account\'s figures agree', async () => {
      expect(await figures('crm_sales_order', order.id)).toEqual([5000, 4000, 2800]);
      const a = await row('crm_account', account.id);
      expect(num(a.invoiced_amount) - num(accountBefore.invoiced_amount)).toBe(4000);
      expect(num(a.received_amount) - num(accountBefore.received_amount)).toBe(2800);
    });
  });

  describe('an order under a framework contract', () => {
    let contractBefore: number[];
    let orderBefore: number[];
    let step: Rec;
    let inv: Rec;

    beforeAll(async () => {
      contractBefore = await figures('crm_contract', acmeContract.id);
      orderBefore = await figures('crm_sales_order', acmeOrder.id);
      step = await insert('crm_billing_milestone', {
        name: `Renewal ${++k}`, crm_sales_order: acmeOrder.id, planned_amount: 9000, planned_date: '2026-12-01',
      });
      inv = await insert('crm_invoice', {
        invoice_number: `INV-FW-${++k}`, crm_sales_order: acmeOrder.id, crm_billing_milestone: step.id, issue_date: '2026-10-01', amount: 6000,
      });
      await insert('crm_payment', { crm_invoice: inv.id, payment_date: '2026-10-02', amount: 1000 });
    }, 120_000);

    it('a row citing the order takes the order\'s contract and account', async () => {
      for (const [object, id] of [['crm_billing_milestone', step.id], ['crm_invoice', inv.id]] as const) {
        const r = await row(object, id);
        expect(r.crm_contract, object).toBe(acmeContract.id);
        expect(r.crm_account, object).toBe(acmeOrder.crm_account);
      }
    });

    it('the order shows its own figures, and the contract the same rows within its total, counted once', async () => {
      const order = await figures('crm_sales_order', acmeOrder.id);
      const contract = await figures('crm_contract', acmeContract.id);
      expect(order.map((v, i) => v - orderBefore[i]!)).toEqual([9000, 6000, 1000]);
      expect(contract.map((v, i) => v - contractBefore[i]!)).toEqual([9000, 6000, 1000]);
    });

    it('the due date reads the contract\'s terms before the order\'s', async () => {
      const order = await insert('crm_sales_order', {
        name: `Wayne call-off ${++k}`, crm_account: wayne.crm_account, crm_contract: wayne.id, status: 'draft', order_date: '2026-10-01', payment_terms: 'net_15',
      });
      const i = await insert('crm_invoice', { invoice_number: `INV-FW-${++k}`, crm_sales_order: order.id, issue_date: '2026-10-01', amount: 1 });
      const r = await row('crm_invoice', i.id);
      expect(r.crm_contract).toBe(wayne.id);
      expect(String(r.due_date).slice(0, 10), 'Net 60, the contract\'s, not the order\'s Net 15').toBe('2026-11-30');
    });
  });

  describe('a mismatch is refused', () => {
    it('an order of another account, with the account named', async () => {
      await refusedNaming(insert('crm_invoice', {
        invoice_number: `INV-MM-${++k}`, crm_account: wayne.crm_account, crm_sales_order: globex.id, issue_date: '2026-10-01', amount: 1,
      }), String(globex.order_number), 'another account');
    });

    it('a contract other than the order\'s own', async () => {
      await refusedNaming(insert('crm_billing_milestone', {
        name: `MM ${++k}`, crm_sales_order: acmeOrder.id, crm_contract: wayne.id, planned_amount: 1, planned_date: '2026-12-01',
      }), String(acmeOrder.order_number), 'another contract');
    });

    it('an order and a contract of two different accounts, naming both', async () => {
      await refusedNaming(insert('crm_payment', {
        crm_sales_order: globex.id, crm_contract: wayne.id, payment_date: '2026-10-01', amount: 1,
      }), String(globex.order_number), String(wayne.contract_number), 'different accounts');
    });

    it('control: the order\'s own contract and account pass', async () => {
      const s = await insert('crm_billing_milestone', {
        name: `Own ${++k}`, crm_account: acmeOrder.crm_account, crm_sales_order: acmeOrder.id, crm_contract: acmeContract.id, planned_amount: 1, planned_date: '2026-12-01',
      });
      expect((await row('crm_billing_milestone', s.id)).crm_sales_order).toBe(acmeOrder.id);
    });
  });

  describe('importing', () => {
    const csv = (lines: string[]): string => `${lines.join('\n')}\n`;

    it('the Order column takes the order number or the order\'s external reference', async () => {
      await verify.hooks.run('crm_sales_order', 'update', { id: globex.id, external_ref: 'SHOP-GLX-9' }, { as: admin });
      const res = await verify.apiAs(finance.token, 'POST', '/data/crm_invoice/import', {
        mappingName: 'crm_invoice_import',
        format: 'csv',
        csv: csv([
          'ERP Reference,Invoice Number,Account,Order,Contract,Billing Milestone,Issue Date,Due Date,Amount,Status',
          `ERP-SO-1,INV-IMP-SO-1,,${globex.order_number},,,2026-10-01,,100,Issued`,
          'ERP-SO-2,INV-IMP-SO-2,,SHOP-GLX-9,,,2026-10-01,2026-10-31,200,Issued',
        ]),
      });
      expect(res.status, await res.clone().text()).toBeLessThan(300);
      for (const ref of ['ERP-SO-1', 'ERP-SO-2']) {
        const [i] = await verify.rows('crm_invoice', { erp_ref: ref });
        expect(i, ref).toBeTruthy();
        expect(i!.crm_sales_order, ref).toBe(globex.id);
        expect(i!.crm_account, ref).toBe(globex.crm_account);
      }
      const [first] = await verify.rows('crm_invoice', { erp_ref: 'ERP-SO-1' });
      expect(String(first!.due_date).slice(0, 10), 'the order\'s Net 60').toBe('2026-11-30');
    });
  });

  describe('with the module disabled', () => {
    const PKG = '/packages/app.objectstack.hotcrm.o2c';
    afterAll(async () => {
      await verify.apiAs(admin, 'PATCH', `${PKG}/enable`);
    });

    // A package switch re-registers metadata; past the 5 s default under the full suite (hotcrm#2623).
    it('the order page shows none of the figures and still works; they come back on enable', async () => {
      const fields = async (): Promise<string[]> => {
        const res = await verify.apiAs(admin, 'GET', '/meta/object/crm_sales_order');
        const body = (await res.json()) as Rec;
        return Object.keys((body.item ?? body.data ?? body).fields ?? {});
      };
      expect(await fields()).toEqual(expect.arrayContaining([...FIGURES]));
      expect((await verify.apiAs(admin, 'PATCH', `${PKG}/disable`)).status).toBe(200);
      try {
        const served = await fields();
        for (const f of FIGURES) expect(served, f).not.toContain(f);
        expect(served).toContain('total_price');
        const read = await verify.apiAs(admin, 'GET', `/data/crm_sales_order/${globex.id}`);
        expect(read.status).toBe(200);
        const { record } = (await read.json()) as { record: Rec };
        for (const f of FIGURES) expect(record, f).not.toHaveProperty(f);
        const edit = await verify.apiAs(admin, 'PATCH', `/data/crm_sales_order/${globex.id}`, { customer_po_number: 'GLX-4471-B' });
        expect(edit.status, await edit.clone().text()).toBeLessThan(300);
      } finally {
        expect((await verify.apiAs(admin, 'PATCH', `${PKG}/enable`)).status).toBe(200);
      }
      expect(await fields()).toEqual(expect.arrayContaining([...FIGURES]));
    }, 120_000);
  });
});
