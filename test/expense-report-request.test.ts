// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { packageStacks } from '../objectstack.composition';
import { hotcrmStack, signUpPerson, systemUpdate, type Person } from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * ═══ An expense report read against its travel request (hotcrm#2580, F3c) ═══
 *
 * A report may cite one approved travel request, chosen when its expenses are
 * submitted: **Submit for a Trip** (`src/expense/actions/expense.actions.ts`)
 * runs Submit for Reimbursement's body with a required request param, so
 * Submit for Reimbursement keeps its one click for an expense with no trip
 * (on 18.5.0 any param, even an optional one, opens the param dialog). The
 * request shows what its reports add up to against the estimate; each report
 * carries the same two amounts for its approver
 * (`expense_report_request_totals`); the last open report paid closes the
 * request. Nothing blocks a report over the estimate. Driven on the shipped
 * app booted by `@objectstack/verify`.
 */

const EXPENSE_ID = 'app.objectstack.hotcrm.expense';
const expenseStack = (): Rec => (packageStacks as Rec[]).find((s) => s.manifest?.id === EXPENSE_ID)!;
const objectNamed = (name: string): Rec => (expenseStack().objects as Rec[]).find((o) => o.name === name)!;
const actionNamed = (name: string): Rec => (expenseStack().actions as Rec[]).find((a) => a.name === name)!;

describe('the request is chosen at submit, never afterwards (hotcrm#2580)', () => {
  it('Submit for Reimbursement has no param, so an expense with no trip takes no extra step', () => {
    expect(actionNamed('submit_for_reimbursement').params ?? []).toEqual([]);
  });

  it('Submit for a Trip runs the same body, with the report\'s request field as its one required param', () => {
    const plain = actionNamed('submit_for_reimbursement');
    const trip = actionNamed('submit_trip_for_reimbursement');
    expect(trip.body.source, 'one source, so the grouping and the checks cannot drift').toBe(plain.body.source);
    expect(trip.visible).toEqual(plain.visible);
    expect(trip.params).toEqual([expect.objectContaining({ field: 'crm_expense_request', objectOverride: 'crm_expense_report', required: true })]);
    const bar = ((expenseStack().views as Rec[]).flatMap((v) => Object.values((v.listViews ?? {}) as Rec)) as Rec[])
      .find((v) => v.name === 'my_expenses')!;
    expect((bar.bulkActionDefs as Rec[]).map((d) => d.name)).toEqual(expect.arrayContaining(['submit_for_reimbursement', 'submit_trip_for_reimbursement']));
  });

  it('the picker offers the caller\'s own approved requests; the field is read-only on the report', () => {
    const field = objectNamed('crm_expense_report').fields.crm_expense_request;
    expect(field).toMatchObject({ type: 'lookup', reference: 'crm_expense_request', readonly: true });
    expect(field.lookupFilters).toEqual([
      { field: 'owner_id', operator: 'eq', value: '{current_user_id}' },
      { field: 'status', operator: 'eq', value: 'approved' },
    ]);
  });

  it('the amounts are kept by expense_report_request_totals, which refuses nothing', () => {
    const hook = (expenseStack().hooks as Rec[]).find((h) => h.name === 'expense_report_request_totals')!;
    expect(hook).toMatchObject({ object: 'crm_expense_report', events: ['afterInsert', 'afterUpdate'], runAs: 'system' });
    expect(hook.refusals ?? {}, 'a sign, never a block').toEqual({});
  });

  it('no rule refuses a report over the estimate', () => {
    const validations = [...(objectNamed('crm_expense_report').validations ?? []), ...(objectNamed('crm_expense_request').validations ?? [])] as Rec[];
    expect(validations.filter((v) => /estimate/i.test(JSON.stringify(v)))).toEqual([]);
  });
});

describe('a trip\'s reports against its estimate (hotcrm#2580)', () => {
  let verify: VerifyStack;
  let traveler: Person;
  let manager: Person;
  let finance: Person;
  let other: Person;
  let k = 0;

  const get = async (p: Person, object: string, id: string): Promise<{ status: number; record: Rec }> => {
    const res = await verify.apiAs(p.token, 'GET', `/data/${object}/${id}`);
    const body = ((await res.json().catch(() => ({}))) ?? {}) as Rec;
    return { status: res.status, record: (body.record ?? body) as Rec };
  };
  const row = async (object: string, id: string): Promise<Rec> => (await verify.rows(object, { id }))[0]!;
  const decide = async (recordId: string, action: 'approve' | 'reject' | 'recall', as: Person): Promise<number> => {
    const [request] = await verify.rows('sys_approval_request', { record_id: recordId, status: 'pending' });
    expect(request, `no open approval on ${recordId}`).toBeTruthy();
    return (await verify.apiAs(as.token, 'POST', `/approvals/requests/${request!.id}/${action}`, { comment: action })).status;
  };
  /** A travel request of `as`, filed and approved by the manager unless `approve` is false. */
  const approvedRequest = async (estimate: number, as: Person = traveler, approve = true): Promise<string> => {
    const { id } = await verify.hooks.run('crm_expense_request', 'insert', {
      name: `Customer visit ${++k}`, destination: 'Beijing', start_date: '2026-12-01', end_date: '2026-12-03', estimated_amount: estimate,
    }, { as: as.token });
    if (!approve) return id;
    await verify.hooks.run('crm_expense_request', 'update', { id, status: 'submitted' }, { as: as.token });
    expect(await decide(id, 'approve', manager)).toBe(200);
    expect((await row('crm_expense_request', id)).status).toBe('approved');
    return id;
  };
  const expense = async (amount: number, as: Person = traveler): Promise<string> => (await verify.hooks.run('crm_expense', 'insert', {
    name: `Hotel ${++k}`, expense_date: '2026-12-02', category: 'lodging', amount,
  }, { as: as.token })).id;
  /** Submit for a Trip (or Submit for Reimbursement with no request); the reports it made. */
  const submit = async (ids: string[], request?: string, as: Person = traveler): Promise<string[]> => {
    const action = request ? 'submit_trip_for_reimbursement' : 'submit_for_reimbursement';
    const params: Rec = ids.length === 1 ? {} : { _selectedIds: ids };
    if (request) params.crm_expense_request = request;
    const result = (await verify.actions.run('crm_expense', action, ids.length === 1
      ? { as: as.token, recordId: ids[0], params }
      : { as: as.token, params })) as Rec;
    return result.reports as string[];
  };
  const pay = (reportId: string): Promise<unknown> => verify.actions.run('crm_expense_report', 'mark_expense_report_paid', {
    as: finance.token, recordId: reportId, params: { payment_date: '2026-12-10', payment_reference: `TRF-${++k}` },
  });

  beforeAll(async () => {
    verify = await hotcrmStack();
    manager = await signUpPerson(verify, 'manager@trip-report.test', {
      name: 'Trip Manager', positions: ['crm_sales_manager'], permissionSets: ['sales_manager'],
    });
    traveler = await signUpPerson(verify, 'traveler@trip-report.test', {
      name: 'Trip Traveler', positions: ['crm_sales_rep'], permissionSets: ['sales_rep'],
    });
    finance = await signUpPerson(verify, 'finance@trip-report.test', {
      name: 'Trip Finance', positions: ['crm_finance_controller'], permissionSets: ['finance_controller'],
    });
    other = await signUpPerson(verify, 'other@trip-report.test', {
      name: 'Trip Other', positions: ['crm_sales_rep'], permissionSets: ['sales_rep'],
    });
    await systemUpdate(verify, 'sys_user', { id: traveler.id, manager_id: manager.id });
    await systemUpdate(verify, 'sys_user', { id: other.id, manager_id: manager.id });
  }, 120_000);

  it('the request shows estimated, reported and the difference; a second report adds to it', async () => {
    const requestId = await approvedRequest(1000);
    const [first] = await submit([await expense(300), await expense(200)], requestId);
    expect(await row('crm_expense_report', first!)).toMatchObject({
      status: 'submitted', crm_expense_request: requestId, total_amount: 500,
      request_estimated_amount: 1000, request_reported_amount: 500,
    });
    let seen = (await get(traveler, 'crm_expense_request', requestId)).record;
    expect(seen).toMatchObject({ estimated_amount: 1000, reported_amount: 500, estimate_difference: -500, over_estimate: false });

    const [second] = await submit([await expense(250)], requestId);
    seen = (await get(traveler, 'crm_expense_request', requestId)).record;
    expect(seen).toMatchObject({ reported_amount: 750, estimate_difference: -250, over_estimate: false });
    for (const id of [first!, second!]) {
      expect(await row('crm_expense_report', id), 'every report of the trip reads the same reported amount').toMatchObject({ request_reported_amount: 750 });
    }
    const reports = await verify.rows('crm_expense_report', { crm_expense_request: requestId });
    expect(reports.map((r) => r.id).sort(), 'the request lists its reports').toEqual([first, second].sort());
  });

  it('a report over the estimate shows it to its approver, who can still approve it', async () => {
    const requestId = await approvedRequest(400);
    const [reportId] = await submit([await expense(320), await expense(180)], requestId);
    const asApprover = await get(manager, 'crm_expense_report', reportId!);
    expect(asApprover.status).toBe(200);
    expect(asApprover.record).toMatchObject({ request_estimated_amount: 400, request_reported_amount: 500, request_over_estimate: true });
    expect((await get(traveler, 'crm_expense_request', requestId)).record).toMatchObject({ estimate_difference: 100, over_estimate: true });
    expect(await decide(reportId!, 'approve', manager), 'a sign, never a block').toBe(200);
    expect((await row('crm_expense_report', reportId!)).status).toBe('approved');
  });

  it('a draft or rejected report is not counted until it is sent again', async () => {
    const requestId = await approvedRequest(1000);
    const [reportId] = await submit([await expense(600)], requestId);
    expect(await decide(reportId!, 'reject', manager)).toBe(200);
    expect((await row('crm_expense_request', requestId)).reported_amount ?? 0).toBe(0);
    expect(await row('crm_expense_report', reportId!)).toMatchObject({ request_reported_amount: 0 });
    await verify.actions.run('crm_expense_report', 'reopen_expense_report', { as: traveler.token, recordId: reportId! });
    await verify.actions.run('crm_expense_report', 'submit_expense_report', { as: traveler.token, recordId: reportId! });
    expect((await row('crm_expense_request', requestId)).reported_amount).toBe(600);
  });

  it('marking the last open report paid closes the request, and the picker then leaves it out', async () => {
    const requestId = await approvedRequest(1000);
    const [first] = await submit([await expense(300)], requestId);
    const [second] = await submit([await expense(200)], requestId);
    expect(await decide(first!, 'approve', manager)).toBe(200);
    expect(await decide(second!, 'approve', manager)).toBe(200);
    await pay(first!);
    expect((await row('crm_expense_request', requestId)).status, 'another report is still approved').toBe('approved');
    await pay(second!);
    expect((await row('crm_expense_request', requestId)).status).toBe('closed');
    expect(await row('crm_expense_report', second!)).toMatchObject({ status: 'paid', request_reported_amount: 500 });

    const picker = objectNamed('crm_expense_report').fields.crm_expense_request.lookupFilters as Rec[];
    const offered = await verify.rows('crm_expense_request', {
      owner_id: traveler.id, ...Object.fromEntries(picker.filter((f) => f.field !== 'owner_id').map((f) => [f.field, f.value])),
    });
    expect(offered.map((r) => r.id), 'the picker\'s filter no longer matches a closed request').not.toContain(requestId);
    const loose = await expense(90);
    await expect(submit([loose], requestId), 'and the action refuses one sent anyway').rejects.toThrow(/is closed, so it takes no new expense report/);
    expect((await row('crm_expense', loose)).crm_expense_report ?? null, 'nothing was written').toBeNull();
  });

  it('a cancelled, unapproved or someone else\'s request takes no report', async () => {
    const cancelled = await approvedRequest(500);
    await verify.actions.run('crm_expense_request', 'cancel_expense_request', { as: traveler.token, recordId: cancelled });
    expect((await row('crm_expense_request', cancelled)).status).toBe('cancelled');
    await expect(submit([await expense(50)], cancelled)).rejects.toThrow(/is cancelled, so it takes no new expense report/);
    const draft = await approvedRequest(500, traveler, false);
    await expect(submit([await expense(50)], draft)).rejects.toThrow(/is not approved yet/);
    const theirs = await approvedRequest(500, other);
    await expect(submit([await expense(50)], theirs)).rejects.toThrow(/not yours, or no longer exists/);
  });

  it('a report with no request behaves as before: one click, no trip amounts, and approval as usual', async () => {
    const [reportId] = await submit([await expense(70)]);
    const stored = await row('crm_expense_report', reportId!);
    expect(stored).toMatchObject({ status: 'submitted', approver: manager.id, total_amount: 70 });
    expect(stored.crm_expense_request ?? null).toBeNull();
    expect(stored.request_estimated_amount ?? null).toBeNull();
    expect(stored.request_reported_amount ?? null).toBeNull();
    expect(await decide(reportId!, 'approve', manager)).toBe(200);
    await pay(reportId!);
    expect((await row('crm_expense_report', reportId!)).status).toBe('paid');
  });

  it('finance reads the request\'s amounts; nobody writes the report\'s copies by hand', async () => {
    const requestId = await approvedRequest(1000);
    const [reportId] = await submit([await expense(100)], requestId);
    expect((await get(finance, 'crm_expense_request', requestId)).record).toMatchObject({ reported_amount: 100 });
    await verify.hooks.run('crm_expense_report', 'update', { id: reportId!, request_reported_amount: 1, request_estimated_amount: 2 }, { as: traveler.token }).catch(() => undefined);
    expect(await row('crm_expense_report', reportId!)).toMatchObject({ request_estimated_amount: 1000, request_reported_amount: 100 });
  });
});
