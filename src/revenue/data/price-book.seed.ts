// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * The `Standard` price book (REQ-0009, phase 1), built from the catalogue.
 *
 * One entry per catalogue product at that product's `list_price`, read from
 * `products` itself, so the book and the catalogue cannot be authored apart.
 *
 * INSERT-ONCE (`mode: 'ignore'`, as the catalogue, #2139). The platform
 * replays the seed on every single-tenant boot, and `ignore` inserts only the
 * rows the database lacks. That is what makes it the upgrade path, with no
 * migration script: the first boot of this version over an existing database
 * writes the book and its entries once, and every later boot finds them and
 * writes nothing, so a price an admin changes on an entry stays changed.
 * `test/price-book-seed.test.ts` measures both across a real restart.
 *
 * The entries key on `(crm_price_book, crm_product)`, the pair
 * `price_book_entry_unique` holds unique.
 */
import { defineSeed } from '@objectstack/spec/data';
import { PriceBook } from '../objects/price_book.object';
import { PriceBookEntry } from '../objects/price_book_entry.object';
import { products } from './catalog.seed';

/** The standard book's name, and its seed identity. */
export const STANDARD_PRICE_BOOK = 'Standard';

export const priceBooks = defineSeed(PriceBook, {
  mode: 'ignore',
  externalId: 'name',
  records: [
    {
      name: STANDARD_PRICE_BOOK,
      description: 'The list price of every product in the catalogue.',
      is_active: true,
      is_standard: true,
    },
  ],
});

export const priceBookEntries = defineSeed(PriceBookEntry, {
  mode: 'ignore',
  externalId: ['crm_price_book', 'crm_product'],
  records: products.records.map((product) => ({
    crm_price_book: STANDARD_PRICE_BOOK,
    crm_product: String(product.name),
    list_price: product.list_price,
    is_active: true,
  })),
});
