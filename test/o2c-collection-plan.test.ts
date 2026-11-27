// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { hotcrmStack, signUpPerson, committedFile, type Person } from './helpers/verify-stack';
import { Invoice } from '../src/o2c/objects/invoice.object';
import { Payment } from '../src/o2c/objects/payment.object';

type Rec = Record<string, any>;

/**
 * Order to Cash, phase 1a (#2315, REQ-0007): the module's hooks and the
 * figures they and the summaries keep, on the shipped app booted by
 * `@objectstack/verify`.
 *
 * - `*_row_stamp` (one per object) — the contract's account is stamped on the
 *   row, and an account that is not the contract's is refused; a missing
 *   contract is filled from the step or the invoice; an imported invoice or
 *   payment is dated `synced_at`. The rows belong to the account since
 *   hotcrm#2557, and the contract is an optional source (a plan step needs
 *   it or an order, `billing_milestone_source`; the order's half is
 *   `test/o2c-sales-order.test.ts`).
 * - `invoice_plan_step_guard` — an invoice naming another account's plan step
 *   is refused, by the step's own name (hotcrm#2755: the form's picker lists
 *   every account's steps, so this rule is what keeps them apart).
 * - `invoice_figures` — a blank due date takes the contract's payment terms,
 *   and `open_amount` follows the payments and the status.
 * - `payment_plan_step_stamp` — a payment takes its invoice's plan step, and a
 *   payment naming another account's invoice or plan step is refused, by the
 *   invoice's or the step's own name (hotcrm#2755: the form's pickers list
 *   every account's, so this rule is what keeps them apart).
 *
 * Since hotcrm#2806 (invoices and payments run in parallel) the payment's
 * invoice, the invoice's plan step and its paid / open / overpaid are hidden,
 * not deleted: no form or import writes them, and the stamps and guards above
 * still hold what an API write or an earlier row names to the account.
 *
 * Real writes: each refusal is the engine's answer, envelope asserted.
 */

let verify: VerifyStack;
let admin: string;
let rep: Person;
let wayne: Rec; // in approval, net_60
let acme: Rec; // activated, net_30
let k = 0;

beforeAll(async () => {
  verify = await hotcrmStack();
  admin = await verify.signIn();
  rep = await signUpPerson(verify, 'rep@o2c-collection-plan.test', {
    name: 'Plan Rep', positions: ['crm_sales_rep'], permissionSets: ['sales_rep'],
  });
  [wayne] = await verify.rows('crm_contract', { payment_terms: 'net_60' });
  [acme] = await verify.rows('crm_contract', { contract_value: 220000 });
  expect(wayne && acme, 'fixture: the seed holds the Wayne and Acme contracts').toBeTruthy();
}, 120_000);

const insert = (object: string, doc: Rec, as: string = admin): Promise<Rec> =>
  verify.hooks.run(object, 'insert', doc, { as });
const row = async (object: string, id: string): Promise<Rec> => (await verify.rows(object, { id }))[0]!;
const step = (contract: Rec, doc: Rec = {}): Promise<Rec> =>
  insert('crm_billing_milestone', {
    name: `Step ${++k}`, crm_contract: contract.id, planned_amount: 100000, planned_date: '2026-12-01', ...doc,
  });
const invoice = (contract: Rec, doc: Rec = {}): Promise<Rec> =>
  insert('crm_invoice', {
    invoice_number: `INV-T-${++k}`, crm_contract: contract.id, issue_date: '2026-09-26', amount: 60000, ...doc,
  });
/** `payment_plan_step_stamp`'s two refusals, word for word. */
const invoiceRefusal = (i: Rec): string =>
  `${i.invoice_number} belongs to another account. Choose an invoice of this payment's account.`;
const milestoneRefusal = (s: Rec): string =>
  `${s.name} belongs to another account. Choose a payment plan of this payment's account.`;

describe('the row stamps', () => {
  it('billing_milestone_row_stamp stamps the contract\'s account', async () => {
    const s = await step(wayne);
    expect((await row('crm_billing_milestone', s.id)).crm_account).toBe(wayne.crm_account);
  });

  it('invoice_row_stamp stamps the account, and dates an imported row', async () => {
    const manual = await invoice(acme);
    const imported = await invoice(acme, { source: 'import', erp_ref: `ERP-T-${k}` });
    const [m, i] = [await row('crm_invoice', manual.id), await row('crm_invoice', imported.id)];
    expect(m.crm_account).toBe(acme.crm_account);
    expect(m.synced_at ?? null).toBeNull();
    expect(i.synced_at).toBeTruthy();
  });

  it('payment_row_stamp stamps the account', async () => {
    const p = await insert('crm_payment', { crm_contract: acme.id, payment_date: '2026-10-01', amount: 10 });
    expect((await row('crm_payment', p.id)).crm_account).toBe(acme.crm_account);
  });
});

