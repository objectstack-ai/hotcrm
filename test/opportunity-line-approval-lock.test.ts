// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { REFUSAL_CODES } from '../src/sales/objects/_refusal';
import { LARGE_DEAL_AMOUNT } from '../src/sales/objects/_thresholds';
import { hookNamed } from './helpers/composed-stack';
import { hotcrmStack, signUpPerson, systemUpdate, runShippedHook, type Person } from './helpers/verify-stack';

/**
 * A deal's lines are held while an approval locks the deal (#2191).
 *
 * OPP-007: a deal's amount is the sum of its lines, and `opportunity_amount_rollup`
 * keeps it so by writing the deal after every line write. An approval node with
 * `lockRecord: true` refuses that write (`RECORD_LOCKED`), and the rollup is
 * `onError: 'log'`, so before this guard the line was stored and the deal kept
 * its old amount. Measured on 18.0.0 before the guard: this file's refusal pins
 * were red on `main` (the REST insert of a second line answered 201 and stored
 * it, and the log carried `opportunity_amount_rollup … RECORD_LOCKED
 * (onError=log; suppressing)` for every insert and update, a description-only
 * edit included), and a probe with the guard's throw ablated read the deal at
 * 100,000 while its lines summed to 107,000. A status-change request's lock
 * refused the rollup the same way.
 *
 * Now the line write is refused up front, with the deal freeze's own envelope
 * (`RECORD_LOCKED` / 409), and nothing is stored, the way a settled quote
 * refuses its lines. The lock is driven for real: the rep adds a line that takes
 * the deal across `LARGE_DEAL_AMOUNT`, the rollup's write opens the approval,
 * and its approval node locks the deal. The controls: a deal no lock holds still
 * takes lines and its amount follows them, a system write still lands and rolls
 * up, and deleting the deal still takes its lines with it.
 */

type Rec = Record<string, any>;

let verify: VerifyStack;
let rep: Person;
let manager: Person;
let k = 0;
beforeAll(async () => {
  verify = await hotcrmStack();
  rep = await signUpPerson(verify, 'rep@opportunity-line-approval-lock.test', {
    name: 'Approval Lock Rep', positions: ['sales_rep'], permissionSets: ['sales_rep'],
  });
  // The approver bench `opportunity_approval` routes to; with nobody on it the
  // request would go to the admin rescue, which locks the deal the same way.
  manager = await signUpPerson(verify, 'manager@opportunity-line-approval-lock.test', {
    name: 'Approval Lock Manager', positions: ['sales_manager'], permissionSets: ['sales_manager'],
  });
}, 180_000);

const as = (p: Person) => ({ as: p.token });
const stored = async (object: string, id: string): Promise<Rec | undefined> => (await verify.rows(object, { id }))[0];
const linesOf = (dealId: string): Promise<Rec[]> => verify.rows('crm_opportunity_line_item', { crm_opportunity: dealId });

/** The deal's line total, computed the way `opportunity_amount_rollup` computes it. */
const lineSum = async (dealId: string): Promise<number> => {
  let sum = 0;
  for (const l of await linesOf(dealId)) sum += l.quantity * l.unit_price * (1 - (l.discount ?? 0) / 100);
  return Math.round(sum * 100) / 100;
};

/** What the engine refused a write with, or null when it went through. */
const refusalOf = (p: Promise<unknown>): Promise<Rec | null> => p.then(() => null, (e: Rec) => e);

/** A rep's open deal at 42,000 with no lines, its account and a product priced at half the large-deal line. */
const repDeal = async (state: Rec = {}): Promise<{ deal: Rec; product: Rec }> => {
  const [account] = await verify.seed('crm_account', [{ name: `Approval Lock Co ${++k}`, owner_id: rep.id }]);
  const [product] = await verify.seed('crm_product', [{
    name: `Approval Lock Product ${k}`, product_code: `AL-${k}`, is_active: true, list_price: LARGE_DEAL_AMOUNT / 2,
  }]);
  const [deal] = await verify.seed('crm_opportunity', [{
    name: `Approval Lock Deal ${k}`, amount: 42_000, stage: 'prospecting', close_date: '2030-06-30', crm_account: account!.id, owner_id: rep.id,
  }]);
  // The verdict columns are `readonly`, so a state is put there by a system write.
  if (Object.keys(state).length > 0) await systemUpdate(verify, 'crm_opportunity', { id: deal!.id, ...state });
  return { deal: (await stored('crm_opportunity', deal!.id))!, product: product! };
};

