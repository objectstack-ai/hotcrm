// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { hookNamed } from './helpers/composed-stack';
import { hotcrmStack, signUpPerson, systemUpdate, committedFile, type Person } from './helpers/verify-stack';

/**
 * An accepted quote's totals are its lines' sum, and its contract is drafted at
 * that sum, even when a line and the accept arrive together (#2503).
 *
 * Measured on 18.5.0 over a dev server before this change: on a rep's
 * Presented quote at 19,000, five line inserts and the accept sent in the same
 * tick answered 201, 409 ×4 and 200 in two runs of four. The quote read
 * Accepted at 19,000 while its lines summed to 20,000, the drafted contract
 * carried 19,000, and nothing was logged. The line passed `quote_workflow`'s
 * line freeze while the quote still read Presented; the accept then landed
 * before `quote_total_rollup` ran, and the rollup, `async` with
 * `onError: 'log'`, read Accepted and skipped the quote through its own guard.
 *
 * The fix, in two places:
 * - `quote_total_rollup` is blocking with `onError: 'abort'` (#2493's
 *   precedent), and when a person's line write finds its quote settled after
 *   the freeze let it in, it refuses with the freeze's own sentence, so the
 *   line is rolled back with the refusal.
 * - `quote_accepted_contract_draft` reads the quote's stored total instead of
 *   the accepting write's pre-image, so a line rolled in between the accept's
 *   prior-row read and its write is in the contract's figure.
 *
 * The in-process app `@objectstack/verify` boots answers one request at a time
 * and settles an `async` hook before the next, so requests sent together do not
 * interleave here. Each case below opens its window on purpose with a hook this
 * file registers on the engine and disarms after one use:
 * - the line is in and the quote settles before the rollup runs (a system
 *   accept at priority 250, between the line's insert and the rollup at 300);
 * - a line is rolled in after the accept read the quote and before it wrote (a
 *   rep's line written from a `beforeUpdate` on the accept).
 * Both cases fail on main: the first stores the line beside a quote accepted at
 * 19,000 with lines of 20,000; the second drafts the contract at 19,000 while
 * the quote and its lines say 20,000.
 */

type Rec = Record<string, any>;

let verify: VerifyStack;
let rep: Person;
let k = 0;

/** The windows this file opens, one quote at a time. */
const armed: { settleBeforeRollup?: string; lineDuringAccept?: { quote: string; product: string } } = {};
const PACKAGE = 'test.quote-line-rollup-race';

beforeAll(async () => {
  verify = await hotcrmStack();
  rep = await signUpPerson(verify, 'rep@quote-line-rollup-race.test', {
    name: 'Race Rep', positions: ['crm_sales_rep'], permissionSets: ['sales_rep'],
  });
  const ql = verify.kernel.getService<Rec>('objectql');
  // Window 1: the line is stored, the freeze is behind it, and the quote is
  // accepted before `quote_total_rollup` (priority 300) reads it.
  ql.registerHook('afterInsert', async (ctx: Rec) => {
    const quote = armed.settleBeforeRollup;
    // An engine-registered hook sees the operation's input: the payload under `data`.
    const data = ctx.input?.data ?? ctx.input;
    if (!quote || ctx.object !== 'crm_quote_line_item' || (data?.crm_quote ?? ctx.result?.crm_quote) !== quote) return;
    armed.settleBeforeRollup = undefined;
    await systemUpdate(verify, 'crm_quote', { id: quote, status: 'accepted' });
  }, { object: 'crm_quote_line_item', priority: 250, packageId: PACKAGE });
  // Window 2: the accept has read the quote's prior row and not yet written;
  // a rep's line lands and is rolled into the quote in that gap.
  ql.registerHook('beforeUpdate', async (ctx: Rec) => {
    const w = armed.lineDuringAccept;
    const data = ctx.input?.data ?? ctx.input;
    if (!w || ctx.object !== 'crm_quote' || data?.status !== 'accepted') return;
    if ((ctx.input?.id ?? data?.id ?? ctx.previous?.id) !== w.quote) return;
    armed.lineDuringAccept = undefined;
    await verify.hooks.run('crm_quote_line_item', 'insert', {
      crm_quote: w.quote, crm_product: w.product, quantity: 1, unit_price: 1_000,
    }, { as: rep.token });
  }, { object: 'crm_quote', priority: 50, packageId: PACKAGE });
}, 180_000);

afterAll(() => {
  verify?.kernel.getService<Rec>('objectql').unregisterHooksByPackage?.(PACKAGE);
});

const stored = async (object: string, id: string): Promise<Rec> => (await verify.rows(object, { id }))[0]!;
const linesOf = (quoteId: string): Promise<Rec[]> => verify.rows('crm_quote_line_item', { crm_quote: quoteId });
/** The quote's line total, computed the way `quote_total_rollup` computes it. */
const lineSum = async (quoteId: string): Promise<number> => {
  let sum = 0;
  for (const l of await linesOf(quoteId)) sum += l.quantity * l.unit_price * (1 - (l.discount ?? 0) / 100);
  return Math.round(sum * 100) / 100;
};
/** Long enough for the accept's `async` cascade (the contract draft) to land. */
const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 1_000));

