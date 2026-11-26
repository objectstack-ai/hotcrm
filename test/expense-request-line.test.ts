// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { packageStacks } from '../objectstack.composition';
import { hotcrmStack, signUpPerson, systemUpdate, type Person } from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * ═══ Itinerary lines: the legs of a travel request (hotcrm#2579, F3b) ═══
 *
 * `crm_expense_request_line` (`src/expense/objects/expense_request_line.object.ts`)
 * is a detail of the travel request: what to book, from where to where, and
 * when, with no amount. Its planned values lock with the request from
 * Submitted on, through a `parent`-scoped `readonlyWhen` the engine enforces by
 * dropping a caller's value, and `expense_request_line_lock`, which refuses a
 * person's change, add, removal or move out loud first (the leg's edit dialog
 * does not evaluate a `parent` predicate, so a silent drop would read as
 * saved). The booking reference stays writable, because it is written after
 * booking. Driven on the shipped app booted by
 * `@objectstack/verify`, through REST as an agent acting as the traveler would.
 */

const EXPENSE_ID = 'app.objectstack.hotcrm.expense';
const PLANNED = ['crm_expense_request', 'kind', 'origin', 'destination', 'start_date', 'end_date', 'details'];

const lineObject = (): Rec => ((packageStacks as Rec[]).find((s) => s.manifest?.id === EXPENSE_ID)!.objects as Rec[])
  .find((o) => o.name === 'crm_expense_request_line')!;

describe('an itinerary line is a leg of a travel request, with no amount (hotcrm#2579)', () => {
  it('is a detail of the request, its access following the request, and optional', () => {
    const object = lineObject();
    expect(object.sharingModel).toBe('controlled_by_parent');
    const fields = object.fields as Rec;
    expect(fields.crm_expense_request).toMatchObject({ type: 'master_detail', reference: 'crm_expense_request', required: true, deleteBehavior: 'cascade' });
    expect((fields.kind.options as Rec[]).map((o) => o.value)).toEqual(['flight', 'train', 'car', 'hotel', 'other']);
    const money = Object.keys(fields).filter((k) => ['currency', 'number', 'percent'].includes(fields[k].type) && k !== 'line_number');
    expect(money, 'the request carries the one estimate').toEqual([]);
  });

  it('locks every planned value with the request, and leaves the booking reference open', () => {
    const fields = lineObject().fields as Rec;
    for (const name of PLANNED) expect(JSON.stringify(fields[name].readonlyWhen ?? null), name).toMatch(/parent\.status/);
    expect(fields.booking_reference.readonlyWhen, 'written after booking, so after approval').toBeUndefined();
    expect(fields.booking_reference.readonly ?? false).toBe(false);
  });
});

