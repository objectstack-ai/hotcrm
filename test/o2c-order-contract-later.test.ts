// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { SalesOrderContractFillFlow } from '../src/o2c/flows/sales-order-contract-fill.flow';
import { o2cStack, appStack } from '../objectstack.composition';
import { hotcrmStack, signUpPerson, committedFile, flowRuns, type Person } from './helpers/verify-stack';

/**
 * An order placed under a contract after its rows exist (hotcrm#2724, the
 * follow-up of hotcrm#2560).
 *
 * A row that names an order takes the order's contract when it is saved
 * (`src/o2c/objects/_row-stamp.ts`). Measured on `main` at `e7fe77f`, before
 * this change: an order with no contract carried a plan step (5000), an
 * invoice (4000) and a payment (2500); placing it under a contract left all
 * three rows with no contract and the contract's Planned, Invoiced and
 * Received at 0, 0 and 0, while the order read 5000, 4000 and 2500.
 * `sales_order_contract_fill` (`src/o2c/flows/`) fills those rows.
 *
 * - Edited on the order, or drafted by Draft Contract: the three rows take the
 *   contract, and the contract's figures count them at once.
 * - A row that already names a contract keeps it; another order's rows are
 *   not touched; the order's and the account's figures do not move.
 * - The flow is the module's, on the app package's order: no hook attaches to
 *   `crm_sales_order` (ADR-0130 R4).
 */

type Rec = Record<string, any>;
const num = (v: unknown): number => Number(v ?? 0);
const FIGURES = ['planned_amount', 'invoiced_amount', 'received_amount'] as const;
const FLOW = 'sales_order_contract_fill';

describe('the shape', () => {
  it('the module ships the flow on the order, and no hook on the order', () => {
    expect(SalesOrderContractFillFlow.name).toBe(FLOW);
    expect((o2cStack.flows ?? []).map((f) => f.name)).toContain(FLOW);
    expect((appStack.flows ?? []).map((f) => f.name)).not.toContain(FLOW);
    const start = SalesOrderContractFillFlow.nodes.find((n) => n.type === 'start')!.config as Rec;
    expect(start).toMatchObject({ objectName: 'crm_sales_order', triggerType: 'record-after-update' });
    expect((o2cStack.hooks ?? []).map((h) => h.object)).not.toContain('crm_sales_order');
  });
});

