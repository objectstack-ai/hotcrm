// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { REFUSAL_CODES } from '../src/sales/objects/_refusal';
import { hookNamed } from './helpers/composed-stack';
import { hotcrmStack, signUpPerson, systemUpdate, runShippedHook, type Person } from './helpers/verify-stack';

/**
 * A closed deal's line items are frozen with it (#2077) — the deal-side twin of
 * `test/quote-line-freeze.test.ts` (#2060 item 1).
 *
 * The defect, measured on 18.0.0-next.1 before the fix: a rep's line insert
 * onto their own closed-won deal, a change to a closed-lost deal's line, and a
 * move of an open deal's line onto a closed one were all admitted, while
 * `opportunity_amount_rollup` rightly kept the closed amount — so the lines
 * stopped summing to it (1,000 against 1,500). The opportunity doc says
 * "Closed deals are locked" (`content/docs/sales/opportunities.mdx`).
 *
 * Pinned both ways: a user's insert, change or move is refused with the deal
 * freeze's own envelope (`RECORD_LOCKED` / 409); an open deal still takes lines
 * (the control), a system write still lands, and the line-number back-fill's
 * touch still numbers a closed deal's line. Delete is decision card #2078.
 */

type Rec = Record<string, any>;

let verify: VerifyStack;
let rep: Person;
let admin: string;
let k = 0;
beforeAll(async () => {
  verify = await hotcrmStack();
  admin = await verify.signIn();
  rep = await signUpPerson(verify, 'rep@opportunity-line-freeze.test', {
    name: 'Line Freeze Rep', positions: ['sales_rep'], permissionSets: ['sales_rep'],
  });
}, 180_000);

const as = (p: Person | string) => ({ as: typeof p === 'string' ? p : p.token });
const stored = async (object: string, id: string): Promise<Rec | undefined> => (await verify.rows(object, { id }))[0];
const CLOSE: Record<string, Rec> = { closed_won: { win_reason: 'better_price' }, closed_lost: { loss_reason: 'price' } };

/** A rep's deal at `stage`, with one line written while it was open; the system closes it. */
const dealWithLine = async (stage: string): Promise<{ deal: Rec; line: Rec; product: Rec }> => {
  const [account] = await verify.seed('crm_account', [{ name: `Line Freeze Co ${++k}`, owner_id: rep.id }]);
  const [product] = await verify.seed('crm_product', [{ name: `Line Freeze Product ${k}`, product_code: `LF-${k}`, is_active: true, list_price: 500 }]);
  const [deal] = await verify.seed('crm_opportunity', [{
    name: `Line Freeze Deal ${k}`, amount: 1000, stage: 'negotiation', close_date: '2030-06-30', crm_account: account!.id, owner_id: rep.id,
  }]);
  const line = await verify.hooks.run('crm_opportunity_line_item', 'insert', {
    crm_opportunity: deal!.id, crm_product: product!.id, quantity: 2, unit_price: 500,
  }, as(rep));
  if (CLOSE[stage]) await systemUpdate(verify, 'crm_opportunity', { id: deal!.id, stage, ...CLOSE[stage] });
  return { deal: (await stored('crm_opportunity', deal!.id))!, line, product: product! };
};

/** What the engine refused a write with, or null when it went through. */
const refusalOf = (p: Promise<unknown>): Promise<Rec | null> => p.then(() => null, (e: Rec) => e);

const sentence = (deal: Rec) => `Opportunity ${deal.name} is closed (${deal.stage}), so its line items can no longer be added or changed.`;

/** The deal freeze's envelope, its wording, and the deal named by its name, never its id. */
const expectFrozen = (err: Rec | null, deal: Rec): void => {
  expect(err, 'the write went through').toBeTruthy();
  expect([err!.code, err!.status]).toEqual([REFUSAL_CODES.locked.code, REFUSAL_CODES.locked.status]);
  expect(String(err!.message)).toContain(sentence(deal));
  expect(String(err!.message)).not.toContain(deal.id);
};

