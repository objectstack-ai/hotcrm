// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { ExpressionEngine } from '@objectstack/formula';
import { ChangeContractAction, ChangeOrderContractAction } from '../src/sales/actions/contract.actions';
import { DraftContractAction } from '../src/sales/actions/sales_order.actions';
import { Contract } from '../src/sales/objects/contract.object';
import { ContractViews } from '../src/sales/views/contract.view';
import {
  hotcrmStack, signUpPerson, committedFile, systemUpdate, type Person,
} from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * The contract's form, an order contract's value and Change (hotcrm#2804, hook
 * `contract_form_and_change`,
 * maintainer ruling 2026-11-26), against a booted stack.
 *
 *  1. Draft Contract on an order drafts an ORDER contract naming its order,
 *     at the order's tax-inclusive total; a person cannot type its value, and
 *     while it is a draft it follows the order.
 *  2. Once activated the value, the end date and the payment terms are locked:
 *     a direct write is refused by name, the order's later change only shows
 *     Differs from the Order Amount, and Change — with a reason and a newly
 *     signed amendment — is the one way to move them, recorded in the history.
 *  3. On an order contract Change offers no value, only Update from Order; a
 *     framework contract may be given a new value. The status stays Activated.
 *  4. A contract saved before the form existed takes its form by the backfill
 *     rule on its next write, and keeps its value.
 */

let verify: VerifyStack;
let manager: Person;
let rep: Person;
beforeAll(async () => {
  verify = await hotcrmStack();
  manager = await signUpPerson(verify, 'manager@contract-form-change.test', {
    name: 'Form Manager', positions: ['crm_sales_manager'], permissionSets: ['sales_manager'],
  });
  rep = await signUpPerson(verify, 'rep@contract-form-change.test', {
    name: 'Form Rep', positions: ['crm_sales_rep'], permissionSets: ['sales_rep'],
  });
}, 120_000);

const as = (who: Person) => ({ as: who.token });
const stored = async (object: string, id: string): Promise<Rec> => (await verify.rows(object, { id }))[0]!;
const refusal = (p: Promise<unknown>): Promise<Rec | null> => p.then(() => null, (e: Rec) => e);
/** The ADR-0112 envelope: code and status, never the throw alone. */
const expectRefused = (err: Rec | null, code: string, status: number) => {
  expect(err, `the write was accepted; expected ${code}`).toBeTruthy();
  expect(err!.code).toBe(code);
  expect(err!.status ?? err!.statusCode).toBe(status);
};

let k = 0;
/** An account and contact of the rep's. */
const parties = async (): Promise<{ account: string; contact: string }> => {
  const [account] = await verify.seed('crm_account', [{ name: `Form Co ${++k}`, type: 'prospect', owner_id: rep.id }]);
  const [contact] = await verify.seed('crm_contact', [{
    first_name: 'Fay', last_name: `Form ${k}`, email: `fay${k}@contract-form-change.test`, crm_account: account!.id, owner_id: rep.id,
  }]);
  return { account: String(account!.id), contact: String(contact!.id) };
};

/** A draft order of the rep's: subtotal 1 000, tax 100 → total 1 100. */
const draftOrder = async (): Promise<Rec> => {
  const { account, contact } = await parties();
  return (await verify.hooks.run('crm_sales_order', 'insert', {
    name: `Form order ${k}`, crm_account: account, crm_contact: contact, subtotal: 1_000, tax: 100,
  }, as(rep))) as Rec;
};

/** Draft Contract on `orderId`, as the rep, through the flow door the action uses; the drafted contract. */
const draftFrom = async (orderId: string): Promise<Rec> => {
  await verify.flows.run(DraftContractAction.target as string, { recordId: orderId, objectName: 'crm_sales_order' }, as(rep));
  const order = await stored('crm_sales_order', orderId);
  expect(order.crm_contract, 'Draft Contract named no contract on the order').toBeTruthy();
  return stored('crm_contract', String(order.crm_contract));
};

