// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { hotcrmStack, signUpPerson, type Person } from './helpers/verify-stack';
import { STANDARD_PRICE_BOOK } from '../src/revenue/data/price-book.seed';

type Rec = Record<string, any>;

/**
 * Price books, phase 1 (#2313, REQ-0009): the two hooks beside the objects, and
 * who may write them.
 *
 * - `price_book_standard` keeps exactly one standard book: a second is refused
 *   naming the first, and the standard book can neither lose the flag nor be
 *   deleted.
 * - `price_book_entry_unique` refuses a second entry for a product in a book,
 *   naming the book and the product.
 *
 * Real writes on the shipped app booted by `@objectstack/verify`: each refusal
 * is the engine's answer to the write, and its envelope is asserted (`code` +
 * `status`), not the bare throw.
 */

let verify: VerifyStack;
let admin: string;
let manager: Person;
let rep: Person;
let standard: Rec;
let platform: Rec;
let smb: Rec;
let k = 0;

beforeAll(async () => {
  verify = await hotcrmStack();
  admin = await verify.signIn();
  manager = await signUpPerson(verify, 'manager@price-book-hooks.test', {
    name: 'Pricing Manager', positions: ['sales_manager'], permissionSets: ['sales_manager'],
  });
  rep = await signUpPerson(verify, 'rep@price-book-hooks.test', {
    name: 'Quoting Rep', positions: ['sales_rep'], permissionSets: ['sales_rep'],
  });
  const books = await verify.rows('crm_price_book', { is_standard: true });
  expect(books, 'fixture: the seed holds one standard book').toHaveLength(1);
  standard = books[0]!;
  [platform] = await verify.rows('crm_product', { name: 'ObjectStack Platform' });
  [smb] = await verify.rows('crm_product', { name: 'ObjectStack Platform (SMB Edition)' });
  expect(platform && smb, 'fixture: the seed holds both catalogue products').toBeTruthy();
}, 120_000);

const book = (doc: Rec, as: string = admin): Promise<Rec> =>
  verify.hooks.run('crm_price_book', 'insert', { name: `Book ${++k}`, ...doc }, { as });
const entry = (doc: Rec, as: string = admin): Promise<Rec> =>
  verify.hooks.run('crm_price_book_entry', 'insert', { list_price: 100, ...doc }, { as });

describe('price_book_standard keeps exactly one standard book', () => {
  it('the seeded standard book is the Standard book', () => {
    expect(standard.name).toBe(STANDARD_PRICE_BOOK);
  });

  it('refuses a second standard book, naming the standard one', async () => {
    await expect(book({ is_standard: true })).rejects.toMatchObject({
      code: 'DUPLICATE_VALUE', status: 409, message: expect.stringContaining(STANDARD_PRICE_BOOK),
    });
    expect(await verify.rows('crm_price_book', { is_standard: true })).toHaveLength(1);
  });

  it('refuses marking an existing book standard', async () => {
    const partner = await book({ name: 'Partner' });
    await expect(verify.hooks.run('crm_price_book', 'update', { id: partner.id, is_standard: true }, { as: admin }))
      .rejects.toMatchObject({ code: 'DUPLICATE_VALUE', status: 409 });
  });

  it('control: a book that is not standard saves', async () => {
    const written = await book({ name: 'Regional', is_standard: false });
    expect(written.is_standard).toBe(false);
  });

  it('refuses turning Standard off on the standard book', async () => {
    await expect(verify.hooks.run('crm_price_book', 'update', { id: standard.id, is_standard: false }, { as: admin }))
      .rejects.toMatchObject({ code: 'RECORD_LOCKED', status: 409, message: expect.stringContaining(STANDARD_PRICE_BOOK) });
  });

  it('lets the standard book be edited otherwise', async () => {
    const description = 'The published list price of every product.';
    await verify.hooks.run('crm_price_book', 'update', { id: standard.id, description }, { as: admin });
    const [row] = await verify.rows('crm_price_book', { id: standard.id });
    expect(row).toMatchObject({ description, is_standard: true });
  });

  it('refuses deleting the standard book', async () => {
    await expect(verify.hooks.run('crm_price_book', 'delete', { id: standard.id }, { as: admin }))
      .rejects.toMatchObject({ code: 'RECORD_LOCKED', status: 409, message: expect.stringContaining(STANDARD_PRICE_BOOK) });
    expect(await verify.rows('crm_price_book', { id: standard.id })).toHaveLength(1);
  });

  it('control: another book deletes, and its entries go with it', async () => {
    const doomed = await book({});
    await entry({ crm_price_book: doomed.id, crm_product: platform.id });
    await verify.hooks.run('crm_price_book', 'delete', { id: doomed.id }, { as: admin });
    expect(await verify.rows('crm_price_book', { id: doomed.id })).toHaveLength(0);
    expect(await verify.rows('crm_price_book_entry', { crm_price_book: doomed.id })).toHaveLength(0);
  });
});

