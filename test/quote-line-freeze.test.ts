// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { REFUSAL_CODES } from '../src/sales/objects/_refusal';
import { hookNamed } from './helpers/composed-stack';
import { hotcrmStack, signUpPerson, systemUpdate, runShippedHook, type Person } from './helpers/verify-stack';

/**
 * A settled quote's line items are frozen with it (#2060 item 1, finding B-09).
 *
 * ### The defect
 *
 * `quote_workflow` froze an accepted or expired quote's own fields, and
 * `quote_total_rollup` rightly leaves a settled quote's totals alone — but
 * nothing refused a write to its LINES. Measured in the browser pass on
 * QTE-0007 and again on 17.7.0 in this rig before the fix: a sales rep added a
 * line to an accepted quote (`insert` answered with the new row), the quote kept
 * its accepted subtotal, and its lines no longer summed to it. The quote doc
 * says the opposite: "From then on the quote is frozen"
 * (`content/docs/sales/quotes.mdx`, *Recording the customer's answer*).
 *
 * ### The boundary pinned here, both directions
 *
 * - A user's insert onto a settled quote, a user's change to one of its lines,
 *   and a user's move of a line onto or off one are REFUSED with the freeze's
 *   own envelope (`RECORD_LOCKED` / 409), naming the quote as every screen
 *   does and never by its record id (#1243).
 * - A DRAFT quote still takes and changes lines, and its totals still follow
 *   them (the control: without it, a guard that refused every line would pass).
 * - A system write is let through, exactly as the quote freeze lets one
 *   through; so is the 4.0.0 line-number back-fill's `{ line_number: null }`
 *   touch, which changes no field a person can author.
 *
 * ### The delete leg (#2088, ruling C of #2078)
 *
 * Measured on 18.0.0-next.3 before it: a rep's REST `DELETE` of one line of an
 * accepted quote answered 200 and the line was gone. Now a user's HAND delete
 * of a settled quote's line is refused with the same envelope and sentence,
 * through the engine, the REST door and the lowered body alike.
 *
 * Deleting the quote still works, and deleting an account whose settled quote
 * goes with it: the engine's cascade deletes each line AS THE DELETING USER,
 * and what lets it through is the platform's declared marker
 * `referentialCascadeDelete` (objectstack#23221), which the cascade sets on
 * each child delete at any depth and a hand delete never carries. The lowered
 * body is pinned on both sides of that one key, with an otherwise identical
 * context, so the guard is shown to read it and nothing else (#1165).
 *
 * An account delete reaches a settled quote's lines only when nothing above
 * them refuses first. Measured on 18.0.0-next.3, before and after this leg:
 * an account whose quote is *accepted* is refused by `contact_integrity`
 * (the quote's contact counts as referenced by an active quote) before the
 * cascade reaches any line. So the account case pinned here holds an
 * *expired* quote, the settled state that path does reach.
 */

type Rec = Record<string, any>;

let verify: VerifyStack;
let rep: Person;
let manager: Person;
let admin: string;
let k = 0;
beforeAll(async () => {
  verify = await hotcrmStack();
  admin = await verify.signIn();
  rep = await signUpPerson(verify, 'rep@quote-line-freeze.test', {
    name: 'Freeze Rep', positions: ['sales_rep'], permissionSets: ['sales_rep'],
  });
  manager = await signUpPerson(verify, 'manager@quote-line-freeze.test', {
    name: 'Freeze Manager', positions: ['sales_manager'], permissionSets: ['sales_manager'],
  });
}, 180_000);

const as = (p: Person | string) => ({ as: typeof p === 'string' ? p : p.token });
const stored = async (object: string, id: string): Promise<Rec | undefined> => (await verify.rows(object, { id }))[0];

