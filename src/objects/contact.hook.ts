// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from './_hook-api';

/**
 * Contact integrity hook.
 *
 * - On insert/update, dedupes by `email` GLOBALLY — matching the schema's
 *   global unique index on `email`. (The old per-account lookup let a
 *   cross-account duplicate sail past the friendly check and explode on the
 *   DB index instead, mid-conversion.)
 * - On delete, refuses if the contact is referenced by an active opportunity,
 *   open quote or active contract.
 *
 * No email/phone propagation to opportunities: `crm_opportunity` has no
 * `contact_email` / `contact_phone` columns — the old afterUpdate rollup
 * wrote nonexistent fields and was silently swallowed. Opportunities reach
 * the live values through their `primary_contact` lookup.
 */

const contactHook: Hook = {
  name: 'contact_integrity',
  object: 'crm_contact',
  events: ['beforeInsert', 'beforeUpdate', 'beforeDelete'],
  priority: 200,
  description:
    'Dedupe contacts by email and protect referenced contacts from deletion.',
  handler: async (ctx: HookContext) => {
    const { event, input } = ctx;
    const api = ctx.api as HookApi | undefined;

    if ((event === 'beforeInsert' || event === 'beforeUpdate') && api) {
      const email = typeof input.email === 'string' ? input.email.toLowerCase() : '';
      if (email) {
        input.email = email;
        // GLOBAL lookup (no account scope): the unique index on `email` is
        // global, so this guard must be at least as strict to fire first with
        // a readable error.
        const dup = await api.object('crm_contact').findOne({
          where: { email },
        });
        const dupId = (dup as { id?: string } | null)?.id;
        const selfId = ctx.previous?.id ?? input.id;
        if (dup && dupId !== selfId) {
          throw new Error(
            `Another contact (${dupId}) with email ${email} already exists.`,
          );
        }
      }
    }

    if (event === 'beforeDelete' && api) {
      const id = ctx.previous?.id;
      if (!id) return;
      const [openOpps, openQuotes, activeContracts] = await Promise.all([
        api.object('crm_opportunity').count({
          where: { primary_contact: id, stage: { $nin: ['closed_won', 'closed_lost'] } },
        }),
        api.object('crm_quote').count({
          where: { crm_contact: id, status: { $nin: ['rejected', 'expired'] } },
        }),
        api.object('crm_contract').count({
          where: { crm_contact: id, status: 'activated' },
        }),
      ]);
      const total = openOpps + openQuotes + activeContracts;
      if (total > 0) {
        throw new Error(
          `Cannot delete contact: still referenced by ${openOpps} open opportunity(ies), ${openQuotes} active quote(s), ${activeContracts} active contract(s). Reassign first.`,
        );
      }
    }
  },
};

export default contactHook;
