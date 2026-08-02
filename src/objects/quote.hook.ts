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
          'id', 'owner', 'owner_id', 'created_at', 'updated_at',
          'created_by', 'updated_by', 'space_id', 'organization_id', 'org_id', 'version',
        ]);
        const changed = Object.keys(input).filter(
          (k) => !allowed.has(k) && !SYSTEM_FIELDS.has(k) && input[k] !== previous[k],
        );
        if (changed.length > 0) {
          throw new Error(
            `Quote is ${previous.status as string}; only internal_notes may be edited. Attempted: ${changed.join(', ')}.`,
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

    const quoteId = (typeof input.id === 'string' && input.id) || previous?.id;
    const accountId =
      (typeof input.crm_account === 'string' && input.crm_account) ||
      (typeof previous?.crm_account === 'string' && previous.crm_account);
    const contactId =
      (typeof input.crm_contact === 'string' && input.crm_contact) ||
      (typeof previous?.crm_contact === 'string' && previous.crm_contact);
    const opportunityId =
      (typeof input.crm_opportunity === 'string' && input.crm_opportunity) ||
      (typeof previous?.crm_opportunity === 'string' && previous.crm_opportunity);
    const totalPrice =
      typeof input.total_price === 'number'
        ? input.total_price
        : typeof previous?.total_price === 'number'
          ? (previous.total_price as number)
          : 0;

    const today = new Date().toISOString().slice(0, 10);
    const months = 12;
    await api.object('crm_contract').insert({
      crm_account: accountId,
      crm_contact: contactId,
      crm_opportunity: opportunityId,
      owner:
        (typeof input.owner === 'string' && input.owner) ||
        (typeof previous?.owner === 'string' && previous.owner) ||
        ctx.user?.id,
      status: 'draft',
      contract_term_months: months,
      start_date: today,
      end_date: addMonths(today, months),
      contract_value: totalPrice,
      contract_type: 'subscription',
      description: `Auto-drafted from accepted quote ${quoteId ?? ''}`.trim(),
    });

    if (opportunityId) {
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
    }
  },
};

export default [quoteValidation, quoteAccepted];