/** Take `id` from draft to activated, as the manager, with the signed copy. */
const activate = async (id: string): Promise<void> => {
  await verify.hooks.run('crm_contract', 'update', { id, status: 'in_approval' }, as(manager));
  await verify.hooks.run('crm_contract', 'update', {
    id, status: 'activated', signed_copy: await committedFile(verify, manager.id),
  }, as(manager));
  expect((await stored('crm_contract', id)).status).toBe('activated');
};

/** A framework contract, activated, at 12 000 over 2026. */
const activeFramework = async (): Promise<Rec> => {
  const { account, contact } = await parties();
  const [c] = await verify.seed('crm_contract', [{
    name: `Framework ${k}`, crm_account: account, crm_contact: contact, contract_form: 'framework', contract_value: 12_000,
    start_date: '2026-01-01', end_date: '2027-01-01', contract_term_months: 12, payment_terms: 'net_30',
    status: 'activated', owner_id: manager.id, signed_copy: await committedFile(verify, manager.id),
  }]);
  return c!;
};

/** Run Change on `id` as the manager, through the action door the console posts to. */
const change = (action: string, id: string, params: Rec) =>
  verify.actions.run('crm_contract', action, { as: manager.token, recordId: id, params });

/** Each field's latest tracked change on `id`: { old, new } from the history. */
const lastTracked = async (id: string, field: string): Promise<{ old: unknown; new: unknown } | undefined> => {
  const entries = (await verify.rows('sys_activity', { object_name: 'crm_contract', record_id: id }))
    .map((r: Rec) => ({ at: String(r.timestamp), meta: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata }))
    .filter((e) => e.meta?.new && field in e.meta.new)
    .sort((x, y) => y.at.localeCompare(x.at));
  const top = entries[0];
  return top ? { old: top.meta.old?.[field], new: top.meta.new[field] } : undefined;
};

describe('Draft Contract drafts an order contract (hotcrm#2804 item 2)', () => {
  let order: Rec;
  let contract: Rec;
  beforeAll(async () => {
    order = await draftOrder();
    contract = await draftFrom(String(order.id));
  }, 60_000);

  it('is an order contract naming its order, at the order\'s tax-inclusive total', async () => {
    expect(Number(order.total_price)).toBe(1_100);
    expect(contract.contract_form).toBe('order');
    expect(contract.crm_sales_order).toBe(order.id);
    expect(Number(contract.contract_value)).toBe(1_100);
    // The order is a Draft: the order contract follows its linked order amount
    // (every order but Cancelled), which the Order Amount shows on an order
    // contract (hotcrm#2806).
    await vi.waitFor(async () => expect(Number((await stored('crm_contract', contract.id)).linked_order_amount)).toBe(1_100),
      { timeout: 10_000, interval: 50 });
  });

  it('refuses a person who types its value, and keeps the value', async () => {
    expectRefused(await refusal(verify.hooks.run('crm_contract', 'update', { id: contract.id, contract_value: 5 }, as(manager))), 'RECORD_LOCKED', 409);
    expect(Number((await stored('crm_contract', contract.id)).contract_value)).toBe(1_100);
  });

  it('follows the order while it is a draft', async () => {
    await verify.hooks.run('crm_sales_order', 'update', { id: order.id, tax: 250 }, as(rep));
    await vi.waitFor(async () => {
      const c = await stored('crm_contract', contract.id);
      expect(Number(c.linked_order_amount)).toBe(1_250);
      expect(Number(c.contract_value)).toBe(1_250);
    }, { timeout: 10_000, interval: 50 });
  });

  it('refuses a person who makes an order contract by hand, or moves one to another form', async () => {
    const { account, contact } = await parties();
    expectRefused(await refusal(verify.hooks.run('crm_contract', 'insert', {
      name: 'By hand', crm_account: account, crm_contact: contact, contract_form: 'order', contract_value: 1,
      start_date: '2026-01-01', end_date: '2027-01-01', contract_term_months: 12,
    }, as(manager))), 'FORBIDDEN', 403);
    expectRefused(await refusal(verify.hooks.run('crm_contract', 'update', { id: contract.id, contract_form: 'framework' }, as(manager))), 'RECORD_LOCKED', 409);
    expect((await stored('crm_contract', contract.id)).contract_form).toBe('order');
  });
});

