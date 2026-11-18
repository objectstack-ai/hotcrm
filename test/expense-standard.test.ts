// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { packageStacks } from '../objectstack.composition';
import { servedApp } from './helpers/composed-stack';
import { hotcrmStack, signUpPerson, systemUpdate, type Person } from './helpers/verify-stack';
import * as profiles from '../src/sales/profiles';

type Rec = Record<string, any>;

/**
 * ═══ Expense standards and Review Notes (hotcrm#2616, F4a) ═══
 *
 * `crm_expense_standard` (`src/expense/objects/expense_standard.object.ts`,
 * REQ-0011, `docs/architecture/expense-module-plan.md` *Expense standards*)
 * holds the company's spending standards as rows finance keeps and everyone
 * reads, for an assistant to check expenses against (「查差标」). The product
 * is not a policy engine (the maintainer's 2026-11-16 rule): nothing in it
 * reads a standard, and an expense above one saves and is submitted as
 * before. What a check finds goes in the expense's Review Notes, which the
 * approver reads on the report's page.
 */

const EXPENSE_ID = 'app.objectstack.hotcrm.expense';
const PSA_ID = 'app.objectstack.hotcrm.psa';

const stackOf = (id: string): Rec => (packageStacks as Rec[]).find((s) => s.manifest?.id === id)!;
const objectOf = (name: string): Rec => (stackOf(EXPENSE_ID).objects as Rec[]).find((o) => o.name === name)!;
const walk = (nodes: Rec[]): Rec[] => nodes.flatMap((n) => (n.type === 'group' ? walk((n.children ?? []) as Rec[]) : [n]));

describe('the expense standard is a table of advisory rows in the expense module (hotcrm#2616)', () => {
  it('is labelled Expense Standard, public read, with only a name required and no grade, city tier or position field', () => {
    const object = objectOf('crm_expense_standard');
    expect(object.label).toBe('Expense Standard');
    expect(object.sharingModel).toBe('public_read');
    const fields = object.fields as Rec;
    expect(Object.keys(fields).filter((k) => fields[k].required)).toEqual(['name']);
    expect(Object.keys(fields).sort()).toEqual(
      ['applies_to', 'category', 'details', 'is_active', 'limit_amount', 'limit_per', 'name', 'owner_id'],
    );
    // The category is the expense's own list, so a standard names what an expense carries.
    expect(fields.category.options).toEqual(objectOf('crm_expense').fields.category.options);
    expect(fields.limit_amount.type).toBe('currency');
    expect((fields.limit_per.options as Rec[]).map((o) => o.value)).toEqual(['night', 'day', 'item', 'trip']);
    expect(fields.applies_to.type).toBe('text');
    expect(fields.details.type).toBe('textarea');
    expect(fields.is_active).toMatchObject({ type: 'boolean', defaultValue: true });
    for (const name of ['grade', 'city_tier', 'position', 'currency', 'effective_from', 'effective_to']) {
      expect(fields[name], name).toBeUndefined();
    }
  });

  it('asks for Per once a limit is written, and only then', () => {
    const gate = JSON.stringify(objectOf('crm_expense_standard').fields.limit_per.requiredWhen);
    expect(gate).toContain('has(record.limit_amount)');
  });

  it('is read by nothing in the product: no hook, flow, validation or formula names it', () => {
    for (const stack of packageStacks as Rec[]) {
      const id = String(stack.manifest?.id);
      for (const hook of (stack.hooks ?? []) as Rec[]) {
        expect(hook.object, `${id} hook ${hook.name}`).not.toBe('crm_expense_standard');
        expect(String(hook.handler ?? ''), `${id} hook ${hook.name}`).not.toContain('crm_expense_standard');
      }
      for (const flow of (stack.flows ?? []) as Rec[]) {
        expect(JSON.stringify(flow), `${id} flow ${flow.name}`).not.toContain('crm_expense_standard');
      }
      for (const action of (stack.actions ?? []) as Rec[]) {
        expect(JSON.stringify(action) + String(action.handler ?? action.execute ?? ''), `${id} action ${action.name}`).not.toContain('crm_expense_standard');
      }
      for (const object of (stack.objects ?? []) as Rec[]) {
        if (object.name === 'crm_expense_standard') {
          expect(object.validations ?? [], 'the standard validates nothing about expenses').toEqual([]);
          continue;
        }
        expect(JSON.stringify(object.validations ?? []), `${id} ${object.name} validations`).not.toContain('crm_expense_standard');
        for (const [name, field] of Object.entries((object.fields ?? {}) as Rec)) {
          expect(JSON.stringify(field), `${object.name}.${name}`).not.toContain('crm_expense_standard');
        }
      }
    }
  });

  it('appears in the Expenses app once, as Expense Standards, and in no other app', () => {
    const items = walk(servedApp('crm_expenses').navigation as Rec[]).filter((i) => i.objectName === 'crm_expense_standard');
    expect(items.map((i) => i.id)).toEqual(['nav_expense_standards']);
    for (const app of ['crm_enterprise', 'crm_service', 'crm_marketing', 'crm_o2c', 'crm_psa']) {
      const named = walk(servedApp(app).navigation as Rec[]).filter((i) => i.objectName === 'crm_expense_standard');
      expect(named, app).toEqual([]);
    }
    expect(stackOf(PSA_ID).manifest.navigationContributions ?? []).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ items: expect.arrayContaining([expect.objectContaining({ objectName: 'crm_expense_standard' })]) })]),
    );
  });

  it('is read by every set that records expenses and kept by finance and administrators', () => {
    const sets = (Object.values(profiles) as unknown as Rec[]).filter((p) => Boolean(p) && typeof p === 'object' && 'objects' in p);
    const rowOf = (name: string): Rec | undefined => sets.find((s) => s.name === name)?.objects?.crm_expense_standard;
    const keep = { allowCreate: true, allowRead: true, allowEdit: true, allowDelete: true, viewAllRecords: true, modifyAllRecords: true };
    for (const name of ['finance_controller', 'ar_accountant']) expect(rowOf(name), name).toMatchObject(keep);
    expect(rowOf('system_admin')).toMatchObject(keep);
    // Every set holding an expense row reads every standard and writes none.
    const readers = sets.filter((s) => s.objects?.crm_expense && !['finance_controller', 'ar_accountant', 'system_admin', 'tenant_admin'].includes(s.name));
    expect(readers.map((s) => s.name).sort()).toEqual(
      ['crm_user', 'marketing_user', 'project_manager', 'project_member', 'sales_leadership', 'sales_manager', 'sales_rep', 'service_agent'],
    );
    for (const set of readers) {
      expect(set.objects.crm_expense_standard, set.name).toMatchObject({ allowRead: true, allowCreate: false, allowEdit: false, allowDelete: false });
    }
    expect(rowOf('service_director'), 'reads through crm_user, as for the expense').toBeUndefined();
    expect(rowOf('guest_portal')).toBeUndefined();
  });
});