/** The rollup is `async: true`: wait for the deal's amount to reach `amount`. */
const amountReaches = (dealId: string, amount: number): Promise<void> =>
  vi.waitFor(async () => expect((await stored('crm_opportunity', dealId))!.amount).toBe(amount), { timeout: 10_000, interval: 50 });

/**
 * A rep's deal held by its real Large Deal Approval. The rep adds a line of two
 * products at half the line each, the rollup takes the deal to exactly
 * `LARGE_DEAL_AMOUNT` (the gate is inclusive), and `opportunity_approval` opens a
 * request whose approval node locks the deal.
 */
const lockedDeal = async (): Promise<{ deal: Rec; line: Rec; product: Rec }> => {
  const { deal, product } = await repDeal();
  const line = await verify.hooks.run('crm_opportunity_line_item', 'insert', {
    crm_opportunity: deal.id, crm_product: product.id, quantity: 2,
  }, as(rep));
  await amountReaches(deal.id, LARGE_DEAL_AMOUNT);
  await vi.waitFor(async () => {
    expect(await verify.rows('sys_approval_request', { object_name: 'crm_opportunity', record_id: deal.id, status: 'pending' })).toHaveLength(1);
    expect((await stored('crm_opportunity', deal.id))!.approval_status).toBe('pending');
  }, { timeout: 15_000, interval: 100 });
  return { deal: (await stored('crm_opportunity', deal.id))!, line, product };
};

/**
 * Long enough for an `async` rollup a stored write would have scheduled to land
 * or fail, so "nothing moved" is read after it, not before it.
 */
const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 500));

const sentence = (deal: Rec) =>
  `Opportunity ${deal.name} is locked while an approval is in progress, so its line items cannot be added, changed or removed until that approval is complete.`;

/** The deal freeze's envelope, its wording, and the deal named by its name, never its id. */
const expectHeld = (err: Rec | null, deal: Rec): void => {
  expect(err, 'the line write went through on a deal its approval locks').toBeTruthy();
  expect([err!.code, err!.status]).toEqual([REFUSAL_CODES.locked.code, REFUSAL_CODES.locked.status]);
  expect(String(err!.message)).toContain(sentence(deal));
  expect(String(err!.message)).not.toContain(deal.id);
};

/** OPP-007, read off the stored rows: the deal's amount is its lines' sum. */
const expectAmountIsLines = async (dealId: string, amount: number): Promise<void> => {
  await settle();
  expect((await stored('crm_opportunity', dealId))!.amount, 'the deal amount moved').toBe(amount);
  expect(await lineSum(dealId), 'the deal amount no longer equals its lines').toBe(amount);
};

