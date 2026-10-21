// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from '../../sales/objects/_hook-api';
import { createLineItemNumbering, createLineItemPriceFill, createLineItemProductTitle } from './_line-item-price-fill';

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
 *   re-trigger this hook (different object), so there's no loop. The one
 *   refusal the app can foresee, an approval lock on the deal, is not left to
 *   this log: `opportunity_line_item_freeze` refuses a user's line write on a
 *   deal an approval locks, before anything is stored (#2191).
 * - On re-parenting (update that moves a line to another opportunity), BOTH the
 *   old and new parents are recomputed.
 */
/**
 * Line-item price fill — one implementation shared with the quote line item;
 * see `_line-item-price-fill.ts` for the behaviour and the sandbox caveat.
 */
const opportunityLineItemPriceFill: Hook = createLineItemPriceFill(
  'crm_opportunity_line_item',
  'opportunity_line_item_price_fill',
);

/** `line_number` assigner — see `_line-item-price-fill.ts` (#1828). */
const opportunityLineItemNumbering: Hook = createLineItemNumbering(
  'crm_opportunity_line_item',
  'opportunity_line_item_line_number',
);

/** `product_title` writer, the line's `nameField`; see `_line-item-price-fill.ts` (#2086). */
const opportunityLineItemProductTitle: Hook = createLineItemProductTitle(
  'crm_opportunity_line_item',
  'opportunity_line_item_product_title',
);

/**
 * A closed deal's LINES are frozen with it (#2077, the deal-side twin of the
 * settled-quote line freeze in `quote_workflow`, #2060 item 1).
 *
 * Measured on 18.0.0-next.1 before this hook: a rep added a 3 × 500 line to
 * their own closed-won deal (admitted), `opportunity_amount_rollup` rightly
 * left the closed amount at 1,000, and the lines summed to 1,500. Changing a
 * closed-lost deal's line and moving an open deal's line onto a closed one were
 * admitted too.
 *
 * ⚠️ Not in `opportunity_lifecycle`, though that is the deal's own freeze: a
 * hook may not attach to another package's object (ADR-0130 R4), and this
 * object is `src/revenue`'s. The freeze is the same one, drawn the same way:
 * "closed" is the lifecycle's own test (`closed_won` / `closed_lost`), the
 * envelope is its `RECORD_LOCKED` / 409, and only USER writes are judged (a
 * write with no `ctx.user` — the seed, a migration — passes). An update is
 * judged by what it CHANGES, as the quote line freeze judges it, so the 4.0.0
 * line-number back-fill's `{ line_number: null }` touch still lands. Both
 * parents are judged, so a line moves neither onto a closed deal nor off one.
 * Priority 90 runs it ahead of the price fill and the numbering, so the
 * caller's own payload is what is judged, not the keys those two inject.
 *
 * A user's DELETE of a closed deal's line is refused too (#2088, ruling C of
 * #2078), and only a hand delete: deleting the deal cascades to its lines as
 * the deleting user, and that cascade is let through, so a closed deal stays
 * deletable (#720). Measured on 18.0.0-next.3 before this leg: a rep's REST
 * `DELETE` of a closed-won deal's line answered 200 and the line was gone.
 *
 * A deal an approval LOCKS holds its lines the same way while the approval is
 * in progress (#2191), on the same boundary and with the same envelope. The
 * lock is the platform's (`lockRecord: true` on the approval node): it refuses
 * every non-system write of the deal, and `opportunity_amount_rollup` writes the
 * deal AS the line's writer, so the rollup of any user line write is refused.
 * The rollup is `onError: 'log'`, so before this leg the line was stored and the
 * deal kept its old amount (OPP-007 broken). Measured on 18.0.0 before it: a
 * rep's second line on their deal under its Large Deal Approval answered 201,
 * the deal stayed at 100,000 while its lines summed to 107,000, and the log read
 * `opportunity_amount_rollup … RECORD_LOCKED (onError=log; suppressing)`; a
 * description-only edit was stored and its rollup refused the same way. So the
 * line write is refused up front instead, and nothing is stored.
 *
 * "Locked" is read off the lock's own mirrors (`approvalStatusField`), as the
 * quote acceptance gate reads them (#2014), for exactly the two approvals on
 * this deal whose node locks it. `approval_status` `pending` is the Large Deal
 * Approval's open request. `status_change_approval_status` `pending` also means
 * an armed gate that has no request yet, which locks nothing, so that hold
 * needs a request: a `requested_status`. A qualification (立项) approval does not
 * lock (`lockRecord: false`), and a decided approval holds nothing. Each of
 * those states is measured in `test/opportunity-line-approval-lock.test.ts`.
 */
const opportunityLineItemFreeze: Hook = {
  name: 'opportunity_line_item_freeze',
  object: 'crm_opportunity_line_item',
  events: ['beforeInsert', 'beforeUpdate', 'beforeDelete'],
  priority: 90,
  description: 'Refuse a user adding, changing, moving or removing a line item of a closed opportunity, or of one an approval locks.',
  handler: async (ctx: HookContext) => {
    // The refusal envelope (#1075). Mirrored from `src/sales/objects/_refusal.ts`
    // because a lowered body has no module scope and `extractHookBody` THROWS on
    // an import; `test/refusal-envelope.test.ts` pins every copy against it.
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
    // `product_title` (#2086) is a name, not a figure, and hooks are its only
    // writers: the engine holds a caller's readonly value back from this hook.
    // A delete removes the line, so it is a change, unless the engine's own
    // cascade issued it (the deal being deleted): the cascade runs as the
    // deleting user, and the platform's declared marker is the one thing that
    // tells it from a hand delete (objectstack#23221). ⛔ Read nothing else to
    // tell them apart (#1165). The deal is the pre-image's `crm_opportunity`.
    const changed = event === 'beforeDelete'
      ? ctx.referentialCascadeDelete !== true
      : Object.keys(input).some((k) => !['id', 'updated_at', 'updated_by', 'line_number', 'product_title'].includes(k) && input[k] !== previous?.[k]);
    if (!changed || !ctx.user?.id) return;
    for (const id of new Set([input.crm_opportunity, previous?.crm_opportunity])) {
      const deal = typeof id === 'string' && id
        ? await (ctx.api as HookApi | undefined)?.object('crm_opportunity').findOne({
          where: { id },
          fields: ['name', 'stage', 'approval_status', 'status_change_approval_status', 'requested_status'],
        })
        : null;
      // `crm_opportunity.nameField` is `name` — never the record id (#1243).
      const name = typeof deal?.name === 'string' ? deal.name.trim() : '';
      const subject = name ? `Opportunity ${name}` : 'Opportunity';
      if (deal?.stage === 'closed_won' || deal?.stage === 'closed_lost') {
        throw refuse(`${subject} is closed (${deal.stage}), so its line items can no longer be added, changed or removed.`, 'RECORD_LOCKED', 409);
      }
      const locked = deal?.approval_status === 'pending'
        || (deal?.status_change_approval_status === 'pending' && typeof deal.requested_status === 'string' && deal.requested_status !== '');
      if (locked) {
        throw refuse(`${subject} is locked while an approval is in progress, so its line items cannot be added, changed or removed until that approval is complete.`, 'RECORD_LOCKED', 409);
      }
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
    const { input, previous } = ctx;
    const num = (v: unknown): number => (typeof v === 'number' ? v : 0);

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
        where: { id: oppId }, fields: ['id', 'stage'],
      });
      const stage = opp && typeof opp.stage === 'string' ? opp.stage : undefined;
      if (stage === 'closed_won' || stage === 'closed_lost') continue;

      const lines = await api.object('crm_opportunity_line_item').find({
        where: { crm_opportunity: oppId },
        fields: ['quantity', 'unit_price', 'discount'],
        top: 5000,
      });
      // No lines left → leave the existing amount as-is (see design note).
      if (!lines || lines.length === 0) continue;

      let sum = 0;
      for (const l of lines) sum += num(l.quantity) * num(l.unit_price) * (1 - num(l.discount) / 100);
      sum = Math.round(sum * 100) / 100;
      if (sum > 0) {
        await api.object('crm_opportunity').update(
          { id: oppId, amount: sum },
          { where: { id: oppId } },
        );
      }
    }
  },
};

export default [opportunityLineItemPriceFill, opportunityLineItemNumbering, opportunityLineItemProductTitle, opportunityAmountRollup, opportunityLineItemFreeze];