/** A rep's Presented quote at 19,000 (one line, rolled up), and a product for more. */
const presentedQuote = async (): Promise<{ quote: Rec; product: Rec; account: Rec }> => {
  const [account] = await verify.seed('crm_account', [{ name: `Race Co ${++k}`, owner_id: rep.id }]);
  const [contact] = await verify.seed('crm_contact', [{
    first_name: 'Rae', last_name: `Buyer ${k}`, email: `rae${k}@quote-line-rollup-race.test`, crm_account: account!.id, owner_id: rep.id,
  }]);
  const [product] = await verify.seed('crm_product', [{ name: `Race Product ${k}`, product_code: `RC-${k}`, is_active: true, list_price: 1_000 }]);
  const [quote] = await verify.seed('crm_quote', [{
    name: `Race Quote ${k}`, crm_account: account!.id, crm_contact: contact!.id, owner_id: rep.id,
    status: 'draft', quote_date: '2030-01-01', expiration_date: '2030-12-31', discount: 0, tax: 0, shipping_handling: 0,
  }]);
  await verify.hooks.run('crm_quote_line_item', 'insert', {
    crm_quote: quote!.id, crm_product: product!.id, quantity: 1, unit_price: 19_000,
  }, { as: rep.token });
  // Presented, with the customer's signed copy on file, so the accept is the
  // ordinary one (Accepted requires it, #2317).
  await systemUpdate(verify, 'crm_quote', { id: quote!.id, status: 'presented', signed_copy: await committedFile(verify, rep.id) });
  // Waited for, so the fixture reads the same on main, where the rollup was `async`.
  await vi.waitFor(async () => {
    const q = await stored('crm_quote', quote!.id);
    expect([q.status, q.subtotal, q.total_price], 'fixture: Presented at 19,000').toEqual(['presented', 19_000, 19_000]);
  }, { timeout: 10_000, interval: 50 });
  const ready = await stored('crm_quote', quote!.id);
  return { quote: ready, product: product!, account: account! };
};

describe('the rollup rides the line write (#2503)', () => {
  it('is blocking and aborts: a line is stored only with the subtotal it makes', () => {
    const hook = hookNamed('quote_total_rollup') as Rec;
    expect(hook.async ?? false).toBe(false);
    expect(hook.onError ?? 'abort').toBe('abort');
  });
});

describe('a line and the accept arrive together (#2503)', () => {
  it('a quote accepted after the freeze let the line in refuses the line, and the totals still equal the lines', async () => {
    const { quote, product } = await presentedQuote();
    armed.settleBeforeRollup = quote.id;
    const res = await verify.apiAs(rep.token, 'POST', '/data/crm_quote_line_item', {
      crm_quote: quote.id, crm_product: product.id, quantity: 1, unit_price: 1_000,
    });
    const body = (await res.clone().json()) as Rec;
    expect(armed.settleBeforeRollup, 'the window did not open').toBeUndefined();
    expect(res.status, JSON.stringify(body)).toBe(409);
    expect(body.code).toBe('RECORD_LOCKED');
    // The line freeze's own sentence, by the status's label.
    expect(JSON.stringify(body)).toContain(
      `Quote ${quote.name} is Accepted, so its line items can no longer be added, changed or removed.`,
    );
    await settle();
    expect(await linesOf(quote.id), 'the refused line was stored').toHaveLength(1);
    const after = await stored('crm_quote', quote.id);
    expect(await lineSum(quote.id), 'the quote subtotal no longer equals its lines').toBe(after.subtotal);
    expect(after.total_price).toBe(after.subtotal);
    // The window's own accept rode the line's unit of work, so it rolled back
    // with the line (measured: the quote reads Presented and no contract was
    // drafted). In the field the accept is its own request and stands.
  });

  it('a line rolled in while the accept was in flight is in the accepted totals and in the contract', async () => {
    const { quote, product, account } = await presentedQuote();
    armed.lineDuringAccept = { quote: quote.id, product: product.id };
    const res = await verify.apiAs(rep.token, 'PATCH', `/data/crm_quote/${quote.id}`, { status: 'accepted' });
    expect(res.status, await res.clone().text()).toBe(200);
    expect(armed.lineDuringAccept, 'the window did not open').toBeUndefined();
    const after = await stored('crm_quote', quote.id);
    expect(after.status).toBe('accepted');
    expect(await linesOf(quote.id)).toHaveLength(2);
    expect(after.subtotal).toBe(20_000);
    expect(await lineSum(quote.id), 'the accepted subtotal no longer equals its lines').toBe(after.subtotal);
    await vi.waitFor(async () => expect(await verify.rows('crm_contract', { crm_account: account.id })).toHaveLength(1), {
      timeout: 10_000, interval: 100,
    });
    const [contract] = await verify.rows('crm_contract', { crm_account: account.id });
    expect(contract!.contract_value, 'the contract was drafted from a total the lines contradict').toBe(after.total_price);
  });
});