describe('a line write on a deal its approval locks is refused, and nothing is stored', () => {
  it('refuses a rep adding a line', async () => {
    const { deal, product } = await lockedDeal();
    expectHeld(await refusalOf(verify.hooks.run('crm_opportunity_line_item', 'insert', {
      crm_opportunity: deal.id, crm_product: product.id, quantity: 1, unit_price: 7_000,
    }, as(rep))), deal);
    expect(await linesOf(deal.id)).toHaveLength(1);
    await expectAmountIsLines(deal.id, LARGE_DEAL_AMOUNT);
  });

  it.each([
    ['quantity', { quantity: 3 }],
    ['unit price', { unit_price: 60_000 }],
    ['discount', { discount: 10 }],
  ] as const)('refuses a rep changing a line\'s %s, and keeps the stored line', async (_label, change) => {
    const { deal, line } = await lockedDeal();
    expectHeld(await refusalOf(verify.hooks.run('crm_opportunity_line_item', 'update', { id: line.id, ...change }, as(rep))), deal);
    expect(await stored('crm_opportunity_line_item', line.id)).toMatchObject({ quantity: 2, unit_price: LARGE_DEAL_AMOUNT / 2, discount: 0 });
    await expectAmountIsLines(deal.id, LARGE_DEAL_AMOUNT);
  });

  it('refuses an edit that does not move the amount too, since the lock refuses its rollup all the same', async () => {
    // Measured before the guard: a description-only edit was stored and its
    // rollup's write of the deal was refused RECORD_LOCKED into the log.
    const { deal, line } = await lockedDeal();
    expectHeld(await refusalOf(verify.hooks.run('crm_opportunity_line_item', 'update', { id: line.id, description: 'Two seats' }, as(rep))), deal);
    expect((await stored('crm_opportunity_line_item', line.id))!.description ?? null).toBeNull();
  });

  it('refuses a rep removing a line, and keeps it', async () => {
    const { deal, line } = await lockedDeal();
    expectHeld(await refusalOf(verify.hooks.run('crm_opportunity_line_item', 'delete', { id: line.id }, as(rep))), deal);
    expect(await stored('crm_opportunity_line_item', line.id)).toBeDefined();
    await expectAmountIsLines(deal.id, LARGE_DEAL_AMOUNT);
  });

  it('refuses moving a line off a locked deal, and onto one', async () => {
    const held = await lockedDeal();
    const { deal: open, product } = await repDeal();
    const openLine = await verify.hooks.run('crm_opportunity_line_item', 'insert', {
      crm_opportunity: open.id, crm_product: product.id, quantity: 1, unit_price: 1_000,
    }, as(rep));
    await amountReaches(open.id, 1_000);
    expectHeld(await refusalOf(verify.hooks.run('crm_opportunity_line_item', 'update', { id: held.line.id, crm_opportunity: open.id }, as(rep))), held.deal);
    expectHeld(await refusalOf(verify.hooks.run('crm_opportunity_line_item', 'update', { id: openLine.id, crm_opportunity: held.deal.id }, as(rep))), held.deal);
    expect((await stored('crm_opportunity_line_item', held.line.id))!.crm_opportunity).toBe(held.deal.id);
    expect((await stored('crm_opportunity_line_item', openLine.id))!.crm_opportunity).toBe(open.id);
    await expectAmountIsLines(held.deal.id, LARGE_DEAL_AMOUNT);
    await expectAmountIsLines(open.id, 1_000);
  });

  it('answers the REST door with the envelope, and stores nothing', async () => {
    const { deal, product } = await lockedDeal();
    const res = await verify.apiAs(rep.token, 'POST', '/data/crm_opportunity_line_item', {
      crm_opportunity: deal.id, crm_product: product.id, quantity: 1, unit_price: 7_000,
    });
    const body = (await res.json()) as Rec;
    expect({ status: res.status, code: body.code }, JSON.stringify(body)).toEqual({
      status: REFUSAL_CODES.locked.status, code: REFUSAL_CODES.locked.code,
    });
    expect(body.userMessage).toBe(sentence(deal));
    expect(await linesOf(deal.id)).toHaveLength(1);
    await expectAmountIsLines(deal.id, LARGE_DEAL_AMOUNT);
  });

  it('refuses on the SHIPPED path too — the lowered body, in QuickJS', async () => {
    const { deal, product } = await lockedDeal();
    const err = await refusalOf(runShippedHook(verify, hookNamed('opportunity_line_item_freeze'), {
      event: 'beforeInsert', input: { crm_opportunity: deal.id, crm_product: product.id, quantity: 1, unit_price: 7_000 }, as: rep.token,
    }));
    expect(err?.name).toBe('SandboxError');
    expect([err!.code, err!.status]).toEqual([REFUSAL_CODES.locked.code, REFUSAL_CODES.locked.status]);
    expect(String(err!.userMessage)).toBe(sentence(deal));
  });

  it('holds while a status-change request is open, the other approval that locks the deal', async () => {
    // The REQ-0006 gate, armed on this deal by a system write; the rep's
    // request opens its approval, whose node locks the deal (`lockRecord: true`).
    const { deal, product } = await repDeal({ status_change_approval_status: 'pending' });
    const line = await verify.hooks.run('crm_opportunity_line_item', 'insert', {
      crm_opportunity: deal.id, crm_product: product.id, quantity: 1, unit_price: 5_000,
    }, as(rep));
    await amountReaches(deal.id, 5_000);
    await verify.hooks.run('crm_opportunity', 'update', { id: deal.id, requested_status: 'closed_won', win_reason: 'best_fit' }, as(rep));
    await vi.waitFor(async () => expect(await verify.rows('sys_approval_request', {
      object_name: 'crm_opportunity', record_id: deal.id, status: 'pending',
    })).toHaveLength(1), { timeout: 15_000, interval: 100 });
    const requested = (await stored('crm_opportunity', deal.id))!;
    expectHeld(await refusalOf(verify.hooks.run('crm_opportunity_line_item', 'update', { id: line.id, quantity: 2 }, as(rep))), requested);
    expect((await stored('crm_opportunity_line_item', line.id))!.quantity).toBe(1);
    await expectAmountIsLines(deal.id, 5_000);
  });
});