describe('invoice_figures', () => {
  it('fills a blank due date from the contract\'s payment terms', async () => {
    const inv = await invoice(wayne);
    expect(String((await row('crm_invoice', inv.id)).due_date).slice(0, 10)).toBe('2026-11-25');
  });

  it('control: a due date the writer gives is kept', async () => {
    const inv = await invoice(wayne, { due_date: '2026-10-15' });
    expect(String((await row('crm_invoice', inv.id)).due_date).slice(0, 10)).toBe('2026-10-15');
  });

  it('a cancelled invoice is open for nothing', async () => {
    const inv = await invoice(wayne, { status: 'cancelled' });
    expect(Number((await row('crm_invoice', inv.id)).open_amount)).toBe(0);
  });
});

describe('invoice_plan_step_guard: an invoice\'s plan step belongs to its account (hotcrm#2755)', () => {
  it('the lookup is not filtered by the account, and the pick fills it, the order and the contract', () => {
    const field = Invoice.fields.crm_billing_milestone as Rec;
    expect(field.dependsOn, 'a dependsOn hides, then drops, the step the milestone page\'s New prefills').toBeUndefined();
    expect(field.lookupAutofill).toContainEqual({ target: 'crm_account', source: 'crm_account', overwrite: true });
    // Default mode: an overwriting fill would empty an order or a contract the
    // invoice already names when the step carries none.
    expect(field.lookupAutofill).toContainEqual({ target: 'crm_sales_order', source: 'crm_sales_order' });
    expect(field.lookupAutofill).toContainEqual({ target: 'crm_contract', source: 'crm_contract' });
  });

  // What the milestone page's New posts once the account is chosen: the
  // account and the step, no contract.
  // Hidden since hotcrm#2806 (an invoice hangs on no plan step), the column
  // is kept for earlier rows and an API write still names it: the stamp and
  // the guard hold it to the account. The step no longer counts invoices.
  it('an invoice that still names a plan step keeps it and takes its contract; the step counts no invoice', async () => {
    const s = await step(wayne, { planned_amount: 900 });
    const i = await insert('crm_invoice', {
      invoice_number: `INV-FROM-STEP-${++k}`, crm_account: wayne.crm_account, crm_billing_milestone: s.id, issue_date: '2026-10-01', amount: 400,
    });
    const ri = await row('crm_invoice', i.id);
    expect(ri.crm_billing_milestone).toBe(s.id);
    expect(ri.crm_contract).toBe(wayne.id);
    expect(ri.crm_account).toBe(wayne.crm_account);
    expect(await row('crm_billing_milestone', s.id)).not.toHaveProperty('invoiced_amount');
  });

  it('refuses an invoice naming another account\'s plan step, naming the step', async () => {
    const s = await step(wayne);
    const refused = insert('crm_invoice', {
      invoice_number: `INV-CROSS-${++k}`, crm_account: acme.crm_account, crm_billing_milestone: s.id, issue_date: '2026-10-01', amount: 1,
    });
    await expect(refused).rejects.toMatchObject({ code: 'VALIDATION_FAILED', status: 400 });
    const message = String(await refused.catch((err: Error) => err.message));
    expect(message).toContain(String(s.name));
    expect(message).toContain('another account');
    // Not the step's contract, which the user never chose.
    expect(message).not.toContain(String(wayne.contract_number));
    expect(await verify.rows('crm_invoice', { crm_billing_milestone: s.id })).toEqual([]);
  });

  it('refuses it under a contract of the invoice\'s own account too', async () => {
    const s = await step(wayne);
    const refused = invoice(acme, { crm_billing_milestone: s.id });
    await expect(refused).rejects.toMatchObject({ code: 'VALIDATION_FAILED', status: 400 });
    expect(String(await refused.catch((err: Error) => err.message))).toContain(String(s.name));
  });

  it('refuses an edit that gives an invoice another account\'s plan step', async () => {
    const s = await step(wayne);
    const i = await invoice(acme);
    const edited = verify.hooks.run('crm_invoice', 'update', { id: i.id, crm_billing_milestone: s.id }, { as: admin });
    await expect(edited).rejects.toMatchObject({ code: 'VALIDATION_FAILED', status: 400 });
    expect(String(await edited.catch((err: Error) => err.message))).toContain(String(s.name));
    expect((await row('crm_invoice', i.id)).crm_billing_milestone ?? null).toBeNull();
  });

  // The step gave the invoice its contract, so the row stamp answers first, by
  // the contract. With the contract taken off, the step is all that ties the
  // invoice to its account, and the refusal names the step.
  it('refuses moving an invoice to another account while it keeps its plan step', async () => {
    const s = await step(wayne, { planned_amount: 50 });
    const i = await insert('crm_invoice', {
      invoice_number: `INV-MOVE-${++k}`, crm_account: wayne.crm_account, crm_billing_milestone: s.id, issue_date: '2026-10-01', due_date: '2026-10-31', amount: 50,
    });
    const move = (): Promise<Rec> => verify.hooks.run('crm_invoice', 'update', { id: i.id, crm_account: acme.crm_account }, { as: admin });
    const underContract = move();
    await expect(underContract).rejects.toMatchObject({ code: 'VALIDATION_FAILED', status: 400 });
    expect(String(await underContract.catch((err: Error) => err.message))).toContain(String(wayne.contract_number));

    await verify.hooks.run('crm_invoice', 'update', { id: i.id, crm_contract: null }, { as: admin });
    expect((await row('crm_invoice', i.id)).crm_contract ?? null).toBeNull();
    const onStepAlone = move();
    await expect(onStepAlone).rejects.toMatchObject({ code: 'VALIDATION_FAILED', status: 400 });
    expect(String(await onStepAlone.catch((err: Error) => err.message))).toContain(String(s.name));
    const kept = await row('crm_invoice', i.id);
    expect(kept.crm_account).toBe(wayne.crm_account);
    expect(kept.crm_billing_milestone).toBe(s.id);
  });

  it('control: an edit that touches neither the account nor the step is not judged', async () => {
    const s = await step(wayne);
    const i = await invoice(wayne, { crm_billing_milestone: s.id, amount: 10 });
    await verify.hooks.run('crm_invoice', 'update', { id: i.id, amount: 20 }, { as: admin });
    const ri = await row('crm_invoice', i.id);
    expect(Number(ri.amount)).toBe(20);
    expect(ri.crm_billing_milestone).toBe(s.id);
  });
});