/** A rep's quote in `status`, with one line already on it — the line written while the quote was open. */
const quoteWithLine = async (status: string): Promise<{ quote: Rec; line: Rec; product: Rec }> => {
  const [account] = await verify.seed('crm_account', [{ name: `Freeze Co ${++k}`, owner_id: rep.id }]);
  const [contact] = await verify.seed('crm_contact', [{
    first_name: 'Fay', last_name: `Buyer ${k}`, email: `fay${k}@quote-line-freeze.test`, crm_account: account!.id, owner_id: rep.id,
  }]);
  const [product] = await verify.seed('crm_product', [{ name: `Freeze Product ${k}`, product_code: `FZ-${k}`, is_active: true, list_price: 100 }]);
  const [quote] = await verify.seed('crm_quote', [{
    name: `Freeze Quote ${k}`, crm_account: account!.id, crm_contact: contact!.id, owner_id: rep.id,
    status: 'draft', quote_date: '2026-01-01', expiration_date: '2030-12-31', discount: 0, tax: 0, shipping_handling: 0,
  }]);
  const line = await verify.hooks.run('crm_quote_line_item', 'insert', {
    crm_quote: quote!.id, crm_product: product!.id, quantity: 2, unit_price: 100,
  }, as(rep));
  // Settle it the way the app does — a status write (the expiry sweep writes
  // as the system; an acceptance's own cascade is not this file's subject).
  if (status !== 'draft') await systemUpdate(verify, 'crm_quote', { id: quote!.id, status });
  return { quote: (await stored('crm_quote', quote!.id))!, line, product: product! };
};

/** What the engine refused a write with, or null when it went through. */
const refusalOf = (p: Promise<unknown>): Promise<Rec | null> => p.then(() => null, (e: Rec) => e);

const sentence = (quote: Rec) =>
  `Quote ${quote.quote_number} - ${quote.name} is ${quote.status}, so its line items can no longer be added, changed or removed.`;

/** The freeze's envelope, its wording, and the quote named the way the UI names it. */
const expectFrozen = (err: Rec | null, quote: Rec): void => {
  expect(err, 'the write went through').toBeTruthy();
  expect([err!.code, err!.status]).toEqual([REFUSAL_CODES.locked.code, REFUSAL_CODES.locked.status]);
  expect(String(err!.message)).toContain(sentence(quote));
  expect(String(err!.message)).not.toContain(quote.id);
};

describe('a user cannot change the lines of a settled quote', () => {
  it.each(['accepted', 'expired'])('refuses a rep adding a line to an %s quote, and stores nothing', async (status) => {
    const { quote, product } = await quoteWithLine(status);
    const err = await refusalOf(verify.hooks.run('crm_quote_line_item', 'insert', {
      crm_quote: quote.id, crm_product: product.id, quantity: 5, unit_price: 100,
    }, as(rep)));
    expectFrozen(err, quote);
    expect(await verify.rows('crm_quote_line_item', { crm_quote: quote.id })).toHaveLength(1);
  });

  it('refuses a rep changing a line of an accepted quote, and keeps the stored line', async () => {
    const { quote, line } = await quoteWithLine('accepted');
    expectFrozen(await refusalOf(verify.hooks.run('crm_quote_line_item', 'update', { id: line.id, quantity: 9 }, as(rep))), quote);
    expect((await stored('crm_quote_line_item', line.id))!.quantity).toBe(2);
  });

  it('refuses a manager too — the freeze is about the quote, not the grant', async () => {
    const { quote, line } = await quoteWithLine('accepted');
    expectFrozen(await refusalOf(verify.hooks.run('crm_quote_line_item', 'update', { id: line.id, unit_price: 1 }, as(manager))), quote);
  });

  it('refuses moving a line off a settled quote, and onto one', async () => {
    const settled = await quoteWithLine('accepted');
    const open = await quoteWithLine('draft');
    expectFrozen(
      await refusalOf(verify.hooks.run('crm_quote_line_item', 'update', { id: settled.line.id, crm_quote: open.quote.id }, as(manager))),
      settled.quote,
    );
    expectFrozen(
      await refusalOf(verify.hooks.run('crm_quote_line_item', 'update', { id: open.line.id, crm_quote: settled.quote.id }, as(manager))),
      settled.quote,
    );
    expect((await stored('crm_quote_line_item', settled.line.id))!.crm_quote).toBe(settled.quote.id);
    expect((await stored('crm_quote_line_item', open.line.id))!.crm_quote).toBe(open.quote.id);
  });

  it('refuses on the SHIPPED path too — the lowered body, in QuickJS, told which object it fired for', async () => {
    const { quote, product } = await quoteWithLine('accepted');
    const err = await refusalOf(runShippedHook(verify, hookNamed('quote_workflow'), {
      event: 'beforeInsert',
      object: 'crm_quote_line_item',
      input: { crm_quote: quote.id, crm_product: product.id, quantity: 1, unit_price: 100 },
      as: rep.token,
    }));
    expect(err?.name).toBe('SandboxError');
    expect([err!.code, err!.status]).toEqual([REFUSAL_CODES.locked.code, REFUSAL_CODES.locked.status]);
    expect(String(err!.userMessage)).toBe(sentence(quote));
  });
});

