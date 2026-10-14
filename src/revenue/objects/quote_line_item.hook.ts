// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from '../../sales/objects/_hook-api';
import { createLineItemNumbering, createLineItemPriceFill } from './_line-item-price-fill';

/**
 * Quote total rollup.
 *
 * Keeps a quote's `subtotal` in sync with the sum of its line items. Fires
 * after a quote line item is inserted / updated / deleted (the console
 * surfaces these as the quote's "Line Items" related list).
 *
 * Why this exists: `quote_generation` seeds the quote totals from the source
 * opportunity's amount at create time, but nothing kept them in step once a
 * rep edited the line items — the quote total and its itemization could drift.
 *
 *   subtotal = Σ line (quantity × unit_price × (1 − line_discount/100))
 * is all this hook writes. `discount_amount` / `total_price` are derived from
 * it IN THE SAME WRITE by `quote_workflow` (`quote.hook.ts`), the header's one
 * formula — which is also what keeps them in step when a person edits the
 * quote's own discount, tax or shipping (#2083).
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

/** `line_number` assigner — see `_line-item-price-fill.ts` (#1828). */
const quoteLineItemNumbering: Hook = createLineItemNumbering(
  'crm_quote_line_item',
  'quote_line_item_line_number',
);

const quoteTotalRollup: Hook = {
  name: 'quote_total_rollup',
  object: 'crm_quote_line_item',
  events: ['afterInsert', 'afterUpdate', 'afterDelete'],
  priority: 300,
  async: true,
  onError: 'log',
  description: 'Recompute parent quote subtotal from its line items.',
  handler: async (ctx: HookContext) => {
    const api = ctx.api as HookApi | undefined;
    if (!api) return;
    const { input, previous } = ctx;
    const num = (v: unknown): number => (typeof v === 'number' ? v : 0);

    const quoteIds = new Set<string>();
    for (const v of [input?.crm_quote, previous?.crm_quote]) {
      if (typeof v === 'string' && v) quoteIds.add(v);
    }
    if (quoteIds.size === 0) return;

    for (const quoteId of quoteIds) {
      const quote = await api.object('crm_quote').findOne({
        where: { id: quoteId },
        fields: ['id', 'status'],
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
      for (const l of lines) subtotal += num(l.quantity) * num(l.unit_price) * (1 - num(l.discount) / 100);
      subtotal = Math.round(subtotal * 100) / 100;

      await api.object('crm_quote').update({ id: quoteId, subtotal }, { where: { id: quoteId } });
    }
  },
};

export default [quoteLineItemPriceFill, quoteLineItemNumbering, quoteTotalRollup];