describe('the plan figures follow invoices and payments', () => {
  let plan: Rec;
  let inv: Rec;

  beforeAll(async () => {
    plan = await step(wayne, { planned_amount: 360000 });
    inv = await invoice(wayne, { crm_billing_milestone: plan.id, amount: 360000 });
    await invoice(wayne, { crm_billing_milestone: plan.id, amount: 5000, status: 'cancelled' });
  });

  it('payment_plan_step_stamp gives a payment its invoice\'s step', async () => {
    const p = await insert('crm_payment', { crm_contract: wayne.id, crm_invoice: inv.id, payment_date: '2026-10-26', amount: 100000 });
    expect((await row('crm_payment', p.id)).crm_billing_milestone).toBe(plan.id);
  });

  it('the invoice reads what is paid and what is open', async () => {
    const i = await row('crm_invoice', inv.id);
    expect(Number(i.paid_amount)).toBe(100000);
    expect(Number(i.open_amount)).toBe(260000);
  });

  it('the step reads received and open, stored (hotcrm#2806: no Invoiced on a step)', async () => {
    const s = await row('crm_billing_milestone', plan.id);
    expect(s).not.toHaveProperty('invoiced_amount');
    expect(Number(s.received_amount)).toBe(100000);
    expect(Number(s.open_amount)).toBe(260000);
  });

  it('refuses a payment naming another account\'s invoice, naming the invoice', async () => {
    const refused = insert('crm_payment', { crm_contract: acme.id, crm_invoice: inv.id, payment_date: '2026-10-26', amount: 1 });
    await expect(refused).rejects.toMatchObject({ code: 'VALIDATION_FAILED', status: 400 });
    expect(String(await refused.catch((err: Rec) => err.userMessage))).toBe(invoiceRefusal(inv));
  });

  // What the form posts when the invoice is picked under the wrong account:
  // the account and the invoice, no contract. The refusal names the invoice,
  // not the contract the invoice carries, which the user never chose.
  it('refuses it on the account alone too, with no contract named, still naming the invoice', async () => {
    const refused = insert('crm_payment', { crm_account: acme.crm_account, crm_invoice: inv.id, payment_date: '2026-10-26', amount: 1 });
    await expect(refused).rejects.toMatchObject({ code: 'VALIDATION_FAILED', status: 400 });
    expect(String(await refused.catch((err: Rec) => err.userMessage))).toBe(invoiceRefusal(inv));
  });
});

