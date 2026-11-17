// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import artifact from '../objectstack.config';
import { allFlows, packageStacks } from '../objectstack.composition';
import { EXPENSE_FINANCE_REVIEW_AMOUNT } from '../src/sales/objects/_thresholds';
import { servedApp } from './helpers/composed-stack';
import { conditionHolds, flowRuns, hotcrmStack, signUpPerson, systemUpdate, type Person } from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * ═══ Expenses are their own module; Project Delivery adds the project (hotcrm#2556) ═══
 *
 * `app.objectstack.hotcrm.expense` (`src/expense/index.ts`, REQ-0011,
 * `docs/architecture/expense-module-plan.md`) owns `crm_expense`, which moved
 * out of Project Delivery under the same name. Project Delivery depends on it
 * and contributes the expense's Project field. Two approvals, never both:
 *
 * - no project: the spender's manager (`sys_user.manager_id`), the Finance
 *   Controllers when there is none, then finance from the threshold;
 * - a project: its Project Manager, then finance from the threshold (pinned,
 *   with the project cost and the over or locked turn-back, in
 *   `test/psa-approvals.test.ts`).
 *
 * Disabling either module leaves the other usable; both directions are
 * driven here on the shipped app booted by `@objectstack/verify`.
 */

const EXPENSE_ID = 'app.objectstack.hotcrm.expense';
const PSA_ID = 'app.objectstack.hotcrm.psa';
const APP_ID = 'app.objectstack.hotcrm';

const bodies: Rec[] = (((artifact as Rec).packages ?? []) as Rec[]).map((entry) => (entry?.manifest ?? {}) as Rec);
const stackOf = (id: string): Rec => (packageStacks as Rec[]).find((s) => s.manifest?.id === id)!;
const flowNamed = (name: string): Rec => (allFlows as Rec[]).find((f) => f.name === name)!;
const startCondition = (name: string): unknown => (flowNamed(name).nodes as Rec[]).find((n) => n.type === 'start')!.config.condition;
const walk = (nodes: Rec[]): Rec[] => nodes.flatMap((n) => (n.type === 'group' ? walk((n.children ?? []) as Rec[]) : [n]));

describe('the expense module ships inside the HotCRM artifact (hotcrm#2556)', () => {
  const expense = bodies.find((b) => b.id === EXPENSE_ID);
  const psa = bodies.find((b) => b.id === PSA_ID);

  it('is a module of the crm namespace, registered before Project Delivery, which depends on it', () => {
    expect(expense, `packages[] carries no ${EXPENSE_ID}`).toBeDefined();
    expect(expense!.type).toBe('module');
    expect(expense!.namespace).toBe('crm');
    const ids = bodies.map((b) => b.id);
    expect(ids.indexOf(EXPENSE_ID)).toBeLessThan(ids.indexOf(PSA_ID));
    expect(Object.keys(expense!.dependencies ?? {}), 'the app package, and nothing else').toEqual([APP_ID]);
    expect(Object.keys(psa!.dependencies ?? {}).sort()).toEqual([APP_ID, EXPENSE_ID].sort());
  });

  it('owns crm_expense and its guard, approvals, sharing rule, app and manual; no project field of its own', () => {
    const stack = stackOf(EXPENSE_ID);
    // The travel request (hotcrm#2578) is pinned in `test/expense-request.test.ts`.
    expect(((stack.objects ?? []) as Rec[]).map((o) => o.name)).toEqual(['crm_expense', 'crm_expense_request']);
    expect(((stack.hooks ?? []) as Rec[]).map((h) => h.name)).toEqual(['expense_decision_guard', 'expense_request_decision_guard']);
    expect(((stack.sharingRules ?? []) as Rec[]).map((r) => r.name)).toEqual(['expense_approver_edit', 'expense_request_approver_edit']);
    expect(((stack.apps ?? []) as Rec[]).map((a) => a.name)).toEqual(['crm_expenses']);
    expect(((stack.books ?? []) as Rec[]).map((b) => b.name)).toEqual(['crm_expense_manual']);
    expect(((stack.flows ?? []) as Rec[]).map((f) => f.name).sort()).toEqual([
      'expense_approval', 'expense_approval_on_create', 'expense_project_approval', 'expense_project_approval_on_create',
      'expense_request_approval', 'expense_request_approval_on_create',
      'expense_request_project_approval', 'expense_request_project_approval_on_create',
    ]);
    expect(stack.data ?? [], 'an expense names a person, so the module seeds none').toEqual([]);
    const fields = stack.objects[0].fields as Rec;
    expect(fields.crm_project, 'the project field is Project Delivery\'s contribution').toBeUndefined();
  });

  it('adds who paid, the merchant, the receipt number and where the entry came from, none of them required', () => {
    const fields = stackOf(EXPENSE_ID).objects[0].fields as Rec;
    const values = (name: string): string[] => (fields[name].options as Rec[]).map((o) => o.value);
    const byDefault = (name: string): string[] => (fields[name].options as Rec[]).filter((o) => o.default).map((o) => o.value);
    expect(fields.paid_by.type).toBe('select');
    expect(values('paid_by')).toEqual(['employee', 'company']);
    expect(byDefault('paid_by')).toEqual(['employee']);
    expect(fields.source.type).toBe('select');
    expect(values('source')).toEqual(['manual', 'agent', 'import']);
    expect(byDefault('source')).toEqual(['manual']);
    expect(fields.merchant).toMatchObject({ type: 'text' });
    expect(fields.receipt_number).toMatchObject({ type: 'text' });
    for (const name of ['paid_by', 'source', 'merchant', 'receipt_number']) expect(fields[name].required, name).toBeFalsy();
    for (const name of ['currency', 'currency_code']) expect(fields[name], 'no currency field (REQ-0012)').toBeUndefined();
  });

  it('Project Delivery contributes the Project field, and the picker offers no Closed or Cancelled project', () => {
    const extensions = (stackOf(PSA_ID).objectExtensions ?? []) as Rec[];
    // The travel request's project (hotcrm#2581) is pinned in `test/expense-request.test.ts`.
    expect(extensions.map((e) => e.extend)).toEqual(['crm_expense', 'crm_expense_request']);
    const field = extensions[0].fields.crm_project as Rec;
    expect(field).toMatchObject({ type: 'lookup', reference: 'crm_project' });
    expect(field.required).toBeFalsy();
    expect(field.lookupFilters).toEqual([{ field: 'status', operator: 'notIn', value: ['closed', 'cancelled'] }]);
  });

  it('project staff keep their two expense lists in the Project Delivery app, by contribution', () => {
    const items = walk(servedApp('crm_psa').navigation as Rec[]);
    for (const id of ['nav_my_expenses', 'nav_expenses_to_approve']) {
      expect(items.find((i) => i.id === id), id).toMatchObject({ type: 'object', objectName: 'crm_expense' });
    }
    const own = walk(stackOf(PSA_ID).apps[0].navigation as Rec[]).map((i) => i.objectName);
    expect(own, 'the app\'s own navigation no longer names the expense (R3)').not.toContain('crm_expense');
  });
});

describe('two approvals, never both (hotcrm#2556)', () => {
  let verify: VerifyStack;
  beforeAll(async () => {
    verify = await hotcrmStack();
  }, 120_000);

  const shapes: [string, Rec][] = [
    ['a project', { crm_project: 'prj_1' }],
    ['a null project', { crm_project: null }],
    ['an empty project', { crm_project: '' }],
    ['no project key (the field absent, Project Delivery disabled)', {}],
  ];

  it.each(shapes)('an expense submitted with %s starts exactly one of them', (_label, shape) => {
    const vars = { record: { status: 'submitted', ...shape }, previous: { status: 'draft', ...shape } };
    const manager = conditionHolds(verify, startCondition('expense_approval'), vars);
    const project = conditionHolds(verify, startCondition('expense_project_approval'), vars);
    expect(manager !== project, `manager path ${manager}, project path ${project}`).toBe(true);
    expect(project).toBe(shape.crm_project === 'prj_1');
    // The insert twins split the same way.
    const born = { record: { status: 'submitted', ...shape } };
    expect(conditionHolds(verify, startCondition('expense_approval_on_create'), born)).toBe(manager);
    expect(conditionHolds(verify, startCondition('expense_project_approval_on_create'), born)).toBe(project);
  });

  it('neither starts while the expense stays a draft', () => {
    for (const [, shape] of shapes) {
      const vars = { record: { status: 'draft', ...shape }, previous: { status: 'draft', ...shape } };
      expect(conditionHolds(verify, startCondition('expense_approval'), vars)).toBe(false);
      expect(conditionHolds(verify, startCondition('expense_project_approval'), vars)).toBe(false);
    }
  });
});

describe('an expense with no project goes to the spender\'s manager (expense_approval)', () => {
  let verify: VerifyStack;
  let spender: Person;
  let loner: Person;
  let manager: Person;
  let finance: Person;
  let k = 0;

  const insert = (doc: Rec, as: string): Promise<Rec> => verify.hooks.run('crm_expense', 'insert', doc, { as });
  const update = (doc: Rec, as: string): Promise<Rec> => verify.hooks.run('crm_expense', 'update', doc, { as });
  const row = async (id: string): Promise<Rec> => (await verify.rows('crm_expense', { id }))[0]!;
  const openRequests = (id: string): Promise<Rec[]> => verify.rows('sys_approval_request', { record_id: id, status: 'pending' });
  const act = async (recordId: string, token: string, action: 'approve' | 'reject' | 'recall'): Promise<number> => {
    const [request] = await openRequests(recordId);
    expect(request, `no open approval request on ${recordId}`).toBeTruthy();
    return (await verify.apiAs(token, 'POST', `/approvals/requests/${request!.id}/${action}`, { comment: `${action} in test.` })).status;
  };
  const taxi = (amount = 40, extra: Rec = {}): Rec => ({ name: `Taxi ${++k}`, expense_date: '2026-11-02', category: 'travel', amount, ...extra });

  beforeAll(async () => {
    verify = await hotcrmStack();
    manager = await signUpPerson(verify, 'manager@expense-module.test', {
      name: 'Expense Manager', positions: ['crm_sales_manager'], permissionSets: ['sales_manager'],
    });
    spender = await signUpPerson(verify, 'spender@expense-module.test', {
      name: 'Expense Spender', positions: ['crm_sales_rep'], permissionSets: ['sales_rep'],
    });
    loner = await signUpPerson(verify, 'loner@expense-module.test', {
      name: 'Expense Loner', positions: ['crm_marketing_user'], permissionSets: ['marketing_user'],
    });
    finance = await signUpPerson(verify, 'finance@expense-module.test', {
      name: 'Expense Finance', positions: ['crm_finance_controller'], permissionSets: ['finance_controller'],
    });
    await systemUpdate(verify, 'sys_user', { id: spender.id, manager_id: manager.id });
  }, 120_000);

  it('a sales rep records one with the new fields defaulted, and it starts as a draft', async () => {
    const exp = await insert(taxi(40, { merchant: 'City Cabs', receipt_number: 'R-1' }), spender.token);
    const stored = await row(exp.id);
    expect(stored).toMatchObject({ status: 'draft', paid_by: 'employee', source: 'manual', merchant: 'City Cabs', receipt_number: 'R-1' });
    expect(await openRequests(exp.id)).toHaveLength(0);
  });

  it('is decided by the manager, who can open it; the spender cannot decide it', async () => {
    const exp = await insert(taxi(), spender.token);
    await update({ id: exp.id, status: 'submitted' }, spender.token);
    expect(await openRequests(exp.id)).toHaveLength(1);
    expect((await row(exp.id)).approver, 'the flow names the manager before the request opens').toBe(manager.id);
    expect((await verify.apiAs(manager.token, 'GET', `/data/crm_expense/${exp.id}`)).status, 'shared to the approver').toBe(200);
    expect(await act(exp.id, spender.token, 'approve'), 'nobody decides their own').not.toBe(200);
    expect(await act(exp.id, manager.token, 'approve')).toBe(200);
    expect((await row(exp.id)).status).toBe('approved');
  });

  it('opens the approval for one entered already Submitted', async () => {
    const exp = await insert(taxi(30, { status: 'submitted' }), spender.token);
    expect(await openRequests(exp.id)).toHaveLength(1);
    expect(await act(exp.id, manager.token, 'reject')).toBe(200);
    expect((await row(exp.id)).status).toBe('rejected');
  });

  it(`sends one of ${EXPENSE_FINANCE_REVIEW_AMOUNT} or more to finance after the manager`, async () => {
    const exp = await insert(taxi(EXPENSE_FINANCE_REVIEW_AMOUNT), spender.token);
    await update({ id: exp.id, status: 'submitted' }, spender.token);
    expect(await act(exp.id, manager.token, 'approve')).toBe(200);
    expect((await row(exp.id)).status, 'still waiting on finance').toBe('submitted');
    expect(await act(exp.id, finance.token, 'approve')).toBe(200);
    expect((await row(exp.id)).status).toBe('approved');
  });

  it('goes to the Finance Controllers when the spender has no manager', async () => {
    const exp = await insert(taxi(), loner.token);
    await update({ id: exp.id, status: 'submitted' }, loner.token);
    expect(await openRequests(exp.id)).toHaveLength(1);
    expect(await act(exp.id, finance.token, 'approve')).toBe(200);
    expect((await row(exp.id)).status).toBe('approved');
  });

  it('puts a recalled one back to Draft, and nobody sets Approved by hand', async () => {
    const exp = await insert(taxi(), spender.token);
    await update({ id: exp.id, status: 'submitted' }, spender.token);
    expect(await act(exp.id, spender.token, 'recall')).toBe(200);
    expect((await row(exp.id)).status).toBe('draft');
    await expect(update({ id: exp.id, status: 'approved' }, manager.token)).rejects.toThrow(/approved or rejected by its approver/);
  });

  it('finance reads every expense; another rep reads none of the spender\'s', async () => {
    const exp = await insert(taxi(), spender.token);
    expect((await verify.apiAs(finance.token, 'GET', `/data/crm_expense/${exp.id}`)).status).toBe(200);
    const other = await signUpPerson(verify, 'other-rep@expense-module.test', {
      name: 'Other Rep', positions: ['crm_sales_rep'], permissionSets: ['sales_rep'],
    });
    expect((await verify.apiAs(other.token, 'GET', `/data/crm_expense/${exp.id}`)).status).not.toBe(200);
  });
});

/**
 * Each module disabled in turn, the other still usable — `module-split-plan.md`
 * item 15, and the card's acceptance. Measured on the shipped app booted by
 * `@objectstack/verify`, through the platform's package disable.
 */
describe('disabling either module leaves the other usable (hotcrm#2556)', () => {
  let verify: VerifyStack;
  let admin: string;
  let spender: Person;
  let manager: Person;
  let pm: Person;
  let k = 0;
  const pkg = (id: string): string => `/packages/${id}`;

  beforeAll(async () => {
    verify = await hotcrmStack();
    admin = await verify.signIn();
    manager = await signUpPerson(verify, 'manager@expense-disable.test', {
      name: 'Disable Manager', positions: ['crm_sales_manager'], permissionSets: ['sales_manager'],
    });
    spender = await signUpPerson(verify, 'spender@expense-disable.test', {
      name: 'Disable Spender', positions: ['crm_project_member'], permissionSets: ['project_member'],
    });
    pm = await signUpPerson(verify, 'pm@expense-disable.test', {
      name: 'Disable PM', positions: ['crm_project_manager'], permissionSets: ['project_manager'],
    });
    await systemUpdate(verify, 'sys_user', { id: spender.id, manager_id: manager.id });
  }, 120_000);

  afterAll(async () => {
    await verify?.apiAs(admin, 'PATCH', `${pkg(EXPENSE_ID)}/enable`);
    await verify?.apiAs(admin, 'PATCH', `${pkg(PSA_ID)}/enable`);
  });

  const fieldsOf = async (object: string): Promise<string[]> => {
    const res = await verify.apiAs(admin, 'GET', `/meta/object/${object}`);
    const body = (await res.json()) as Rec;
    return Object.keys(((body.item ?? body.data ?? body).fields ?? {}) as Rec);
  };
  const navIds = async (app: string): Promise<string[]> => {
    const res = await verify.apiAs(admin, 'GET', `/meta/app/${app}`);
    const body = (await res.json()) as Rec;
    return walk(((body.item ?? body.data ?? body).navigation ?? []) as Rec[]).map((i) => String(i.id));
  };

  it('with Project Delivery off, an expense has no Project field, and is recorded and approved by the manager', async () => {
    expect(await fieldsOf('crm_expense')).toContain('crm_project');
    expect((await verify.apiAs(admin, 'PATCH', `${pkg(PSA_ID)}/disable`)).status).toBe(200);
    try {
      expect(await fieldsOf('crm_expense')).not.toContain('crm_project');
      expect((await verify.apiAs(admin, 'GET', '/meta/app/crm_expenses')).status).toBe(200);
      const exp = await verify.hooks.run('crm_expense', 'insert', {
        name: `Lunch ${++k}`, expense_date: '2026-11-03', category: 'meals', amount: 25,
      }, { as: spender.token });
      await verify.hooks.run('crm_expense', 'update', { id: exp.id, status: 'submitted' }, { as: spender.token });
      const [request] = await verify.rows('sys_approval_request', { record_id: exp.id, status: 'pending' });
      expect(request, 'the manager path runs').toBeTruthy();
      expect((await verify.apiAs(manager.token, 'POST', `/approvals/requests/${request!.id}/approve`, { comment: 'ok' })).status).toBe(200);
      expect((await verify.rows('crm_expense', { id: exp.id }))[0]!.status).toBe('approved');
      // Measured at runtime: the project path never starts, so nothing reads
      // the absent project, and the manager path's run ends clean.
      expect(await flowRuns(verify, 'expense_project_approval', exp.id)).toEqual([]);
      const runs = await flowRuns(verify, 'expense_approval', exp.id);
      expect(runs.length).toBeGreaterThan(0);
      for (const run of runs) expect(run.error ?? null, `run ${run.id}`).toBeNull();
    } finally {
      expect((await verify.apiAs(admin, 'PATCH', `${pkg(PSA_ID)}/enable`)).status).toBe(200);
    }
    expect(await fieldsOf('crm_expense'), 'the field returns on enable').toContain('crm_project');
  });

  it('with the expense module off, projects and timesheets work, and the expense entries leave the Project Delivery app', async () => {
    expect(await navIds('crm_psa')).toContain('nav_my_expenses');
    expect((await verify.apiAs(admin, 'PATCH', `${pkg(EXPENSE_ID)}/disable`)).status).toBe(200);
    try {
      expect((await verify.apiAs(admin, 'GET', '/meta/object/crm_expense')).status).toBe(404);
      expect((await verify.apiAs(admin, 'GET', '/meta/app/crm_expenses')).status).toBe(404);
      expect((await verify.apiAs(admin, 'GET', '/meta/app/crm_psa')).status).toBe(200);
      const ids = await navIds('crm_psa');
      expect(ids).not.toContain('nav_my_expenses');
      expect(ids).not.toContain('nav_expenses_to_approve');
      expect(ids).toContain('nav_my_timesheets');
      const fields = await fieldsOf('crm_project');
      expect(fields, 'the cost summaries stay on the project').toContain('actual_expense_cost');
      const [account] = await verify.rows('crm_account', {});
      const project = await verify.hooks.run('crm_project', 'insert', {
        name: `Disabled Expenses ${++k}`, crm_account: account!.id, kind: 'delivery',
      }, { as: pm.token });
      expect((await verify.apiAs(pm.token, 'GET', `/data/crm_project/${project.id}`)).status).toBe(200);
      await verify.hooks.run('crm_project', 'update', { id: project.id, description: 'Edited with expenses off.' }, { as: pm.token });
      expect((await verify.rows('crm_project', { id: project.id }))[0]!.description).toBe('Edited with expenses off.');
    } finally {
      expect((await verify.apiAs(admin, 'PATCH', `${pkg(EXPENSE_ID)}/enable`)).status).toBe(200);
    }
    expect(await navIds('crm_psa')).toContain('nav_my_expenses');
  });
});