describe('a user cannot remove a line from a settled quote by hand (#2088)', () => {
  it.each(['accepted', 'expired'])('refuses a rep deleting a line of an %s quote, and keeps the line', async (status) => {
    const { quote, line } = await quoteWithLine(status);
    expectFrozen(await refusalOf(verify.hooks.run('crm_quote_line_item', 'delete', { id: line.id }, as(rep))), quote);
    expect(await stored('crm_quote_line_item', line.id)).toBeDefined();
  });

  it('answers the REST door with the freeze envelope', async () => {
    const { quote, line } = await quoteWithLine('accepted');
    const res = await verify.apiAs(rep.token, 'DELETE', `/data/crm_quote_line_item/${line.id}`);
    const body = (await res.json()) as Rec;
    expect({ status: res.status, code: body.code }, JSON.stringify(body)).toEqual({
      status: REFUSAL_CODES.locked.status, code: REFUSAL_CODES.locked.code,
    });
    expect(body.userMessage).toBe(sentence(quote));
    expect(await stored('crm_quote_line_item', line.id)).toBeDefined();
  });

  it('on the SHIPPED path, refuses a hand delete and yields to the declared cascade marker, on one context', async () => {
    const { quote, line } = await quoteWithLine('accepted');
    const handDelete = { event: 'beforeDelete', object: 'crm_quote_line_item', input: { id: line.id }, previous: line, as: rep.token };
    const err = await refusalOf(runShippedHook(verify, hookNamed('quote_workflow'), handDelete));
    expect(err?.name).toBe('SandboxError');
    expect([err!.code, err!.status]).toEqual([REFUSAL_CODES.locked.code, REFUSAL_CODES.locked.status]);
    expect(String(err!.userMessage)).toBe(sentence(quote));
    // The same delete, with the one key the engine's cascade adds.
    await expect(runShippedHook(verify, hookNamed('quote_workflow'), { ...handDelete, referentialCascadeDelete: true })).resolves.toBeDefined();
  });
});

