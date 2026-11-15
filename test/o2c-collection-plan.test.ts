// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { hotcrmStack, signUpPerson, type Person } from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * Order to Cash, phase 1a (#2315, REQ-0007): the module's five hooks and the
 * figures they and the summaries keep, on the shipped app booted by
 * `@objectstack/verify`.
 *
 * - `*_row_stamp` (one per object) — the contract's account is stamped on the
 *   row; an imported invoice or payment is dated `synced_at`.
 * - `invoice_figures` — a blank due date takes the contract's payment terms,
 *   and `open_amount` (stored, so the overdue view can filter it) follows the
 *   payments and the status.
 * - `payment_plan_step_stamp` — a payment takes its invoice's plan step, and a
 *   payment naming another contract's invoice is refused.
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

  it('the step reads invoiced (issued only), received and open', async () => {
    const s = await row('crm_billing_milestone', plan.id);
    expect(Number(s.invoiced_amount)).toBe(360000);
    expect(Number(s.received_amount)).toBe(100000);
    expect(Number(s.open_amount)).toBe(260000);
  });

  it('refuses a payment naming another contract\'s invoice, naming the invoice', async () => {
    const refused = insert('crm_payment', { crm_contract: acme.id, crm_invoice: inv.id, payment_date: '2026-10-26', amount: 1 });
    await expect(refused).rejects.toMatchObject({ code: 'VALIDATION_FAILED', status: 400 });
    expect(String(await refused.catch((err: Error) => err.message))).toContain(String(inv.invoice_number));
  });
});

describe('who writes what (#2462: read on the contract is the contract-side question)', () => {
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
    own = await insert('crm_contract', {
      crm_account: account.id, crm_contact: contact.id, status: 'activated',
      contract_term_months: 12, start_date: '2026-01-01', end_date: '2026-12-31', contract_value: 50000,
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

  it('someone who cannot read the contract cannot write its plan', async () => {
    expect(await verify.rows('crm_contract', { id: own.id }, { as: stranger.token })).toHaveLength(0);
    await expect(insert('crm_billing_milestone', {
      name: 'Stranger step', crm_contract: own.id, planned_amount: 1, planned_date: '2026-12-01',
    }, stranger.token)).rejects.toMatchObject({ status: 403 });
  });
});
