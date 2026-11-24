// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import { ExpressionEngine } from '@objectstack/formula';
import type { VerifyStack } from '@objectstack/verify';
import stack from './helpers/composed-stack';
import { hotcrmStack, signUpPerson, type Person } from './helpers/verify-stack';

/**
 * The order's lifecycle actions (#2716).
 *
 * Before them, an order moved only through Edit and the Status dropdown, and
 * users looking for a Confirm button found none. Now each forward step of
 * `sales_order_status_progression` has a button, offered only where the step
 * leaves from (`src/sales/actions/sales_order.actions.ts`).
 *
 * What is pinned:
 *
 *  - the OFFER per status: Draft offers Confirm and Cancel, Confirmed offers
 *    Complete and Cancel, Completed and Cancelled offer none;
 *  - the MACHINE AGREES: every status an action is offered on, read off its
 *    `visible` by evaluating it, is a status its patch is a declared move
 *    from, and every declared move but `confirmed → draft` (no button, the
 *    card names none) has an action. The machine is read off the object, so a
 *    change to either side that the other does not follow turns this red;
 *  - the offer follows the GRANT: a persona whose sets read orders but may not
 *    edit them is offered none, by the effective permissions the server
 *    publishes;
 *  - the WRITE is the caller's, through the action door the console posts to:
 *    a rep confirms and completes an order, cancels another; a move the
 *    machine refuses by then answers the machine's own refusal, not a silent
 *    success; and the API still moves the status under the same machine,
 *    since Status stays editable on the form until objectstack#36806.
 */

type Rec = Record<string, any>;

const ACTIONS = ['confirm_sales_order', 'complete_sales_order', 'cancel_sales_order'] as const;
const STATUSES = ['draft', 'confirmed', 'completed', 'cancelled'] as const;

const actions: Rec[] = (stack as Rec).actions ?? [];
const actionNamed = (name: string): Rec => {
  const a = actions.find((x) => x.name === name);
  if (!a) throw new Error(`no ${name} action registered`);
  return a;
};
const order: Rec = ((stack as Rec).objects as Rec[]).find((o) => o.name === 'crm_sales_order')!;
const rule: Rec = (order.validations as Rec[]).find((v) => v.name === 'sales_order_status_progression')!;
const machine: Record<string, string[]> = rule.transitions;

/**
 * Evaluate an action's `visible` the way the console does. The default map is
 * an editor's as a session publishes it: read beside edit, since
 * `current_user.can(object, 'edit')` answers edit only together with read.
 */
const offered = (name: string, record: Rec, permissions: Rec = { crm_sales_order: { allowRead: true, allowEdit: true } }): boolean => {
  const result = ExpressionEngine.evaluate<boolean>(actionNamed(name).visible, {
    user: { id: 'u1', positions: [] }, record, permissions: permissions as never,
  });
  expect(result.ok, `${name}.visible did not evaluate: ${JSON.stringify(result)}`).toBe(true);
  return (result as Rec).value === true;
};
const fromStatuses = (name: string): string[] => STATUSES.filter((status) => offered(name, { status }));

describe('each status offers the moves it can make', () => {
  it.each([
    ['draft', ['confirm_sales_order', 'cancel_sales_order']],
    ['confirmed', ['complete_sales_order', 'cancel_sales_order']],
    ['completed', []],
    ['cancelled', []],
  ] as const)('%s offers %j', (status, expected) => {
    expect(ACTIONS.filter((name) => offered(name, { status }))).toEqual(expected);
  });

  it.each(ACTIONS)('%s is withheld before the record has loaded', (name) => {
    expect(offered(name, {})).toBe(false);
  });
});

describe('each action is a declared step of the order machine', () => {
  it.each(ACTIONS)('%s is a declarative update of the status alone, offered only where its move is declared', (name) => {
    const action = actionNamed(name);
    expect(action.operation).toBe('update');
    expect(Object.keys(action.patch)).toEqual(['status']);
    const to = action.patch.status as string;
    for (const status of fromStatuses(name)) expect(machine[status], `${name}: ${status} → ${to} is not a declared move`).toContain(to);
  });

  it('every declared move but Confirmed → Draft has its action', () => {
    const covered = new Set(ACTIONS.flatMap((name) => fromStatuses(name).map((from) => `${from}→${actionNamed(name).patch.status}`)));
    const declared = Object.entries(machine).flatMap(([from, tos]) => tos.map((to) => `${from}→${to}`));
    // Confirmed → Draft has no button (the card names none): it stays a
    // Status edit on the form until the field becomes action-only.
    expect(declared.filter((move) => !covered.has(move))).toEqual(['confirmed→draft']);
  });

  it.each(ACTIONS)('%s asks first and names the order when it succeeds', (name) => {
    const action = actionNamed(name);
    expect(String(action.confirmText ?? '').length, `${name} asks nothing first`).toBeGreaterThan(0);
    const message = action.successMessage;
    expect(String(message?.source ?? message)).toContain('{{ record.name }}');
  });
});

let verify: VerifyStack;
let rep: Person;
let otherRep: Person;
let accountant: Person;
let k = 0;

beforeAll(async () => {
  verify = await hotcrmStack();
  rep = await signUpPerson(verify, 'rep@order-lifecycle.test', {
    name: 'Life Rep', positions: ['crm_sales_rep'], permissionSets: ['sales_rep'],
  });
  otherRep = await signUpPerson(verify, 'other@order-lifecycle.test', {
    name: 'Other Rep', positions: ['crm_sales_rep'], permissionSets: ['sales_rep'],
  });
  accountant = await signUpPerson(verify, 'ar@order-lifecycle.test', {
    name: 'Life Accountant', positions: ['crm_ar_accountant'], permissionSets: ['ar_accountant'],
  });
}, 180_000);

