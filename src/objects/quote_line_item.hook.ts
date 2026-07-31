// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from './_hook-api';
import { createLineItemPriceFill } from './_line-item-price-fill';

/**
 * Quote total rollup.
 *
 * Keeps a quote's pricing (`subtotal` / `discount_amount` / `total_price`) in
 * sync with the sum of its line items. Fires after a quote line item is
 * inserted / updated / deleted (the console surfaces these as the quote's
 * "Line Items" related list).
 *
 * Why this exists: `quote_generation` seeds the quote totals from the source
 * opportunity's amount at create time, but nothing kept them in step once a
 * rep edited the line items — the quote total and its itemization could drift.
 *
 * Total model (mirrors the quote_generation flow):
 *   subtotal        = Σ line (quantity × unit_price × (1 − line_discount/100))
 *   discount_amount = subtotal × quote.discount%              (quote-level)
 *   total_price     = subtotal − discount_amount + tax + shipping_handling
 * Quote-level `tax` and `shipping_handling` stay manual; only the line-derived
 * figures are rolled up.
 *
 * Design decisions mirror opportunity_line_item.hook:
 * - recompute from raw `quantity/unit_price/discount` (not the `subtotal`
 *   FORMULA field) so it doesn't depend on formula hydration in the sandbox;
 * - leave totals untouched when there are NO lines (never zero a quote whose
 *   totals came from the opportunity);
 * - skip accepted / expired quotes — the rollup runs system-context and would
 *   otherwise bypass the quote freeze guard and rewrite a settled quote;
 * - async + onError:'log' — a derived convenience, never blocks the line write;
 * - handles re-parenting (old + new quote).
 */
/**
 * Line-item price fill — one implementation shared with the opportunity line
 * item; see `_line-item-price-fill.ts` for the behaviour and the sandbox caveat.
 */
const quoteLineItemPriceFill: Hook = createLineItemPriceFill(
  'crm_quote_line_item',
  'quote_line_item_price_fill',
);

const quoteTotalRollup: Hook = {
  name: 'quote_total_rollup',
  object: 'crm_quote_line_item',
  events: ['afterInsert', 'afterUpdate', 'afterDelete'],
  priority: 300,
  async: true,
  onError: 'log',
  description: 'Recompute parent quote subtotal/discount/total from its line items.',
  handler: async (ctx: HookContext) => {
    const api = ctx.api as HookApi | undefined;
    if (!api) return;
    const { input } = ctx;
    const previous = ctx.previous;

    const quoteIds = new Set<string>();
    for (const v of [input?.crm_quote, previous?.crm_quote]) {
      if (typeof v === 'string' && v) quoteIds.add(v);
    }
    if (quoteIds.size === 0) return;

    for (const quoteId of quoteIds) {
      const quote = await api.object('crm_quote').findOne({
        where: { id: quoteId },
        fields: ['id', 'status', 'discount', 'tax', 'shipping_handling'],
      });
      if (!quote) continue;
      const status = typeof quote.status === 'string' ? quote.status : undefined;
      if (status === 'accepted' || status === 'expired') continue;

      const lines = await api.object('crm_quote_line_item').find({
        where: { crm_quote: quoteId },
        fields: ['quantity', 'unit_price', 'discount'],
        top: 5000,
      });
      // No lines left → leave the flow-seeded totals as-is (see design note).
      if (!lines || lines.length === 0) continue;

      let subtotal = 0;
      for (const l of lines) {
        const qty = typeof l.quantity === 'number' ? l.quantity : 0;
        const price = typeof l.unit_price === 'number' ? l.unit_price : 0;
        const disc = typeof l.discount === 'number' ? l.discount : 0;
        subtotal += qty * price * (1 - disc / 100);
      }
      subtotal = Math.round(subtotal * 100) / 100;

      const quoteDiscountPct = typeof quote.discount === 'number' ? quote.discount : 0;
      const tax = typeof quote.tax === 'number' ? quote.tax : 0;
      const shipping = typeof quote.shipping_handling === 'number' ? quote.shipping_handling : 0;
      const discountAmount = Math.round(subtotal * (quoteDiscountPct / 100) * 100) / 100;
      const total = Math.round((subtotal - discountAmount + tax + shipping) * 100) / 100;

      await api.object('crm_quote').update(quoteId, {
        subtotal,
        discount_amount: discountAmount,
        total_price: total,
      });
    }
  },
};

export default [quoteLineItemPriceFill, quoteTotalRollup];