describe('a user cannot change the lines of a closed deal', () => {
  it.each(['closed_won', 'closed_lost'])('refuses a rep adding a line to a %s deal, and stores nothing', async (stage) => {
    const { deal, product } = await dealWithLine(stage);
    expectFrozen(await refusalOf(verify.hooks.run('crm_opportunity_line_item', 'insert', {
      crm_opportunity: deal.id, crm_product: product.id, quantity: 3, unit_price: 500,
    }, as(rep))), deal);
    expect(await verify.rows('crm_opportunity_line_item', { crm_opportunity: deal.id })).toHaveLength(1);
  });

  it('refuses a rep changing a line of a closed deal, and keeps the stored line', async () => {
    const { deal, line } = await dealWithLine('closed_lost');
    expectFrozen(await refusalOf(verify.hooks.run('crm_opportunity_line_item', 'update', { id: line.id, quantity: 9 }, as(rep))), deal);
    expect((await stored('crm_opportunity_line_item', line.id))!.quantity).toBe(2);
  });

  it('refuses moving a line off a closed deal, and onto one', async () => {
    const closed = await dealWithLine('closed_won');
    const open = await dealWithLine('negotiation');
    expectFrozen(await refusalOf(verify.hooks.run('crm_opportunity_line_item', 'update', { id: closed.line.id, crm_opportunity: open.deal.id }, as(rep))), closed.deal);
    expectFrozen(await refusalOf(verify.hooks.run('crm_opportunity_line_item', 'update', { id: open.line.id, crm_opportunity: closed.deal.id }, as(rep))), closed.deal);
    expect((await stored('crm_opportunity_line_item', closed.line.id))!.crm_opportunity).toBe(closed.deal.id);
    expect((await stored('crm_opportunity_line_item', open.line.id))!.crm_opportunity).toBe(open.deal.id);
  });

  it('refuses on the SHIPPED path too — the lowered body, in QuickJS', async () => {
    const { deal, product } = await dealWithLine('closed_won');
    const err = await refusalOf(runShippedHook(verify, hookNamed('opportunity_line_item_freeze'), {
      event: 'beforeInsert', input: { crm_opportunity: deal.id, crm_product: product.id, quantity: 1, unit_price: 500 }, as: rep.token,
    }));
    expect(err?.name).toBe('SandboxError');
    expect([err!.code, err!.status]).toEqual([REFUSAL_CODES.locked.code, REFUSAL_CODES.locked.status]);
    expect(String(err!.userMessage)).toBe(sentence(deal));
  });
});

describe('what the freeze lets through', () => {
  it('CONTROL — an open deal still takes and changes lines, and its amount follows them', async () => {
    const { deal, line, product } = await dealWithLine('negotiation');
    await verify.hooks.run('crm_opportunity_line_item', 'insert', { crm_opportunity: deal.id, crm_product: product.id, quantity: 1, unit_price: 50 }, as(rep));
    await verify.hooks.run('crm_opportunity_line_item', 'update', { id: line.id, quantity: 3 }, as(rep));
    // `opportunity_amount_rollup` is `async: true`, so its result is waited for.
    await vi.waitFor(async () => expect((await stored('crm_opportunity', deal.id))!.amount).toBe(1550), { timeout: 10_000, interval: 50 }); // 3×500 + 1×50
  });

  it('a system write onto a closed deal still lands (the freeze judges users only)', async () => {
    const { deal, product } = await dealWithLine('closed_won');
    await verify.seed('crm_opportunity_line_item', [{ crm_opportunity: deal.id, crm_product: product.id, quantity: 1, unit_price: 10 }]);
    expect(await verify.rows('crm_opportunity_line_item', { crm_opportunity: deal.id })).toHaveLength(2);
  });

  it('the line-number back-fill still numbers an unnumbered line of a closed deal', async () => {
    const { line } = await dealWithLine('closed_lost');
    await systemUpdate(verify, 'crm_opportunity_line_item', { id: line.id, line_number: null });
    expect((await stored('crm_opportunity_line_item', line.id))!.line_number ?? null).toBeNull();
    // `scripts/backfill-line-number.ts`'s own write: an admin's REST touch.
    await verify.hooks.run('crm_opportunity_line_item', 'update', { id: line.id, line_number: null }, as(admin));
    expect(typeof (await stored('crm_opportunity_line_item', line.id))!.line_number).toBe('number');
  });

  it('lets through a write that changes only product_title, a name the hooks write (#2086)', async () => {
    // `product_title_mirror` re-stamps a renamed product's lines elevated but
    // AS the renaming user, so this freeze sees a user; the key is what lets it
    // through. A rep never reaches it: the engine holds their readonly value back.
    const { line } = await dealWithLine('closed_won');
    const input = await runShippedHook(verify, hookNamed('opportunity_line_item_freeze'), {
      event: 'beforeUpdate', input: { id: line.id, product_title: 'Renamed Product' }, previous: line, as: rep.token,
    });
    expect(input.product_title).toBe('Renamed Product');
  });
});
