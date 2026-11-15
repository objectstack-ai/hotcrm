// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { hookNamed } from './helpers/composed-stack';
import { hotcrmStack, signUpPerson, systemUpdate, type Person } from './helpers/verify-stack';

/**
 * A deal's amount is its lines' sum, even when lines arrive back to back
 * across the large-deal line (#2493).
 *
 * Measured on 18.5.0 over a dev server before this change: three line inserts
 * sent back to back on a 40,000 deal (70,000, 44,000, 48,000) all answered
 * 201. The second one's rollup took the deal to 114,000 and opened the Large
 * Deal Approval; the third passed `opportunity_line_item_freeze` before that
 * lock landed, and its own `async` rollup was refused by the lock and only
 * logged (`onError: 'log'`). The approver was asked to sign 114,000 while the
 * lines summed to 162,000.
 *
 * `opportunity_amount_rollup` is now blocking with `onError: 'abort'`: the line
 * write returns once the deal carries the new sum (and once the approval that
 * sum opens has locked it), and a rollup the lock refuses takes the line down
 * with it.
 *
 * The in-process app `@objectstack/verify` boots answers one request at a time
 * and settles an `async` hook before the next, so back-to-back requests do not
 * open the window here (the first case passes on main too, as the scenario's
 * record). The second case opens it on purpose: the freeze reads the deal's
 * `approval_status`, the engine's lock is the pending approval request, and a
 * system write that sets the flag back while the request stays pending is
 * exactly the instant the third line met — a lock the freeze did not see. That
 * case fails on main (201, the deal at 114,000 beside lines of 162,000).
 */

type Rec = Record<string, any>;

let verify: VerifyStack;
let rep: Person;
let k = 0;

beforeAll(async () => {
  verify = await hotcrmStack();
  rep = await signUpPerson(verify, 'rep@opportunity-line-rollup-race.test', {
    name: 'Quick Lines Rep', positions: ['crm_sales_rep'], permissionSets: ['sales_rep'],
  });
  // The approver bench `opportunity_approval` routes to.
  await signUpPerson(verify, 'manager@opportunity-line-rollup-race.test', {
    name: 'Quick Lines Manager', positions: ['crm_sales_manager'], permissionSets: ['sales_manager'],
  });
}, 180_000);

const stored = async (object: string, id: string): Promise<Rec | undefined> => (await verify.rows(object, { id }))[0];
const linesOf = (dealId: string): Promise<Rec[]> => verify.rows('crm_opportunity_line_item', { crm_opportunity: dealId });
/** The deal's line total, computed the way `opportunity_amount_rollup` computes it. */
const lineSum = async (dealId: string): Promise<number> => {
  let sum = 0;
  for (const l of await linesOf(dealId)) sum += l.quantity * l.unit_price * (1 - (l.discount ?? 0) / 100);
  return Math.round(sum * 100) / 100;
};
/** Long enough for any write a request scheduled to land, so "nothing moved" is read after it. */
const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 1_000));

/** A rep's open deal at 40,000 with no lines, and a product to put on it. */
const repDeal = async (): Promise<{ deal: Rec; product: Rec }> => {
  const [account] = await verify.seed('crm_account', [{ name: `Quick Lines Co ${++k}`, owner_id: rep.id }]);
  const [product] = await verify.seed('crm_product', [{ name: `Quick Lines Product ${k}`, product_code: `QL-${k}`, is_active: true, list_price: 1_000 }]);
  const [deal] = await verify.seed('crm_opportunity', [{
    name: `Quick Lines Deal ${k}`, amount: 40_000, stage: 'prospecting', close_date: '2030-06-30', crm_account: account!.id, owner_id: rep.id,
  }]);
  return { deal: deal!, product: product! };
};
const addLine = (deal: Rec, product: Rec, unit_price: number) =>
  verify.apiAs(rep.token, 'POST', '/data/crm_opportunity_line_item', { crm_opportunity: deal.id, crm_product: product.id, quantity: 1, unit_price });

describe('the rollup rides the line write (#2493)', () => {
  it('is blocking and aborts: a line is stored only with the amount it makes', () => {
    const hook = hookNamed('opportunity_amount_rollup') as Rec;
    expect(hook.async ?? false).toBe(false);
    expect(hook.onError ?? 'abort').toBe('abort');
  });
});

describe('three lines added back to back across the large-deal line (#2493)', () => {
  it('the second opens the approval on the lines it sums, the third is refused, and the amount equals the lines', async () => {
    const { deal, product } = await repDeal();
    const statuses: number[] = [];
    for (const price of [70_000, 44_000, 48_000]) statuses.push((await addLine(deal, product, price)).status);
    await settle();
    const after = (await stored('crm_opportunity', deal.id))!;
    expect(statuses).toEqual([201, 201, 409]);
    expect(after.approval_status).toBe('pending');
    expect(after.amount).toBe(114_000);
    expect(await lineSum(deal.id), 'the deal amount no longer equals its lines').toBe(after.amount);
  });

  it('a lock the freeze did not see refuses the third line, which is not stored, and the amount still equals the lines', async () => {
    const { deal, product } = await repDeal();
    for (const price of [70_000, 44_000]) {
      const res = await addLine(deal, product, price);
      expect(res.status, await res.clone().text()).toBe(201);
    }
    await vi.waitFor(async () => expect(await verify.rows('sys_approval_request', {
      object_name: 'crm_opportunity', record_id: deal.id, status: 'pending',
    })).toHaveLength(1), { timeout: 15_000, interval: 100 });
    // The flag the freeze reads, set back; the engine's lock (the pending request) stays.
    await systemUpdate(verify, 'crm_opportunity', { id: deal.id, approval_status: 'not_required' });
    const res = await addLine(deal, product, 48_000);
    const body = (await res.clone().json()) as Rec;
    expect(res.status, JSON.stringify(body)).toBe(409);
    expect(body.code).toBe('RECORD_LOCKED');
    await settle();
    expect(await linesOf(deal.id), 'the refused line was stored').toHaveLength(2);
    const after = (await stored('crm_opportunity', deal.id))!;
    expect(after.amount).toBe(114_000);
    expect(await lineSum(deal.id), 'the deal amount no longer equals its lines').toBe(after.amount);
  });
});
