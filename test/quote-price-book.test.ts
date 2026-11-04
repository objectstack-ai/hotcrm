// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { hotcrmStack, signUpPerson, systemUpdate, type Person } from './helpers/verify-stack';
import { STANDARD_PRICE_BOOK } from '../src/revenue/data/price-book.seed';

type Rec = Record<string, any>;

/**
 * Price books, phase 2 (#2318, REQ-0009): a quote chooses a price book and
 * its lines take their list price from it.
 *
 * REQ-0009 *Acceptance*, case by case, on the shipped app booted by
 * `@objectstack/verify`, each write made by the person the acceptance names:
 *
 * - a manager makes a Partner book with one product 20% under its standard
 *   price; a rep quotes that product once from the standard book and once
 *   from the Partner book, and the two lines carry the two list prices;
 * - a product the Partner book does not price is refused on the line, and the
 *   refusal names the book;
 * - a line already written keeps its price after the book's entry changes;
 * - a rep cannot edit a book.
 *
 * Around them, the edges the hooks draw: the default book on a new quote, the
 * product's standard price kept by `product_standard_price`, an inactive book
 * or entry, a book change on a quote with lines, the freeze, a delete of a
 * book quotes price from, and the opportunity line that does not read books.
 * Every refusal asserts its envelope (`code` + `status`), not the bare throw.
 */

let verify: VerifyStack;
let admin: string;
let manager: Person;
let rep: Person;
let standard: Rec;
let k = 0;

beforeAll(async () => {
  verify = await hotcrmStack();
  admin = await verify.signIn();
  manager = await signUpPerson(verify, 'manager@quote-price-book.test', {
    name: 'Book Manager', positions: ['sales_manager'], permissionSets: ['sales_manager'],
  });
  rep = await signUpPerson(verify, 'rep@quote-price-book.test', {
    name: 'Book Rep', positions: ['sales_rep'], permissionSets: ['sales_rep'],
  });
  const books = await verify.rows('crm_price_book', { is_standard: true });
  expect(books, 'fixture: the seed holds one standard book').toHaveLength(1);
  standard = books[0]!;
}, 120_000);

const as = (p: Person | string) => ({ as: typeof p === 'string' ? p : p.token });
const stored = async (object: string, id: string): Promise<Rec> => (await verify.rows(object, { id }))[0]!;

/** A product made by an administrator, as the catalogue's keeper makes one. */
const product = async (listPrice: number): Promise<Rec> =>
  verify.hooks.run('crm_product', 'insert', {
    name: `Book Product ${++k}`, product_code: `BK-${k}`, is_active: true, list_price: listPrice,
  }, as(admin));

/** A rep's account and a draft quote on it, created by the rep. */
const quote = async (doc: Rec = {}): Promise<Rec> => {
  const [account] = await verify.seed('crm_account', [{ name: `Book Co ${++k}`, owner_id: rep.id }]);
  return verify.hooks.run('crm_quote', 'insert', {
    name: `Book Quote ${k}`, crm_account: account!.id, status: 'draft', ...doc,
  }, as(rep));
};

const line = (quoteId: string, productId: string, as_: Person | string = rep): Promise<Rec> =>
  verify.hooks.run('crm_quote_line_item', 'insert', { crm_quote: quoteId, crm_product: productId, quantity: 1 }, as(as_));

const book = (doc: Rec, by: Person | string = manager): Promise<Rec> =>
  verify.hooks.run('crm_price_book', 'insert', { name: `Book ${++k}`, is_active: true, ...doc }, as(by));

const entry = (doc: Rec, by: Person | string = manager): Promise<Rec> =>
  verify.hooks.run('crm_price_book_entry', 'insert', { is_active: true, ...doc }, as(by));