describe('a payment\'s invoice and plan step belong to its account (hotcrm#2755)', () => {
  it('the plan step lookup is not filtered by the account, and the pick fills it', () => {
    const field = Payment.fields.crm_billing_milestone as Rec;
    expect(field.dependsOn, 'a dependsOn hides, then drops, the step the payment plan page\'s New prefills').toBeUndefined();
    expect(field.lookupAutofill).toContainEqual({ target: 'crm_account', source: 'crm_account', overwrite: true });
  });

  it('the invoice lookup stays hidden, with no Payments list on the invoice (hotcrm#2806)', () => {
    const field = Payment.fields.crm_invoice as Rec;
    expect(field.hidden).toBe(true);
    expect(field.relatedList).toBe(false);
  });

  it('a payment written with an invoice through the API keeps it, and the invoice and its step count it', async () => {
    const s = await step(wayne, { planned_amount: 900 });
    const i = await invoice(wayne, { crm_billing_milestone: s.id, amount: 900 });
    const p = await insert('crm_payment', { crm_account: wayne.crm_account, crm_invoice: i.id, payment_date: '2026-10-26', amount: 400 });
    const rp = await row('crm_payment', p.id);
    expect(rp.crm_invoice).toBe(i.id);
    expect(rp.crm_billing_milestone).toBe(s.id);
    expect(rp.crm_contract).toBe(wayne.id);
    const ri = await row('crm_invoice', i.id);
    expect(Number(ri.paid_amount)).toBe(400);
    expect(Number(ri.open_amount)).toBe(500);
    expect(Number((await row('crm_billing_milestone', s.id)).received_amount)).toBe(400);
  });

  it('a payment entered from a plan step keeps it, and the step counts it', async () => {
    const s = await step(wayne, { planned_amount: 900 });
    const p = await insert('crm_payment', { crm_account: wayne.crm_account, crm_billing_milestone: s.id, payment_date: '2026-10-26', amount: 250 });
    const rp = await row('crm_payment', p.id);
    expect(rp.crm_billing_milestone).toBe(s.id);
    expect(rp.crm_contract).toBe(wayne.id);
    expect(Number((await row('crm_billing_milestone', s.id)).received_amount)).toBe(250);
  });

  it('refuses a payment naming another account\'s plan step, naming the step', async () => {
    const s = await step(wayne);
    const refused = insert('crm_payment', { crm_account: acme.crm_account, crm_billing_milestone: s.id, payment_date: '2026-10-26', amount: 1 });
    await expect(refused).rejects.toMatchObject({ code: 'VALIDATION_FAILED', status: 400 });
    expect(String(await refused.catch((err: Rec) => err.userMessage))).toBe(milestoneRefusal(s));
  });

  it('refuses it under a contract of the payment\'s own account too', async () => {
    const s = await step(wayne);
    const refused = insert('crm_payment', { crm_contract: acme.id, crm_billing_milestone: s.id, payment_date: '2026-10-26', amount: 1 });
    await expect(refused).rejects.toMatchObject({ code: 'VALIDATION_FAILED', status: 400 });
    expect(String(await refused.catch((err: Rec) => err.userMessage))).toBe(milestoneRefusal(s));
    expect(await verify.rows('crm_payment', { crm_billing_milestone: s.id })).toEqual([]);
  });

  // An invoice saved before its milestone moved to another account's contract:
  // the user picks only the invoice, so the refusal names the invoice, and the
  // milestone it brings, never the milestone alone as if the user had chosen it.
  it('refuses an invoice whose milestone is now another account\'s, naming the invoice', async () => {
    const s = await step(wayne);
    const i = await invoice(wayne, { crm_billing_milestone: s.id });
    await verify.hooks.run('crm_billing_milestone', 'update', { id: s.id, crm_contract: acme.id }, { as: admin });
    expect((await row('crm_billing_milestone', s.id)).crm_account, 'fixture: the step moved to Acme').toBe(acme.crm_account);
    expect((await row('crm_invoice', i.id)).crm_billing_milestone, 'fixture: the invoice still counts toward it').toBe(s.id);
    const refused = insert('crm_payment', { crm_account: wayne.crm_account, crm_invoice: i.id, payment_date: '2026-10-26', amount: 1 });
    await expect(refused).rejects.toMatchObject({ code: 'VALIDATION_FAILED', status: 400 });
    expect(String(await refused.catch((err: Rec) => err.userMessage))).toBe(
      `${i.invoice_number} counts toward ${s.name}, a payment plan of another account. Correct the invoice's payment plan, or choose another invoice.`,
    );
    expect(await verify.rows('crm_payment', { crm_invoice: i.id })).toEqual([]);
  });

  // A write that names a contract and no account: the contract gives the
  // account, so the invoice of another account brings no order to refuse.
  it('refuses another account\'s invoice under a contract alone by the invoice, not the order it carries', async () => {
    const [globexInvoice] = await verify.rows('crm_invoice', { invoice_number: 'INV-01024' });
    expect(globexInvoice?.crm_sales_order, 'fixture: the seeded Globex invoice carries its order').toBeTruthy();
    const order = await row('crm_sales_order', globexInvoice!.crm_sales_order);
    const refused = insert('crm_payment', { crm_contract: acme.id, crm_invoice: globexInvoice!.id, payment_date: '2026-10-26', amount: 1 });
    await expect(refused).rejects.toMatchObject({ code: 'VALIDATION_FAILED', status: 400 });
    const message = String(await refused.catch((err: Rec) => err.userMessage));
    expect(message).toBe(invoiceRefusal(globexInvoice!));
    expect(message).not.toContain(String(order.order_number));
  });

  it('refuses moving a payment to another account while it keeps its invoice or its step', async () => {
    const s = await step(wayne);
    const i = await insert('crm_invoice', { invoice_number: `INV-MOVE-${++k}`, crm_account: wayne.crm_account, issue_date: '2026-10-01', due_date: '2026-10-31', amount: 50 });
    const paid = await insert('crm_payment', { crm_account: wayne.crm_account, crm_invoice: i.id, payment_date: '2026-10-02', amount: 5 });
    const moved = verify.hooks.run('crm_payment', 'update', { id: paid.id, crm_account: acme.crm_account }, { as: admin });
    await expect(moved).rejects.toMatchObject({ code: 'VALIDATION_FAILED', status: 400 });
    expect(String(await moved.catch((err: Rec) => err.userMessage))).toBe(invoiceRefusal(i));
    const keptPaid = await row('crm_payment', paid.id);
    expect(keptPaid.crm_account).toBe(wayne.crm_account);
    expect(keptPaid.crm_invoice).toBe(i.id);

    // The step gave the advance Wayne's contract, which would answer first;
    // with it taken off, the step is what ties the advance to its account.
    const advance = await insert('crm_payment', { crm_account: wayne.crm_account, crm_billing_milestone: s.id, payment_date: '2026-10-02', amount: 7 });
    await verify.hooks.run('crm_payment', 'update', { id: advance.id, crm_contract: null }, { as: admin });
    expect((await row('crm_payment', advance.id)).crm_contract ?? null).toBeNull();
    const stepMoved = verify.hooks.run('crm_payment', 'update', { id: advance.id, crm_account: acme.crm_account }, { as: admin });
    await expect(stepMoved).rejects.toMatchObject({ code: 'VALIDATION_FAILED', status: 400 });
    expect(String(await stepMoved.catch((err: Rec) => err.userMessage))).toBe(milestoneRefusal(s));
    const keptAdvance = await row('crm_payment', advance.id);
    expect(keptAdvance.crm_account).toBe(wayne.crm_account);
    expect(keptAdvance.crm_billing_milestone).toBe(s.id);
    expect(Number((await row('crm_billing_milestone', s.id)).received_amount)).toBe(7);
  });

  it('control: an edit that touches neither the account, the invoice nor the step is not judged', async () => {
    const s = await step(wayne);
    const p = await insert('crm_payment', { crm_account: wayne.crm_account, crm_billing_milestone: s.id, payment_date: '2026-10-26', amount: 10 });
    await verify.hooks.run('crm_payment', 'update', { id: p.id, amount: 20 }, { as: admin });
    const rp = await row('crm_payment', p.id);
    expect(Number(rp.amount)).toBe(20);
    expect(rp.crm_account).toBe(wayne.crm_account);
    expect(rp.crm_billing_milestone).toBe(s.id);
    expect(Number((await row('crm_billing_milestone', s.id)).received_amount)).toBe(20);
  });
});

