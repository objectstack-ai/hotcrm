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
        // Phrase the refusal as the BLOCKING RELATIONSHIP, not as the caller's
        // operation (#693). This hook fires on a direct
        // `DELETE /crm_contact/<id>` AND as a cascade child of
        // `DELETE /crm_account/<id>` (`crm_contact.crm_account` is a
        // master-detail with `deleteBehavior: 'cascade'`), and the hook context
        // carries nothing that distinguishes the two — measured on 17.0.0-rc.2,
        // a cascaded `beforeDelete` ctx holds exactly
        // {api,event,input,object,previous,provenance,ql,session,transaction,user}
        // with no cascade marker. So "Cannot delete contact" told an account
        // deleter that they had asked to delete a contact, and sent them
        // looking for the wrong record. Naming the contact and both
        // consequences is true in either context.
        const name = [ctx.previous?.first_name, ctx.previous?.last_name]
          .filter((part) => typeof part === 'string' && part.trim() !== '')
          .join(' ');
        const subject = name ? `Contact ${name} (${id})` : `Contact ${id}`;
        throw new Error(
          `${subject} is still referenced by ${openOpps} open opportunity(ies), ${openQuotes} active quote(s), ${activeContracts} active contract(s), so it cannot be deleted — and neither can its account, because deleting an account deletes its contacts. Close or reassign those records first.`,
        );
      }
    }
  },
};

export default contactHook;
