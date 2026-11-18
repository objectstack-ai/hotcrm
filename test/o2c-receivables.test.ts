// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { hotcrmStack, signUpPerson, type Person } from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * Order to Cash, phase 1b (#2416, REQ-0007): the contract's and the account's
 * receivables figures, added by the module through `objectExtensions`
 * (`src/o2c/extensions/`), on the shipped app booted by `@objectstack/verify`.
 *
 * - The figures follow the module's rows: planned from the plan, invoiced from
 *   issued invoices only, received from payments, the balance from the open
 *   amount of the issued invoices (Q2 ruled B, 2026-11-15), so an advance not
 *   set against an invoice moves Received and not the balance; the account's
 *   over the rows stamped with it.
 * - Every member reads them (the app package's sets, the 2026-11-05 ruling),
 *   and a member who reads the account but not the contract reads the totals
 *   and still no invoice (`controlled_by_parent`).
 * - With the module disabled the figures are not served (objectstack#30304,
 *   18.4.0), and they come back on enable.
 */

let verify: VerifyStack;
let admin: string;
let rep: Person;
let member: Person;
let contract: Rec; // Wayne, net_60
let account: Rec;
let k = 0;

const insert = (object: string, doc: Rec): Promise<Rec> => verify.hooks.run(object, 'insert', doc, { as: admin });
const row = async (object: string, id: string, as?: string): Promise<Rec> =>
  (await verify.rows(object, { id }, as ? { as } : undefined))[0]!;
const num = (v: unknown): number => Number(v ?? 0);

beforeAll(async () => {
  verify = await hotcrmStack();
  admin = await verify.signIn();
  rep = await signUpPerson(verify, 'rep@o2c-receivables.test', {
    name: 'Receivables Rep', positions: ['crm_sales_rep'], permissionSets: ['sales_rep'],
  });
  member = await signUpPerson(verify, 'member@o2c-receivables.test', {
    name: 'Receivables Member', permissionSets: ['crm_user'],
  });
  [contract] = await verify.rows('crm_contract', { payment_terms: 'net_60' });
  expect(contract, 'fixture: the seed holds the Wayne contract').toBeTruthy();
  account = await row('crm_account', contract.crm_account);
}, 120_000);

describe('the figures follow the module\'s rows', () => {
  let before: { c: Rec; a: Rec };

  beforeAll(async () => {
    before = { c: await row('crm_contract', contract.id), a: await row('crm_account', account.id) };
    const step = await insert('crm_billing_milestone', {
      name: `Rx step ${++k}`, crm_contract: contract.id, planned_amount: 400000, planned_date: '2026-12-01',
    });
    const inv = await insert('crm_invoice', {
      invoice_number: `INV-RX-${++k}`, crm_contract: contract.id, crm_billing_milestone: step.id, issue_date: '2026-10-01', amount: 120000,
    });
    await insert('crm_invoice', {
      invoice_number: `INV-RX-${++k}`, crm_contract: contract.id, issue_date: '2026-10-01', amount: 9000, status: 'cancelled',
    });
    await insert('crm_payment', { crm_contract: contract.id, crm_invoice: inv.id, payment_date: '2026-10-20', amount: 50000 });
    // An advance: received, set against no invoice yet.
    await insert('crm_payment', { crm_contract: contract.id, payment_date: '2026-10-21', amount: 30000 });
  });

  // The balance is the open amount of the issued invoices, summed: 120,000
  // issued less the 50,000 set against it. The 9,000 cancelled invoice and the
  // 30,000 advance leave it alone.
  const openOfIssued = async (where: Rec): Promise<number> =>
    (await verify.rows('crm_invoice', { ...where, status: 'issued' })).reduce((sum, r) => sum + num(r.open_amount), 0);

  it('the contract reads planned, invoiced (issued only), received, and the open balance', async () => {
    const c = await row('crm_contract', contract.id);
    expect(num(c.planned_amount) - num(before.c.planned_amount)).toBe(400000);
    expect(num(c.invoiced_amount) - num(before.c.invoiced_amount)).toBe(120000);
    expect(num(c.received_amount) - num(before.c.received_amount)).toBe(80000);
    expect(num(c.receivable_balance) - num(before.c.receivable_balance)).toBe(70000);
    expect(num(c.receivable_balance)).toBe(await openOfIssued({ crm_contract: contract.id }));
  });

  it('the account reads the same rows through the stamp', async () => {
    const a = await row('crm_account', account.id);
    expect(num(a.invoiced_amount) - num(before.a.invoiced_amount)).toBe(120000);
    expect(num(a.received_amount) - num(before.a.received_amount)).toBe(80000);
    expect(num(a.receivable_balance) - num(before.a.receivable_balance)).toBe(70000);
    expect(num(a.receivable_balance)).toBe(await openOfIssued({ crm_account: account.id }));
  });
});

describe('who reads them', () => {
  it('a rep who reads the contract reads its figures', async () => {
    await verify.hooks.run('crm_account', 'update', { id: account.id, owner_id: rep.id }, { as: admin });
    const c = await row('crm_contract', contract.id, rep.token);
    expect(c, 'the rep reads the contract of an account they own').toBeTruthy();
    expect(c.receivable_balance).not.toBeUndefined();
    expect(c.planned_amount).not.toBeUndefined();
  });

  it('a member who reads the account but not the contract reads the totals and no invoice', async () => {
    await verify.hooks.run('crm_account', 'update', { id: account.id, owner_id: member.id }, { as: admin });
    const a = await row('crm_account', account.id, member.token);
    expect(a, 'the member reads the account they own').toBeTruthy();
    expect(num(a.receivable_balance)).toBeGreaterThan(0);
    expect(await verify.rows('crm_invoice', { crm_account: account.id }, { as: member.token })).toEqual([]);
  });

  // crm_user, marketing_user, service_agent and project_member (account read
  // since #2316 ruling D) grant read on crm_invoice and crm_payment only so the
  // account's totals have a readable source (`security-rollup-source-unreadable`).
  // The grant is inert: none of the four reads contracts, and both objects are
  // `controlled_by_parent` on the contract, so a holder reads no invoice and no
  // payment at all.
  it.each(['crm_user', 'marketing_user', 'service_agent', 'project_member'])('a holder of %s alone reads no invoice and no payment', async (set) => {
    const holder = await signUpPerson(verify, `${set}@o2c-receivables.test`, { name: `Inert ${set}`, permissionSets: [set] });
    expect((await verify.rows('crm_invoice', {})).length, 'fixture: invoices exist').toBeGreaterThan(0);
    expect((await verify.rows('crm_payment', {})).length, 'fixture: payments exist').toBeGreaterThan(0);
    await expect(verify.rows('crm_contract', {}, { as: holder.token }), 'the set grants no contract read').rejects.toThrow(/permission/i);
    expect(await verify.rows('crm_invoice', {}, { as: holder.token })).toEqual([]);
    expect(await verify.rows('crm_payment', {}, { as: holder.token })).toEqual([]);
  });
});

describe('with the module disabled', () => {
  const PKG = '/packages/app.objectstack.hotcrm.o2c';

  afterAll(async () => {
    await verify.apiAs(admin, 'PATCH', `${PKG}/enable`);
  });

  // A package switch re-registers metadata; past the 5 s default under the full suite (hotcrm#2623).
  it('the figures are not served, and come back on enable', async () => {
    const fields = async (): Promise<string[]> => {
      const res = await verify.apiAs(admin, 'GET', '/meta/object/crm_contract');
      const body = (await res.json()) as Rec;
      return Object.keys((body.item ?? body.data ?? body).fields ?? {});
    };
    expect(await fields()).toContain('receivable_balance');
    expect((await verify.apiAs(admin, 'PATCH', `${PKG}/disable`)).status).toBe(200);
    expect(await fields()).not.toContain('receivable_balance');
    expect(await fields()).not.toContain('planned_amount');
    expect((await verify.apiAs(admin, 'PATCH', `${PKG}/enable`)).status).toBe(200);
    expect(await fields()).toContain('receivable_balance');
  }, 60_000);

  // The module's own app (#2465) leaves with it, as the Marketing app does
  // with its module (#2417): the app is not served while the module is off.
  // A package switch re-registers metadata; past the 5 s default under the full suite (hotcrm#2623).
  it('the Order to Cash app is not served, and comes back on enable', async () => {
    const appStatus = async (): Promise<number> => (await verify.apiAs(admin, 'GET', '/meta/app/crm_o2c')).status;
    expect(await appStatus()).toBe(200);
    expect((await verify.apiAs(admin, 'PATCH', `${PKG}/disable`)).status).toBe(200);
    expect(await appStatus()).toBe(404);
    expect((await verify.apiAs(admin, 'PATCH', `${PKG}/enable`)).status).toBe(200);
    expect(await appStatus()).toBe(200);
  }, 60_000);
});