describe('contract_form_and_change — an activated order contract: locked, a sign when the order moves, Change from the order (items 2, 5)', () => {
  let order: Rec;
  let contract: Rec;
  beforeAll(async () => {
    order = await draftOrder();
    contract = await draftFrom(String(order.id));
    await activate(String(contract.id));
    // The order's amount changes after activation.
    await verify.hooks.run('crm_sales_order', 'update', { id: order.id, tax: 300 }, as(rep));
    await vi.waitFor(async () => expect(Number((await stored('crm_contract', contract.id)).linked_order_amount)).toBe(1_300),
      { timeout: 10_000, interval: 50 });
  }, 90_000);

  it('keeps the signed value when the order changes, and says it differs', async () => {
    const c = await stored('crm_contract', contract.id);
    expect(Number(c.contract_value)).toBe(1_100);
    const differs = ExpressionEngine.evaluate((Contract.fields.order_amount_differs as Rec).expression, { record: c } as never);
    expect(differs).toMatchObject({ ok: true, value: true });
    const agrees = ExpressionEngine.evaluate((Contract.fields.order_amount_differs as Rec).expression, { record: { ...c, contract_value: 1_300 } } as never);
    expect(agrees).toMatchObject({ ok: true, value: null });
  });

  it('refuses a direct write to the end date or the payment terms, by name', async () => {
    expectRefused(await refusal(verify.hooks.run('crm_contract', 'update', { id: contract.id, end_date: '2030-01-01' }, as(manager))), 'RECORD_LOCKED', 409);
    expectRefused(await refusal(verify.hooks.run('crm_contract', 'update', { id: contract.id, payment_terms: 'net_60' }, as(manager))), 'RECORD_LOCKED', 409);
  });

  it('refuses a change without the signed amendment, at the dialog\'s door and at the record, and changes nothing', async () => {
    // The action door holds the param contract: a required param missing.
    const door = await refusal(change('change_order_contract', contract.id, { change_reason: 'New price list', change_from_order: true }));
    expectRefused(door, 'VALIDATION_ERROR', 400);
    expect(String(door!.message ?? '')).toMatch(/amendment/i);
    // A write past the dialog meets the hook.
    expectRefused(await refusal(verify.hooks.run('crm_contract', 'update', {
      id: contract.id, change_reason: 'New price list', change_from_order: true,
    }, as(manager))), 'VALIDATION_FAILED', 400);
    expect(Number((await stored('crm_contract', contract.id)).contract_value)).toBe(1_100);
  });

  it('refuses a typed value on an order contract', async () => {
    // Not one of the order contract's params at all …
    expectRefused(await refusal(change('change_order_contract', contract.id, {
      change_reason: 'Typed', change_amendment: await committedFile(verify, manager.id), change_new_value: 9,
    })), 'VALIDATION_ERROR', 400);
    // … and refused on the record when written past the dialog.
    const err = await refusal(verify.hooks.run('crm_contract', 'update', {
      id: contract.id, change_reason: 'Typed', change_amendment: await committedFile(verify, manager.id), change_new_value: 9,
    }, as(manager)));
    expectRefused(err, 'VALIDATION_FAILED', 400);
    expect(Number((await stored('crm_contract', contract.id)).contract_value)).toBe(1_100);
  });

  it('takes the order\'s amount on Update from Order, stays Activated, and records before and after', async () => {
    await change('change_order_contract', contract.id, {
      change_reason: 'Order re-quoted', change_amendment: await committedFile(verify, manager.id), change_from_order: true,
    });
    const c = await stored('crm_contract', contract.id);
    expect(Number(c.contract_value)).toBe(1_300);
    expect(c.status).toBe('activated');
    expect(c.change_reason).toBe('Order re-quoted');
    expect(c.change_from_order ?? false).toBe(false);
    const tracked = await lastTracked(contract.id, 'contract_value');
    expect(tracked && Number(tracked.old)).toBe(1_100);
    expect(tracked && Number(tracked.new)).toBe(1_300);
  });
});