describe('Review Notes on each expense (hotcrm#2616)', () => {
  it('is an optional long text worded as the report\'s, shown in the report\'s expense list', () => {
    const expense = objectOf('crm_expense');
    const report = objectOf('crm_expense_report');
    expect(expense.fields.review_notes).toMatchObject({ type: 'textarea', label: 'Review Notes' });
    expect(expense.fields.review_notes.required ?? false).toBe(false);
    expect(expense.fields.review_notes.description).toBe(report.fields.review_notes.description);
    expect(expense.fields.crm_expense_report.relatedListColumns).toContain('review_notes');
  });

  it('indexes the receipt number, so a duplicate check is one indexed query', () => {
    expect((objectOf('crm_expense').indexes as Rec[]).map((i) => i.fields)).toContainEqual(['receipt_number']);
  });
});

describe('standards on the booted app: finance keeps them, an expense above one goes through (hotcrm#2616)', () => {
  let verify: VerifyStack;
  let admin: string;
  let finance: Person;
  let spender: Person;
  let manager: Person;
  let k = 0;
  const pkg = (id: string): string => `/packages/${id}`;

  beforeAll(async () => {
    verify = await hotcrmStack();
    admin = await verify.signIn();
    finance = await signUpPerson(verify, 'finance@expense-standard.test', {
      name: 'Standard Finance', positions: ['crm_finance_controller'], permissionSets: ['finance_controller'],
    });
    spender = await signUpPerson(verify, 'spender@expense-standard.test', {
      name: 'Standard Spender', positions: ['crm_sales_rep'], permissionSets: ['sales_rep'],
    });
    manager = await signUpPerson(verify, 'manager@expense-standard.test', {
      name: 'Standard Manager', positions: ['crm_sales_manager'], permissionSets: ['sales_manager'],
    });
    await systemUpdate(verify, 'sys_user', { id: spender.id, manager_id: manager.id });
  }, 120_000);

  afterAll(async () => {
    await verify?.apiAs(admin, 'PATCH', `${pkg(PSA_ID)}/enable`);
  });

  const standard = async (doc: Rec): Promise<Response> => verify.apiAs(finance.token, 'POST', '/data/crm_expense_standard', doc);

  it('finance adds a standard; an employee reads it and cannot change or delete it', async () => {
    const res = await standard({ name: 'Hotel, tier-1 cities', category: 'lodging', limit_amount: 600, limit_per: 'night', applies_to: 'Tier-1 cities' });
    expect(res.status).toBe(201);
    const [row] = await verify.rows('crm_expense_standard', { name: 'Hotel, tier-1 cities' });
    expect(row).toMatchObject({ limit_amount: 600, limit_per: 'night', is_active: true });

    const read = await verify.apiAs(spender.token, 'GET', `/data/crm_expense_standard/${row!.id}`);
    expect(read.status).toBe(200);
    expect((await verify.apiAs(spender.token, 'PATCH', `/data/crm_expense_standard/${row!.id}`, { limit_amount: 9999 })).status).toBe(403);
    expect((await verify.apiAs(spender.token, 'DELETE', `/data/crm_expense_standard/${row!.id}`)).status).toBe(403);
    expect((await verify.apiAs(spender.token, 'POST', '/data/crm_expense_standard', { name: 'Mine' })).status).toBe(403);
    expect((await verify.rows('crm_expense_standard', { id: row!.id }))[0]!.limit_amount).toBe(600);

    expect((await verify.apiAs(finance.token, 'PATCH', `/data/crm_expense_standard/${row!.id}`, { is_active: false })).status).toBe(200);
    expect((await verify.rows('crm_expense_standard', { id: row!.id }))[0]!.is_active).toBe(false);
  });

  it('takes a rule in words with no limit, and refuses a limit with no Per', async () => {
    expect((await standard({ name: 'Second-class rail', category: 'travel', details: 'Second class on every train.' })).status).toBe(201);
    expect((await standard({ name: 'Meals, a number alone', category: 'meals', limit_amount: 100 })).status).toBe(400);
    expect(await verify.rows('crm_expense_standard', { name: 'Meals, a number alone' })).toEqual([]);
  });

  const aboveStandard = async (): Promise<void> => {
    await standard({ name: `Meals ${++k}`, category: 'meals', limit_amount: 50, limit_per: 'item' });
    const exp = await verify.hooks.run('crm_expense', 'insert', {
      name: `Team dinner ${k}`, expense_date: '2026-11-10', category: 'meals', amount: 480, receipt_number: `R-${k}`,
    }, { as: spender.token });
    expect(exp.id, 'an expense above a standard saves').toBeTruthy();
    // The spender's assistant writes what it found on the draft.
    const note = 'Above the meals standard (50 per item).';
    await verify.hooks.run('crm_expense', 'update', { id: exp.id, review_notes: note }, { as: spender.token });
    expect((await verify.rows('crm_expense', { id: exp.id }))[0]!.review_notes).toBe(note);

    const result = (await verify.actions.run('crm_expense', 'submit_for_reimbursement', { as: spender.token, params: { _selectedIds: [exp.id] } })) as Rec;
    expect(result.reports, 'submitted exactly as an expense under a standard').toHaveLength(1);
    const reportId = result.reports[0] as string;
    expect((await verify.rows('crm_expense_report', { id: reportId }))[0]!.status).toBe('submitted');

    // The approver opens the expense on the report and reads the note.
    const seen = await verify.apiAs(manager.token, 'GET', `/data/crm_expense/${exp.id}`);
    expect(seen.status).toBe(200);
    const body = (await seen.json()) as Rec;
    expect((body.record ?? body.data ?? body).review_notes).toBe(note);

    // Once the report is sent, the note locks with the expense.
    await expect(verify.hooks.run('crm_expense', 'update', { id: exp.id, review_notes: 'changed' }, { as: spender.token })).rejects.toThrow();
    expect((await verify.rows('crm_expense', { id: exp.id }))[0]!.review_notes).toBe(note);
  };

  it('an expense above a standard saves and is submitted as before; the approver reads its Review Notes', aboveStandard);

  // A package switch re-registers metadata; past the 5 s default under the full suite (hotcrm#2623).
  it('works the same with Project Delivery disabled', async () => {
    expect((await verify.apiAs(admin, 'PATCH', `${pkg(PSA_ID)}/disable`)).status).toBe(200);
    try {
      expect((await verify.apiAs(admin, 'GET', '/meta/object/crm_expense_standard')).status).toBe(200);
      await aboveStandard();
    } finally {
      expect((await verify.apiAs(admin, 'PATCH', `${pkg(PSA_ID)}/enable`)).status).toBe(200);
    }
  }, 60_000);
});
