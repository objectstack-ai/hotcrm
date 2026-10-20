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
 * - `contact_primary_per_account` (below) keeps one primary contact per account.
 *
 * ⛔ No email/phone propagation to opportunities: `crm_opportunity` has no
 * `contact_email` / `contact_phone` columns, and a rollup writing nonexistent
 * fields is silently swallowed. Opportunities reach the live values through
 * their `primary_contact` lookup.
 */

const contactHook: Hook = {
  name: 'contact_integrity',
  object: 'crm_contact',
  events: ['beforeInsert', 'beforeUpdate', 'beforeDelete'],
  priority: 200,
  description:
    'Dedupe contacts by email and protect referenced contacts from deletion.',
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
          const dupRow = dup as
            | { id?: string; first_name?: unknown; last_name?: unknown }
            | null;
          const dupId = dupRow?.id;
          const selfId = ctx.previous?.id ?? input.id;
          if (dup && dupId !== selfId) {
            // Name the colliding contact, not its primary key (#1243, the same
            // class #1208 closed on the escalation task). This refusal is read
            // by a rep in a dialog at the moment their save is blocked, and the
            // one actionable thing it can say is WHOSE record already holds the
            // address. The id was the opposite of that: a 16-character string
            // that appears on no screen in this app and cannot be pasted into
            // search. `full_name` is `crm_contact.nameField`, and it is composed
            // from the same two stored columns here — a lowered hook body cannot
            // read a formula field. No second read pays for it: the `findOne`
            // above carries no projection, so the whole row is already in hand.
            const dupName = [dupRow?.first_name, dupRow?.last_name]
              .filter((part) => typeof part === 'string' && part.trim() !== '')
              .join(' ');
            throw refuse(
              dupName
                ? `Another contact (${dupName}) with email ${email} already exists.`
                : `Another contact with email ${email} already exists.`,
              'DUPLICATE_VALUE',
              409,
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
        // An OPEN quote holds the contact; a settled one does not (#2161). An
        // accepted quote is settled like a rejected or expired one: its
        // contact is required only on the write that accepts it
        // (`crm_quote.crm_contact`'s `requiredWhen`, quote.object.ts), so the
        // engine clears the link on delete and the accepted quote stays. The
        // opportunity count above excludes both settled stages the same way.
        api.object('crm_quote').count({
          where: { crm_contact: id, status: { $nin: ['accepted', 'rejected', 'expired'] } },
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
        // master-detail with `deleteBehavior: 'cascade'`). Measured on
        // 17.0.0-rc.2, a cascaded `beforeDelete` ctx carried no cascade marker;
        // since 18.0.0-next.2 the platform declares one,
        // `ctx.referentialCascadeDelete` (objectstack#23221, pinned in
        // `test/cascade-guard-messages.test.ts`), and this guard does not read
        // it. So "Cannot delete contact" told an account deleter that they had
        // asked to delete a contact, and sent them looking for the wrong
        // record. Naming the contact and both consequences is true in either
        // context.
        const name = [ctx.previous?.first_name, ctx.previous?.last_name]
          .filter((part) => typeof part === 'string' && part.trim() !== '')
          .join(' ');
        // Named, never keyed (#1243). `id` still does the work it is good at —
        // it is what the three counts above were queried by — but the sentence
        // the user reads names the contact the way `nameField` does. A contact
        // with no name at all is referred to, not identified: a bare id told
        // the reader nothing they could look up either.
        const subject = name ? `Contact ${name}` : 'This contact';
        // What frees the contact is not the same for the three (#2019). An
        // opportunity's `primary_contact` and a quote's `crm_contact` are
        // optional, so once the deal or quote is settled the engine clears the
        // link and the delete lands (an accepted quote included since #2161). A contract's `crm_contact` is REQUIRED: a
        // contract keeps its primary contact for its whole life, ended or not
        // — it is the account's signed record and is kept, so the engine
        // refuses the delete while ANY contract names the contact. The old
        // closing "Close or reassign those records first" sent the user to
        // terminate the contract, after which the engine refused all the same.
        // So the sentence says what frees the contact from a contract: another
        // primary contact on it.
        //
        // ⛔ The COUNT stays `activated`, and that is deliberate. This guard also
        // runs inside an account delete (the cascade above) and does not tell
        // the two apart, and an account delete takes its draft and ended contracts
        // with it (#549, `account_protection`). Counting those here would make
        // this guard refuse that account delete itself — today the engine
        // already refuses it on the cascade's order (objectstack#22305, pinned
        // in `test/hooks-runtime-sales.test.ts`), and that is the platform's to
        // fix. An ended contract on a DIRECT contact delete is refused by the
        // engine, in its own words naming the contract.
        //
        // The sentence names only what holds the contact, each count with its
        // own plural (#2060 item 12, A-17: "2 open opportunity(ies), 0 active
        // quote(s)" listed a zero and left the grammar to the reader), and only
        // remedies that FREE it (#2161). For an open quote that is another
        // contact or a rejection — ⛔ not acceptance: accepting drafts a
        // contract naming the same person, and a contract keeps its primary
        // contact for life. "Close or reassign the quotes" was the old remedy,
        // and on an accepted quote, which this count used to include, neither
        // could be done.
        const held: string[] = [];
        const remedies: string[] = [];
        if (openOpps > 0) {
          held.push(`${openOpps} open ${openOpps === 1 ? 'opportunity' : 'opportunities'}`);
          remedies.push('close each open opportunity or give it another primary contact');
        }
        if (openQuotes > 0) {
          held.push(`${openQuotes} open ${openQuotes === 1 ? 'quote' : 'quotes'}`);
          remedies.push('give each open quote another contact or reject it');
        }
        if (activeContracts > 0) {
          held.push(`${activeContracts} active ${activeContracts === 1 ? 'contract' : 'contracts'}`);
          remedies.push('give each contract another primary contact: a contract keeps its primary contact even after it ends');
        }
        const referents =
          held.length > 1 ? `${held.slice(0, -1).join(', ')} and ${held[held.length - 1]}` : held[0];
        const todo =
          remedies.length > 1
            ? `${remedies.slice(0, -1).join('; ')}; and ${remedies[remedies.length - 1]}`
            : remedies[0];
        throw refuse(
          `${subject} is still referenced by ${referents}, so it cannot be deleted — and neither can its account, because deleting an account deletes its contacts. To free the contact, ${todo}.`,
          'DELETE_RESTRICTED',
          409,
        );
      }
    }
  },
};

/**
 * One primary contact per account (#2060 item 9, A-15).
 *
 * When a contact BECOMES its account's primary contact — inserted with the
 * flag, flagged later, or moved onto another account while flagged — the flag
 * is cleared on the account's other contacts. Every writer of `is_primary`
 * reaches this one rule: Mark as Primary, the record form and the create
 * dialog, the REST / AI data door, and the seed. Measured on 18.0.0-next.3
 * before this hook, each of them left two primaries side by side.
 *
 * - After the write, so `ctx.result` is the row as stored (an insert's `input`
 *   carries no id). Blocking with `onError: 'abort'`, so the clearing writes
 *   ride the write's own unit of work: a clearing write that is refused takes
 *   the new flag down with it, and the account is never left half-switched.
 * - `runAs` is left at `inherit`: the clearing writes run as the writer.
 *   `crm_contact` is `controlled_by_parent`, so the person who may write one
 *   contact of an account may write all of them; nothing is elevated.
 * - No loop: a clearing write stores `false`, and only a row that holds `true`
 *   reaches the read below. Only a CHANGE re-runs it, so re-saving a primary
 *   contact touches nothing else, and an account written before this rule
 *   with several primaries keeps them until a contact there is marked primary
 *   (which clears the rest) or the extras are cleared.
 * - Rule 10: the read is pinned to one account id, under the writer's own
 *   context, so it cannot reach another organization's rows.
 *
 * ⛔ Not "the first contact of an account becomes primary": no contact is ever
 * made primary here. Who is primary stays the writer's call (#2060 ruling).
 */
const contactPrimaryPerAccount: Hook = {
  name: 'contact_primary_per_account',
  object: 'crm_contact',
  events: ['afterInsert', 'afterUpdate'],
  priority: 300,
  description:
    "When a contact becomes its account's primary contact, clear the flag on the account's other contacts.",
  handler: async (ctx: HookContext) => {
    const api = ctx.api as HookApi | undefined;
    const row = ctx.result as Record<string, unknown> | undefined;
    if (!api || !row || row.is_primary !== true) return;
    const id = row.id;
    const accountId = row.crm_account;
    if (typeof id !== 'string' || typeof accountId !== 'string') return;
    const previous = ctx.previous;
    if (previous?.is_primary === true && previous.crm_account === accountId) return;
    const primaries = await api.object('crm_contact').find({
      where: { crm_account: accountId, is_primary: true },
      fields: ['id'],
      top: 200,
    });
    // Already cleared by a contact written in the same batch, whose own pass
    // ran first: that one keeps the flag. Clearing here would leave none.
    if (!primaries.some((c) => c.id === id)) return;
    for (const other of primaries) {
      if (typeof other.id !== 'string' || other.id === id) continue;
      await api.object('crm_contact').update({ id: other.id, is_primary: false }, { where: { id: other.id } });
    }
  },
};

export default [contactHook, contactPrimaryPerAccount];
