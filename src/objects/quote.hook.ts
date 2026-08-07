// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from './_hook-api';

/**
 * Quote workflow hook.
 *
 * - Defaults `expiration_date` to `quote_date + 30 days` when missing.
 * - Freezes quotes once `accepted` or `expired`.
 * - On `accepted`, drafts a contract and pushes the linked opportunity to `closed_won`.
 */

// NB: helpers used by handlers are declared INSIDE each handler — L2 hook
// bodies run body-only in the QuickJS sandbox, so module scope is not
// available at runtime (cf. opportunity.hook.ts).

const quoteValidation: Hook = {
  name: 'quote_workflow',
  object: 'crm_quote',
  events: ['beforeInsert', 'beforeUpdate'],
  priority: 200,
  description: 'Default expiration date and freeze accepted/expired quotes.',
  handler: async (ctx: HookContext) => {
    const { event, input } = ctx;
    const previous = ctx.previous;

    function addDays(iso: string, days: number): string {
      const d = new Date(iso);
      d.setDate(d.getDate() + days);
      return d.toISOString().slice(0, 10);
    }

    if (event === 'beforeInsert' && !input.expiration_date) {
      const base =
        typeof input.quote_date === 'string'
          ? input.quote_date
          : new Date().toISOString().slice(0, 10);
      input.expiration_date = addDays(base, 30);
    }

    // Guard ONLY genuine USER edits (`ctx.user?.id` present). System / seed /
    // backfill writes carry no user and legitimately re-apply business fields
    // (the seed's quote_date/expiration_date re-evaluate on every reboot), so
    // guarding them threw boot-time BodyRunner errors (#459). Matches the
    // system-write convention used across the case/lead/opportunity hooks.
    if (event === 'beforeUpdate' && previous && ctx.user?.id) {
      const frozen = previous.status === 'accepted' || previous.status === 'expired';
      if (frozen) {
        const allowed = new Set(['internal_notes']);
        // Framework-managed columns (ownership, audit timestamps) are re-stamped
        // by the 9.x runtime — never treat those system writes as edits to a
        // frozen quote, only user changes to business fields.
        const SYSTEM_FIELDS = new Set([
          'id', 'owner_id', 'created_at', 'updated_at',
          'created_by', 'updated_by', 'space_id', 'organization_id', 'org_id', 'version',
        ]);
        const changed = Object.keys(input).filter(
          (k) => !allowed.has(k) && !SYSTEM_FIELDS.has(k) && input[k] !== previous[k],
        );
        if (changed.length > 0) {
          // Same defect class as #693: the freeze also fires from a write the
          // caller never made. Deleting an opportunity (or a contact) an
          // ACCEPTED quote references makes the engine clear that lookup, and
          // the clear arrives here as an ordinary `beforeUpdate` — measured:
          // `DELETE /crm_opportunity/<id>` answered "Quote is accepted; only
          // internal_notes may be edited. Attempted: crm_opportunity.", naming
          // an object the caller never addressed. Nothing in the hook context
          // marks a cascade, so the refusal names the frozen quote and the link.
          const REFERENCE_FIELDS = new Set(['crm_account', 'crm_contact', 'crm_opportunity']);
          const name = typeof previous.name === 'string' ? previous.name : '';
          const quoteId =
            (typeof previous.id === 'string' && previous.id) ||
            (typeof input.id === 'string' && input.id) ||
            '';
          const label = [name, quoteId ? `(${quoteId})` : ''].filter(Boolean).join(' ');
          const subject = label ? `Quote ${label}` : 'Quote';
          const detached = changed.filter(
            (k) => REFERENCE_FIELDS.has(k) && input[k] === null && previous[k] != null,
          );
          if (detached.length === changed.length) {
            throw new Error(
              `${subject} is ${previous.status as string} and frozen, so its link(s) ${detached.join(', ')} cannot be cleared — which also blocks deleting the record(s) they point at. Delete the quote first, or have an admin clear the link with a system write.`,
            );
          }
          throw new Error(
            `${subject} is ${previous.status as string}; only internal_notes may be edited. Attempted: ${changed.join(', ')}.`,
          );
        }
      }
    }
  },
};