describe('price_book_entry_unique holds one entry per product per book', () => {
  let partner: Rec;
  beforeAll(async () => {
    partner = await book({ name: 'Partner Tier' });
  });

  it('refuses a second entry for the product, naming the book and the product', async () => {
    await entry({ crm_price_book: partner.id, crm_product: platform.id, list_price: 40000 });
    const refusal = { code: 'DUPLICATE_VALUE', status: 409 };
    const second = entry({ crm_price_book: partner.id, crm_product: platform.id, list_price: 39000 });
    await expect(second).rejects.toMatchObject(refusal);
    const message = String(await second.catch((err: Error) => err.message));
    expect(message).toContain('Partner Tier');
    expect(message).toContain(String(platform.display_title));
    expect(await verify.rows('crm_price_book_entry', { crm_price_book: partner.id, crm_product: platform.id })).toHaveLength(1);
  });

  it('control: the same product in another book saves', async () => {
    const other = await book({});
    const written = await entry({ crm_price_book: other.id, crm_product: platform.id });
    expect(written.crm_product).toBe(platform.id);
  });

  it('refuses moving an entry onto a product the book already prices', async () => {
    const moved = await entry({ crm_price_book: partner.id, crm_product: smb.id, list_price: 15000 });
    await expect(verify.hooks.run('crm_price_book_entry', 'update', { id: moved.id, crm_product: platform.id }, { as: admin }))
      .rejects.toMatchObject({ code: 'DUPLICATE_VALUE', status: 409 });
  });

  it('control: repricing an entry saves', async () => {
    const [row] = await verify.rows('crm_price_book_entry', { crm_price_book: partner.id, crm_product: smb.id });
    await verify.hooks.run('crm_price_book_entry', 'update', { id: row!.id, list_price: 14500 }, { as: admin });
    const [after] = await verify.rows('crm_price_book_entry', { id: row!.id });
    expect(after!.list_price).toBe(14500);
  });

  it('the seeded standard book already prices each catalogue product once', async () => {
    await expect(entry({ crm_price_book: standard.id, crm_product: platform.id }))
      .rejects.toMatchObject({ code: 'DUPLICATE_VALUE', status: 409, message: expect.stringContaining(STANDARD_PRICE_BOOK) });
  });
});

describe('who writes price books', () => {
  it('a sales manager creates a book and prices a product in it', async () => {
    const own = await book({ name: 'Manager Promotion', valid_from: '2026-11-01', valid_to: '2026-11-30' }, manager.token);
    const priced = await entry({ crm_price_book: own.id, crm_product: platform.id, list_price: 45000 }, manager.token);
    expect(priced.list_price).toBe(45000);
  });

  it('a sales rep reads the standard book and its entries', async () => {
    const bookRes = await verify.apiAs(rep.token, 'GET', `/data/crm_price_book/${standard.id}`);
    expect(bookRes.status).toBe(200);
    expect(JSON.stringify(await bookRes.json())).toContain(STANDARD_PRICE_BOOK);
    const entriesRes = await verify.apiAs(rep.token, 'GET', `/data/crm_price_book_entry?crm_price_book=${standard.id}`);
    expect(entriesRes.status).toBe(200);
    expect(JSON.stringify(await entriesRes.json())).toContain(String(platform.id));
  });

  it('a sales rep creates no book', async () => {
    await expect(book({}, rep.token)).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('a validity window that ends before it starts is refused', async () => {
    // A declarative rule, not a hook: the engine's ValidationError carries the
    // code in process (the HTTP mapper supplies 400 for it).
    await expect(book({ valid_from: '2026-12-01', valid_to: '2026-11-01' }))
      .rejects.toMatchObject({ code: 'VALIDATION_FAILED', message: expect.stringContaining('Valid To') });
  });
});