describe('the rows belong to the account; the contract is a source (hotcrm#2557)', () => {
  it('an invoice and a payment are recorded against an account with no contract', async () => {
    const i = await insert('crm_invoice', {
      invoice_number: `INV-ACC-${++k}`, crm_account: acme.crm_account, issue_date: '2026-10-01', due_date: '2026-10-31', amount: 700,
    });
    const advance = await insert('crm_payment', { crm_account: acme.crm_account, payment_date: '2026-09-20', amount: 300 });
    const ri = await row('crm_invoice', i.id);
    expect(ri.crm_account).toBe(acme.crm_account);
    expect(ri.crm_contract ?? null).toBeNull();
    expect(Number(ri.open_amount)).toBe(700);
    const ra = await row('crm_payment', advance.id);
    expect(ra.crm_account).toBe(acme.crm_account);
    expect(ra.crm_contract ?? null).toBeNull();
  });

  it('an invoice with no contract has no terms to read: a blank due date stays blank', async () => {
    const i = await insert('crm_invoice', { invoice_number: `INV-ACC-${++k}`, crm_account: acme.crm_account, issue_date: '2026-10-01', amount: 1 });
    expect((await row('crm_invoice', i.id)).due_date ?? null).toBeNull();
  });

  it('a payment on the account alone takes the account of the invoice it pays', async () => {
    const i = await insert('crm_invoice', { invoice_number: `INV-ACC-${++k}`, crm_account: wayne.crm_account, issue_date: '2026-10-01', due_date: '2026-10-31', amount: 50 });
    const p = await insert('crm_payment', { crm_invoice: i.id, payment_date: '2026-10-02', amount: 50 });
    const rp = await row('crm_payment', p.id);
    expect(rp.crm_account).toBe(wayne.crm_account);
    expect(rp.crm_contract ?? null).toBeNull();
    expect(Number((await row('crm_invoice', i.id)).open_amount)).toBe(0);
  });

  it('a plan step still needs a source: an order or a contract (hotcrm#2560)', async () => {
    await expect(insert('crm_billing_milestone', {
      name: `No source ${++k}`, crm_account: acme.crm_account, planned_amount: 1, planned_date: '2026-12-01',
    })).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
  });

  it('refuses a contract of another account, naming the contract, on each of the three', async () => {
    const attempts: Array<[string, Rec]> = [
      ['crm_billing_milestone', { name: `Cross ${++k}`, crm_account: acme.crm_account, crm_contract: wayne.id, planned_amount: 1, planned_date: '2026-12-01' }],
      ['crm_invoice', { invoice_number: `INV-X-${++k}`, crm_account: acme.crm_account, crm_contract: wayne.id, issue_date: '2026-10-01', amount: 1 }],
      ['crm_payment', { crm_account: acme.crm_account, crm_contract: wayne.id, payment_date: '2026-10-01', amount: 1 }],
    ];
    for (const [object, doc] of attempts) {
      const refused = insert(object, doc);
      await expect(refused, object).rejects.toMatchObject({ code: 'VALIDATION_FAILED', status: 400 });
      const message = String(await refused.catch((err: Error) => err.message));
      expect(message, object).toContain(String(wayne.contract_number));
      expect(message, object).toContain('another account');
    }
  });

  it('refuses moving a row to another account while it keeps its contract', async () => {
    const i = await invoice(wayne);
    await expect(verify.hooks.run('crm_invoice', 'update', { id: i.id, crm_account: acme.crm_account }, { as: admin }))
      .rejects.toMatchObject({ code: 'VALIDATION_FAILED', status: 400 });
  });

  it('control: naming the contract\'s own account passes', async () => {
    const i = await insert('crm_invoice', {
      invoice_number: `INV-OWN-${++k}`, crm_account: wayne.crm_account, crm_contract: wayne.id, issue_date: '2026-10-01', amount: 1,
    });
    expect((await row('crm_invoice', i.id)).crm_contract).toBe(wayne.id);
  });

  it('an invoice naming a step but no contract takes the step\'s contract', async () => {
    const s = await step(wayne);
    const i = await insert('crm_invoice', { invoice_number: `INV-STEP-${++k}`, crm_billing_milestone: s.id, issue_date: '2026-10-01', amount: 1 });
    const ri = await row('crm_invoice', i.id);
    expect(ri.crm_contract).toBe(wayne.id);
    expect(ri.crm_account).toBe(wayne.crm_account);
  });

  it('a payment naming an invoice but no contract takes the invoice\'s contract and step', async () => {
    const s = await step(wayne);
    const i = await invoice(wayne, { crm_billing_milestone: s.id });
    const p = await insert('crm_payment', { crm_invoice: i.id, payment_date: '2026-10-02', amount: 1 });
    const rp = await row('crm_payment', p.id);
    expect(rp.crm_contract).toBe(wayne.id);
    expect(rp.crm_account).toBe(wayne.crm_account);
    expect(rp.crm_billing_milestone).toBe(s.id);
  });
});