describe('what the delete leg lets through', () => {
  it('CONTROL — a rep still removes a line from a draft quote', async () => {
    const { line } = await quoteWithLine('draft');
    await verify.hooks.run('crm_quote_line_item', 'delete', { id: line.id }, as(rep));
    expect(await stored('crm_quote_line_item', line.id)).toBeUndefined();
  });

  it('a system delete of a settled quote\'s line still lands (the freeze judges users only)', async () => {
    const { line } = await quoteWithLine('accepted');
    await verify.hooks.run('crm_quote_line_item', 'delete', { id: line.id }, { system: true });
    expect(await stored('crm_quote_line_item', line.id)).toBeUndefined();
  });

  it.each(['accepted', 'expired'])('a manager can still delete an %s quote that carries lines, through the REST door', async (status) => {
    const { quote, line } = await quoteWithLine(status);
    const res = await verify.apiAs(manager.token, 'DELETE', `/data/crm_quote/${quote.id}`);
    expect(res.status, await res.clone().text()).toBe(200);
    expect(await stored('crm_quote', quote.id)).toBeUndefined();
    expect(await stored('crm_quote_line_item', line.id)).toBeUndefined();
  });

  it('a manager can still delete an account whose expired quote carries lines, two cascade levels above them', async () => {
    const { quote, line } = await quoteWithLine('expired');
    const res = await verify.apiAs(manager.token, 'DELETE', `/data/crm_account/${quote.crm_account}`);
    expect(res.status, await res.clone().text()).toBe(200);
    expect(await stored('crm_quote', quote.id)).toBeUndefined();
    expect(await stored('crm_quote_line_item', line.id)).toBeUndefined();
  });
});

describe('what the freeze lets through', () => {
  it('CONTROL — a draft quote still takes and changes lines, and its totals follow them', async () => {
    const { quote, line, product } = await quoteWithLine('draft');
    await verify.hooks.run('crm_quote_line_item', 'insert', { crm_quote: quote.id, crm_product: product.id, quantity: 1, unit_price: 50 }, as(rep));
    await verify.hooks.run('crm_quote_line_item', 'update', { id: line.id, quantity: 3 }, as(rep));
    // `quote_total_rollup` is `async: true`, so its result is waited for.
    await vi.waitFor(async () => expect((await stored('crm_quote', quote.id))!.subtotal).toBe(350), { timeout: 10_000, interval: 50 }); // 3×100 + 1×50
  });

  it('a system write onto a settled quote still lands (the freeze judges users only)', async () => {
    const { quote, product } = await quoteWithLine('accepted');
    await verify.seed('crm_quote_line_item', [{ crm_quote: quote.id, crm_product: product.id, quantity: 1, unit_price: 10 }]);
    expect(await verify.rows('crm_quote_line_item', { crm_quote: quote.id })).toHaveLength(2);
  });

  it('the line-number back-fill still numbers an unnumbered line of a settled quote', async () => {
    // A line from before #1828, as the back-fill finds it: no ordinal.
    const { line } = await quoteWithLine('expired');
    await systemUpdate(verify, 'crm_quote_line_item', { id: line.id, line_number: null });
    expect((await stored('crm_quote_line_item', line.id))!.line_number ?? null).toBeNull();
    // `scripts/backfill-line-number.ts`'s own write: an admin's REST touch.
    await verify.hooks.run('crm_quote_line_item', 'update', { id: line.id, line_number: null }, as(admin));
    expect(typeof (await stored('crm_quote_line_item', line.id))!.line_number).toBe('number');
  });

  it('lets through a write that changes only product_title, a name the hooks write (#2086)', async () => {
    // `product_title_mirror` re-stamps a renamed product's lines elevated but
    // AS the renaming user, so this freeze sees a user; the key is what lets it
    // through. A rep never reaches it: the engine holds their readonly value back.
    const { line } = await quoteWithLine('accepted');
    const input = await runShippedHook(verify, hookNamed('quote_workflow'), {
      event: 'beforeUpdate', object: 'crm_quote_line_item', input: { id: line.id, product_title: 'Renamed Product' }, previous: line, as: rep.token,
    });
    expect(input.product_title).toBe('Renamed Product');
  });

  it('a manager can still delete a settled quote that carries lines — the cascade runs as them', async () => {
    const { quote, line } = await quoteWithLine('accepted');
    await verify.hooks.run('crm_quote', 'delete', { id: quote.id }, as(manager));
    expect(await stored('crm_quote', quote.id)).toBeUndefined();
    expect(await stored('crm_quote_line_item', line.id)).toBeUndefined();
  });
});