describe('what the approval hold lets through', () => {
  it('CONTROL — a deal no approval holds still takes, changes and loses lines, and its amount follows them', async () => {
    const { deal, product } = await repDeal();
    const line = await verify.hooks.run('crm_opportunity_line_item', 'insert', {
      crm_opportunity: deal.id, crm_product: product.id, quantity: 1, unit_price: 7_000,
    }, as(rep));
    await amountReaches(deal.id, 7_000);
    const second = await verify.hooks.run('crm_opportunity_line_item', 'insert', {
      crm_opportunity: deal.id, crm_product: product.id, quantity: 1, unit_price: 3_000,
    }, as(rep));
    await amountReaches(deal.id, 10_000);
    await verify.hooks.run('crm_opportunity_line_item', 'update', { id: line.id, quantity: 2, discount: 25 }, as(rep));
    await amountReaches(deal.id, 13_500); // 2 × 7,000 × 75% + 3,000
    await verify.hooks.run('crm_opportunity_line_item', 'update', { id: line.id, unit_price: 8_000 }, as(rep));
    await amountReaches(deal.id, 15_000); // 2 × 8,000 × 75% + 3,000
    await verify.hooks.run('crm_opportunity_line_item', 'delete', { id: second.id }, as(rep));
    await amountReaches(deal.id, 12_000);
    expect(await lineSum(deal.id)).toBe(12_000);
  });

  it.each([
    ['an approved Large Deal Approval', { approval_status: 'approved' }],
    ['a rejected Large Deal Approval', { approval_status: 'rejected' }],
    ['an armed status-change gate with no request open', { status_change_approval_status: 'pending' }],
    ['a status change an approver rejected', { status_change_approval_status: 'rejected' }],
    ['a qualification (立项) gate awaiting approval, whose node does not lock', { qualification_approval_status: 'pending' }],
  ] as const)('%s holds nothing: a line lands and the amount follows it', async (_label, state) => {
    const { deal, product } = await repDeal(state);
    await verify.hooks.run('crm_opportunity_line_item', 'insert', {
      crm_opportunity: deal.id, crm_product: product.id, quantity: 1, unit_price: 7_000,
    }, as(rep));
    await amountReaches(deal.id, 7_000);
    expect(await lineSum(deal.id)).toBe(7_000);
  });

  it('a system write onto a locked deal still lands, and rolls up (the hold judges users only)', async () => {
    const { deal, product } = await lockedDeal();
    await verify.seed('crm_opportunity_line_item', [{ crm_opportunity: deal.id, crm_product: product.id, quantity: 1, unit_price: 7_000 }]);
    expect(await linesOf(deal.id)).toHaveLength(2);
    await amountReaches(deal.id, LARGE_DEAL_AMOUNT + 7_000);
    expect(await lineSum(deal.id)).toBe(LARGE_DEAL_AMOUNT + 7_000);
  });

  it('a manager can still delete a locked deal that carries lines, through the REST door', async () => {
    const { deal, line } = await lockedDeal();
    const res = await verify.apiAs(manager.token, 'DELETE', `/data/crm_opportunity/${deal.id}`);
    expect(res.status, await res.clone().text()).toBe(200);
    expect(await stored('crm_opportunity', deal.id)).toBeUndefined();
    expect(await stored('crm_opportunity_line_item', line.id)).toBeUndefined();
  });
});
