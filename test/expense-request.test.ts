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

  it('appears in the Expenses app only, under Travel Requests', () => {
    const items = walk(servedApp('crm_expenses').navigation as Rec[]).filter((i) => i.objectName === 'crm_expense_request');
    expect(items.map((i) => i.id)).toEqual(['nav_my_travel_requests', 'nav_travel_requests_to_approve', 'nav_all_travel_requests']);
    for (const app of ['crm_enterprise', 'crm_service', 'crm_marketing', 'crm_psa', 'crm_o2c']) {
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

  it('works the same with Project Delivery enabled and disabled', async () => {
    await fileAndApprove();
    expect((await verify.apiAs(admin, 'PATCH', `${pkg(PSA_ID)}/disable`)).status).toBe(200);
    try {
      await fileAndApprove();
    } finally {
      expect((await verify.apiAs(admin, 'PATCH', `${pkg(PSA_ID)}/enable`)).status).toBe(200);
    }
  });

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
  });
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
