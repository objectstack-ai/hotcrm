// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from '../../sales/objects/_hook-api';

/**
 * Shared line-item price fill.
 *
 * On write, when a product is part of THIS change, it stamps the line's
 * `list_price`; on INSERT it also defaults the negotiated `unit_price` to the
 * list price when the rep left it blank (they can still override). On update
 * the negotiated `unit_price` is left alone, so a re-synced price never
 * clobbers a price someone actually negotiated.
 *
 * Where the list price comes from differs by object (REQ-0009 phase 2, #2318):
 *
 * - an OPPORTUNITY line takes the product's own `list_price`, as it always has
 *   (the card's recorded assumption: deals do not choose a price book);
 * - a QUOTE line takes the ACTIVE entry for its product in the quote's price
 *   book (`crm_quote.crm_price_book`). A quote with no book (one older than the
 *   field) prices from the organization's active standard book. A book with no
 *   active entry for the product refuses the line, naming the book and the
 *   product. Only with no book at all, neither the quote's nor a standard one,
 *   does a quote line fall back to the product's `list_price` (phase-1 seat
 *   note item 1: an organization the standard-book seed never reached).
 *
 * Only a write that names a product reprices, so a line already written keeps
 * its price when its book's entry is edited later: a line is a record of what
 * was quoted, as it is of the catalogue price today.
 *
 * Why it lives here rather than twice: `crm_opportunity_line_item` and
 * `crm_quote_line_item` carried near-verbatim copies of this handler that
 * differed only in comments — the shape that lets a fix land on one object and
 * silently skip the other. Only the price fill is shared; the two ROLLUP hooks
 * next door look alike but compute genuinely different totals, so they stay
 * separate.
 *
 * Sandbox note: L2 hook bodies run BODY-ONLY in the QuickJS sandbox, so a
 * handler cannot reach module scope at runtime. This factory is still safe
 * because the sharing happens at authoring time — `objectName`/`hookName` are
 * plain metadata on the returned Hook, and the handler body below closes over
 * NOTHING but its own `ctx`. Never move a value the body reads into this
 * factory's parameters; it would resolve here and be undefined in the sandbox.
 *
 * That rule is enforced, not just documented: `pnpm lint` (`os lint --strict`)
 * refuses a handler that does not lower as `hook-body/not-lowerable`, with the
 * build's own extraction pass (which rejects a body referencing anything out of
 * scope), and `test/script-bodies.test.ts` lowers this one, runs it inside real
 * writes and keeps a negative control that shows the extraction still bites.
 * Worth knowing why a gate has to: when extraction fails the build does not,
 * it silently keeps the handler in its bundled form and the hook stops being
 * deployable as pure metadata.
 */
export function createLineItemPriceFill(objectName: string, hookName: string): Hook {
  return {
    name: hookName,
    object: objectName,
    events: ['beforeInsert', 'beforeUpdate'],
    priority: 100,
    description: "Default list_price / unit_price: a quote line from its quote's price book, an opportunity line from the product.",
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
      const { event, input } = ctx;
      const api = ctx.api as HookApi | undefined;
      if (!api) return;
      // Only act when a product reference is part of THIS write.
      const productId = typeof input.crm_product === 'string' ? input.crm_product : undefined;
      if (!productId) return;
      const product = await api.object('crm_product').findOne({
        where: { id: productId }, fields: ['id', 'name', 'list_price'],
      });
      let listPrice = product && typeof product.list_price === 'number' ? product.list_price : undefined;

      // A quote line: the price book decides (REQ-0009 phase 2; header note).
      if (ctx.object === 'crm_quote_line_item') {
        const quoteId = refId(input.crm_quote) || refId(ctx.previous?.crm_quote);
        const quote = quoteId
          ? await api.object('crm_quote').findOne({ where: { id: quoteId }, fields: ['id', 'crm_price_book', 'organization_id'] })
          : null;
        let bookId = refId(quote?.crm_price_book);
        if (!bookId) {
          // The organization's standard book, scoped as `price_book_standard`
          // scopes its read (`price_book.hook.ts`): a system write whose
          // organization cannot be resolved reads none, and falls back.
          const organizationId = [
            ctx.user?.organizationId,
            ctx.session?.organizationId,
            quote?.organization_id,
            input.organization_id,
          ].find((candidate): candidate is string => typeof candidate === 'string' && candidate !== '');
          if (organizationId || ctx.user?.id) {
            const where: Record<string, unknown> = organizationId
              ? { organization_id: organizationId, is_standard: true, is_active: true }
              : { is_standard: true, is_active: true };
            const [standard] = await api.object('crm_price_book').find({ where, fields: ['id'], top: 1 });
            bookId = refId(standard?.id);
          }
        }
        if (bookId) {
          const [entry] = await api.object('crm_price_book_entry').find({
            where: { crm_price_book: bookId, crm_product: productId, is_active: true }, fields: ['id', 'list_price'], top: 1,
          });
          if (!entry || typeof entry.list_price !== 'number') {
            const book = await api.object('crm_price_book').findOne({ where: { id: bookId }, fields: ['id', 'name'] });
            const bookName = typeof book?.name === 'string' && book.name.trim() !== '' ? book.name.trim() : 'The price book';
            // The product as its record title names it: the name alone (#2369 row 10).
            const productName = typeof product?.name === 'string' && product.name.trim() !== '' ? product.name.trim() : 'this product';
            throw refuse(
              `${bookName} has no active price for ${productName}. Add the product to ${bookName}, or choose another price book on the quote.`,
              'VALIDATION_FAILED',
              400,
            );
          }
          listPrice = entry.list_price;
        }
      }
      if (listPrice === undefined) return;
      // The list price always tracks the product picked in this write.
      input.list_price = listPrice;
      // Negotiated price defaults to list on create when left blank; never
      // overwritten on update (respect a rep's negotiated figure).
      if (event === 'beforeInsert' && input.unit_price == null) {
        input.unit_price = listPrice;
      }
    },
  };
}