describe('a new quote prices from the standard book', () => {
  it('a rep\'s quote created without a book gets the standard book', async () => {
    const q = await quote();
    expect((await stored('crm_quote', q.id)).crm_price_book).toBe(standard.id);
  });

  it('every seeded quote names the standard book', async () => {
    const seeded = await verify.rows('crm_quote', {});
    const named = seeded.filter((q) => !String(q.name).startsWith('Book Quote'));
    expect(named.length, 'fixture: the seed holds quotes').toBeGreaterThan(0);
    for (const q of named) expect(q.crm_price_book, String(q.name)).toBe(standard.id);
  });

  it('a product added later is priced in the standard book at its List Price, and follows it', async () => {
    const p = await product(1200);
    const [mirrored] = await verify.rows('crm_price_book_entry', { crm_price_book: standard.id, crm_product: p.id });
    expect(mirrored).toMatchObject({ list_price: 1200, is_active: true });
    await verify.hooks.run('crm_product', 'update', { id: p.id, list_price: 1300 }, as(admin));
    const after = await verify.rows('crm_price_book_entry', { crm_price_book: standard.id, crm_product: p.id });
    expect(after).toHaveLength(1);
    expect(after[0]!.list_price).toBe(1300);
  });

  it('a standard-book line takes the standard price', async () => {
    const p = await product(500);
    const q = await quote();
    const written = await line(q.id, p.id);
    expect(await stored('crm_quote_line_item', written.id)).toMatchObject({ list_price: 500, unit_price: 500 });
  });
});

describe('REQ-0009 Acceptance', () => {
  let partner: Rec;
  let shared: Rec;
  let missing: Rec;

  beforeAll(async () => {
    shared = await product(1000);
    missing = await product(700);
    partner = await book({ name: 'Partner' });
    await entry({ crm_price_book: partner.id, crm_product: shared.id, list_price: 800 });
  });

  it('a manager made a Partner book with one entry 20% under the standard price', async () => {
    const [std] = await verify.rows('crm_price_book_entry', { crm_price_book: standard.id, crm_product: shared.id });
    const [cut] = await verify.rows('crm_price_book_entry', { crm_price_book: partner.id, crm_product: shared.id });
    expect(cut!.list_price).toBe(std!.list_price * 0.8);
  });

  it('a rep quotes the same product from both books, and the two lines show the two list prices', async () => {
    const fromStandard = await quote();
    const fromPartner = await quote({ crm_price_book: partner.id });
    const a = await line(fromStandard.id, shared.id);
    const b = await line(fromPartner.id, shared.id);
    expect((await stored('crm_quote_line_item', a.id)).list_price).toBe(1000);
    expect((await stored('crm_quote_line_item', b.id)).list_price).toBe(800);
    expect((await stored('crm_quote_line_item', b.id)).unit_price).toBe(800);
  });

  it('a product the Partner book does not price is refused, naming the book and the product', async () => {
    const q = await quote({ crm_price_book: partner.id });
    const refused = line(q.id, missing.id);
    await expect(refused).rejects.toMatchObject({ code: 'VALIDATION_FAILED', status: 400 });
    const message = String(await refused.catch((err: Error) => err.message));
    expect(message).toContain('Partner');
    expect(message).toContain(String(missing.name));
    expect(await verify.rows('crm_quote_line_item', { crm_quote: q.id })).toHaveLength(0);
  });

  it('a line already written keeps its prices after the book\'s entry changes', async () => {
    const q = await quote({ crm_price_book: partner.id });
    const written = await line(q.id, shared.id);
    const [cut] = await verify.rows('crm_price_book_entry', { crm_price_book: partner.id, crm_product: shared.id });
    await verify.hooks.run('crm_price_book_entry', 'update', { id: cut!.id, list_price: 750 }, as(manager));
    await verify.hooks.run('crm_price_book', 'update', { id: partner.id, description: 'Partners, repriced' }, as(manager));
    expect(await stored('crm_quote_line_item', written.id)).toMatchObject({ list_price: 800, unit_price: 800 });
    // Control: a line picked after the change takes the new price.
    const fresh = await line(q.id, shared.id);
    expect((await stored('crm_quote_line_item', fresh.id)).list_price).toBe(750);
  });

  it('a rep cannot edit a book', async () => {
    await expect(verify.hooks.run('crm_price_book', 'update', { id: partner.id, name: 'Rep Edit' }, as(rep)))
      .rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
    expect((await stored('crm_price_book', partner.id)).name).toBe('Partner');
  });
});

