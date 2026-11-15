// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from '../../sales/objects/_hook-api';
import { createLineItemNumbering, createLineItemPriceFill, createLineItemProductTitle } from './_line-item-price-fill';

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
 * - handles re-parenting (old + new quote).
 *
 * ## It rides the line's write, and takes a second look at the quote (#2503)
 *
 * It was `async: true` + `onError: 'log'`, "a derived convenience, never
 * blocks the line write", and it skipped an accepted or expired quote. Measured
 * on 18.5.0 before this branch (`objectstack dev`, REST, a rep on a Presented
 * quote at 19,000): five line inserts and the accept sent in the same tick
 * answered 201, 409 ×4 and 200 in two runs of four. The one line got past
 * `quote_workflow`'s line freeze while the quote still read Presented, the
 * accept landed before this hook ran, and the hook then read Accepted and
 * skipped it through its own guard. The quote settled at 19,000 with lines
 * summing to 20,000, its contract was drafted at 19,000, and nothing was
 * logged. No lock and no error were involved, so making it blocking alone
 * would not have helped: the skip was the hole.
 *
 * Now the hook is blocking with `onError: 'abort'`, the #2493 precedent for
 * `opportunity_amount_rollup`. On 18.5.0 an abort in a blocking after* hook
 * rolls back the row and every `ctx.api` write the chain made, inside the
 * write door's unit of work (default datasource, transactional driver). And it
 * looks at the quote again AFTER the row is in: when a person's line write
 * finds its quote settled (Accepted, Rejected or Expired), it refuses with the
 * line freeze's own sentence, so the line is rolled back and the settled totals
 * keep equalling the lines. The freeze in `quote_workflow` stays the one place
 * that decides what a settled quote's lines may do; this is the same refusal
 * read at the later moment, which is the moment the race was lost. Its words
 * are held to the freeze's by `test/quote-line-rollup-race.test.ts`.
 *
 * Boundaries, recorded:
 * - A system write (a seed, an import, a backfill) carries no user, as the
 *   freeze's boundary does, and is still left alone on an Accepted or Expired
 *   quote: the seeds put lines on accepted quotes.
 * - An update is judged by what it changes, with the freeze's own key list, so
 *   the `line_number` back-fill and a `product_title` rename still pass.
 * - A cascade child delete (`ctx.referentialCascadeDelete`) is skipped: the
 *   quote it would recompute is the row being deleted.
 * - The write is the caller's, not system context: `ctx.api` carries the person,
 *   so `quote_workflow` judges the subtotal write too. That second check reads
 *   the quote's prior row inside the rollup's own update.
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

/** `product_title` writer, the line's `nameField`; see `_line-item-price-fill.ts` (#2086). */
const quoteLineItemProductTitle: Hook = createLineItemProductTitle(
  'crm_quote_line_item',
  'quote_line_item_product_title',
);

const quoteTotalRollup: Hook = {
  name: 'quote_total_rollup',
  object: 'crm_quote_line_item',
  events: ['afterInsert', 'afterUpdate', 'afterDelete'],
  priority: 300,
  // Blocking, and `abort` (the default) on purpose (#2503): see the header.
  onError: 'abort',
  description: 'Recompute the parent quote subtotal from its line items, in the line write; refuse a person\'s line on a quote settled meanwhile.',
  // The line freeze's sentences, as `quote_workflow` declares them.
  refusals: {
    RECORD_LOCKED: {
      message: 'Quote {{quote}} is Accepted, so its line items can no longer be added, changed or removed.',
      status: 409,
      params: ['quote'],
      reasons: {
        rejected: { message: 'Quote {{quote}} is Rejected, so its line items can no longer be added, changed or removed. Revise it back to Draft to change them.' },
        expired: { message: 'Quote {{quote}} is Expired, so its line items can no longer be added, changed or removed.' },
      },
    },
  },
  handler: async (ctx: HookContext) => {
    // The refusal envelope. ⚠️ Mirrored from `src/sales/objects/_refusal.ts` because a lowered
    // body has no module scope and `extractHookBody` THROWS on an import;
    // `test/refusal-envelope.test.ts` pins every copy against it.
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
    // The settled statuses by the labels the user sees, as `quote_workflow`'s
    // line freeze writes them; `test/refusal-labels.test.ts` reads both copies
    // off `crm_quote`.
    const STATUS_LABELS: Record<string, string> = { accepted: 'Accepted', rejected: 'Rejected', expired: 'Expired' };
    const api = ctx.api as HookApi | undefined;
    if (!api) return;
    // The quote is going too: nothing to recompute (#2493's skip).
    if (ctx.referentialCascadeDelete === true) return;
    const { event, input, previous } = ctx;
    const num = (v: unknown): number => (typeof v === 'number' ? v : 0);
    // What the line freeze calls a change: an update by the keys it changes,
    // less the row address, the engine's stamps and the two hook-written names.
    const changed = event !== 'afterUpdate'
      || Object.keys(input ?? {}).some((k) => !['id', 'updated_at', 'updated_by', 'line_number', 'product_title'].includes(k) && input[k] !== previous?.[k]);

    const quoteIds = new Set<string>();
    for (const v of [input?.crm_quote, previous?.crm_quote]) {
      if (typeof v === 'string' && v) quoteIds.add(v);
    }
    if (quoteIds.size === 0) return;

    for (const quoteId of quoteIds) {
      const quote = await api.object('crm_quote').findOne({
        where: { id: quoteId },
        fields: ['id', 'name', 'status'],
      });
      if (!quote) continue;
      const status = typeof quote.status === 'string' ? quote.status : undefined;
      if (status === 'accepted' || status === 'rejected' || status === 'expired') {
        // A person's line on a quote that settled after the freeze let it in
        // (#2503): the freeze's sentence, read now. The abort rolls the line back.
        if (ctx.user?.id && changed) {
          const what = `Quote ${String(quote.name)} is`;
          const rest = 'so its line items can no longer be added, changed or removed.';
          const revise = status === 'rejected' ? ' Revise it back to Draft to change them.' : '';
          throw Object.assign(refuse(
            `${what} ${status}, ${rest}${revise}`,
            'RECORD_LOCKED',
            409,
            `${what} ${STATUS_LABELS[status]}, ${rest}${revise}`,
          ), { reason: status === 'accepted' ? undefined : status, params: { quote: String(quote.name) } });
        }
        // A system write leaves settled totals alone; a Rejected quote is
        // revised back to Draft, so its subtotal still follows its lines.
        if (status !== 'rejected') continue;
      }

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

export default [quoteLineItemPriceFill, quoteLineItemNumbering, quoteLineItemProductTitle, quoteTotalRollup];
