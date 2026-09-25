// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from '../../sales/objects/_hook-api';

/**
 * Shared line-item price fill.
 *
 * `list_price` on both line-item objects is documented as "auto-populated from
 * product.list_price", and nothing implemented it until this hook. On write,
 * when a product is part of THIS change, it stamps the catalog `list_price`;
 * on INSERT it also defaults the negotiated `unit_price` to the list price when
 * the rep left it blank (they can still override). On update the negotiated
 * `unit_price` is left alone, so a re-synced catalog price never clobbers a
 * price someone actually negotiated.
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
 * That rule is enforced, not just documented: `test/action-sandbox.test.ts`
 * lowers this handler with the CLI build's own extraction pass (which rejects a
 * body referencing anything out of scope) and runs the result under the real
 * QuickJS runner, with a negative control that shows the guard still bites.
 * Worth knowing why a test has to: when extraction fails the build does not,
 * it silently keeps the handler in its bundled form and the hook stops being
 * deployable as pure metadata.
 */
export function createLineItemPriceFill(objectName: string, hookName: string): Hook {
  return {
    name: hookName,
    object: objectName,
    events: ['beforeInsert', 'beforeUpdate'],
    priority: 100,
    description: 'Default list_price / unit_price from the chosen product.',
    handler: async (ctx: HookContext) => {
      const { event, input } = ctx;
      const api = ctx.api as HookApi | undefined;
      if (!api) return;
      // Only act when a product reference is part of THIS write.
      const productId = typeof input.crm_product === 'string' ? input.crm_product : undefined;
      if (!productId) return;
      const product = await api.object('crm_product').findOne({
        where: { id: productId }, fields: ['id', 'list_price'],
      });
      const listPrice = product && typeof product.list_price === 'number' ? product.list_price : undefined;
      if (listPrice === undefined) return;
      // Catalog reference always tracks the product.
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