describe('what a quote may do with its book', () => {
  it('an inactive entry is no price: the line is refused', async () => {
    const p = await product(300);
    const b = await book({});
    await entry({ crm_price_book: b.id, crm_product: p.id, list_price: 250, is_active: false });
    const q = await quote({ crm_price_book: b.id });
    await expect(line(q.id, p.id)).rejects.toMatchObject({ code: 'VALIDATION_FAILED', status: 400 });
  });

  it('an inactive book is refused on the quote', async () => {
    const b = await book({ is_active: false });
    await expect(quote({ crm_price_book: b.id })).rejects.toMatchObject({ code: 'VALIDATION_FAILED', status: 400 });
  });

  it('a quote with no lines may change its book; one with lines may not', async () => {
    const p = await product(400);
    const b = await book({});
    await entry({ crm_price_book: b.id, crm_product: p.id, list_price: 350 });
    const q = await quote();
    await verify.hooks.run('crm_quote', 'update', { id: q.id, crm_price_book: b.id }, as(rep));
    expect((await stored('crm_quote', q.id)).crm_price_book).toBe(b.id);
    await line(q.id, p.id);
    await expect(verify.hooks.run('crm_quote', 'update', { id: q.id, crm_price_book: standard.id }, as(rep)))
      .rejects.toMatchObject({ code: 'VALIDATION_FAILED', status: 400 });
    expect((await stored('crm_quote', q.id)).crm_price_book).toBe(b.id);
  });

  it('the book is frozen with an expired quote, as every field but Internal Notes is', async () => {
    const b = await book({});
    const q = await quote();
    // Expired, the settled state the sweep writes, needs no contact; the
    // freeze is one rule for accepted, rejected and expired alike.
    await systemUpdate(verify, 'crm_quote', { id: q.id, status: 'expired' });
    await expect(verify.hooks.run('crm_quote', 'update', { id: q.id, crm_price_book: b.id }, as(rep)))
      .rejects.toMatchObject({ code: 'RECORD_LOCKED', status: 409 });
    expect((await stored('crm_quote', q.id)).crm_price_book).toBe(standard.id);
  });

  it('a book a quote prices from cannot be deleted; an unused one can', async () => {
    const used = await book({});
    await quote({ crm_price_book: used.id });
    await expect(verify.hooks.run('crm_price_book', 'delete', { id: used.id }, as(admin)))
      .rejects.toMatchObject({ code: 'DELETE_RESTRICTED', status: 409 });
    expect(await verify.rows('crm_price_book', { id: used.id })).toHaveLength(1);
    const unused = await book({});
    await verify.hooks.run('crm_price_book', 'delete', { id: unused.id }, as(admin));
    expect(await verify.rows('crm_price_book', { id: unused.id })).toHaveLength(0);
  });

  it('an opportunity line still takes the product\'s own List Price (the card\'s assumption)', async () => {
    const p = await product(900);
    const b = await book({});
    await entry({ crm_price_book: b.id, crm_product: p.id, list_price: 100 });
    const [account] = await verify.seed('crm_account', [{ name: `Book Deal Co ${++k}`, owner_id: rep.id }]);
    const [deal] = await verify.seed('crm_opportunity', [{
      name: `Book Deal ${k}`, crm_account: account!.id, owner_id: rep.id, stage: 'prospecting', amount: 900, close_date: '2030-12-31',
    }]);
    const written = await verify.hooks.run('crm_opportunity_line_item', 'insert', {
      crm_opportunity: deal!.id, crm_product: p.id, quantity: 1,
    }, as(rep));
    expect((await stored('crm_opportunity_line_item', written.id)).list_price).toBe(900);
  });

  it('the standard book is the seeded Standard book', () => {
    expect(standard.name).toBe(STANDARD_PRICE_BOOK);
  });
});