/**
 * Shared line-number assigner (#1828) — `line_number` is `readonly`, so this is
 * its one writer. Insert: `max under the parent + 1`. Update of a row that still
 * has none (created before this hook — `scripts/backfill-line-number.ts` touches
 * each once): same stamp. An existing ordinal is never renumbered. The engine
 * keeps a payload key a hook wrote through its readonly strip, so a user write
 * lands the stamp and a user-supplied value is overwritten; only a no-user
 * system write that supplies one (the seed, and its replay) keeps its own. `runAs: 'system'`
 * elevates the sibling read and nothing else. Body-only rule as above: the
 * parent key comes from `ctx.object`, never a factory parameter.
 */
export function createLineItemNumbering(objectName: string, hookName: string): Hook {
  return {
    name: hookName,
    object: objectName,
    events: ['beforeInsert', 'beforeUpdate'],
    priority: 110,
    runAs: 'system',
    description: 'Assign line_number = (max under the parent) + 1.',
    handler: async (ctx: HookContext) => {
      const { event, input } = ctx;
      const prev = ctx.previous;
      const api = ctx.api as HookApi | undefined;
      if (!api) return;
      if (!ctx.user?.id && typeof input.line_number === 'number') return;
      // D3: a predicate update has ONE payload for every row (forecast.hook.ts).
      if (event === 'beforeUpdate' && (ctx.dispatch?.mode === 'per-row' || typeof prev?.line_number === 'number')) return;
      const parentKey = ctx.object === 'crm_quote_line_item' ? 'crm_quote' : 'crm_opportunity';
      const parentId = input[parentKey] ?? prev?.[parentKey];
      if (typeof parentId !== 'string' || !parentId) return;
      const siblings = await api.object(ctx.object).find({
        where: { [parentKey]: parentId }, fields: ['line_number'], top: 5000,
      });
      let max = 0;
      for (const s of siblings) {
        if (typeof s.line_number === 'number' && s.line_number > max) max = s.line_number;
      }
      // A batch insert runs every row's beforeInsert before storing any row.
      const offset = event === 'beforeInsert' && ctx.dispatch?.mode === 'per-row' ? ctx.dispatch.index : 0;
      input.line_number = max + 1 + offset;
    },
  };
}

/**
 * Shared product-title writer (#2086). `product_title` is each line object's
 * `nameField`, and this hook writes it from the line side.
 *
 * It writes the product's `name`, the product's record title (#2369 row 10),
 * in three cases. A product is part of THIS write: an insert, or a re-point to another
 * product. Or an update reaches a row that has no title yet, which is what
 * heals a line older than the field. The rename half lives on `crm_product`
 * (`product_title_mirror`, `product.hook.ts`), so the governing table in
 * `skills/objectstack-data/SKILL.md` is covered on both sides.
 *
 * The title is read as a column, `fields: ['name']`, so the line carries
 * exactly what the product's own surfaces show. `ctx.title('crm_product')`
 * would follow the product's `nameField` pointer instead. The hook does not
 * use it, because the hook context under `@objectstack/verify` has no
 * `ctx.title` (objectstack-ai/objectstack#24289). Until that ships, a test pins
 * `crm_product.nameField` to `name`, so the two cannot drift apart.
 *
 * A no-user write that carries its own title keeps it. That is
 * `product_title_mirror` re-stamping after a rename. A user's value is never
 * kept: the field is `readonly`, so the engine drops it unless this hook wrote
 * it. A PREDICATE update hands every row one shared payload (the ADR-0058
 * Addendum II D3 note in `forecast.hook.ts`). So the fill, which reads
 * `ctx.previous`, stands down there. A product named in that payload is the
 * same for every row, so its title still lands.
 *
 * Priority 105 sits after the line freezes (90), so a caller's own payload is
 * what they judge. Body-only rule as above: the body closes over `ctx` alone.
 */
export function createLineItemProductTitle(objectName: string, hookName: string): Hook {
  return {
    name: hookName,
    object: objectName,
    events: ['beforeInsert', 'beforeUpdate'],
    priority: 105,
    description: "Copy the product's title onto the line; it is the line's nameField.",
    handler: async (ctx: HookContext) => {
      const { event, input } = ctx;
      const prev = ctx.previous;
      const api = ctx.api as HookApi | undefined;
      if (!api) return;
      if (!ctx.user?.id && typeof input.product_title === 'string' && input.product_title.trim() !== '') return;
      const untitled = typeof prev?.product_title !== 'string' || prev.product_title.trim() === '';
      let productId: string | undefined;
      if (typeof input.crm_product === 'string' && input.crm_product) {
        productId = input.crm_product;
      } else if (event === 'beforeUpdate' && ctx.dispatch?.mode !== 'per-row' && untitled
        && typeof prev?.crm_product === 'string' && prev.crm_product) {
        productId = prev.crm_product;
      }
      if (!productId) return;
      const product = await api.object('crm_product').findOne({
        where: { id: productId }, fields: ['id', 'name'],
      });
      const title = product && typeof product.name === 'string' ? product.name.trim() : '';
      if (title) input.product_title = title;
    },
  };
}