describe('who writes what (#2462: read on the master is the master-side question; the account since hotcrm#2557)', () => {
  let fin: Person;
  let stranger: Person;
  let own: Rec; // a contract under an account the rep owns, so the rep reads it

  beforeAll(async () => {
    fin = await signUpPerson(verify, 'fin@o2c-collection-plan.test', {
      name: 'Plan Finance', positions: ['crm_ar_accountant'], permissionSets: ['ar_accountant'],
    });
    stranger = await signUpPerson(verify, 'stranger@o2c-collection-plan.test', {
      name: 'Plan Stranger', positions: ['crm_sales_rep'], permissionSets: ['sales_rep'],
    });
    const account = await insert('crm_account', {
      name: 'Plan Rep Corp', type: 'customer', industry: 'technology', owner_id: rep.id,
    });
    const contact = await insert('crm_contact', {
      first_name: 'Plan', last_name: 'Contact', email: 'plan@o2c-collection-plan.test', crm_account: account.id,
    });
    // Born activated, so it carries the signed copy that state requires (#2317),
    // a file of the admin's own (the account's `created_by`).
    own = await insert('crm_contract', {
      crm_account: account.id, crm_contact: contact.id, status: 'activated',
      signed_copy: await committedFile(verify, String(account.created_by)),
      name: 'Fixture Contract', contract_term_months: 12, start_date: '2026-01-01', end_date: '2026-12-31', contract_value: 50000,
    });
  }, 120_000);

  it('control: the rep reads the contract and cannot edit it', async () => {
    expect(await verify.rows('crm_contract', { id: own.id }, { as: rep.token })).toHaveLength(1);
    await expect(verify.hooks.run('crm_contract', 'update', { id: own.id, contract_value: 50001 }, { as: rep.token }))
      .rejects.toMatchObject({ status: 403 });
  });

  it('a rep who reads the contract adds and edits a plan step', async () => {
    const s = await insert('crm_billing_milestone', {
      name: 'Rep step', crm_contract: own.id, planned_amount: 20000, planned_date: '2026-12-01',
    }, rep.token);
    await verify.hooks.run('crm_billing_milestone', 'update', { id: s.id, planned_amount: 25000 }, { as: rep.token });
    expect(Number((await row('crm_billing_milestone', s.id)).planned_amount)).toBe(25000);
  });

  it('Accounts Receivable enters an invoice and a payment on a contract it reads and does not edit', async () => {
    const i = await insert('crm_invoice', { invoice_number: 'INV-FIN-1', crm_contract: wayne.id, issue_date: '2026-10-01', amount: 1000 }, fin.token);
    const p = await insert('crm_payment', { crm_contract: wayne.id, crm_invoice: i.id, payment_date: '2026-10-02', amount: 400 }, fin.token);
    expect(Number((await row('crm_invoice', i.id)).open_amount)).toBe(600);
    expect((await row('crm_payment', p.id)).crm_billing_milestone ?? null).toBeNull();
    await expect(verify.hooks.run('crm_contract', 'update', { id: wayne.id, contract_value: 1 }, { as: fin.token }))
      .rejects.toMatchObject({ status: 403 });
  });

  it('a rep still cannot create an invoice or a payment, even on a contract they read', async () => {
    await expect(insert('crm_invoice', { invoice_number: 'INV-REP', crm_contract: own.id, issue_date: '2026-10-01', amount: 1 }, rep.token))
      .rejects.toMatchObject({ status: 403 });
    await expect(insert('crm_payment', { crm_contract: own.id, payment_date: '2026-10-01', amount: 1 }, rep.token))
      .rejects.toMatchObject({ status: 403 });
  });

  it('someone who cannot read the account cannot write its plan', async () => {
    expect(await verify.rows('crm_contract', { id: own.id }, { as: stranger.token })).toHaveLength(0);
    expect(await verify.rows('crm_account', { id: own.crm_account }, { as: stranger.token })).toHaveLength(0);
    // Naming the account: the master read is refused.
    await expect(insert('crm_billing_milestone', {
      name: 'Stranger step', crm_account: own.crm_account, crm_contract: own.id, planned_amount: 1, planned_date: '2026-12-01',
    }, stranger.token)).rejects.toMatchObject({ status: 403 });
    // Naming the contract alone: the stamp cannot read it as the stranger, so
    // no account is filled and the write is refused before it lands.
    await expect(insert('crm_billing_milestone', {
      name: 'Stranger step 2', crm_contract: own.id, planned_amount: 1, planned_date: '2026-12-01',
    }, stranger.token)).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
    expect(await verify.rows('crm_billing_milestone', { crm_contract: own.id, name: 'Stranger step' })).toEqual([]);
  });
});

