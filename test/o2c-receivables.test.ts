// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { bootStack, type VerifyStack } from '@objectstack/verify';
import { bootOptions, hotcrmStack, signUpPerson, type Person } from './helpers/verify-stack';
import { COMPOSITION_ENV_VAR } from '../src/sales/data/index';

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
 * - Who reads the account's totals is ruling C on hotcrm#2557 (comment
 *   6999611419): it takes a business role. `crm_user`, the default set every
 *   member holds, authors them `readable: false`; each set that should read
 *   them opens them with its own `readable: true` row or with View All /
 *   Modify All on the account. The matrix below pins it, set by set. A member
 *   holding nothing else reads their account without the totals and still no
 *   invoice: since hotcrm#2557 the rows hang off the account, so the sets that
 *   read accounts and not contracts hold no read on them at all (Irene,
 *   2026-11-17 05:08Z 「保持现在的范围」).
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
const TOTALS = ['invoiced_amount', 'received_amount', 'receivable_balance'] as const;

/**
 * Ruling C on hotcrm#2557 (comment 6999611419), set by set: does a person
 * holding this set — and `crm_user`, which every member holds on this runtime
 * (`test/default-permission-set.test.ts`) — read the account's three totals,
 * and through what. `tenant_admin` is the SaaS composition's and is measured
 * on that boot below.
 */
const TOTALS_READERS: ReadonlyArray<readonly [set: string, reads: boolean, through: string]> = [
  ['crm_user',           false, 'its own readable: false rows, and nothing votes for them'],
  ['sales_rep',          true,  'its own readable: true rows'],
  ['sales_manager',      true,  'Modify All on the account'],
  ['sales_leadership',   true,  'its own readable: true rows'],
  ['ar_accountant',      true,  'its own readable: true rows'],
  ['finance_controller', true,  'View All on the account'],
  ['project_manager',    true,  'View All on the account'],
  ['project_member',     false, 'its own readable: false rows bind its View All (hotcrm#2481)'],
  ['marketing_user',     true,  'its own readable: true rows'],
  ['service_agent',      true,  'its own readable: true rows'],
  ['service_director',   true,  'its own readable: true rows'],
  ['system_admin',       true,  'Modify All on the account'],
];

/**
 * An account the person owns (so an own-scope set reaches it), with an issued
 * invoice on it, so its totals are not zero; then what the person reads of
 * it over REST, the door the console reads through.
 */
