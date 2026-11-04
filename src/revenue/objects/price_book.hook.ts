// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from '../../sales/objects/_hook-api';

/**
 * Exactly one standard price book (REQ-0009, phase 1).
 *
 * The standard book is the one every product's `list_price` is published in,
 * and the book a quote will default to (#2318). So there is never a second
 * one, and once a book is standard it stays standard:
 *
 * - a book saved as Standard while another book is Standard is refused, naming
 *   the standard book;
 * - clearing Standard on the standard book is refused;
 * - deleting the standard book is refused.
 *
 * A tenant with no standard book yet (seeds off) may mark one. The seed's own
 * `Standard` row passes through here like any other insert.
 *
 * The "another standard book" read is scoped to the organization the write
 * belongs to, as `contact_integrity` scopes its dedupe (`contact.hook.ts`, the
 * long note there): a per-organization seed replay runs as a SYSTEM write with
 * no session, and an unscoped read would find organization #1's standard book
 * and refuse every later organization's. A system write whose organization
 * cannot be resolved skips the check.
 */
const priceBookHook: Hook = {
  name: 'price_book_standard',
  object: 'crm_price_book',
  events: ['beforeInsert', 'beforeUpdate', 'beforeDelete'],
  priority: 200,
  description: 'Keep exactly one standard price book: refuse a second one, and refuse un-marking or deleting it.',
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
    const { event, input, previous } = ctx;
    const api = ctx.api as HookApi | undefined;
    if (!api) return;

    if (event === 'beforeDelete') {
      const id = previous?.id;
      if (!id) return;
      // A delete's `previous` may carry only the id; read the row when it does.
      const row = previous && Object.prototype.hasOwnProperty.call(previous, 'is_standard')
        ? previous
        : await api.object('crm_price_book').findOne({ where: { id }, fields: ['id', 'name', 'is_standard'] });
      if (row && row.is_standard === true) {
        throw refuse(
          `Cannot delete ${String(row.name ?? 'the standard price book')}: it is the standard price book. To stop quoting from it, turn off Active.`,
          'RECORD_LOCKED',
          409,
        );
      }
      return;
    }

    if (event !== 'beforeInsert' && event !== 'beforeUpdate') return;
    const wasStandard = previous?.is_standard === true;

    if (event === 'beforeUpdate' && wasStandard && input.is_standard === false) {
      throw refuse(
        `${String(previous?.name ?? 'This book')} is the standard price book, and there is always one: Standard cannot be turned off. Edit its prices instead.`,
        'RECORD_LOCKED',
        409,
      );
    }

    if (input.is_standard !== true || wasStandard) return;
    const organizationId = [
      ctx.user?.organizationId,
      ctx.session?.organizationId,
      input.organization_id,
      previous?.organization_id,
    ].find((candidate): candidate is string => typeof candidate === 'string' && candidate !== '');
    if (!organizationId && !ctx.user?.id) return;
    const where: Record<string, unknown> = organizationId
      ? { organization_id: organizationId, is_standard: true }
      : { is_standard: true };
    const selfId = previous?.id ?? input.id;
    const others = (await api.object('crm_price_book').find({ where, fields: ['id', 'name'], top: 2 }))
      .filter((book) => book.id !== selfId);
    if (others.length > 0) {
      throw refuse(
        `${String(others[0]!.name)} is already the standard price book, and there is only one. Save this book without Standard.`,
        'DUPLICATE_VALUE',
        409,
      );
    }
  },
};

export default priceBookHook;