/**
 * hotcrm#2557 moved the three objects' master from the contract to the
 * account. The contract itself derives from the account, so for the people
 * who work Order to Cash — the rep, the sales manager and finance — who reads
 * and who writes must not move. Pinned here on one account the rep owns and
 * one the rep does not, with a record of each kind on each, plus an invoice
 * and a payment entered against the owned account with no contract.
 */
describe('who reads and writes after the move to the account (hotcrm#2557)', () => {
  let rep2: Person;
  let manager: Person;
  let finance: Person;
  let mine: Rec; // contract under an account rep2 owns
  let theirs: Rec; // contract under an account rep2 does not own
  const rows: Record<'mine' | 'theirs', Record<string, string[]>> = { mine: {}, theirs: {} };

  beforeAll(async () => {
    rep2 = await signUpPerson(verify, 'rep2@o2c-collection-plan.test', {
      name: 'Move Rep', positions: ['crm_sales_rep'], permissionSets: ['sales_rep'],
    });
    manager = await signUpPerson(verify, 'manager@o2c-collection-plan.test', {
      name: 'Move Manager', positions: ['crm_sales_manager'], permissionSets: ['sales_manager'],
    });
    finance = await signUpPerson(verify, 'finance@o2c-collection-plan.test', {
      name: 'Move Finance', positions: ['crm_ar_accountant'], permissionSets: ['ar_accountant'],
    });
    const make = async (label: string, owner?: string): Promise<Rec> => {
      const account = await insert('crm_account', {
        name: `Move ${label} Corp`, type: 'customer', industry: 'technology', ...(owner ? { owner_id: owner } : {}),
      });
      const contact = await insert('crm_contact', {
        first_name: 'Move', last_name: label, email: `move-${label}@o2c-collection-plan.test`, crm_account: account.id,
      });
      return insert('crm_contract', {
        crm_account: account.id, crm_contact: contact.id, status: 'activated',
        signed_copy: await committedFile(verify, String(account.created_by)),
        name: 'Fixture Contract', contract_term_months: 12, start_date: '2026-01-01', end_date: '2026-12-31', contract_value: 1000,
      });
    };
    mine = await make('Mine', rep2.id);
    theirs = await make('Theirs');
    for (const [key, contract] of [['mine', mine], ['theirs', theirs]] as const) {
      const s = await step(contract, { planned_amount: 1000 });
      const i = await invoice(contract, { amount: 1000, crm_billing_milestone: s.id });
      const p = await insert('crm_payment', { crm_contract: contract.id, crm_invoice: i.id, payment_date: '2026-10-01', amount: 100 });
      rows[key] = { crm_billing_milestone: [s.id], crm_invoice: [i.id], crm_payment: [p.id] };
    }
    const loose = await insert('crm_invoice', {
      invoice_number: `INV-LOOSE-${++k}`, crm_account: mine.crm_account, issue_date: '2026-10-01', due_date: '2026-10-31', amount: 10,
    });
    const deposit = await insert('crm_payment', { crm_account: mine.crm_account, payment_date: '2026-10-01', amount: 5 });
    rows.mine.crm_invoice!.push(loose.id);
    rows.mine.crm_payment!.push(deposit.id);
  }, 120_000);

  const seen = async (object: string, ids: string[], token: string): Promise<number> =>
    (await verify.rows(object, { id: { $in: ids } }, { as: token })).length;

  it.each(['crm_billing_milestone', 'crm_invoice', 'crm_payment'])('the rep reads the %s rows of an account they own, and none of another', async (object) => {
    expect(await seen(object, rows.mine[object]!, rep2.token)).toBe(rows.mine[object]!.length);
    expect(await seen(object, rows.theirs[object]!, rep2.token)).toBe(0);
  });

  it.each(['crm_billing_milestone', 'crm_invoice', 'crm_payment'])('the sales manager and finance read every %s row', async (object) => {
    for (const person of [manager, finance]) {
      expect(await seen(object, [...rows.mine[object]!, ...rows.theirs[object]!], person.token))
        .toBe(rows.mine[object]!.length + rows.theirs[object]!.length);
    }
  });

  it('the rep and the sales manager keep the plan; finance does not write it', async () => {
    await verify.hooks.run('crm_billing_milestone', 'update', { id: rows.mine.crm_billing_milestone![0], planned_amount: 1100 }, { as: rep2.token });
    await verify.hooks.run('crm_billing_milestone', 'update', { id: rows.theirs.crm_billing_milestone![0], planned_amount: 1200 }, { as: manager.token });
    await expect(verify.hooks.run('crm_billing_milestone', 'update', { id: rows.theirs.crm_billing_milestone![0], planned_amount: 1 }, { as: finance.token }))
      .rejects.toMatchObject({ status: 403 });
    await expect(verify.hooks.run('crm_billing_milestone', 'update', { id: rows.theirs.crm_billing_milestone![0], planned_amount: 1 }, { as: rep2.token }))
      .rejects.toMatchObject({ status: expect.any(Number) });
  });

  it('finance writes invoices and payments on any account, with or without a contract; the rep and the manager write neither', async () => {
    const i = await insert('crm_invoice', { invoice_number: `INV-FINMOVE-${++k}`, crm_account: theirs.crm_account, issue_date: '2026-10-01', due_date: '2026-10-31', amount: 20 }, finance.token);
    await insert('crm_payment', { crm_account: theirs.crm_account, crm_invoice: i.id, payment_date: '2026-10-02', amount: 20 }, finance.token);
    await insert('crm_invoice', { invoice_number: `INV-FINMOVE-${++k}`, crm_contract: theirs.id, issue_date: '2026-10-01', amount: 20 }, finance.token);
    for (const person of [rep2, manager]) {
      await expect(insert('crm_invoice', { invoice_number: `INV-NO-${++k}`, crm_account: mine.crm_account, issue_date: '2026-10-01', amount: 1 }, person.token))
        .rejects.toMatchObject({ status: 403 });
      await expect(insert('crm_payment', { crm_account: mine.crm_account, payment_date: '2026-10-01', amount: 1 }, person.token))
        .rejects.toMatchObject({ status: 403 });
    }
  });
});
