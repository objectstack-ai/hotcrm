// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from './_hook-api';

/**
 * Contact integrity hook.
 *
 * - On insert/update, dedupes by `email` WITHIN THE ORGANIZATION — matching
 *   the constraint the schema actually declares. `crm_contact.email` carries
 *   field-level `unique: true`, which materializes as the tenant composite
 *   `(organization_id, email)` (framework#3696), so the address is unique
 *   across every account of one organization and two organizations may each
 *   know the same person. The lookup is deliberately NOT account-scoped (the
 *   old per-account lookup let a cross-account duplicate sail past the
 *   friendly check and explode on the DB index instead, mid-conversion) — but
 *   it must not reach ACROSS organizations either.
 *
 *   ## What an unscoped lookup cost, as measured
 *
 *   `ctx.api` reads are not organization-scoped for every caller: the seed
 *   loader replays a dataset per organization as a SYSTEM write, and an
 *   unscoped `findOne({ where: { email } })` from inside that replay meets the
 *   FIRST organization's contacts. On the deployment shape where many
 *   organizations share one database, the second organization's replay was
 *   refused row by row — `Another contact (…) with email
 *   john.smith@acme.example.com already exists.` — landing 0 of 9 contacts
 *   and, because `crm_contract` requires one, 0 of 4 contracts, plus
 *   half-populated quotes, quote line items, campaign members and event
 *   attendees. Nothing leaked; the tenant wall held. The data never arrived.
 *
 *   The organization is therefore resolved before the lookup, in the blessed
 *   order: the acting user's active organization first (`user.organizationId`
 *   === `session.organizationId` === the `organization_id` column === RLS's
 *   `current_user.organizationId`), then the row's own stamp, which is what a
 *   system write carries when no session does. Resolved: scope the lookup.
 *   Unresolvable on a system write: skip the friendly guard and let the
 *   `(organization_id, email)` index enforce. Unresolvable for a USER write:
 *   an untenanted (community) install, where the old global lookup is right.
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
        // Scope the guard to the organization the write belongs to, so it is
        // exactly as strict as the `(organization_id, email)` index it fires
        // ahead of — no stricter. An unresolvable organization on a SYSTEM
        // write (no `ctx.user`) means the caller is the seed loader or a
        // backfill: skip the friendly guard rather than run it unscoped, and
        // let the database constraint be the enforcement. Running it unscoped
        // there is what starved every organization after the first of its
        // contacts.
        const organizationId = [
          ctx.user?.organizationId,
          ctx.session?.organizationId,
          input.organization_id,
          ctx.previous?.organization_id,
        ].find((candidate): candidate is string => typeof candidate === 'string' && candidate !== '');
        if (organizationId || ctx.user?.id) {
          const dup = await api.object('crm_contact').findOne({
            where: organizationId ? { organization_id: organizationId, email } : { email },
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