const permissionsOf = async (p: Person): Promise<Rec> => {
  const res = await verify.apiAs(p.token, 'GET', '/auth/me/permissions');
  expect(res.status, await res.clone().text()).toBe(200);
  const body: Rec = await res.json();
  return (body.data ?? body).objects;
};

describe('the offer follows the grant to edit an order', () => {
  it('is made to a rep, on the statuses each step leaves from', async () => {
    const permissions = await permissionsOf(rep);
    expect(offered('confirm_sales_order', { status: 'draft' }, permissions)).toBe(true);
    expect(offered('complete_sales_order', { status: 'confirmed' }, permissions)).toBe(true);
    expect(offered('cancel_sales_order', { status: 'confirmed' }, permissions)).toBe(true);
  });

  it('is withheld from an AR accountant, who reads every order and edits none', async () => {
    const permissions = await permissionsOf(accountant);
    for (const name of ACTIONS) {
      for (const status of STATUSES) expect(offered(name, { status }, permissions), `${name} on ${status}`).toBe(false);
    }
  });
});

const stored = async (id: string): Promise<Rec> => (await verify.rows('crm_sales_order', { id }))[0]!;
const run = (name: string, id: string, who: Person = rep): Promise<unknown> =>
  verify.actions.run('crm_sales_order', name, { as: who.token, recordId: id });
const refusal = (p: Promise<unknown>): Promise<Rec | null> => p.then(() => null, (e: Rec) => e);

/** A draft order on an account the rep owns, created as the form creates it. */
const draftOrder = async (): Promise<Rec> => {
  const [account] = await verify.seed('crm_account', [{ name: `Life Order Co ${++k}`, owner_id: rep.id }]);
  const res = await verify.apiAs(rep.token, 'POST', '/data/crm_sales_order', { name: `Life Order ${k}`, crm_account: account!.id });
  const body: Rec = await res.json();
  expect(res.status, JSON.stringify(body)).toBe(201);
  return stored(body.id ?? body.record?.id);
};

describe('the write is the caller’s', () => {
  it('confirms a draft order, then completes it, one step per action', async () => {
    const o = await draftOrder();
    expect(o.status).toBe('draft');
    await run('confirm_sales_order', o.id);
    expect((await stored(o.id)).status).toBe('confirmed');
    await run('complete_sales_order', o.id);
    expect((await stored(o.id)).status).toBe('completed');
  }, 60_000);

  it('cancels a draft order, and a confirmed one', async () => {
    const draft = await draftOrder();
    await run('cancel_sales_order', draft.id);
    expect((await stored(draft.id)).status).toBe('cancelled');

    const confirmed = await draftOrder();
    await run('confirm_sales_order', confirmed.id);
    await run('cancel_sales_order', confirmed.id);
    expect((await stored(confirmed.id)).status).toBe('cancelled');
  }, 60_000);

  it('answers a move the machine refuses with the machine’s message, and moves nothing', async () => {
    // The button is not drawn here, but the status can change under an open
    // page (another person cancelled the order a moment ago): the click then
    // reaches a status its move does not leave from.
    // Re-setting the status an order already holds is no move at all, so the
    // pairs below are the real ones: a final status left for another.
    const cancelled = await draftOrder();
    await run('cancel_sales_order', cancelled.id);
    const completed = await draftOrder();
    await run('confirm_sales_order', completed.id);
    await run('complete_sales_order', completed.id);
    for (const [name, o, status] of [
      ['confirm_sales_order', cancelled, 'cancelled'],
      ['complete_sales_order', cancelled, 'cancelled'],
      ['cancel_sales_order', completed, 'completed'],
    ] as const) {
      const err = await refusal(run(name, o.id));
      expect(err, `${name} on a ${status} order answered success`).toBeTruthy();
      expect([err!.code, err!.status], name).toEqual(['VALIDATION_FAILED', 400]);
      expect(JSON.stringify(err!.details ?? err!.message), name).toContain(rule.message);
      expect((await stored(o.id)).status, name).toBe(status);
    }
  }, 60_000);

  it('moves nothing for a rep who may not edit the order', async () => {
    const o = await draftOrder();
    const err = await refusal(run('confirm_sales_order', o.id, otherRep));
    expect(err, 'another rep moved an order they cannot edit').toBeTruthy();
    expect([err!.code, err!.status]).toEqual(['RECORD_NOT_FOUND', 404]);
    expect((await stored(o.id)).status).toBe('draft');
  }, 60_000);

  it('the API still moves the status, judged by the same machine', async () => {
    const o = await draftOrder();
    const patch = (status: string) => verify.apiAs(rep.token, 'PATCH', `/data/crm_sales_order/${o.id}`, { status });
    expect((await patch('confirmed')).status).toBe(200);
    // Confirmed → Draft, the move with no button.
    expect((await patch('draft')).status).toBe(200);
    const jump = await patch('completed');
    const body: Rec = await jump.json();
    expect([jump.status, body.code]).toEqual([400, 'VALIDATION_FAILED']);
    expect(JSON.stringify(body)).toContain(rule.message);
    expect((await stored(o.id)).status).toBe('draft');
  }, 60_000);
});