describe('on the booted stack', () => {
  let verify: VerifyStack;
  let admin: string;
  let finance: Person;
  let rep: Person;
  let k = 0;

  const insert = (object: string, doc: Rec, as: string = admin): Promise<Rec> => verify.hooks.run(object, 'insert', doc, { as });
  const update = (object: string, doc: Rec, as: string = admin): Promise<Rec> => verify.hooks.run(object, 'update', doc, { as });
  const row = async (object: string, id: string): Promise<Rec> => (await verify.rows(object, { id }))[0]!;
  const figures = async (object: string, id: string): Promise<number[]> => {
    const r = await row(object, id);
    return FIGURES.map((f) => num(r[f]));
  };
  const delta = (after: number[], before: number[]): number[] => after.map((v, i) => v - before[i]!);
  const contractOf = async (object: string, id: string): Promise<string | null> => (await row(object, id)).crm_contract ?? null;

  /** An account with a contact, an order with no contract, and a contract maker on the same account. */
  const fixture = async (as: string = admin): Promise<{ account: Rec; order: Rec; contract: () => Promise<Rec> }> => {
    const n = ++k;
    const account = await insert('crm_account', { name: `Later Corp ${n}`, type: 'customer', industry: 'technology' }, as);
    const contact = await insert('crm_contact', {
      first_name: 'Lee', last_name: `Later ${n}`, email: `lee${n}@o2c-order-contract-later.test`, crm_account: account.id,
    }, as);
    const order = await insert('crm_sales_order', {
      name: `Later Order ${n}`, crm_account: account.id, crm_contact: contact.id, status: 'confirmed', order_date: '2026-10-01', payment_terms: 'net_15',
    }, as);
    const contract = async (): Promise<Rec> => insert('crm_contract', {
      crm_account: account.id, crm_contact: contact.id, status: 'activated',
      signed_copy: await committedFile(verify, String(account.created_by)),
      contract_term_months: 12, start_date: '2026-01-01', end_date: '2026-12-31', contract_value: 50000,
    });
    return { account, order, contract };
  };

  /** A plan step, an issued invoice on it, and a payment on the invoice, all on `orderId`. */
  const rowsOn = async (orderId: string): Promise<{ step: Rec; inv: Rec; pay: Rec }> => {
    const step = await insert('crm_billing_milestone', {
      name: `Later step ${++k}`, crm_sales_order: orderId, planned_amount: 5000, planned_date: '2026-11-01',
    });
    const inv = await insert('crm_invoice', {
      invoice_number: `INV-LATER-${++k}`, crm_sales_order: orderId, crm_billing_milestone: step.id, issue_date: '2026-10-05', amount: 4000,
    }, finance.token);
    const pay = await insert('crm_payment', { crm_invoice: inv.id, payment_date: '2026-10-10', amount: 2500 }, finance.token);
    return { step, inv, pay };
  };

  beforeAll(async () => {
    verify = await hotcrmStack();
    admin = await verify.signIn();
    finance = await signUpPerson(verify, 'fin@o2c-order-contract-later.test', {
      name: 'Later Finance', positions: ['crm_ar_accountant'], permissionSets: ['ar_accountant'],
    });
    rep = await signUpPerson(verify, 'rep@o2c-order-contract-later.test', {
      name: 'Later Rep', positions: ['crm_sales_rep'], permissionSets: ['sales_rep'],
    });
  }, 180_000);

  describe('the contract set on the order', () => {
    let f: Awaited<ReturnType<typeof fixture>>;
    let rows: Awaited<ReturnType<typeof rowsOn>>;
    let framework: Rec;
    let other: Rec;
    let kept: Rec;
    let otherOrderStep: Rec;
    let contractBefore: number[];
    let otherBefore: number[];
    let orderBefore: number[];
    let accountBefore: number[];

    beforeAll(async () => {
      f = await fixture();
      rows = await rowsOn(f.order.id);
      framework = await f.contract();
      other = await f.contract();
      // A step on the order that already names a contract of the account: it keeps it.
      kept = await insert('crm_billing_milestone', {
        name: `Kept ${++k}`, crm_sales_order: f.order.id, crm_contract: other.id, planned_amount: 700, planned_date: '2026-11-01',
      });
      // Another order of the account, with a step and no contract: not touched.
      const second = await insert('crm_sales_order', {
        name: `Later Second ${++k}`, crm_account: f.account.id, status: 'confirmed', order_date: '2026-10-01',
      });
      otherOrderStep = await insert('crm_billing_milestone', {
        name: `Second ${++k}`, crm_sales_order: second.id, planned_amount: 300, planned_date: '2026-11-01',
      });
      expect(await contractOf('crm_invoice', rows.inv.id), 'fixture: the rows start with no contract').toBeNull();
      contractBefore = await figures('crm_contract', framework.id);
      otherBefore = await figures('crm_contract', other.id);
      orderBefore = await figures('crm_sales_order', f.order.id);
      accountBefore = await figures('crm_account', f.account.id);
      await update('crm_sales_order', { id: f.order.id, crm_contract: framework.id });
      await vi.waitFor(async () => expect(await contractOf('crm_payment', rows.pay.id)).toBe(framework.id), { timeout: 15_000, interval: 100 });
    }, 120_000);

    it('the plan step, the invoice and the payment take the order\'s contract', async () => {
      for (const [object, id] of [['crm_billing_milestone', rows.step.id], ['crm_invoice', rows.inv.id], ['crm_payment', rows.pay.id]] as const) {
        const r = await row(object, id);
        expect(r.crm_contract, object).toBe(framework.id);
        expect(r.crm_account, object).toBe(f.account.id);
      }
    });

    it('the contract\'s planned, invoiced and received count them at once', async () => {
      expect(delta(await figures('crm_contract', framework.id), contractBefore)).toEqual([5000, 4000, 2500]);
    });

    it('a row that already names a contract keeps it, and that contract\'s figures do not move', async () => {
      expect(await contractOf('crm_billing_milestone', kept.id)).toBe(other.id);
      expect(delta(await figures('crm_contract', other.id), otherBefore)).toEqual([0, 0, 0]);
    });

    it('another order\'s rows, the order\'s own figures and the account\'s do not move', async () => {
      expect(await contractOf('crm_billing_milestone', otherOrderStep.id)).toBeNull();
      expect(await figures('crm_sales_order', f.order.id)).toEqual(orderBefore);
      expect(await figures('crm_account', f.account.id)).toEqual(accountBefore);
    });

    it('the run history records one run that wrote the three rows and failed none', async () => {
      const runs = await flowRuns(verify, FLOW, f.order.id);
      expect(runs).toHaveLength(1);
      expect(runs[0]!.status).toBe('completed');
      // A refused row is caught per row (`guarded`), so the run still
      // completes; the summary is where a skipped row shows.
      expect(runs[0]!.summary).toMatchObject({ selected: 3, acted: 3, failed: 0 });
    });
  });

  describe('Draft Contract on the order, as a sales rep', () => {
    it('the rows take the drafted contract', async () => {
      const f = await fixture(rep.token);
      const rows = await rowsOn(f.order.id);
      await verify.flows.run('sales_order_draft_contract', { recordId: f.order.id, objectName: 'crm_sales_order' }, { as: rep.token });
      const drafted = (await row('crm_sales_order', f.order.id)).crm_contract;
      expect(drafted, 'Draft Contract named a contract on the order').toBeTruthy();
      await vi.waitFor(async () => expect(await contractOf('crm_payment', rows.pay.id)).toBe(drafted), { timeout: 15_000, interval: 100 });
      expect(await contractOf('crm_billing_milestone', rows.step.id)).toBe(drafted);
      expect(await contractOf('crm_invoice', rows.inv.id)).toBe(drafted);
      expect(await figures('crm_contract', drafted)).toEqual([5000, 4000, 2500]);
    }, 120_000);
  });
});
