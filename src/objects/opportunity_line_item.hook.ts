// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from './_hook-api';

/**
 * Opportunity amount rollup.
 *
 * Keeps `crm_opportunity.amount` in sync with the sum of its line items'
 * extended price. Fires after a line item is inserted / updated / deleted (the
 * console surfaces these as the opportunity's "Products" related list) and
 * recomputes the parent opportunity's amount from the current line set.
 *
 * Why this exists: `amount` was a free-typed currency field with no link to
 * `crm_opportunity_line_item`, so itemising a deal and its headline number
 * could drift apart. Once a deal is itemised, the line sum is authoritative.
 *
 * Design decisions:
 * - Recomputes from raw `quantity * unit_price * (1 - discount/100)` rather than
 *   reading the `total_price` FORMULA field, so it doesn't depend on formula
 *   hydration inside the sandboxed hook body.
 * - If the opportunity has NO line items (e.g. the last one was just deleted),
 *   `amount` is left untouched — zeroing it would trip the `amount > 0`
 *   validation and wipe the manually-entered figure on opportunities that never
 *   used line items at all.
 * - `async: true` + `onError: 'log'` — the rollup is a derived convenience; a
 *   failure must never block the line-item write. Updating the parent does not
 *   re-trigger this hook (different object), so there's no loop.
 * - On re-parenting (update that moves a line to another opportunity), BOTH the
 *   old and new parents are recomputed.
 */
/**
 * Line-item price fill.
 *
 * `list_price` was documented as "Auto-populated from product.list_price" but
 * nothing implemented it. On write, when a product is chosen this stamps the
 * catalog `list_price`, and on INSERT defaults the negotiated `unit_price` to
 * the list price when the rep left it blank (they can still override). On update
 * the negotiated `unit_price` is left alone so a re-synced catalog price never
 * clobbers a negotiated one.
 */
const opportunityLineItemPriceFill: Hook = {
  name: 'opportunity_line_item_price_fill',
  object: 'crm_opportunity_line_item',
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
      filter: { id: productId }, fields: ['id', 'list_price'],
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

const opportunityAmountRollup: Hook = {
  name: 'opportunity_amount_rollup',
  object: 'crm_opportunity_line_item',
  events: ['afterInsert', 'afterUpdate', 'afterDelete'],
  priority: 300,
  async: true,
  onError: 'log',
  description: 'Recompute parent opportunity.amount from the sum of its line items.',
  handler: async (ctx: HookContext) => {
    const api = ctx.api as HookApi | undefined;
    if (!api) return;
    const { input } = ctx;
    const previous = ctx.previous;

    // Every parent opportunity touched by this change (old + new handles the
    // re-parenting case on update).
    const oppIds = new Set<string>();
    for (const v of [input?.crm_opportunity, previous?.crm_opportunity]) {
      if (typeof v === 'string' && v) oppIds.add(v);
    }
    if (oppIds.size === 0) return;

    for (const oppId of oppIds) {
      // Skip closed deals. The rollup runs in a system context (no ctx.user),
      // which BYPASSES the opportunity freeze guard — so without this check,
      // editing a line item would silently rewrite a closed-won deal's recorded
      // amount. A closed deal's value is settled; leave it.
      const opp = await api.object('crm_opportunity').findOne({
        filter: { id: oppId }, fields: ['id', 'stage'],
      });
      const stage = opp && typeof opp.stage === 'string' ? opp.stage : undefined;
      if (stage === 'closed_won' || stage === 'closed_lost') continue;

      const lines = await api.object('crm_opportunity_line_item').find({
        filter: { crm_opportunity: oppId },
        fields: ['quantity', 'unit_price', 'discount'],
        top: 5000,
      });
      // No lines left → leave the existing amount as-is (see design note).
      if (!lines || lines.length === 0) continue;

      let sum = 0;
      for (const l of lines) {
        const qty = typeof l.quantity === 'number' ? l.quantity : 0;
        const price = typeof l.unit_price === 'number' ? l.unit_price : 0;
        const disc = typeof l.discount === 'number' ? l.discount : 0;
        sum += qty * price * (1 - disc / 100);
      }
      sum = Math.round(sum * 100) / 100;
      if (sum > 0) {
        await api.object('crm_opportunity').update(oppId, { amount: sum });
      }
    }
  },
};

export default [opportunityLineItemPriceFill, opportunityAmountRollup];