describe('Change on a framework contract (item 5)', () => {
  it('moves the value, the end date and the payment terms, re-counts the term, and clears its inputs', async () => {
    const c = await activeFramework();
    await change('change_contract', c.id, {
      change_reason: 'Scope extended', change_amendment: await committedFile(verify, manager.id),
      change_new_value: 18_000, change_new_end_date: '2027-07-01', change_new_payment_terms: 'net_60',
    });
    const row = await stored('crm_contract', c.id);
    expect(Number(row.contract_value)).toBe(18_000);
    expect(row.end_date).toBe('2027-07-01');
    expect(row.payment_terms).toBe('net_60');
    expect(row.contract_term_months).toBe(18);
    expect(row.status).toBe('activated');
    expect(row.change_new_value ?? null).toBeNull();
    expect(row.change_new_end_date ?? null).toBeNull();
    expect(row.change_new_payment_terms ?? null).toBeNull();
    expect((await lastTracked(c.id, 'end_date'))?.old).toBe('2027-01-01');
  });

  it('refuses a change without a reason', async () => {
    const c = await activeFramework();
    expectRefused(await refusal(change('change_contract', c.id, {
      change_amendment: await committedFile(verify, manager.id), change_new_value: 1,
    })), 'VALIDATION_ERROR', 400);
    expectRefused(await refusal(verify.hooks.run('crm_contract', 'update', {
      id: c.id, change_amendment: await committedFile(verify, manager.id), change_new_value: 1,
    }, as(manager))), 'VALIDATION_FAILED', 400);
    expect(Number((await stored('crm_contract', c.id)).contract_value)).toBe(12_000);
  });

  it('refuses Change on a contract that is not activated', async () => {
    const c = await activeFramework();
    await systemUpdate(verify, 'crm_contract', { id: c.id, status: 'terminated' });
    expectRefused(await refusal(verify.hooks.run('crm_contract', 'update', {
      id: c.id, change_reason: 'Late', change_amendment: await committedFile(verify, manager.id), change_new_value: 1,
    }, as(manager))), 'VALIDATION_FAILED', 400);
  });
});

