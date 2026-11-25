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
 * - Moved to another contract (ruling B on step 3, comment 7072581116): the
 *   rows that carried the previous contract move, its figures fall and the new
 *   one's rise. Cleared: those rows are cleared, and the next contract (set
 *   directly, or by Draft Contract) fills them, so A, then none, then B ends
 *   under B. A row naming any other contract stays; another order's rows are
 *   not touched; the order's and the account's figures do not move.
 * - The moved rows' history names the change and the person whose order edit
 *   caused it (a sales rep's edit names the rep).
 * - The ruling's two premises, pinned on the installed platform: the trigger
 *   hands the flow the previous contract, and a row moved between contracts
 *   leaves one contract's figures and joins the other's.
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
  let named = 0;

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
    // Activated, with the signed copy that state requires (#2317), when the
    // admin made the account and so owns a file the admin can open; a draft
    // otherwise. The figures sum the same either way.
    // Each contract its own name: the history names a contract by its title (hotcrm#2746).
    const contract = async (): Promise<Rec> => insert('crm_contract', {
      crm_account: account.id, crm_contact: contact.id,
      ...(as === admin
        ? { status: 'activated', signed_copy: await committedFile(verify, String(account.created_by)) }
        : { status: 'draft' }),
      name: `Later Contract ${++named}`, contract_term_months: 12, start_date: '2026-01-01', end_date: '2026-12-31', contract_value: 50000,
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

  /**
   * The order's contract changed or cleared (hotcrm#2724 step 3, ruling B):
   * the records that carried the previous contract follow it, a record on any
   * other contract stays.
   */
  describe('the order\'s contract changed', () => {
    const OBJECTS = ['crm_billing_milestone', 'crm_invoice', 'crm_payment'] as const;
    const idsOf = (rows: Awaited<ReturnType<typeof rowsOn>>): string[] => [rows.step.id, rows.inv.id, rows.pay.id];
    const contractsOf = async (rows: Awaited<ReturnType<typeof rowsOn>>): Promise<Array<string | null>> =>
      Promise.all(OBJECTS.map((object, i) => contractOf(object, idsOf(rows)[i]!)));
    /** Set the order's contract and wait for the flow's run number `n`. */
    const setContract = async (orderId: string, contract: string | null, n: number): Promise<void> => {
      await update('crm_sales_order', { id: orderId, crm_contract: contract });
      await vi.waitFor(async () => expect(await flowRuns(verify, FLOW, orderId)).toHaveLength(n), { timeout: 15_000, interval: 100 });
    };

    describe('to another contract', () => {
      let f: Awaited<ReturnType<typeof fixture>>;
      let rows: Awaited<ReturnType<typeof rowsOn>>;
      let a: Rec;
      let b: Rec;
      let c: Rec;
      let third: Rec;
      let cBefore: number[];

      beforeAll(async () => {
        f = await fixture();
        rows = await rowsOn(f.order.id);
        [a, b, c] = [await f.contract(), await f.contract(), await f.contract()];
        // Named while the order had no contract: a step on a third contract.
        third = await insert('crm_billing_milestone', {
          name: `Third ${++k}`, crm_sales_order: f.order.id, crm_contract: c.id, planned_amount: 700, planned_date: '2026-11-01',
        });
        await setContract(f.order.id, a.id, 1);
        cBefore = await figures('crm_contract', c.id);
        await setContract(f.order.id, b.id, 2);
      }, 120_000);

      it('the records that carried the previous contract move to the new one', async () => {
        expect(await contractsOf(rows)).toEqual([b.id, b.id, b.id]);
        for (const [i, object] of OBJECTS.entries()) expect((await row(object, idsOf(rows)[i]!)).crm_account, object).toBe(f.account.id);
      });

      it('the previous contract\'s figures fall and the new one\'s rise', async () => {
        expect(await figures('crm_contract', a.id)).toEqual([0, 0, 0]);
        expect(await figures('crm_contract', b.id)).toEqual([5000, 4000, 2500]);
      });

      it('a record on a third contract stays, and its contract\'s figures do not move', async () => {
        expect(await contractOf('crm_billing_milestone', third.id)).toBe(c.id);
        expect(await figures('crm_contract', c.id)).toEqual(cBefore);
      });

      it('the move\'s run wrote the three records and failed none', async () => {
        const runs = await flowRuns(verify, FLOW, f.order.id);
        const last = runs.sort((x, y) => String(x.started_at).localeCompare(String(y.started_at))).at(-1)!;
        expect(last.status).toBe('completed');
        expect(last.summary).toMatchObject({ selected: 3, acted: 3, failed: 0 });
      });

      it('each moved record\'s history names the change of contract', async () => {
        const [entry] = (await verify.rows('sys_activity', { object_name: 'crm_invoice', record_id: rows.inv.id }))
          .filter((r: Rec) => JSON.stringify(r.metadata ?? '').includes(b.id) && String(r.summary ?? '').length > 0)
          .sort((x: Rec, y: Rec) => String(y.timestamp).localeCompare(String(x.timestamp)));
        expect(entry, 'a history entry for the move').toBeTruthy();
        const meta = typeof entry!.metadata === 'string' ? JSON.parse(entry!.metadata) : entry!.metadata;
        expect(meta.new).toMatchObject({ crm_contract: b.id });
        expect(meta.old).toMatchObject({ crm_contract: a.id });
        // `trackHistory` on the field: the entry reads "Contract: A → B", not
        // the generic "Updated Invoice …" line an untracked field gets. A
        // contract is named by its title, its name since hotcrm#2746.
        const title = async (id: string): Promise<string> => String((await row('crm_contract', id)).name);
        expect(String(entry!.summary)).toBe(`Contract: ${await title(a.id)} → ${await title(b.id)}`);
        // The system write names the person whose order edit triggered it
        // (here the administrator who made the order), not the system.
        expect(entry!.actor_id).toBe(f.account.created_by);
      });
    });

    it('a sales rep\'s order edit moves finance\'s invoice and payment, and their history names the rep', async () => {
      const f = await fixture(rep.token);
      const rows = await rowsOn(f.order.id);
      const [a, b] = [await f.contract(), await f.contract()];
      await update('crm_sales_order', { id: f.order.id, crm_contract: a.id }, rep.token);
      await vi.waitFor(async () => expect(await contractsOf(rows)).toEqual([a.id, a.id, a.id]), { timeout: 15_000, interval: 100 });
      await update('crm_sales_order', { id: f.order.id, crm_contract: b.id }, rep.token);
      await vi.waitFor(async () => expect(await contractsOf(rows)).toEqual([b.id, b.id, b.id]), { timeout: 15_000, interval: 100 });
      for (const [object, id] of [['crm_invoice', rows.inv.id], ['crm_payment', rows.pay.id]] as const) {
        const moves = (await verify.rows('sys_activity', { object_name: object, record_id: id }))
          .filter((r: Rec) => { const m = typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata; return m?.new?.crm_contract === b.id; });
        expect(moves, object).toHaveLength(1);
        expect(moves[0]!.actor_id, object).toBe(rep.id);
      }
    }, 120_000);

    describe('cleared', () => {
      it('the records that carried it are cleared, and the contract\'s figures fall', async () => {
        const f = await fixture();
        const rows = await rowsOn(f.order.id);
        const a = await f.contract();
        await setContract(f.order.id, a.id, 1);
        expect(await contractsOf(rows)).toEqual([a.id, a.id, a.id]);
        await setContract(f.order.id, null, 2);
        expect(await contractsOf(rows)).toEqual([null, null, null]);
        expect(await figures('crm_contract', a.id)).toEqual([0, 0, 0]);
        expect(await figures('crm_sales_order', f.order.id), 'the order still counts them').toEqual([5000, 4000, 2500]);
      }, 120_000);

      it('then another contract: the records end under it', async () => {
        const f = await fixture();
        const rows = await rowsOn(f.order.id);
        const [a, b] = [await f.contract(), await f.contract()];
        await setContract(f.order.id, a.id, 1);
        await setContract(f.order.id, null, 2);
        await setContract(f.order.id, b.id, 3);
        expect(await contractsOf(rows)).toEqual([b.id, b.id, b.id]);
        expect(await figures('crm_contract', a.id)).toEqual([0, 0, 0]);
        expect(await figures('crm_contract', b.id)).toEqual([5000, 4000, 2500]);
      }, 120_000);

      it('then Draft Contract, as a sales rep: the records take the drafted contract', async () => {
        const f = await fixture(rep.token);
        const rows = await rowsOn(f.order.id);
        const a = await f.contract();
        await setContract(f.order.id, a.id, 1);
        await setContract(f.order.id, null, 2);
        await verify.flows.run('sales_order_draft_contract', { recordId: f.order.id, objectName: 'crm_sales_order' }, { as: rep.token });
        const drafted = (await row('crm_sales_order', f.order.id)).crm_contract;
        expect(drafted, 'Draft Contract named a contract on the order').toBeTruthy();
        await vi.waitFor(async () => expect(await contractsOf(rows)).toEqual([drafted, drafted, drafted]), { timeout: 15_000, interval: 100 });
        expect(await figures('crm_contract', a.id)).toEqual([0, 0, 0]);
        expect(await figures('crm_contract', drafted)).toEqual([5000, 4000, 2500]);
      }, 120_000);
    });
  });

  /**
   * The two premises the ruling on step 3 rests on (hotcrm#2724, ruling B,
   * comment 7072581116), pinned on the platform as installed.
   */
  describe('the premises of a move', () => {
    it('(a) the trigger hands the flow the order\'s previous contract', async () => {
      const f = await fixture();
      await rowsOn(f.order.id);
      const a = await f.contract();
      const b = await f.contract();
      await update('crm_sales_order', { id: f.order.id, crm_contract: a.id });
      await vi.waitFor(async () => expect(await flowRuns(verify, FLOW, f.order.id)).toHaveLength(1), { timeout: 15_000, interval: 100 });
      // Another field of an order already under A: the start condition reads
      // `previous.crm_contract != record.crm_contract`. An absent previous
      // would satisfy `!has(previous.crm_contract)` and record a second run.
      await update('crm_sales_order', { id: f.order.id, customer_po_number: `PO-${++k}` });
      await new Promise((r) => setTimeout(r, 1500));
      expect(await flowRuns(verify, FLOW, f.order.id), 'no run when the contract did not change').toHaveLength(1);
      // A to B: previous now differs from the record, so a run is recorded.
      await update('crm_sales_order', { id: f.order.id, crm_contract: b.id });
      await vi.waitFor(async () => expect(await flowRuns(verify, FLOW, f.order.id)).toHaveLength(2), { timeout: 15_000, interval: 100 });
    }, 120_000);

    it('(b) a record moved from one contract to another leaves the old contract\'s figures and joins the new one\'s', async () => {
      const f = await fixture();
      const rows = await rowsOn(f.order.id);
      const a = await f.contract();
      const b = await f.contract();
      await update('crm_sales_order', { id: f.order.id, crm_contract: a.id });
      await vi.waitFor(async () => expect(await contractOf('crm_payment', rows.pay.id)).toBe(a.id), { timeout: 15_000, interval: 100 });
      expect(await figures('crm_contract', a.id)).toEqual([5000, 4000, 2500]);
      // The order moved to B, then each record written to B by id, by hand: the
      // summaries' recompute on a changed lookup is the subject, not the flow.
      await update('crm_sales_order', { id: f.order.id, crm_contract: b.id });
      await vi.waitFor(async () => expect(await flowRuns(verify, FLOW, f.order.id)).toHaveLength(2), { timeout: 15_000, interval: 100 });
      for (const [object, id] of [['crm_billing_milestone', rows.step.id], ['crm_invoice', rows.inv.id], ['crm_payment', rows.pay.id]] as const) {
        if (await contractOf(object, id) !== b.id) await update(object, { id, crm_contract: b.id });
      }
      for (const [object, id] of [['crm_billing_milestone', rows.step.id], ['crm_invoice', rows.inv.id], ['crm_payment', rows.pay.id]] as const) {
        expect(await contractOf(object, id), object).toBe(b.id);
      }
      expect(await figures('crm_contract', a.id), 'the old contract falls').toEqual([0, 0, 0]);
      expect(await figures('crm_contract', b.id), 'the new contract rises').toEqual([5000, 4000, 2500]);
    }, 120_000);
  });
});
