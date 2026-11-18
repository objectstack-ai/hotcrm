// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { allFlows, packageStacks } from '../objectstack.composition';
import { servedApp } from './helpers/composed-stack';
import { conditionHolds, flowRuns, hotcrmStack, signUpPerson, systemUpdate, type Person } from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * ═══ The travel request: asking before a trip (hotcrm#2578, F3a) ═══
 *
 * `crm_expense_request` (`src/expense/objects/expense_request.object.ts`,
 * REQ-0011, `docs/architecture/expense-module-plan.md` *Travel request*) is
 * the expense module's: filed by the traveler, approved or rejected by the
 * traveler's manager in one tier, its planned values locked once approved,
 * then cancelled or closed by the traveler. Driven on the shipped app booted
 * by `@objectstack/verify`.
 */

const EXPENSE_ID = 'app.objectstack.hotcrm.expense';
const PSA_ID = 'app.objectstack.hotcrm.psa';

const stackOf = (id: string): Rec => (packageStacks as Rec[]).find((s) => s.manifest?.id === id)!;
const requestObject = (): Rec => (stackOf(EXPENSE_ID).objects as Rec[]).find((o) => o.name === 'crm_expense_request')!;
const flowNamed = (name: string): Rec => (allFlows as Rec[]).find((f) => f.name === name)!;
const walk = (nodes: Rec[]): Rec[] => nodes.flatMap((n) => (n.type === 'group' ? walk((n.children ?? []) as Rec[]) : [n]));

describe('the travel request is the expense module\'s, travel only (hotcrm#2578)', () => {
  it('is labelled Travel Request, private, with the four required values and no type or currency field', () => {
    const object = requestObject();
    expect(object.label).toBe('Travel Request');
    expect(object.sharingModel).toBe('private');
    const fields = object.fields as Rec;
    const required = Object.keys(fields).filter((k) => fields[k].required && k !== 'status').sort();
    expect(required).toEqual(['destination', 'end_date', 'estimated_amount', 'name', 'start_date']);
    for (const name of ['type', 'request_type', 'currency', 'currency_code']) expect(fields[name], name).toBeUndefined();
    expect(fields.estimated_amount.type).toBe('currency');
    expect(fields.request_number.type).toBe('autonumber');
    expect(fields.days.type).toBe('formula');
    expect(fields.approver).toMatchObject({ type: 'lookup', reference: 'sys_user', readonly: true });
    expect(fields.crm_account).toMatchObject({ type: 'lookup', reference: 'crm_account', relatedList: false });
    expect((fields.source.options as Rec[]).map((o) => o.value)).toEqual(['manual', 'agent', 'import']);
    expect(fields.review_notes.type).toBe('textarea');
    expect(object.enable.files).toBe(true);
  });

  it('carries all six statuses from the start, held by a state machine', () => {
    const object = requestObject();
    expect((object.fields.status.options as Rec[]).map((o) => o.value)).toEqual(
      ['draft', 'submitted', 'approved', 'rejected', 'cancelled', 'closed'],
    );
    const machine = (object.validations as Rec[]).find((v) => v.type === 'state_machine')!;
    expect(machine.transitions).toEqual({
      draft: ['submitted'],
      submitted: ['approved', 'rejected', 'draft'],
      approved: ['cancelled', 'closed'],
      rejected: ['draft'],
      cancelled: [],
      closed: [],
    });
  });

  it('has no project field of its own: Project Delivery contributes it', () => {
    expect(requestObject().fields.crm_project).toBeUndefined();
  });

  it('has one approval tier: the manager, falling back to the Finance Controllers, never a finance step', () => {
    for (const name of ['expense_request_approval', 'expense_request_approval_on_create']) {
      const approvals = (flowNamed(name).nodes as Rec[]).filter((n) => n.type === 'approval');
      expect(approvals.map((n) => n.id), name).toEqual(['approver_review']);
      expect(approvals[0]!.config).toMatchObject({
        approvers: [{ type: 'manager', value: 'owner_id' }],
        onEmptyApprovers: 'fallback',
        fallbackApprovers: [{ type: 'position', value: 'crm_finance_controller' }],
        lockRecord: true,
      });
    }
  });

  it('appears in the Expenses app under Travel Requests, and as My Travel Requests in Project Delivery only', () => {
    const items = walk(servedApp('crm_expenses').navigation as Rec[]).filter((i) => i.objectName === 'crm_expense_request');
    expect(items.map((i) => i.id)).toEqual(['nav_my_travel_requests', 'nav_travel_requests_to_approve', 'nav_all_travel_requests']);
    // Contributed beside My Expenses (hotcrm#2581); the app's own navigation never names it (R3).
    const psa = walk(servedApp('crm_psa').navigation as Rec[]);
    expect(psa.filter((i) => i.objectName === 'crm_expense_request').map((i) => i.id)).toEqual(['nav_my_travel_requests']);
    const ids = psa.map((i) => i.id);
    expect(ids.indexOf('nav_my_travel_requests')).toBe(ids.indexOf('nav_expense_reports_to_approve') + 1);
    for (const app of ['crm_enterprise', 'crm_service', 'crm_marketing', 'crm_o2c']) {
      const named = walk(servedApp(app).navigation as Rec[]).filter((i) => i.objectName === 'crm_expense_request');
      expect(named, app).toEqual([]);
    }
  });
});

describe('a travel request goes to the traveler\'s manager (expense_request_approval)', () => {
  let verify: VerifyStack;
  let traveler: Person;
  let loner: Person;
  let manager: Person;
  let finance: Person;
  let k = 0;

  const insert = (doc: Rec, as: string): Promise<Rec> => verify.hooks.run('crm_expense_request', 'insert', doc, { as });
  const update = (doc: Rec, as: string): Promise<Rec> => verify.hooks.run('crm_expense_request', 'update', doc, { as });
  const row = async (id: string): Promise<Rec> => (await verify.rows('crm_expense_request', { id }))[0]!;
  const openRequests = (id: string): Promise<Rec[]> => verify.rows('sys_approval_request', { record_id: id, status: 'pending' });
  const act = async (recordId: string, token: string, action: 'approve' | 'reject' | 'recall'): Promise<number> => {
    const [request] = await openRequests(recordId);
    expect(request, `no open approval request on ${recordId}`).toBeTruthy();
    return (await verify.apiAs(token, 'POST', `/approvals/requests/${request!.id}/${action}`, { comment: `${action} in test.` })).status;
  };
  const trip = (extra: Rec = {}): Rec => ({
    name: `Customer visit ${++k}`, destination: 'Shanghai', start_date: '2026-12-01', end_date: '2026-12-03', estimated_amount: 3000, ...extra,
  });
  const approved = async (): Promise<string> => {
    const req = await insert(trip(), traveler.token);
    await update({ id: req.id, status: 'submitted' }, traveler.token);
    expect(await act(req.id, manager.token, 'approve')).toBe(200);
    expect((await row(req.id)).status).toBe('approved');
    return req.id;
  };

  beforeAll(async () => {
    verify = await hotcrmStack();
    manager = await signUpPerson(verify, 'manager@expense-request.test', {
      name: 'Request Manager', positions: ['crm_sales_manager'], permissionSets: ['sales_manager'],
    });
    traveler = await signUpPerson(verify, 'traveler@expense-request.test', {
      name: 'Request Traveler', positions: ['crm_sales_rep'], permissionSets: ['sales_rep'],
    });
    loner = await signUpPerson(verify, 'loner@expense-request.test', {
      name: 'Request Loner', positions: ['crm_marketing_user'], permissionSets: ['marketing_user'],
    });
    finance = await signUpPerson(verify, 'finance@expense-request.test', {
      name: 'Request Finance', positions: ['crm_finance_controller'], permissionSets: ['finance_controller'],
    });
    await systemUpdate(verify, 'sys_user', { id: traveler.id, manager_id: manager.id });
  }, 120_000);

  it('is filed as a draft with the four required values, Source Manual and both dates counted', async () => {
    const req = await insert(trip(), traveler.token);
    const stored = await row(req.id);
    expect(stored).toMatchObject({ status: 'draft', source: 'manual', owner_id: traveler.id });
    expect(String(stored.request_number)).toMatch(/^TR-\d{5}$/);
    const read = await verify.apiAs(traveler.token, 'GET', `/data/crm_expense_request/${req.id}`);
    const body = (await read.json()) as Rec;
    expect((body.record ?? body.data ?? body).days).toBe(3);
    expect(await openRequests(req.id)).toHaveLength(0);
  });

  it('refuses an end date before the start date', async () => {
    await expect(insert(trip({ start_date: '2026-12-05', end_date: '2026-12-01' }), traveler.token)).rejects.toThrow(/End Date must be on or after Start Date/);
  });

  it('is approved by the manager, who can open it; the traveler cannot decide it; no finance step follows', async () => {
    const req = await insert(trip({ estimated_amount: 50_000 }), traveler.token);
    await update({ id: req.id, status: 'submitted' }, traveler.token);
    expect(await openRequests(req.id)).toHaveLength(1);
    expect((await row(req.id)).approver, 'the flow names the manager before the request opens').toBe(manager.id);
    expect((await verify.apiAs(manager.token, 'GET', `/data/crm_expense_request/${req.id}`)).status, 'shared to the approver').toBe(200);
    expect(await act(req.id, traveler.token, 'approve'), 'nobody decides their own').not.toBe(200);
    expect(await act(req.id, manager.token, 'approve')).toBe(200);
    expect((await row(req.id)).status, 'one tier, whatever the amount').toBe('approved');
    expect(await openRequests(req.id)).toHaveLength(0);
  });

  it('goes back to Draft when rejected, and can be corrected and submitted again', async () => {
    const req = await insert(trip(), traveler.token);
    await update({ id: req.id, status: 'submitted' }, traveler.token);
    expect(await act(req.id, manager.token, 'reject')).toBe(200);
    expect((await row(req.id)).status).toBe('rejected');
    await update({ id: req.id, status: 'draft', destination: 'Hangzhou' }, traveler.token);
    await update({ id: req.id, status: 'submitted' }, traveler.token);
    expect(await openRequests(req.id)).toHaveLength(1);
    expect((await row(req.id)).destination).toBe('Hangzhou');
  });

  it('puts a recalled one back to Draft, and nobody sets Approved by hand', async () => {
    const req = await insert(trip(), traveler.token);
    await update({ id: req.id, status: 'submitted' }, traveler.token);
    expect(await act(req.id, traveler.token, 'recall')).toBe(200);
    expect((await row(req.id)).status).toBe('draft');
    await expect(update({ id: req.id, status: 'approved' }, manager.token)).rejects.toThrow(/approved or rejected by its approver/);
  });

  it('opens the approval for one filed already Submitted (an agent filing and sending in one save)', async () => {
    const req = await insert(trip({ status: 'submitted', source: 'agent' }), traveler.token);
    expect(await openRequests(req.id)).toHaveLength(1);
    expect(await act(req.id, manager.token, 'approve')).toBe(200);
    expect((await row(req.id)).status).toBe('approved');
  });

  it('goes to the Finance Controllers when the traveler has no manager', async () => {
    const req = await insert(trip(), loner.token);
    await update({ id: req.id, status: 'submitted' }, loner.token);
    expect(await openRequests(req.id)).toHaveLength(1);
    expect(await act(req.id, finance.token, 'approve')).toBe(200);
    expect((await row(req.id)).status).toBe('approved');
  });

  it('keeps its planned values once approved; the notes still take a write', async () => {
    const id = await approved();
    const res = await verify.apiAs(traveler.token, 'PATCH', `/data/crm_expense_request/${id}`, {
      name: 'Changed purpose', destination: 'Beijing', start_date: '2026-12-10', end_date: '2026-12-12', estimated_amount: 9999, notes: 'Hotel booked.',
    });
    expect(res.status, await res.clone().text()).toBeLessThan(300);
    const stored = await row(id);
    expect(stored).toMatchObject({ destination: 'Shanghai', start_date: '2026-12-01', end_date: '2026-12-03', estimated_amount: 3000, notes: 'Hotel booked.' });
    expect(stored.name).toMatch(/^Customer visit /);
  });

  it('is cancelled or closed by the traveler once approved, and both are final', async () => {
    const cancelled = await approved();
    await update({ id: cancelled, status: 'cancelled' }, traveler.token);
    expect((await row(cancelled)).status).toBe('cancelled');
    await expect(update({ id: cancelled, status: 'approved' }, traveler.token)).rejects.toThrow();
    await expect(update({ id: cancelled, status: 'draft' }, traveler.token)).rejects.toThrow(/status change is not allowed/);

    const closed = await approved();
    const res = await verify.apiAs(traveler.token, 'PATCH', `/data/crm_expense_request/${closed}`, { status: 'closed' });
    expect(res.status, 'an agent acting as the traveler closes it through the API').toBeLessThan(300);
    expect((await row(closed)).status).toBe('closed');
    await expect(update({ id: closed, status: 'cancelled' }, traveler.token)).rejects.toThrow(/status change is not allowed/);
  });

  it('cannot be cancelled or closed before it is approved', async () => {
    const req = await insert(trip(), traveler.token);
    await expect(update({ id: req.id, status: 'cancelled' }, traveler.token)).rejects.toThrow(/status change is not allowed/);
    await expect(update({ id: req.id, status: 'closed' }, traveler.token)).rejects.toThrow(/status change is not allowed/);
  });

  it('finance reads every request and edits none that is not theirs; another rep reads none', async () => {
    const req = await insert(trip(), traveler.token);
    expect((await verify.apiAs(finance.token, 'GET', `/data/crm_expense_request/${req.id}`)).status).toBe(200);
    const edit = await verify.apiAs(finance.token, 'PATCH', `/data/crm_expense_request/${req.id}`, { notes: 'Finance was here.' });
    expect(edit.status, 'View All reads; it edits nothing').toBeGreaterThanOrEqual(400);
    expect((await row(req.id)).notes ?? null).toBeNull();
    const other = await signUpPerson(verify, 'other-rep@expense-request.test', {
      name: 'Other Traveler', positions: ['crm_sales_rep'], permissionSets: ['sales_rep'],
    });
    expect((await verify.apiAs(other.token, 'GET', `/data/crm_expense_request/${req.id}`)).status).not.toBe(200);
  });
});

/**
 * The card's acceptance: with Project Delivery disabled and enabled the
 * request works the same; with the expense module disabled nothing else
 * breaks. Measured through the platform's package disable.
 */
describe('the travel request and the module switches (hotcrm#2578)', () => {
  let verify: VerifyStack;
  let admin: string;
  let traveler: Person;
  let manager: Person;
  let k = 0;
  const pkg = (id: string): string => `/packages/${id}`;

  beforeAll(async () => {
    verify = await hotcrmStack();
    admin = await verify.signIn();
    manager = await signUpPerson(verify, 'manager@request-disable.test', {
      name: 'Switch Manager', positions: ['crm_sales_manager'], permissionSets: ['sales_manager'],
    });
    traveler = await signUpPerson(verify, 'traveler@request-disable.test', {
      name: 'Switch Traveler', positions: ['crm_project_member'], permissionSets: ['project_member'],
    });
    await systemUpdate(verify, 'sys_user', { id: traveler.id, manager_id: manager.id });
  }, 120_000);

  afterAll(async () => {
    await verify?.apiAs(admin, 'PATCH', `${pkg(EXPENSE_ID)}/enable`);
    await verify?.apiAs(admin, 'PATCH', `${pkg(PSA_ID)}/enable`);
  });

  const fileAndApprove = async (): Promise<string> => {
    const req = await verify.hooks.run('crm_expense_request', 'insert', {
      name: `Workshop ${++k}`, destination: 'Shenzhen', start_date: '2026-12-08', end_date: '2026-12-09', estimated_amount: 1800,
    }, { as: traveler.token });
    await verify.hooks.run('crm_expense_request', 'update', { id: req.id, status: 'submitted' }, { as: traveler.token });
    const [request] = await verify.rows('sys_approval_request', { record_id: req.id, status: 'pending' });
    expect(request, 'the manager is asked').toBeTruthy();
    expect((await verify.apiAs(manager.token, 'POST', `/approvals/requests/${request!.id}/approve`, { comment: 'ok' })).status).toBe(200);
    expect((await verify.rows('crm_expense_request', { id: req.id }))[0]!.status).toBe('approved');
    for (const run of await flowRuns(verify, 'expense_request_approval', req.id)) expect(run.error ?? null, `run ${run.id}`).toBeNull();
    return req.id;
  };

  // A package disable or enable re-registers the module's metadata, and each
  // of these cases files and approves around one or two of them: under the
  // full suite's load that runs past the 5 s default (merge-queue run
  // 44135337244), though about 2 s alone. Each switch case here takes the
  // explicit timeout of the repo's other multi-step stack cases.
  it('works the same with Project Delivery enabled and disabled', async () => {
    await fileAndApprove();
    expect((await verify.apiAs(admin, 'PATCH', `${pkg(PSA_ID)}/disable`)).status).toBe(200);
    try {
      await fileAndApprove();
    } finally {
      expect((await verify.apiAs(admin, 'PATCH', `${pkg(PSA_ID)}/enable`)).status).toBe(200);
    }
  }, 60_000);

  it('leaves with the expense module, and the rest of the app keeps working', async () => {
    const id = await fileAndApprove();
    expect((await verify.apiAs(admin, 'PATCH', `${pkg(EXPENSE_ID)}/disable`)).status).toBe(200);
    try {
      expect((await verify.apiAs(admin, 'GET', '/meta/object/crm_expense_request')).status).toBe(404);
      expect((await verify.apiAs(admin, 'GET', '/meta/app/crm_expenses')).status).toBe(404);
      for (const app of ['crm_enterprise', 'crm_psa']) {
        expect((await verify.apiAs(admin, 'GET', `/meta/app/${app}`)).status, app).toBe(200);
      }
      const [account] = await verify.rows('crm_account', {});
      expect((await verify.apiAs(admin, 'GET', `/data/crm_account/${account!.id}`)).status).toBe(200);
    } finally {
      expect((await verify.apiAs(admin, 'PATCH', `${pkg(EXPENSE_ID)}/enable`)).status).toBe(200);
    }
    expect((await verify.rows('crm_expense_request', { id }))[0]!.status, 'the request is kept').toBe('approved');
  }, 60_000);
});

describe('the start conditions open one request per submission (hotcrm#2578)', () => {
  let verify: VerifyStack;
  beforeAll(async () => {
    verify = await hotcrmStack();
  }, 120_000);

  const startOf = (name: string): unknown => (flowNamed(name).nodes as Rec[]).find((n) => n.type === 'start')!.config.condition;

  it('a save into Submitted starts it; a re-save of a submitted one or a draft does not', () => {
    const cond = startOf('expense_request_approval');
    expect(conditionHolds(verify, cond, { record: { status: 'submitted' }, previous: { status: 'draft' } })).toBe(true);
    expect(conditionHolds(verify, cond, { record: { status: 'submitted' }, previous: { status: 'submitted' } })).toBe(false);
    expect(conditionHolds(verify, cond, { record: { status: 'draft' }, previous: { status: 'draft' } })).toBe(false);
    expect(conditionHolds(verify, startOf('expense_request_approval_on_create'), { record: { status: 'submitted' } })).toBe(true);
    expect(conditionHolds(verify, startOf('expense_request_approval_on_create'), { record: { status: 'draft' } })).toBe(false);
  });
});

/**
 * ═══ A travel request on a project goes to its Project Manager (hotcrm#2581, F3d) ═══
 *
 * Project Delivery contributes the request's Project field
 * (`src/psa/extensions/expense-project.extension.ts`); the project path,
 * `expense_request_project_approval`, sits in the expense module for the
 * platform gap objectstack#34616, as the expense's does
 * (`src/expense/flows/expense-request-project-approval.flow.ts`).
 */
describe('Project Delivery contributes the request\'s project (hotcrm#2581)', () => {
  const extension = (): Rec => ((stackOf(PSA_ID).objectExtensions ?? []) as Rec[]).find((e) => e.extend === 'crm_expense_request')!;

  it('an optional Project, with the expense\'s picker rule, locked with the plan once approved', () => {
    const field = extension().fields.crm_project as Rec;
    expect(field).toMatchObject({ type: 'lookup', reference: 'crm_project' });
    expect(field.required).toBeFalsy();
    const expenseField = ((stackOf(PSA_ID).objectExtensions as Rec[]).find((e) => e.extend === 'crm_expense')!.fields.crm_project) as Rec;
    expect(field.lookupFilters).toEqual(expenseField.lookupFilters);
    expect(field.relatedList, 'the project page lists its requests').not.toBe(false);
    expect(field.readonlyWhen).toEqual(requestObject().fields.destination.readonlyWhen);
  });

  it('adds no summary on the project: a request is a plan, not a cost', () => {
    const project = (stackOf(PSA_ID).objects as Rec[]).find((o) => o.name === 'crm_project')!;
    const over = Object.entries(project.fields as Rec)
      .filter(([, f]) => (f as Rec).type === 'summary' && (f as Rec).summaryOperations?.object === 'crm_expense_request');
    expect(over.map(([k]) => k)).toEqual([]);
  });

  it('the project path is one tier, its Project Manager by expression, an administrator when there is none', () => {
    for (const name of ['expense_request_project_approval', 'expense_request_project_approval_on_create']) {
      const flow = flowNamed(name);
      expect((stackOf(EXPENSE_ID).flows as Rec[]).map((f) => f.name), 'in the expense module until objectstack#34616').toContain(name);
      const approvals = (flow.nodes as Rec[]).filter((n) => n.type === 'approval');
      expect(approvals.map((n) => n.id), name).toEqual(['approver_review']);
      expect(approvals[0]!.config).toMatchObject({
        approvers: [{ type: 'expression', value: 'vars.projectRecord.project_manager' }],
        excludeSubmitter: true,
        onEmptyApprovers: 'admin_rescue',
        lockRecord: true,
      });
    }
  });
});

describe('two approvals for a travel request, never both (hotcrm#2581)', () => {
  let verify: VerifyStack;
  beforeAll(async () => {
    verify = await hotcrmStack();
  }, 120_000);

  const startOf = (name: string): unknown => (flowNamed(name).nodes as Rec[]).find((n) => n.type === 'start')!.config.condition;
  const shapes: [string, Rec][] = [
    ['a project', { crm_project: 'prj_1' }],
    ['a null project', { crm_project: null }],
    ['an empty project', { crm_project: '' }],
    ['no project key (the field absent, Project Delivery disabled)', {}],
  ];

  it.each(shapes)('a request submitted with %s starts exactly one of them', (_label, shape) => {
    const vars = { record: { status: 'submitted', ...shape }, previous: { status: 'draft', ...shape } };
    const manager = conditionHolds(verify, startOf('expense_request_approval'), vars);
    const project = conditionHolds(verify, startOf('expense_request_project_approval'), vars);
    expect(manager !== project, `manager path ${manager}, project path ${project}`).toBe(true);
    expect(project).toBe(shape.crm_project === 'prj_1');
    const born = { record: { status: 'submitted', ...shape } };
    expect(conditionHolds(verify, startOf('expense_request_approval_on_create'), born)).toBe(manager);
    expect(conditionHolds(verify, startOf('expense_request_project_approval_on_create'), born)).toBe(project);
  });

  it('neither starts on a draft, or on a re-save of a submitted one', () => {
    for (const [, shape] of shapes) {
      for (const vars of [
        { record: { status: 'draft', ...shape }, previous: { status: 'draft', ...shape } },
        { record: { status: 'submitted', ...shape }, previous: { status: 'submitted', ...shape } },
      ]) {
        expect(conditionHolds(verify, startOf('expense_request_approval'), vars)).toBe(false);
        expect(conditionHolds(verify, startOf('expense_request_project_approval'), vars)).toBe(false);
      }
    }
  });
});

describe('a travel request on a project goes to its Project Manager (expense_request_project_approval)', () => {
  let verify: VerifyStack;
  let admin: string;
  let consultant: Person;
  let lineManager: Person;
  let pm: Person;
  let finance: Person;
  let project: Rec;
  let k = 0;

  const insert = (object: string, doc: Rec, as: string): Promise<Rec> => verify.hooks.run(object, 'insert', doc, { as });
  const update = (object: string, doc: Rec, as: string): Promise<Rec> => verify.hooks.run(object, 'update', doc, { as });
  const row = async (id: string): Promise<Rec> => (await verify.rows('crm_expense_request', { id }))[0]!;
  const openRequests = (id: string): Promise<Rec[]> => verify.rows('sys_approval_request', { record_id: id, status: 'pending' });
  const act = async (recordId: string, token: string, action: 'approve' | 'reject' | 'recall'): Promise<number> => {
    const [request] = await openRequests(recordId);
    expect(request, `no open approval request on ${recordId}`).toBeTruthy();
    return (await verify.apiAs(token, 'POST', `/approvals/requests/${request!.id}/${action}`, { comment: `${action} in test.` })).status;
  };
  const trip = (extra: Rec = {}): Rec => ({
    name: `Go-live support ${++k}`, destination: 'Chengdu', start_date: '2026-12-14', end_date: '2026-12-16', estimated_amount: 4200,
    crm_project: project.id, ...extra,
  });
  /** A project with `manager` staffed as its Project Manager, and the consultant on it. */
  const staffedProject = async (manager: Person | null): Promise<Rec> => {
    const [account] = await verify.rows('crm_account', {});
    const card = await insert('crm_rate_card', {
      name: `Request Card ${++k}`, seniority: 'senior', unit: 'hour', cost_rate: 50, bill_rate: 100,
    }, finance.token);
    const p = await insert('crm_project', { name: `Travel Project ${++k}`, crm_account: account!.id, kind: 'delivery' }, pm.token);
    if (manager) await insert('crm_project_member', { crm_project: p.id, person: manager.id, responsibility: 'project_manager', rate_card: card.id }, pm.token);
    await insert('crm_project_member', { crm_project: p.id, person: consultant.id, responsibility: 'consultant', rate_card: card.id }, pm.token);
    return (await verify.rows('crm_project', { id: p.id }))[0]!;
  };

  beforeAll(async () => {
    verify = await hotcrmStack();
    admin = await verify.signIn();
    lineManager = await signUpPerson(verify, 'line-manager@request-project.test', {
      name: 'Line Manager', positions: ['crm_sales_manager'], permissionSets: ['sales_manager'],
    });
    pm = await signUpPerson(verify, 'pm@request-project.test', {
      name: 'Request PM', positions: ['crm_project_manager'], permissionSets: ['project_manager'],
    });
    consultant = await signUpPerson(verify, 'consultant@request-project.test', {
      name: 'Request Consultant', positions: ['crm_project_member'], permissionSets: ['project_member'],
    });
    finance = await signUpPerson(verify, 'finance@request-project.test', {
      name: 'Request Finance', positions: ['crm_finance_controller'], permissionSets: ['finance_controller'],
    });
    await systemUpdate(verify, 'sys_user', { id: consultant.id, manager_id: lineManager.id });
    project = await staffedProject(pm);
    expect(project.project_manager, 'kept from the staffing row').toBe(pm.id);
  }, 120_000);

  it('is decided by the Project Manager, not the traveler\'s manager; one tier, whatever the amount', async () => {
    const req = await insert('crm_expense_request', trip({ estimated_amount: 50_000 }), consultant.token);
    await update('crm_expense_request', { id: req.id, status: 'submitted' }, consultant.token);
    expect(await openRequests(req.id)).toHaveLength(1);
    expect((await row(req.id)).approver, 'the flow names the PM before the request opens').toBe(pm.id);
    expect((await verify.apiAs(pm.token, 'GET', `/data/crm_expense_request/${req.id}`)).status, 'shared to the approver').toBe(200);
    expect(await act(req.id, lineManager.token, 'approve'), 'the line manager is not on the slate').not.toBe(200);
    expect(await act(req.id, consultant.token, 'approve'), 'nobody decides their own').not.toBe(200);
    expect(await act(req.id, pm.token, 'approve')).toBe(200);
    expect((await row(req.id)).status).toBe('approved');
    expect(await openRequests(req.id)).toHaveLength(0);
    expect(await flowRuns(verify, 'expense_request_approval', req.id), 'the manager path never starts').toEqual([]);
  });

  it('opens the approval for one filed already Submitted, and a rejection sends it back', async () => {
    const req = await insert('crm_expense_request', trip({ status: 'submitted', source: 'agent' }), consultant.token);
    expect(await openRequests(req.id)).toHaveLength(1);
    expect((await row(req.id)).approver).toBe(pm.id);
    expect(await act(req.id, pm.token, 'reject')).toBe(200);
    expect((await row(req.id)).status).toBe('rejected');
  });

  it('puts a recalled one back to Draft, and moved off the project it goes to the line manager', async () => {
    const req = await insert('crm_expense_request', trip(), consultant.token);
    await update('crm_expense_request', { id: req.id, status: 'submitted' }, consultant.token);
    expect(await act(req.id, consultant.token, 'recall')).toBe(200);
    expect((await row(req.id)).status).toBe('draft');
    await update('crm_expense_request', { id: req.id, crm_project: null }, consultant.token);
    await update('crm_expense_request', { id: req.id, status: 'submitted' }, consultant.token);
    expect((await row(req.id)).approver).toBe(lineManager.id);
    expect(await act(req.id, lineManager.token, 'approve')).toBe(200);
    expect((await row(req.id)).status).toBe('approved');
  });

  it('a request without a project still goes to the traveler\'s manager', async () => {
    const req = await insert('crm_expense_request', trip({ crm_project: null }), consultant.token);
    await update('crm_expense_request', { id: req.id, status: 'submitted' }, consultant.token);
    expect((await row(req.id)).approver).toBe(lineManager.id);
    expect(await act(req.id, lineManager.token, 'approve')).toBe(200);
    expect(await flowRuns(verify, 'expense_request_project_approval', req.id)).toEqual([]);
  });

  it('keeps its project once approved, with the rest of the plan', async () => {
    const req = await insert('crm_expense_request', trip(), consultant.token);
    await update('crm_expense_request', { id: req.id, status: 'submitted' }, consultant.token);
    expect(await act(req.id, pm.token, 'approve')).toBe(200);
    const other = await staffedProject(pm);
    const res = await verify.apiAs(consultant.token, 'PATCH', `/data/crm_expense_request/${req.id}`, { crm_project: other.id, notes: 'Booked.' });
    expect(res.status, await res.clone().text()).toBeLessThan(300);
    expect(await row(req.id)).toMatchObject({ crm_project: project.id, notes: 'Booked.' });
  });

  it('goes to an administrator when the project has no Project Manager, or the traveler is it', async () => {
    const unmanaged = await staffedProject(null);
    const req = await insert('crm_expense_request', trip({ crm_project: unmanaged.id }), consultant.token);
    await update('crm_expense_request', { id: req.id, status: 'submitted' }, consultant.token);
    expect(await openRequests(req.id)).toHaveLength(1);
    expect(await act(req.id, admin, 'approve')).toBe(200);
    expect((await row(req.id)).status).toBe('approved');

    const own = await insert('crm_expense_request', trip(), pm.token);
    await update('crm_expense_request', { id: own.id, status: 'submitted' }, pm.token);
    expect(await act(own.id, pm.token, 'approve'), 'nobody approves their own trip').not.toBe(200);
    expect(await act(own.id, admin, 'approve')).toBe(200);
  });
});

/**
 * The card's acceptance for the switches: Project Delivery off, the field
 * leaves the request and the request is filed, submitted and approved by the
 * line manager; the expense module off, projects still read, list and edit.
 */
describe('the request\'s project and the module switches (hotcrm#2581)', () => {
  let verify: VerifyStack;
  let admin: string;
  let traveler: Person;
  let manager: Person;
  let pm: Person;
  let k = 0;
  const pkg = (id: string): string => `/packages/${id}`;

  beforeAll(async () => {
    verify = await hotcrmStack();
    admin = await verify.signIn();
    manager = await signUpPerson(verify, 'manager@request-project-switch.test', {
      name: 'Switch Line Manager', positions: ['crm_sales_manager'], permissionSets: ['sales_manager'],
    });
    traveler = await signUpPerson(verify, 'traveler@request-project-switch.test', {
      name: 'Switch Consultant', positions: ['crm_project_member'], permissionSets: ['project_member'],
    });
    pm = await signUpPerson(verify, 'pm@request-project-switch.test', {
      name: 'Switch PM', positions: ['crm_project_manager'], permissionSets: ['project_manager'],
    });
    await systemUpdate(verify, 'sys_user', { id: traveler.id, manager_id: manager.id });
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

  it('with Project Delivery off, the request has no Project field and the line manager approves it', async () => {
    expect(await fieldsOf('crm_expense_request')).toContain('crm_project');
    expect((await verify.apiAs(admin, 'PATCH', `${pkg(PSA_ID)}/disable`)).status).toBe(200);
    try {
      expect(await fieldsOf('crm_expense_request')).not.toContain('crm_project');
      const req = await verify.hooks.run('crm_expense_request', 'insert', {
        name: `Kick-off ${++k}`, destination: 'Wuhan', start_date: '2026-12-21', end_date: '2026-12-22', estimated_amount: 900,
      }, { as: traveler.token });
      await verify.hooks.run('crm_expense_request', 'update', { id: req.id, status: 'submitted' }, { as: traveler.token });
      const [request] = await verify.rows('sys_approval_request', { record_id: req.id, status: 'pending' });
      expect(request, 'the manager path runs').toBeTruthy();
      expect((await verify.apiAs(manager.token, 'POST', `/approvals/requests/${request!.id}/approve`, { comment: 'ok' })).status).toBe(200);
      expect((await verify.rows('crm_expense_request', { id: req.id }))[0]!.status).toBe('approved');
      expect(await flowRuns(verify, 'expense_request_project_approval', req.id), 'the project path never starts').toEqual([]);
      for (const run of await flowRuns(verify, 'expense_request_approval', req.id)) expect(run.error ?? null, `run ${run.id}`).toBeNull();
    } finally {
      expect((await verify.apiAs(admin, 'PATCH', `${pkg(PSA_ID)}/enable`)).status).toBe(200);
    }
    expect(await fieldsOf('crm_expense_request'), 'the field returns on enable').toContain('crm_project');
  }, 60_000);

  it('with the expense module off, projects read, list and edit, and My Travel Requests leaves Project Delivery', async () => {
    const navIds = async (): Promise<string[]> => {
      const res = await verify.apiAs(admin, 'GET', '/meta/app/crm_psa');
      const body = (await res.json()) as Rec;
      return walk(((body.item ?? body.data ?? body).navigation ?? []) as Rec[]).map((i) => String(i.id));
    };
    expect(await navIds()).toContain('nav_my_travel_requests');
    expect((await verify.apiAs(admin, 'PATCH', `${pkg(EXPENSE_ID)}/disable`)).status).toBe(200);
    try {
      expect(await navIds()).not.toContain('nav_my_travel_requests');
      const [account] = await verify.rows('crm_account', {});
      const project = await verify.hooks.run('crm_project', 'insert', {
        name: `No Expenses ${++k}`, crm_account: account!.id, kind: 'delivery',
      }, { as: pm.token });
      expect((await verify.apiAs(pm.token, 'GET', `/data/crm_project/${project.id}`)).status).toBe(200);
      expect((await verify.apiAs(pm.token, 'GET', '/data/crm_project')).status).toBe(200);
      await verify.hooks.run('crm_project', 'update', { id: project.id, description: 'Edited with expenses off.' }, { as: pm.token });
      expect((await verify.rows('crm_project', { id: project.id }))[0]!.description).toBe('Edited with expenses off.');
    } finally {
      expect((await verify.apiAs(admin, 'PATCH', `${pkg(EXPENSE_ID)}/enable`)).status).toBe(200);
    }
  }, 60_000);
});