describe('the backfill rule (item 7)', () => {
  /** A contract as it was before the form: no form at all. */
  const formless = async (doc: Rec, own?: { account: string; contact: string }): Promise<Rec> => {
    const { account, contact } = own ?? await parties();
    const [c] = await verify.seed('crm_contract', [{
      name: `Old ${k}`, crm_account: account, crm_contact: contact, contract_value: 5_000,
      start_date: '2026-01-01', end_date: '2027-01-01', contract_term_months: 12, status: 'draft', ...doc,
    }]);
    const ql = verify.kernel.getService<Rec>('objectql');
    await (ql.getDriverForObject('crm_contract') as Rec).update('crm_contract', c!.id, { contract_form: null });
    expect((await stored('crm_contract', c!.id)).contract_form ?? null, 'the fixture still has a form').toBeNull();
    return c!;
  };

  it('drafted and named by an order ⇒ order contract with that order, its value kept', async () => {
    const order = await draftOrder();
    const c = await formless({ automation_key: 'quote_acceptance', contract_value: 999 },
      { account: String(order.crm_account), contact: String(order.crm_contact) });
    // Linking the order rolls its amount onto the contract: that system write
    // is the contract's first, and backfills the form without correcting the
    // value.
    await systemUpdate(verify, 'crm_sales_order', { id: order.id, crm_contract: c.id });
    await verify.hooks.run('crm_contract', 'update', { id: c.id, description: 'Touched.' }, as(manager));
    const row = await stored('crm_contract', c.id);
    expect(row.contract_form).toBe('order');
    expect(row.crm_sales_order).toBe(order.id);
    expect(Number(row.contract_value)).toBe(999);
  });

  it('does not correct an old draft order contract when its Order Amount is first computed', async () => {
    const order = await draftOrder();
    const c = await draftFrom(String(order.id));
    // As a contract that predates the roll-up: no Order Amount yet, and a
    // value that differs from its order.
    const ql = verify.kernel.getService<Rec>('objectql');
    await (ql.getDriverForObject('crm_contract') as Rec).update('crm_contract', c.id, { linked_order_amount: null, contract_value: 500 });
    // The platform materialises it (`os migrate summary-nulls`), as the system.
    await systemUpdate(verify, 'crm_contract', { id: c.id, linked_order_amount: 1_100 });
    const row = await stored('crm_contract', c.id);
    expect(Number(row.linked_order_amount)).toBe(1_100);
    expect(Number(row.contract_value)).toBe(500);
  });

  it('no amount ⇒ other; the rest ⇒ framework', async () => {
    const none = await formless({ contract_value: 0 });
    const some = await formless({});
    for (const c of [none, some]) await systemUpdate(verify, 'crm_contract', { id: c.id, description: 'Touched.' });
    expect((await stored('crm_contract', none.id)).contract_form).toBe('other');
    expect((await stored('crm_contract', some.id)).contract_form).toBe('framework');
  });
});

describe('the metadata', () => {
  const offered = (action: Rec, record: Rec): boolean => {
    const result = ExpressionEngine.evaluate<boolean>(action.visible as never, {
      record, user: { id: manager.id, positions: ['crm_sales_manager'] },
      permissions: { crm_contract: { allowRead: true, allowEdit: true } } as never,
    } as never);
    expect(result.ok, JSON.stringify(result)).toBe(true);
    return (result as Rec).value === true;
  };

  it('offers each Change on activated contracts of its kind only', () => {
    const order = { status: 'activated', contract_form: 'order' };
    const framework = { status: 'activated', contract_form: 'framework' };
    expect([offered(ChangeOrderContractAction, order), offered(ChangeContractAction, order)]).toEqual([true, false]);
    expect([offered(ChangeOrderContractAction, framework), offered(ChangeContractAction, framework)]).toEqual([false, true]);
    expect(offered(ChangeContractAction, { status: 'draft', contract_form: 'framework' })).toBe(false);
    expect(offered(ChangeContractAction, {})).toBe(false);
  });

  it('gives the order contract no value input, only Update from Order', () => {
    const names = (a: Rec) => (a.params as Rec[]).map((p) => p.field);
    expect(names(ChangeOrderContractAction)).toContain('change_from_order');
    expect(names(ChangeOrderContractAction)).not.toContain('change_new_value');
    expect(names(ChangeContractAction)).toContain('change_new_value');
    for (const a of [ChangeContractAction, ChangeOrderContractAction]) {
      expect((a.params as Rec[]).filter((p) => p.required).map((p) => p.field)).toEqual(['change_reason', 'change_amendment']);
    }
  });

  it('keeps the history the ruling names, and asks for the form on the edit form', () => {
    for (const f of ['contract_value', 'start_date', 'end_date', 'payment_terms', 'change_reason']) {
      expect((Contract.fields as Rec)[f].trackHistory, f).toBe(true);
    }
    const fields = (ContractViews.form!.sections as Rec[]).flatMap((s) => s.fields as string[]);
    expect(fields).toContain('contract_form');
  });
});
