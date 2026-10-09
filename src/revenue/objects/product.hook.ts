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
 */

const productHook: Hook = {
  name: 'product_catalog',
  object: 'crm_product',
  events: ['beforeInsert', 'beforeUpdate', 'beforeDelete'],
  priority: 200,
  description: 'Pricing sanity, SKU normalization, and protect referenced products from deletion.',
  handler: async (ctx: HookContext) => {
    // The refusal envelope (#1075). Mirrored from `./_refusal.ts` because a
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

export default productHook;