const totalsAsServedTo = async (stack: VerifyStack, adminToken: string, person: Person, label: string): Promise<Rec> => {
  const acct = await stack.hooks.run('crm_account', 'insert', { name: `Totals ${label}`, owner_id: person.id }, { as: adminToken });
  await stack.hooks.run('crm_invoice', 'insert', {
    invoice_number: `INV-TOT-${label}`, crm_account: acct.id, issue_date: '2026-10-01', amount: 1000, status: 'issued',
  }, { as: adminToken });
  const full = (await stack.rows('crm_account', { id: acct.id }))[0]!;
  expect(num(full.invoiced_amount), `fixture: ${label}'s account has invoiced totals`).toBe(1000);
  const res = await stack.apiAs(person.token, 'GET', `/data/crm_account/${acct.id}`);
  expect(res.status, `${label} reads the account itself`).toBe(200);
  const { record } = (await res.json()) as { record: Rec };
  expect(record.name).toBe(full.name);
  return record;
};

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

  it('a member who reads the account but not the contract reads it without the totals, and no invoice (ruling C)', async () => {
    await verify.hooks.run('crm_account', 'update', { id: account.id, owner_id: member.id }, { as: admin });
    expect(num((await row('crm_account', account.id)).receivable_balance), 'fixture: the account has a balance').toBeGreaterThan(0);
    const a = await row('crm_account', account.id, member.token);
    expect(a, 'the member reads the account they own').toBeTruthy();
    expect(a.name).toBeTruthy();
    for (const f of TOTALS) expect(a, `a bare member reads no ${f}`).not.toHaveProperty(f);
    await expect(verify.rows('crm_invoice', { crm_account: account.id }, { as: member.token })).rejects.toThrow(/permission/i);
  });

  it.each(TOTALS_READERS)('a holder of %s reads the account\'s totals: %s (%s)', async (set, reads) => {
    const holder = set === 'crm_user'
      ? await signUpPerson(verify, 'totals-crm_user@o2c-receivables.test', { name: 'Totals crm_user' })
      : await signUpPerson(verify, `totals-${set}@o2c-receivables.test`, { name: `Totals ${set}`, permissionSets: [set] });
    const record = await totalsAsServedTo(verify, admin, holder, set);
    expect(TOTALS.map((f) => f in record), `what ${set} reads of the three`).toEqual([reads, reads, reads]);
  });

  // crm_user, marketing_user, service_agent and project_member read accounts
  // and not contracts. Before hotcrm#2557 they held an inert read on
  // crm_invoice and crm_payment (inert because the rows hung off the
  // contract). With the account as the master that grant would open every
  // row, so it is gone (ruled 2026-11-17 05:08Z): a holder reads the totals
  // and is refused the rows. Strict lint reports the totals over an unreadable
  // child; marketing_user and service_agent acknowledge the pair on the three
  // account figures (`rollupSourceUnreadableReason`, @objectstack 18.6.0).
  it.each(['crm_user', 'marketing_user', 'service_agent', 'project_member'])('a holder of %s alone reads no invoice and no payment', async (set) => {
    const holder = await signUpPerson(verify, `${set}@o2c-receivables.test`, { name: `Inert ${set}`, permissionSets: [set] });
    expect((await verify.rows('crm_invoice', {})).length, 'fixture: invoices exist').toBeGreaterThan(0);
    expect((await verify.rows('crm_payment', {})).length, 'fixture: payments exist').toBeGreaterThan(0);
    await expect(verify.rows('crm_contract', {}, { as: holder.token }), 'the set grants no contract read').rejects.toThrow(/permission/i);
    await expect(verify.rows('crm_invoice', {}, { as: holder.token })).rejects.toThrow(/permission/i);
    await expect(verify.rows('crm_payment', {}, { as: holder.token })).rejects.toThrow(/permission/i);
  });
});

/**
 * `tenant_admin` is registered only by the SaaS composition
 * (`HOTCRM_COMPOSITION=saas`, `test/saas-composition.test.ts`), so it is read
 * on a boot of that artifact. Its object grants are `system_admin`'s, spread
 * (`tenant-admin.profile.ts`), so it holds Modify All on the account and reads
 * the totals over `crm_user`'s rows: an administrator holding only
 * `tenant_admin` + `crm_user` reads them, and nothing is authored for it.
 */
describe('the SaaS composition\'s administrator', () => {
  let saas: VerifyStack | undefined;

  afterAll(() => saas?.stop());

  it('a holder of tenant_admin (and crm_user) reads the account\'s totals, through Modify All', async () => {
    const previous = process.env[COMPOSITION_ENV_VAR];
    process.env[COMPOSITION_ENV_VAR] = 'saas';
    vi.resetModules();
    let saasArtifact: Rec;
    try {
      saasArtifact = ((await import('../objectstack.config')) as Rec).default as Rec;
    } finally {
      if (previous === undefined) delete process.env[COMPOSITION_ENV_VAR];
      else process.env[COMPOSITION_ENV_VAR] = previous;
      vi.resetModules();
    }
    saas = await bootStack(saasArtifact, bootOptions());
    // `signUpPerson` refuses a set the boot does not serve: that is the
    // fixture check that this boot is the SaaS shape.
    const saasAdmin = await saas.signIn();
    const tenantAdmin = await signUpPerson(saas, 'tenant-admin@o2c-receivables.test', { name: 'Totals tenant_admin', permissionSets: ['tenant_admin'] });
    const me = (await (await saas.apiAs(tenantAdmin.token, 'GET', '/auth/me/permissions')).json()) as Rec;
    expect([...me.permissionSets].sort(), 'the person holds tenant_admin and the default set').toEqual(expect.arrayContaining(['crm_user', 'tenant_admin']));
    const record = await totalsAsServedTo(saas, saasAdmin, tenantAdmin, 'tenant_admin');
    expect(TOTALS.map((f) => f in record)).toEqual([true, true, true]);
  }, 180_000);
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
