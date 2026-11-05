// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { hotcrmStack, signUpPerson, type Person } from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * Add Products (#2318, REQ-0009 phase 3): the `price_book_add_products`
 * screen flow, driven as the console drives it — `flows.run` on a price book,
 * `flows.resume` with the screen's answer, and one more resume past the
 * result screen.
 *
 * - every active product the book does not price gets an entry at the chosen
 *   share of its List Price, rounded to the cent;
 * - a product the book already prices keeps its price, so a second run only
 *   tops the book up;
 * - the bound on the screen is judged on resume, before the run is consumed;
 * - a manager adding to a book they do not own is refused product by product,
 *   and the run ends `refused` with the counts.
 */

let verify: VerifyStack;
let manager: Person;
let other: Person;
let k = 0;

beforeAll(async () => {
  verify = await hotcrmStack();
  manager = await signUpPerson(verify, 'manager@flow-price-book-add-products.test', {
    name: 'Adding Manager', positions: ['sales_manager'], permissionSets: ['sales_manager'],
  });
  other = await signUpPerson(verify, 'other@flow-price-book-add-products.test', {
    name: 'Other Manager', positions: ['sales_manager'], permissionSets: ['sales_manager'],
  });
}, 120_000);

const book = async (by: Person): Promise<Rec> =>
  verify.hooks.run('crm_price_book', 'insert', { name: `Add Book ${++k}`, is_active: true }, { as: by.token });

/** Run the flow on `bookId` as `by`, answer the screen, and read how it ended. */
async function addProducts(bookId: string, by: Person, percentOfList: number): Promise<Rec> {
  const run = await verify.flows.run('price_book_add_products', { recordId: bookId }, { as: by.token });
  expect(run.status, 'price_book_add_products did not pause on its screen').toBe('paused');
  let result = (await verify.flows.resume(run, { percentOfList }, { as: by.token })) as Rec;
  const resultScreen = result.status === 'paused' ? (result.screen ?? result.output?.screen)?.nodeId : undefined;
  if (resultScreen) result = (await verify.flows.resume(result as never, {}, { as: by.token })) as Rec;
  return { ...result, resultScreen };
}

const activeProducts = async (): Promise<Rec[]> =>
  (await verify.rows('crm_product', { is_active: true })).filter((p) => typeof p.list_price === 'number');

describe('price_book_add_products', () => {
  it('prices every active product in the book at the chosen share of its List Price', async () => {
    const b = await book(manager);
    const ended = await addProducts(b.id, manager, 80);
    expect(ended.status, String(ended.refusalMessage ?? '')).not.toBe('refused');
    expect(ended.resultScreen).toBe('result');
    const products = await activeProducts();
    const entries = await verify.rows('crm_price_book_entry', { crm_price_book: b.id });
    expect(entries).toHaveLength(products.length);
    for (const p of products) {
      const e = entries.find((row) => row.crm_product === p.id);
      expect(e, String(p.name)).toBeDefined();
      expect(e!.list_price, String(p.name)).toBe(Math.round(p.list_price * 80) / 100);
      expect(e!.is_active).toBe(true);
    }
  });

  it('a second run tops the book up and keeps the prices it already holds', async () => {
    const b = await book(manager);
    await addProducts(b.id, manager, 80);
    const [first] = await verify.rows('crm_price_book_entry', { crm_price_book: b.id });
    await verify.hooks.run('crm_price_book_entry', 'update', { id: first!.id, list_price: 1 }, { as: manager.token });
    const p = await verify.hooks.run('crm_product', 'insert', {
      name: `Later Product ${++k}`, product_code: `LP-${k}`, is_active: true, list_price: 333.33,
    }, { as: (await verify.signIn()) });
    await addProducts(b.id, manager, 50);
    const entries = await verify.rows('crm_price_book_entry', { crm_price_book: b.id });
    expect(entries.find((e) => e.id === first!.id)!.list_price).toBe(1);
    // 333.33 × 50% = 166.665, rounded half-up to the cent.
    expect(entries.find((e) => e.crm_product === p.id)!.list_price).toBe(166.67);
    expect(entries).toHaveLength((await activeProducts()).length);
  });

  it('refuses an out-of-bound share on the screen, before the run is consumed', async () => {
    const b = await book(manager);
    const run = await verify.flows.run('price_book_add_products', { recordId: b.id }, { as: manager.token });
    await expect(verify.flows.resume(run, { percentOfList: 0 }, { as: manager.token }))
      .rejects.toMatchObject({ code: 'INVALID_SCREEN_INPUT' });
    expect(await verify.rows('crm_price_book_entry', { crm_price_book: b.id })).toHaveLength(0);
  });

  it('a manager adding to a book they do not own is refused, with the counts', async () => {
    const b = await book(other);
    const ended = await addProducts(b.id, manager, 90);
    expect(ended.status).toBe('refused');
    const products = await activeProducts();
    expect(String(ended.refusalMessage)).toContain(`${products.length} products could not be added`);
    expect(await verify.rows('crm_price_book_entry', { crm_price_book: b.id })).toHaveLength(0);
  });
});