describe('the legs on a request, through approval (hotcrm#2579)', () => {
  let verify: VerifyStack;
  let traveler: Person;
  let manager: Person;
  let finance: Person;
  let other: Person;
  let k = 0;

  const call = async (p: Person, method: string, url: string, body?: Rec): Promise<{ status: number; body: Rec }> => {
    const res = await verify.apiAs(p.token, method, url, body);
    return { status: res.status, body: ((await res.json().catch(() => ({}))) ?? {}) as Rec };
  };
  const fileRequest = async (): Promise<string> => (await verify.hooks.run('crm_expense_request', 'insert', {
    name: `Customer workshop ${++k}`, destination: 'Beijing', start_date: '2026-12-01', end_date: '2026-12-04', estimated_amount: 8000,
  }, { as: traveler.token })).id;
  const addLeg = (requestId: string, leg: Rec): Promise<{ status: number; body: Rec }> =>
    call(traveler, 'POST', '/data/crm_expense_request_line', { crm_expense_request: requestId, ...leg });
  const legs = async (requestId: string): Promise<Rec[]> =>
    (await verify.rows('crm_expense_request_line', { crm_expense_request: requestId }))
      .sort((a, b) => String(a.start_date).localeCompare(String(b.start_date)) || a.line_number - b.line_number);
  const status = async (requestId: string): Promise<string> => (await verify.rows('crm_expense_request', { id: requestId }))[0]!.status;
  const submit = (requestId: string): Promise<Rec> =>
    verify.hooks.run('crm_expense_request', 'update', { id: requestId, status: 'submitted' }, { as: traveler.token });
  const decide = async (requestId: string, action: 'approve' | 'reject' | 'recall', as: Person): Promise<void> => {
    const [request] = await verify.rows('sys_approval_request', { record_id: requestId, status: 'pending' });
    expect(request, `no open approval on ${requestId}`).toBeTruthy();
    expect((await verify.apiAs(as.token, 'POST', `/approvals/requests/${request!.id}/${action}`, { comment: action })).status).toBe(200);
  };
  const threeLegs = async (requestId: string): Promise<void> => {
    // Added out of date order, to show the page lists them by date.
    for (const leg of [
      { kind: 'hotel', destination: 'Beijing', start_date: '2026-12-01', end_date: '2026-12-04', details: 'Near the customer.' },
      { kind: 'flight', origin: 'Shanghai', destination: 'Beijing', start_date: '2026-12-01', details: 'Aisle seat.' },
      { kind: 'train', origin: 'Beijing', destination: 'Shanghai', start_date: '2026-12-04' },
    ]) expect((await addLeg(requestId, leg)).status).toBe(201);
  };

  beforeAll(async () => {
    verify = await hotcrmStack();
    manager = await signUpPerson(verify, 'manager@itinerary.test', {
      name: 'Itinerary Manager', positions: ['crm_sales_manager'], permissionSets: ['sales_manager'],
    });
    traveler = await signUpPerson(verify, 'traveler@itinerary.test', {
      name: 'Itinerary Traveler', positions: ['crm_sales_rep'], permissionSets: ['sales_rep'],
    });
    finance = await signUpPerson(verify, 'finance@itinerary.test', {
      name: 'Itinerary Finance', positions: ['crm_finance_controller'], permissionSets: ['finance_controller'],
    });
    other = await signUpPerson(verify, 'other@itinerary.test', {
      name: 'Itinerary Other', positions: ['crm_sales_rep'], permissionSets: ['sales_rep'],
    });
    await systemUpdate(verify, 'sys_user', { id: traveler.id, manager_id: manager.id });
  }, 120_000);

  it('takes three legs, numbered as added and read in the order of the trip; the approver reads them', async () => {
    const id = await fileRequest();
    await threeLegs(id);
    const rows = await legs(id);
    expect(rows.map((r) => [r.kind, r.line_number])).toEqual([['hotel', 1], ['flight', 2], ['train', 3]]);
    expect(rows.every((r) => r.booking_reference == null)).toBe(true);
    await submit(id);
    const read = await call(manager, 'GET', `/data/crm_expense_request_line?crm_expense_request=${id}`);
    expect(read.status).toBe(200);
    expect((read.body.records as Rec[]).map((r) => r.kind).sort()).toEqual(['flight', 'hotel', 'train']);
  });

  it('refuses a leg that ends before it starts', async () => {
    const id = await fileRequest();
    const res = await addLeg(id, { kind: 'hotel', destination: 'Beijing', start_date: '2026-12-04', end_date: '2026-12-01' });
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toMatch(/End Date must be on or after Start Date/);
  });

  it('after approval keeps every planned value of a leg and takes a booking reference, from the traveler or the approver', async () => {
    const id = await fileRequest();
    await threeLegs(id);
    await submit(id);
    await decide(id, 'approve', manager);
    expect(await status(id)).toBe('approved');
    const [hotel, flight] = await legs(id);

    const change = await call(traveler, 'PATCH', `/data/crm_expense_request_line/${flight!.id}`, {
      kind: 'train', origin: 'Nanjing', destination: 'Tianjin', start_date: '2026-12-09', end_date: '2026-12-10', details: 'Window.', booking_reference: 'PNR-7QX2LM',
    });
    expect(change.status, 'a change of plan is refused out loud, not dropped and reported saved').toBe(409);
    expect(String(change.body.error)).toMatch(/is Approved, so its legs are fixed: only a Booking Reference can still be written/);
    // The whole leg sent back with only the booking reference new, as the edit dialog sends it.
    const booked = await call(traveler, 'PATCH', `/data/crm_expense_request_line/${flight!.id}`, {
      kind: 'flight', origin: 'Shanghai', destination: 'Beijing', start_date: '2026-12-01', end_date: null, details: 'Aisle seat.', booking_reference: 'PNR-7QX2LM',
    });
    expect(booked.status).toBeLessThan(300);
    const after = (await legs(id)).find((r) => r.id === flight!.id)!;
    expect(after).toMatchObject({
      kind: 'flight', origin: 'Shanghai', destination: 'Beijing', start_date: '2026-12-01', details: 'Aisle seat.', booking_reference: 'PNR-7QX2LM',
    });
    expect(after.end_date ?? null).toBeNull();

    expect((await call(manager, 'PATCH', `/data/crm_expense_request_line/${hotel!.id}`, { booking_reference: 'HTL-55120' })).status).toBeLessThan(300);
    expect((await legs(id)).find((r) => r.id === hotel!.id)!.booking_reference).toBe('HTL-55120');
  });

  it('refuses adding, removing or moving a leg of an approved request', async () => {
    const id = await fileRequest();
    await threeLegs(id);
    await submit(id);
    await decide(id, 'approve', manager);
    const [first] = await legs(id);

    const added = await addLeg(id, { kind: 'car', destination: 'Airport', start_date: '2026-12-04' });
    expect(added.status).toBe(409);
    expect(added.body.code).toBe('RECORD_LOCKED');
    expect(String(added.body.error)).toMatch(/is Approved, so its legs are fixed/);

    expect((await call(traveler, 'DELETE', `/data/crm_expense_request_line/${first!.id}`)).status).toBe(409);
    const draft = await fileRequest();
    expect((await call(traveler, 'PATCH', `/data/crm_expense_request_line/${first!.id}`, { crm_expense_request: draft })).status).toBe(409);
    expect(await legs(id)).toHaveLength(3);
    expect(await legs(draft)).toHaveLength(0);
  });

  it('holds the legs while the request waits, and opens them again when it is rejected', async () => {
    const id = await fileRequest();
    await threeLegs(id);
    await submit(id);
    const [, flight] = await legs(id);
    expect((await call(traveler, 'PATCH', `/data/crm_expense_request_line/${flight!.id}`, { origin: 'Hangzhou' })).status).toBe(409);
    // While the approval is pending the platform holds every line of the request (objectstack 1e018d6, 19.0):
    // the booking reference too, which stays writable once the request is decided.
    const held = await call(traveler, 'PATCH', `/data/crm_expense_request_line/${flight!.id}`, { booking_reference: 'HOLD-1' });
    expect([held.status, held.body.code]).toEqual([409, 'RECORD_LOCKED']);
    expect((await legs(id))[1]).toMatchObject({ origin: 'Shanghai' });
    expect((await legs(id))[1]!.booking_reference ?? null).toBeNull();
    expect((await addLeg(id, { kind: 'other', destination: 'Beijing', start_date: '2026-12-02' })).status).toBe(409);

    await decide(id, 'reject', manager);
    expect(await status(id)).toBe('rejected');
    expect((await call(traveler, 'PATCH', `/data/crm_expense_request_line/${flight!.id}`, { origin: 'Hangzhou' })).status).toBeLessThan(300);
    expect((await legs(id))[1]!.origin).toBe('Hangzhou');
    expect((await addLeg(id, { kind: 'car', destination: 'Customer site', start_date: '2026-12-02' })).status).toBe(201);
  });

  it('submits and is approved with no legs at all', async () => {
    const id = await fileRequest();
    await submit(id);
    await decide(id, 'approve', manager);
    expect(await status(id)).toBe('approved');
  });

  it('is read by finance, who writes nothing on it, and by nobody outside the request', async () => {
    const id = await fileRequest();
    await threeLegs(id);
    const [leg] = await legs(id);
    expect((await call(finance, 'GET', `/data/crm_expense_request_line/${leg!.id}`)).status).toBe(200);
    expect((await call(finance, 'PATCH', `/data/crm_expense_request_line/${leg!.id}`, { booking_reference: 'FIN-1' })).status).toBe(403);
    expect((await call(other, 'GET', `/data/crm_expense_request_line/${leg!.id}`)).status).toBe(404);
    const listed = await call(other, 'GET', `/data/crm_expense_request_line?crm_expense_request=${id}`);
    expect(listed.body.records ?? []).toEqual([]);
  });

  it('goes with its request when the request is deleted', async () => {
    const id = await fileRequest();
    await threeLegs(id);
    expect((await call(traveler, 'DELETE', `/data/crm_expense_request/${id}`)).status).toBeLessThan(300);
    expect(await legs(id)).toHaveLength(0);
  });
});
