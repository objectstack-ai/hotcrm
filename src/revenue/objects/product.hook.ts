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
 * stop the others. A pass that leaves a refused line throws once, naming how
 * many kept a stale copy, and `onError: 'log'` records that.
 *
 * ## One invocation does a bounded share of the lines (#2168)
 *
 * The hosted runtime runs this body in a sandbox with a 30 s wall-clock
 * ceiling. Each line write runs the line's own before-hooks, each a round trip
 * to the remote database, so a product with a few dozen lines used to stop
 * after about ten. `onError: 'log'` swallowed the stop, and the rest of the
 * lines kept their old copy until someone renamed the product again.
 *
 * So a pass writes at most `WRITES_PER_PASS` lines (and gives up early on
 * `PASS_BUDGET_MS`). When lines are still stale, it hands the rest to a fresh
 * invocation, with a fresh budget, by re-sending the product's own `name`.
 * That is the same unchanged-name write the backfill makes. It continues only
 * on measured progress: the stale count read back after the pass must be
 * lower than the count it started from. So a write that does not stick, or a
 * run of refused lines, ends the chain with one logged error instead of
 * looping.
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
    // Inside the handler, not at module scope: a lowered body has none.
    const WRITES_PER_PASS = 5;
    const ATTEMPTS_PER_PASS = 10;
    const PASS_BUDGET_MS = 15_000;
    const startedAt = Date.now();
    const api = ctx.api as HookApi | undefined;
    const id = ctx.previous?.id ?? ctx.input?.id;
    if (!api || typeof id !== 'string' || !id) return;
    if (!ctx.input || !Object.prototype.hasOwnProperty.call(ctx.input, 'name')) return;
    const product = await api.object('crm_product').findOne({ where: { id }, fields: ['id', 'name', 'display_title'] });
    const title = product && typeof product.display_title === 'string' ? product.display_title.trim() : '';
    if (!title) return;
    const staleLines = async (): Promise<Array<{ object: string; id: string }>> => {
      const out: Array<{ object: string; id: string }> = [];
      for (const object of ['crm_opportunity_line_item', 'crm_quote_line_item']) {
        const lines = await api.object(object).find({
          where: { crm_product: id }, fields: ['id', 'product_title'], top: 5000,
        });
        for (const line of lines) {
          if (line.product_title !== title) out.push({ object, id: String(line.id) });
        }
      }
      return out;
    };
    const before = await staleLines();
    let written = 0;
    let refused = 0;
    let first = '';
    for (const line of before) {
      if (written >= WRITES_PER_PASS || written + refused >= ATTEMPTS_PER_PASS) break;
      if (Date.now() - startedAt > PASS_BUDGET_MS) break;
      try {
        await api.object(line.object).update({ id: line.id, product_title: title }, { where: { id: line.id } });
        written++;
      } catch (err) {
        refused++;
        if (!first) first = `${line.object}: ${err instanceof Error ? err.message : String(err)}`;
      }
    }
    if (written + refused < before.length) {
      // Lines are left for another pass. Hand them on only if this pass moved the data.
      const left = (await staleLines()).length;
      if (left < before.length) {
        await api.object('crm_product').update({ id, name: product!.name }, { where: { id } });
        return;
      }
      throw new Error(
        `product_title_mirror: ${left} line(s) of ${title} still hold a stale product_title and this pass made no progress; the first refusal: ${first || 'none'}`,
      );
    }
    if (refused > 0) {
      throw new Error(`product_title_mirror: ${refused} line(s) of ${title} kept a stale product_title; the first refusal: ${first}`);
    }
  },
};

/**
 * An untitled line, read, starts its product's re-stamp (#2168).
 *
 * Lines created before 5.1.0 hold no `product_title`, so they are named by
 * their record id until something writes them. Self-hosted operators can run
 * `scripts/backfill-line-product-title.ts`. A hosted environment cannot: that
 * script signs in with a password, and the platform gives an installed package
 * no upgrade-time code path (package `migrations` are retired, `onEnable` does
 * not survive the JSON artifact, and seeds do not run where sample data is
 * off). So the trigger is the first read that shows such a line. For each
 * product behind an untitled row, this re-sends the product's own `name`,
 * the same write the script makes, and `product_title_mirror` titles every
 * line of that product, pass after pass.
 *
 * It does not fix the response that triggered it. A hosted hook body hands
 * only `input` back to the engine, never `result`, so the first view after an
 * upgrade still shows the id and the next one shows the name.
 *
 * It acts only on a row that carries BOTH `crm_product` and an empty
 * `product_title`, the shape of a record page, a list or an API read. None of
 * the app's own reads of a line projects both: the mirror reads `id` and
 * `product_title`, the rollups read the figures, numbering reads
 * `line_number`. So the re-stamp's own reads never trigger another re-stamp.
 *
 * `async`, so it runs off the read's response path. While every line is
 * titled it makes no database call. A product whose title is empty is never
 * touched: the mirror would have nothing to stamp, and the read would write
 * the product again every time it ran. It touches at most five products per read
 * to stay inside the sandbox's wall-clock ceiling; the next read finds the
 * rest.
 */
const lineProductTitleBackfill: Hook = {
  name: 'line_item_product_title_backfill',
  object: ['crm_opportunity_line_item', 'crm_quote_line_item'],
  events: ['afterFind'],
  priority: 900,
  runAs: 'system',
  async: true,
  onError: 'log',
  description: "Re-send the product's name for every untitled line a read returns, so product_title_mirror titles them.",
  handler: async (ctx: HookContext) => {
    // Inside the handler, not at module scope: a lowered body has none.
    const PRODUCTS_PER_READ = 5;
    const api = ctx.api as HookApi | undefined;
    if (!api) return;
    const result = (ctx as { result?: unknown }).result;
    const rows: unknown[] = Array.isArray(result) ? result : result && typeof result === 'object' ? [result] : [];
    const products: string[] = [];
    for (const row of rows) {
      if (!row || typeof row !== 'object') continue;
      const r = row as Record<string, unknown>;
      if (!Object.prototype.hasOwnProperty.call(r, 'product_title') || !Object.prototype.hasOwnProperty.call(r, 'crm_product')) continue;
      if (typeof r.product_title === 'string' && r.product_title.trim() !== '') continue;
      const ref = r.crm_product;
      const productId = typeof ref === 'string'
        ? ref
        : ref && typeof ref === 'object' && typeof (ref as Record<string, unknown>).id === 'string' ? String((ref as Record<string, unknown>).id) : '';
      if (productId && !products.includes(productId)) products.push(productId);
      if (products.length >= PRODUCTS_PER_READ) break;
    }
    for (const id of products) {
      const product = await api.object('crm_product').findOne({ where: { id }, fields: ['id', 'name', 'display_title'] });
      // A product with no title gives the mirror nothing to stamp. Touching it
      // would write the product on every read and title nothing.
      if (!product || typeof product.name !== 'string') continue;
      if (typeof product.display_title !== 'string' || product.display_title.trim() === '') continue;
      await api.object('crm_product').update({ id, name: product.name }, { where: { id } });
    }
  },
};

export default [productHook, productTitleMirror, lineProductTitleBackfill];
