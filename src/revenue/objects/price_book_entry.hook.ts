// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from '../../sales/objects/_hook-api';

/**
 * One entry per product per price book (REQ-0009, phase 1).
 *
 * A second entry for a product a book already prices is refused, naming the
 * book and the product, so the rep or manager who hit it knows which entry to
 * edit instead. It runs on insert, and on an update that moves an entry to
 * another book or product.
 *
 * Not a unique index: the platform's refusal for a broken index names the
 * columns, not the records, and the card asks for the book and the product by
 * name. No organization scope is needed, unlike `price_book_standard`: the
 * key is the book's id, and a book belongs to one organization.
 */
const priceBookEntryHook: Hook = {
  name: 'price_book_entry_unique',
  object: 'crm_price_book_entry',
  events: ['beforeInsert', 'beforeUpdate'],
  priority: 200,
  description: 'Refuse a second entry for the same product in the same price book, naming both.',
  handler: async (ctx: HookContext) => {
    // The refusal envelope (#1075). Mirrored from `src/sales/objects/_refusal.ts` because a
    // lowered body has no module scope and `extractHookBody` THROWS on an
    // import; `test/refusal-envelope.test.ts` pins every copy against it.
    function refuse(
      message: string,
      code: string,
      status: number,
      userMessage: string = message,
    ): Error {
      const err = new Error(message) as Error & {
        code: string;
        status: number;
        userMessage: string;
      };
      err.code = code;
      err.status = status;
      err.userMessage = userMessage;
      return err;
    }
    // A reference arrives as an id, or expanded as `{ id }`.
    function refId(value: unknown): string {
      if (typeof value === 'string') return value;
      if (value && typeof value === 'object' && typeof (value as Record<string, unknown>).id === 'string') {
        return String((value as Record<string, unknown>).id);
      }
      return '';
    }
    const { event, input, previous } = ctx;
    const api = ctx.api as HookApi | undefined;
    if (!api) return;
    if (event !== 'beforeInsert' && event !== 'beforeUpdate') return;
    const has = (key: string): boolean => Object.prototype.hasOwnProperty.call(input, key);
    if (event === 'beforeUpdate' && !has('crm_price_book') && !has('crm_product')) return;

    const book = refId(has('crm_price_book') ? input.crm_price_book : previous?.crm_price_book);
    const product = refId(has('crm_product') ? input.crm_product : previous?.crm_product);
    if (!book || !product) return;
    const selfId = previous?.id ?? input.id;
    const twins = (await api.object('crm_price_book_entry').find({
      where: { crm_price_book: book, crm_product: product }, fields: ['id'], top: 2,
    })).filter((entry) => entry.id !== selfId);
    if (twins.length === 0) return;

    const [bookRow, productRow] = await Promise.all([
      api.object('crm_price_book').findOne({ where: { id: book }, fields: ['id', 'name'] }),
      api.object('crm_product').findOne({ where: { id: product }, fields: ['id', 'name', 'display_title'] }),
    ]);
    const bookName = typeof bookRow?.name === 'string' && bookRow.name.trim() !== '' ? bookRow.name : 'This price book';
    const productName = typeof productRow?.display_title === 'string' && productRow.display_title.trim() !== ''
      ? productRow.display_title
      : typeof productRow?.name === 'string' ? productRow.name : 'this product';
    throw refuse(
      `${bookName} already has a price for ${productName}. A price book holds one entry per product: edit that entry instead.`,
      'DUPLICATE_VALUE',
      409,
    );
  },
};

export default priceBookEntryHook;