const quoteAccepted: Hook = {
  name: 'quote_on_accepted',
  object: 'crm_quote',
  events: ['afterUpdate'],
  priority: 800,
  async: true,
  onError: 'log',
  description: 'When quote is accepted: draft a contract and close-won the linked opportunity.',
  handler: async (ctx: HookContext) => {
    const { input } = ctx;
    const previous = ctx.previous;
    if (input.status !== 'accepted' || previous?.status === 'accepted') return;
    const api = ctx.api as HookApi | undefined;
    if (!api) return;

    // Real calendar months — `days * 30` shorted a 12-month term by ~5 days
    // and only slipped past contract_validation's ±1-month tolerance by luck.
    function addMonths(iso: string, months: number): string {
      const d = new Date(iso);
      d.setMonth(d.getMonth() + months);
      return d.toISOString().slice(0, 10);
    }

    /**
     * First candidate that is a non-empty record id, or `undefined` (#714).
     *
     * The id chains here used to be written `(typeof a === 'string' && a) || (typeof
     * b === 'string' && b)`, whose value when NEITHER operand holds is boolean
     * `false` — not `undefined`. `false` is a VALUE: it went into the contract
     * document as the content of a lookup, and a lookup column takes a record id
     * or nothing at all. What the engine did with it depends on the deployment's
     * ADR-0104 value-shape posture, and both outcomes are wrong:
     *
     *   - warn-first (a deployment that has not run `os migrate value-shapes
     *     --apply`): the write is ADMITTED with a `[value-shape] … accepted for
     *     now` warning, and `crm_contact = false` is persisted into a reference
     *     column — a row the value-shape scan will later refuse to convert;
     *   - strict (after that gate, or `OS_DATA_VALUE_SHAPE_STRICT_ENABLED=1`):
     *     `ValidationError: Primary Contact has an invalid lookup value: Invalid
     *     input: expected string, received boolean`, which aborted this whole
     *     handler — so no contract, and the close-won leg below never ran.
     *
     * `undefined` is the only correct "there is no id here": it does not survive
     * the JSON hop into the engine, and the writes below drop the key outright,
     * so an absent optional link is an ABSENT COLUMN rather than a junk value.
     */
    function pickId(...candidates: unknown[]): string | undefined {
      for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate) return candidate;
      }
      return undefined;
    }

    const quoteId = pickId(input.id, previous?.id);
    const accountId = pickId(input.crm_account, previous?.crm_account);
    const contactId = pickId(input.crm_contact, previous?.crm_contact);
    const opportunityId = pickId(input.crm_opportunity, previous?.crm_opportunity);
    const ownerId = pickId(input.owner_id, previous?.owner_id, ctx.user?.id);
    const totalPrice =
      typeof input.total_price === 'number'
        ? input.total_price
        : typeof previous?.total_price === 'number'
          ? (previous.total_price as number)
          : 0;

    const today = new Date().toISOString().slice(0, 10);
    const months = 12;

    // Only lookups we actually HAVE are written. A missing optional link is an
    // absent key — never `false` (see `pickId`), and never `null` either: `null`
    // is a legal shape for the optional `crm_opportunity` but not for the
    // required `crm_contact`, and one idiom for both is what keeps this honest.
    const contract: Record<string, unknown> = {
      status: 'draft',
      contract_term_months: months,
      start_date: today,
      end_date: addMonths(today, months),
      contract_value: totalPrice,
      contract_type: 'subscription',
      description: `Auto-drafted from accepted quote ${quoteId ?? ''}`.trim(),
    };
    if (accountId) contract.crm_account = accountId;
    if (contactId) contract.crm_contact = contactId;
    if (opportunityId) contract.crm_opportunity = opportunityId;
    if (ownerId) contract.owner_id = ownerId;

    // The two legs are INDEPENDENT, and this is the other half of #714: they
    // used to be one straight-line sequence, so anything that made the contract
    // insert throw also swallowed the close-won below it — an accepted quote on
    // a live opportunity left the deal open, with the hook's `onError: 'log'`
    // making the whole thing invisible to the user. Winning the deal is keyed on
    // the quote being ACCEPTED, not on the contract being draftable, so a
    // refusal from `crm_contract` must not decide the opportunity's stage.
    // Failures are collected and re-thrown together at the end, so the log the
    // runtime writes still names everything that went wrong.
    const failures: string[] = [];

    try {
      await api.object('crm_contract').insert(contract);
    } catch (err) {
      // `crm_quote.crm_contact` is deliberately optional while
      // `crm_contract.crm_contact` is `required + notNull`, so a quote accepted
      // without a recipient legitimately lands here with "Primary Contact is
      // required". That refusal is the documented behaviour, not a defect —
      // `content/docs/sales/quotes.mdx` already tells reps to put the contact on
      // the quote first, because "what the quote does not carry, acceptance
      // cannot pass on". What this catch changes is that the refusal is now
      // truthful (a named missing field, not "received boolean") and that it no
      // longer takes the close-won leg with it.
      failures.push(
        `could not draft the contract for quote ${quoteId ?? '(unknown)'}: ${(err as Error).message}`,
      );
    }

    if (opportunityId) {
      try {
        const opp = await api.object('crm_opportunity').findOne({ where: { id: opportunityId } });
        if (opp && opp.stage !== 'closed_won' && opp.stage !== 'closed_lost') {
          await api.object('crm_opportunity').update(
            {
              id: opportunityId,
              stage: 'closed_won',
              close_date: today,
              // `crm_opportunity.win_reason` is `requiredWhen` stage is
              // closed_won (#593), and this write is the ONE close path with no
              // human in it to attribute the win — so without a value here the
              // CPQ leg would be rejected by the engine on every accepted quote.
              // `quote_accepted` names the automated path rather than guessing a
              // rep's answer; keep the reason the rep already recorded if there
              // is one.
              ...(opp.win_reason ? {} : { win_reason: 'quote_accepted' }),
            },
            { where: { id: opportunityId } },
          );
        }
      } catch (err) {
        failures.push(
          `could not close-won opportunity ${opportunityId}: ${(err as Error).message}`,
        );
      }
    }

    if (failures.length > 0) {
      throw new Error(`quote_on_accepted: ${failures.join('; ')}`);
    }
  },
};

export default [quoteValidation, quoteAccepted];
