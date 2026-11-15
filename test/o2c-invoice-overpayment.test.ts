// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { hotcrmStack, signUpPerson, type Person } from './helpers/verify-stack';
import { CrmPositions } from '../src/sales/sharing/positions';

type Rec = Record<string, any>;

/**
 * An overpaid invoice (#2513, E2E round 2 AR-03).
 *
 * Measured on main b820306 (@objectstack 18.5.0): a 6,000 invoice paid 2,500 +
 * 3,500 + 100 read Paid 6,100 and Open −100, and the contract's and the
 * account's Receivable Balance dropped by the same 100.
 *
 * Ruled (decision thread, 2026-11-15): the overpayment is allowed (the cash is
 * real and an ERP import must not fail), the invoice counts as fully paid,
 * Open floors at 0, the excess shows in a read-only Overpaid amount, and no
 * receivable goes negative. Setting the excess against other invoices is out
 * of scope.
 */

let verify: VerifyStack;
let ar: Person;
let admin: string;
let contract: Rec;
let k = 0;

const row = async (object: string, id: string): Promise<Rec> => (await verify.rows(object, { id }))[0]!;
const num = (v: unknown): number => Number(v ?? 0);

const post = async (object: string, doc: Rec): Promise<Rec> => {
  const res = await verify.apiAs(ar.token, 'POST', `/data/${object}`, doc);
  const body = (await res.clone().json()) as Rec;
  expect(res.status, `${object}: ${JSON.stringify(body)}`).toBe(201);
  return (body.data ?? body.record ?? body) as Rec;
};

beforeAll(async () => {
  verify = await hotcrmStack();
  admin = await verify.signIn();
  ar = await signUpPerson(verify, 'ar@o2c-invoice-overpayment.test', {
    name: 'Overpay AR', positions: ['crm_ar_accountant'],
    permissionSets: CrmPositions.find((c) => c.name === 'crm_ar_accountant')?.permissionSets ?? [],
  });
  [contract] = await verify.rows('crm_contract', { payment_terms: 'net_60' });
  expect(contract, 'fixture: the seed holds the Wayne contract').toBeTruthy();
}, 120_000);

describe('an invoice paid more than its amount (#2513)', () => {
  let before: { c: Rec; a: Rec };
  let step: Rec;
  let invoice: Rec;
  let extra: Rec;

  beforeAll(async () => {
    before = { c: await row('crm_contract', contract.id), a: await row('crm_account', contract.crm_account) };
    // The plan is the contract owner's to write (finance reads it); the admin plans the step.
    step = await verify.hooks.run('crm_billing_milestone', 'insert', {
      name: `Overpay step ${++k}`, crm_contract: contract.id, planned_amount: 6_000, planned_date: '2026-12-01',
    }, { as: admin });
    invoice = await post('crm_invoice', {
      invoice_number: `INV-OP-${++k}`, crm_contract: contract.id, crm_billing_milestone: step.id, issue_date: '2026-10-01', amount: 6_000,
    });
    for (const amount of [2_500, 3_500]) {
      await post('crm_payment', {
        crm_contract: contract.id, crm_invoice: invoice.id, crm_billing_milestone: step.id, payment_date: '2026-10-20', amount,
      });
    }
  });

  it('paid exactly: Open 0 and Overpaid 0', async () => {
    const i = await row('crm_invoice', invoice.id);
    expect([num(i.paid_amount), num(i.open_amount), num(i.overpaid_amount)]).toEqual([6_000, 0, 0]);
  });

  it('a payment above the open amount is taken, and the invoice reads Paid 6,100, Open 0, Overpaid 100', async () => {
    extra = await post('crm_payment', {
      crm_contract: contract.id, crm_invoice: invoice.id, crm_billing_milestone: step.id, payment_date: '2026-10-25', amount: 100,
    });
    const i = await row('crm_invoice', invoice.id);
    expect(num(i.paid_amount)).toBe(6_100);
    expect(num(i.open_amount)).toBe(0);
    expect(num(i.overpaid_amount)).toBe(100);
  });

  it('the contract and the account receivable do not drop below what the other invoices hold', async () => {
    const c = await row('crm_contract', contract.id);
    const a = await row('crm_account', contract.crm_account);
    // This invoice adds nothing to either balance: it is fully paid.
    expect(num(c.receivable_balance)).toBe(num(before.c.receivable_balance));
    expect(num(a.receivable_balance)).toBe(num(before.a.receivable_balance));
    expect(num(c.receivable_balance)).toBeGreaterThanOrEqual(0);
    expect(num(a.receivable_balance)).toBeGreaterThanOrEqual(0);
    // Received still counts the cash.
    expect(num(c.received_amount) - num(before.c.received_amount)).toBe(6_100);
  });

  it('the collection step counts the cash it received', async () => {
    // The step's Open is planned minus received and is documented to go below
    // zero when more was received than planned (collection-plan docs); the
    // ruling covers the invoice and the receivables, not the plan.
    const s = await row('crm_billing_milestone', step.id);
    expect(num(s.received_amount)).toBe(6_100);
  });

  it('removing the extra payment takes the overpayment back to 0', async () => {
    const res = await verify.apiAs(ar.token, 'DELETE', `/data/crm_payment/${extra.id}`);
    expect(res.status, await res.clone().text()).toBeLessThan(300);
    const i = await row('crm_invoice', invoice.id);
    expect([num(i.paid_amount), num(i.open_amount), num(i.overpaid_amount)]).toEqual([6_000, 0, 0]);
  });

  it('lowering the amount below what is paid moves the excess to Overpaid', async () => {
    const res = await verify.apiAs(ar.token, 'PATCH', `/data/crm_invoice/${invoice.id}`, { amount: 5_500 });
    expect(res.status, await res.clone().text()).toBe(200);
    const i = await row('crm_invoice', invoice.id);
    expect([num(i.open_amount), num(i.overpaid_amount)]).toEqual([0, 500]);
  });

  it('a cancelled invoice is open for nothing and overpaid by nothing', async () => {
    const res = await verify.apiAs(ar.token, 'PATCH', `/data/crm_invoice/${invoice.id}`, { status: 'cancelled' });
    expect(res.status, await res.clone().text()).toBe(200);
    const i = await row('crm_invoice', invoice.id);
    expect([num(i.open_amount), num(i.overpaid_amount)]).toEqual([0, 0]);
  });
});

describe('Overpaid is the module\'s to write (#2513)', () => {
  it('a person\'s write to Overpaid is not stored', async () => {
    const inv = await post('crm_invoice', {
      invoice_number: `INV-OP-${++k}`, crm_contract: contract.id, issue_date: '2026-10-01', amount: 1_000, overpaid_amount: 999,
    });
    const i = await row('crm_invoice', inv.id);
    expect([num(i.open_amount), num(i.overpaid_amount)]).toEqual([1_000, 0]);
  });
});
