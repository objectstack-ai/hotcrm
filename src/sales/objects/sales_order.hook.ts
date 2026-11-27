// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from './_hook-api';

/**
 * Sales order hooks (REQ-0010, hotcrm#2555): the order and its lines.
 *
 * - `sales_order_workflow` — the lines of an order past Draft cannot change,
 *   nor can its header amount (Subtotal, Discount %, Tax, Shipping; #2826):
 *   Confirmed goes back to Draft first, Completed and Cancelled are final. On
 *   an order with lines a person's Subtotal must be the lines' sum. The
 *   header's `discount_amount` / `total_price` follow their inputs, the quote
 *   header's one formula (`quote_workflow`, #2083).
 * - `sales_order_line_fill` — a line that names a product takes its name and
 *   list price, and a blank Sales Price defaults to it on create. A line with
 *   no product must say what it sells and what it costs.
 * - `sales_order_line_number` — `line_number`, as on the quote line (#1828).
 * - `sales_order_total_rollup` — the order's `subtotal` is the sum of its
 *   lines, written inside the line's write, and the lock is read again after
 *   the row is in (the quote's #2503 race).
 *
 * The shapes are the quote's (`src/revenue/objects/quote.hook.ts`,
 * `quote_line_item.hook.ts`, `_line-item-price-fill.ts`), restated here
 * because an app-package file may not import from a module directory
 * (AGENTS.md *Project Architecture* rule 2), and a lowered body has no module
 * scope anyway: every helper a handler uses is declared inside it.
 */

