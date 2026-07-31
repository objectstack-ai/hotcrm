// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from './_hook-api';

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
