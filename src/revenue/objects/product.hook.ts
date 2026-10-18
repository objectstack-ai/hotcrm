// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from '../../sales/objects/_hook-api';

/**
 * Product catalog hook.
 *
 * - Enforces `list_price >= cost`.
 * - Normalizes `sku` to uppercase.
 * - Refuses delete when the product is referenced by ANY opportunity or quote
 *   line item (historical included — deals keep their line history); suggests
 *   deactivating (`is_active=false`) instead.
 * - `product_title_mirror`: keeps a renamed product's title on its line items.
 */

const productHook: Hook = {
  name: 'product_catalog',
  object: 'crm_product',
  events: ['beforeInsert', 'beforeUpdate', 'beforeDelete'],
  priority: 200,
  description: 'Pricing sanity, SKU normalization, and protect referenced products from deletion.',
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
    const { event, input, previous } = ctx;

    if (event === 'beforeInsert' || event === 'beforeUpdate') {
      // The patch's value, else the stored one — the first that is a number.
      const listPrice = [input.list_price, previous?.list_price].find((v): v is number => typeof v === 'number');
      const cost = [input.cost, previous?.cost].find((v): v is number => typeof v === 'number');
      if (typeof listPrice === 'number' && typeof cost === 'number' && listPrice < cost) {
        throw refuse(
          `List Price (${listPrice}) must be greater than or equal to Cost (${cost}).`,
          'VALIDATION_FAILED',
          400,
        );
      }
      if (typeof input.sku === 'string') {
        input.sku = input.sku.toUpperCase();
      }
    }

    if (event === 'beforeDelete') {
      const api = ctx.api as HookApi | undefined;
      const id = previous?.id;
      if (!api || !id) return;
      const [oppRefs, quoteRefs] = await Promise.all([
        api.object('crm_opportunity_line_item').count({ where: { crm_product: id } }).catch(() => 0),
        api.object('crm_quote_line_item').count({ where: { crm_product: id } }).catch(() => 0),
      ]);
      if (oppRefs + quoteRefs > 0) {
        throw refuse(
          `Cannot delete product: referenced by ${oppRefs} opportunity(ies) and ${quoteRefs} quote(s). Set is_active=false to retire instead.`,
          'DELETE_RESTRICTED',
          409,
        );
      }
    }
  },
};

/**
 * A renamed product renames its line items (#2086).
 *
 * Both line objects name a line by `product_title`, a stored copy of this
 * product's `display_title` (`product_code - name`). The rename side of the
 * governing table in `skills/objectstack-data/SKILL.md` ("mirror the value,
 * always") is this hook. The line side is `*_line_item_product_title`
 * (`_line-item-price-fill.ts`).
 *
 * It acts only on a write that carries `name`. `product_code` is an
 * autonumber the engine issues once. It re-reads the title as the engine
 * computes it, and re-writes only lines whose copy differs. So an edit that
 * resends an unchanged name reads the lines and writes none.
 * `scripts/backfill-line-product-title.ts` relies on that: it resends each
 * product's own name to stamp the lines that predate the field.
 *
 * Every line follows, frozen parents included (#2086 ruling 2): a closed
 * deal's lines and an accepted or expired quote's lines. The title is a name,
 * not a figure, and the line's own header already shows the live product chip
 * beside it. Two things let the re-stamp through. Both line freezes list
 * `product_title` as a key that is not a change, beside `line_number` (#2086
 * ruling A). That is needed because `runAs: 'system'` elevates but keeps the
 * renaming user, and the freezes judge `ctx.user`. `runAs: 'system'` itself
 * is still needed: the product's editor may not be able to edit every deal
 * that sold it. A user's change to any other field of a frozen line is still
 * refused; `test/line-item-product-title.test.ts` pins both directions.
 *
 * `async` + `onError: 'log'`, as the line rollups are: a rename is never
 * refused because one old line will not take a write (a quote line stored
 * above today's discount ceiling refuses every write). One bad line does not
 * stop the others. The hook re-stamps every line it can, then throws once,
 * naming how many kept a stale copy, and `onError: 'log'` records that.
 */
const productTitleMirror: Hook = {
  name: 'product_title_mirror',
  object: 'crm_product',
  events: ['afterUpdate'],
  priority: 300,
  runAs: 'system',
  async: true,
  onError: 'log',
  description: 'Re-stamp product_title on every opportunity and quote line of a renamed product.',
  handler: async (ctx: HookContext) => {
    const api = ctx.api as HookApi | undefined;
    const id = ctx.previous?.id ?? ctx.input?.id;
    if (!api || typeof id !== 'string' || !id) return;
    if (!ctx.input || !Object.prototype.hasOwnProperty.call(ctx.input, 'name')) return;
    const product = await api.object('crm_product').findOne({ where: { id }, fields: ['id', 'display_title'] });
    const title = product && typeof product.display_title === 'string' ? product.display_title.trim() : '';
    if (!title) return;
    let stale = 0;
    let first = '';
    for (const object of ['crm_opportunity_line_item', 'crm_quote_line_item']) {
      const lines = await api.object(object).find({
        where: { crm_product: id }, fields: ['id', 'product_title'], top: 5000,
      });
      for (const line of lines) {
        if (line.product_title === title) continue;
        try {
          await api.object(object).update({ id: String(line.id), product_title: title }, { where: { id: String(line.id) } });
        } catch (err) {
          stale++;
          if (!first) first = `${object}: ${err instanceof Error ? err.message : String(err)}`;
        }
      }
    }
    if (stale > 0) {
      throw new Error(`product_title_mirror: ${stale} line(s) of ${title} kept a stale product_title; the first refusal: ${first}`);
    }
  },
};

export default [productHook, productTitleMirror];