const salesOrderWorkflow: Hook = {
  name: 'sales_order_workflow',
  // One lock, the order's and its lines', in one place (the `quote_workflow`
  // shape, #2060). `test/package-ownership.test.ts` reads every name.
  object: ['crm_sales_order', 'crm_sales_order_line'],
  events: ['beforeInsert', 'beforeUpdate', 'beforeDelete'],
  // Before the line fill (100, 105, 110), so the caller's own payload is what
  // the lock judges.
  priority: 90,
  description: "Lock an order's lines and header amount once it leaves Draft; derive the header totals.",
  refusals: {
    RECORD_LOCKED: {
      message: 'Order {{order}} is Confirmed, so its lines can no longer be added, changed or removed. Move it back to Draft to change them.',
      status: 409,
      params: ['order'],
      reasons: {
        completed: { message: 'Order {{order}} is Completed, so its lines can no longer be added, changed or removed.' },
        cancelled: { message: 'Order {{order}} is Cancelled, so its lines can no longer be added, changed or removed.' },
        // The header amount (#2826): Subtotal, Discount %, Tax, Shipping.
        amount_confirmed: { message: 'Order {{order}} is Confirmed, so its amount can no longer be changed. Send it back to Draft first.' },
        amount_completed: { message: 'Order {{order}} is Completed, so its amount can no longer be changed.' },
        amount_cancelled: { message: 'Order {{order}} is Cancelled, so its amount can no longer be changed.' },
      },
    },
    VALIDATION_FAILED: {
      message: "Order {{order}} has lines, so its Subtotal is the sum of its lines and cannot be typed. Change the lines instead.",
      status: 400,
      params: ['order'],
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
    // The locked statuses by the labels the user sees (`crm_sales_order.status`).
    const STATUS_LABELS: Record<string, string> = { confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled' };
    const { event, input, previous } = ctx;

    // ─── The lines of an order past Draft are locked ────────────────────
    //
    // USER writes only: a seed or an import carries no user and is let
    // through, as the quote's freeze is. An update is judged by what it
    // CHANGES, less the row address, the engine's stamps and the read-only
    // ordinal. A hand delete of one line is refused too; the engine's cascade
    // delete (the order or its account going) carries
    // `referentialCascadeDelete` and is let through. Both orders are judged,
    // so a line moves neither onto a locked order nor off one.
    if (ctx.object === 'crm_sales_order_line') {
      const changed = event === 'beforeDelete'
        ? ctx.referentialCascadeDelete !== true
        : Object.keys(input).some((k) => !['id', 'updated_at', 'updated_by', 'line_number'].includes(k) && input[k] !== previous?.[k]);
      for (const id of new Set([input.crm_sales_order, previous?.crm_sales_order])) {
        const order = changed && ctx.user?.id && typeof id === 'string' && id
          ? await (ctx.api as HookApi | undefined)?.object('crm_sales_order').findOne({ where: { id }, fields: ['name', 'status'] })
          : null;
        const status = typeof order?.status === 'string' ? order.status : '';
        if (STATUS_LABELS[status]) {
          const what = `Order ${String(order?.name)} is`;
          const rest = 'so its lines can no longer be added, changed or removed.';
          const back = status === 'confirmed' ? ' Move it back to Draft to change them.' : '';
          throw Object.assign(refuse(
            `${what} ${status}, ${rest}${back}`,
            'RECORD_LOCKED',
            409,
            `${what} ${STATUS_LABELS[status]}, ${rest}${back}`,
          ), { reason: status === 'confirmed' ? undefined : status, params: { order: String(order?.name) } });
        }
      }
      return;
    }

    if (event === 'beforeDelete') return;

    // ─── The header amount of an order past Draft is locked (#2826) ─────
    //
    // The order is the one source of its amount (#2803): the order contract,
    // the payment plan and the framework quota all read its Total Price, so
    // once it is Confirmed its inputs lock together with its lines. The same
    // exemption as the line lock: USER writes only, so a seed, an import and
    // `sales_order_total_rollup` under a system write pass. An update is
    // judged by what it CHANGES against the stored row, so a form that sends
    // the unchanged figures back passes, and by the status the order WAS in:
    // a write that moves a Confirmed order back to Draft and changes its
    // amount in one go is refused, the amount changes in the next write.
    //
    // ⚠️ A hook, not `readonlyWhen`: on 18.6.0 a TRUE `readonlyWhen` strips
    // every caller's write, `isSystem` included, and strips it in silence,
    // so the seed's lines on confirmed orders could no longer roll up.
    if (event === 'beforeUpdate' && previous && ctx.user?.id) {
      const same = (a: unknown, b: unknown): boolean => (a == null && b == null) || a === b;
      const edited = ['subtotal', 'discount', 'tax', 'shipping_handling'].filter((k) => k in input && !same(input[k], previous[k]));
      const was = typeof previous.status === 'string' ? previous.status : '';
      const name = String(previous.name ?? input.name ?? '');
      if (edited.length > 0 && STATUS_LABELS[was]) {
        const what = `Order ${name} is`;
        const rest = 'so its amount can no longer be changed.';
        const back = was === 'confirmed' ? ' Send it back to Draft first.' : '';
        const REASONS: Record<string, string> = { confirmed: 'amount_confirmed', completed: 'amount_completed', cancelled: 'amount_cancelled' };
        throw Object.assign(refuse(
          `${what} ${was}, ${rest}${back}`,
          'RECORD_LOCKED',
          409,
          `${what} ${STATUS_LABELS[was]}, ${rest}${back}`,
        ), { reason: REASONS[was], params: { order: name } });
      }

      // On an order with lines, Subtotal IS the lines' sum: a person's
      // Subtotal that differs from it is refused (not overridden, so the
      // person is told why the number they typed did not stick). The
      // rollup's own write carries the sum and passes; an order with no
      // lines keeps the Subtotal typed on it. The sum is the rollup's.
      const orderId = previous.id ?? input.id;
      if (edited.includes('subtotal') && typeof orderId === 'string' && orderId) {
        const api = ctx.api as HookApi | undefined;
        const lines = api
          ? await api.object('crm_sales_order_line').find({
            where: { crm_sales_order: orderId }, fields: ['quantity', 'unit_price', 'discount'], top: 5000,
          })
          : [];
        if ((lines ?? []).length > 0) {
          const num = (v: unknown): number => (typeof v === 'number' ? v : 0);
          let sum = 0;
          for (const l of lines ?? []) sum += num(l.quantity) * num(l.unit_price) * (1 - num(l.discount) / 100);
          sum = Math.round(sum * 100) / 100;
          if (typeof input.subtotal !== 'number' || Math.abs(input.subtotal - sum) >= 0.005) {
            throw Object.assign(refuse(
              `Order ${name} has lines, so its Subtotal is the sum of its lines and cannot be typed. Change the lines instead.`,
              'VALIDATION_FAILED',
              400,
            ), { params: { order: name } });
          }
        }
      }
    }

    // ─── The header totals follow their inputs ──────────────────────────
    //
    //   discount_amount = subtotal × discount%
    //   total_price     = subtotal − discount_amount + tax + shipping_handling
    //
    // On a create carrying a subtotal, and on an update that carries a pricing
    // input: a person's edit while the order is Draft, a system write, or
    // `sales_order_total_rollup`'s subtotal. The header's figures always
    // agree with each other. Both outputs are `readonly`, and
    // the engine keeps a read-only key a before-hook wrote (#2110). Not on the
    // predicate path, which hands every row one payload (D3, `forecast.hook.ts`).
    if (event === 'beforeInsert' || (event === 'beforeUpdate' && previous && ctx.dispatch?.mode !== 'per-row'
      && ['subtotal', 'discount', 'tax', 'shipping_handling'].some((k) => k in input))) {
      const now = (k: string): number => {
        const v = k in input ? input[k] : previous?.[k];
        return typeof v === 'number' ? v : 0;
      };
      const subtotal = 'subtotal' in input ? input.subtotal : previous?.subtotal;
      if (typeof subtotal === 'number') {
        const discountAmount = Math.round(subtotal * (now('discount') / 100) * 100) / 100;
        input.discount_amount = discountAmount;
        input.total_price = Math.round((subtotal - discountAmount + now('tax') + now('shipping_handling')) * 100) / 100;
      }
    }
  },
};

/**
 * A line that names a product takes the product's name and list price.
 *
 * Only a write that names a product reprices it, so a line keeps what it was
 * ordered at when the catalogue changes later. The product's name becomes the
 * title unless the same write typed one. A blank Sales Price defaults to the
 * list price on create, and a negotiated one is never overwritten.
 *
 * The product is read in a `try`: with the quote-and-product module disabled
 * `crm_product` answers 404, the picker is empty and the line is typed by
 * hand (the card's accepted limit). Then a line that still has no price is
 * refused with a sentence saying what to type, before the NOT NULL column
 * would refuse it with the database's words.
 */
const salesOrderLineFill: Hook = {
  name: 'sales_order_line_fill',
  object: 'crm_sales_order_line',
  events: ['beforeInsert', 'beforeUpdate'],
  priority: 100,
  description: "Fill a line's title and list price from its product; a line with no price says what to type.",
  refusals: {
    VALIDATION_FAILED: {
      message: 'Enter a Sales Price for this line, or choose a product to take its list price.',
      status: 400,
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
    const { event, input } = ctx;
    const api = ctx.api as HookApi | undefined;
    const productId = typeof input.crm_product === 'string' && input.crm_product ? input.crm_product : '';
    if (api && productId) {
      let product: Record<string, unknown> | null = null;
      try {
        product = await api.object('crm_product').findOne({ where: { id: productId }, fields: ['id', 'name', 'list_price'] });
      } catch {
        product = null;
      }
      const typedTitle = typeof input.product_title === 'string' && input.product_title.trim() !== '';
      const name = product && typeof product.name === 'string' ? product.name.trim() : '';
      if (name && !typedTitle) input.product_title = name;
      if (product && typeof product.list_price === 'number') {
        input.list_price = product.list_price;
        if (event === 'beforeInsert' && input.unit_price == null) input.unit_price = product.list_price;
      }
    }
    if (event === 'beforeInsert' && input.unit_price == null) {
      throw refuse('Enter a Sales Price for this line, or choose a product to take its list price.', 'VALIDATION_FAILED', 400);
    }
  },
};

/**
 * `line_number` — `max under the order + 1` on insert, and on an update of a
 * row that still has none. An existing ordinal is never renumbered. The
 * quote line's assigner (`createLineItemNumbering`, #1828), restated for the
 * order: `runAs: 'system'` elevates the sibling read and nothing else.
 */
const salesOrderLineNumber: Hook = {
  name: 'sales_order_line_number',
  object: 'crm_sales_order_line',
  events: ['beforeInsert', 'beforeUpdate'],
  priority: 110,
  runAs: 'system',
  description: 'Assign line_number = (max under the order) + 1.',
  handler: async (ctx: HookContext) => {
    const { event, input } = ctx;
    const prev = ctx.previous;
    const api = ctx.api as HookApi | undefined;
    if (!api) return;
    if (!ctx.user?.id && typeof input.line_number === 'number') return;
    // D3: a predicate update has ONE payload for every row (forecast.hook.ts).
    if (event === 'beforeUpdate' && (ctx.dispatch?.mode === 'per-row' || typeof prev?.line_number === 'number')) return;
    const orderId = input.crm_sales_order ?? prev?.crm_sales_order;
    if (typeof orderId !== 'string' || !orderId) return;
    const siblings = await api.object('crm_sales_order_line').find({
      where: { crm_sales_order: orderId }, fields: ['line_number'], top: 5000,
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

/**
 * The order's `subtotal` is the sum of its lines:
 *
 *   subtotal = Σ line (quantity × unit_price × (1 − line_discount/100))
 *
 * from the raw columns, not the `subtotal` formula, so it does not depend on
 * formula hydration in the sandbox. `sales_order_workflow` derives the rest of
 * the header in the same write.
 *
 * Blocking with `onError: 'abort'` (the #2503 precedent): an abort rolls back
 * the line and every write the chain made. After the row is in, it reads the
 * order again, and a person's line on an order that left Draft meanwhile is
 * refused with the lock's own sentence, so the line rolls back and a confirmed
 * order's total keeps equalling its lines.
 *
 * Unlike the quote rollup, a system write recomputes at any status (the seed
 * puts lines on confirmed and completed orders, and the total is theirs), and
 * an order left with no lines reads 0: the lines are what it sums. An order
 * that never had a line keeps the subtotal typed on it, since no line write
 * reaches it. A cascade delete is skipped: the order is the row being deleted.
 */
const salesOrderTotalRollup: Hook = {
  name: 'sales_order_total_rollup',
  object: 'crm_sales_order_line',
  events: ['afterInsert', 'afterUpdate', 'afterDelete'],
  priority: 300,
  onError: 'abort',
  description: "Recompute the order subtotal from its lines, in the line write; refuse a person's line on an order locked meanwhile.",
  refusals: {
    RECORD_LOCKED: {
      message: 'Order {{order}} is Confirmed, so its lines can no longer be added, changed or removed. Move it back to Draft to change them.',
      status: 409,
      params: ['order'],
      reasons: {
        completed: { message: 'Order {{order}} is Completed, so its lines can no longer be added, changed or removed.' },
        cancelled: { message: 'Order {{order}} is Cancelled, so its lines can no longer be added, changed or removed.' },
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
    const STATUS_LABELS: Record<string, string> = { confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled' };
    const api = ctx.api as HookApi | undefined;
    if (!api) return;
    if (ctx.referentialCascadeDelete === true) return;
    const { event, input, previous } = ctx;
    const num = (v: unknown): number => (typeof v === 'number' ? v : 0);
    const changed = event !== 'afterUpdate'
      || Object.keys(input ?? {}).some((k) => !['id', 'updated_at', 'updated_by', 'line_number', 'product_title', 'list_price'].includes(k) && input[k] !== previous?.[k]);
    if (!changed) return;

    const orderIds = new Set<string>();
    for (const v of [input?.crm_sales_order, previous?.crm_sales_order]) {
      if (typeof v === 'string' && v) orderIds.add(v);
    }

    for (const orderId of orderIds) {
      const order = await api.object('crm_sales_order').findOne({
        where: { id: orderId },
        fields: ['id', 'name', 'status', 'subtotal'],
      });
      if (!order) continue;
      const status = typeof order.status === 'string' ? order.status : '';
      if (STATUS_LABELS[status] && ctx.user?.id) {
        const what = `Order ${String(order.name)} is`;
        const rest = 'so its lines can no longer be added, changed or removed.';
        const back = status === 'confirmed' ? ' Move it back to Draft to change them.' : '';
        throw Object.assign(refuse(
          `${what} ${status}, ${rest}${back}`,
          'RECORD_LOCKED',
          409,
          `${what} ${STATUS_LABELS[status]}, ${rest}${back}`,
        ), { reason: status === 'confirmed' ? undefined : status, params: { order: String(order.name) } });
      }

      const lines = await api.object('crm_sales_order_line').find({
        where: { crm_sales_order: orderId },
        fields: ['quantity', 'unit_price', 'discount'],
        top: 5000,
      });
      let subtotal = 0;
      for (const l of lines ?? []) subtotal += num(l.quantity) * num(l.unit_price) * (1 - num(l.discount) / 100);
      subtotal = Math.round(subtotal * 100) / 100;
      if (order.subtotal === subtotal) continue;

      await api.object('crm_sales_order').update({ id: orderId, subtotal }, { where: { id: orderId } });
    }
  },
};

export default [salesOrderWorkflow, salesOrderLineFill, salesOrderLineNumber, salesOrderTotalRollup];
