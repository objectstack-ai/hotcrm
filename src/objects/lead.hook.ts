// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from './_hook-api';

/**
 * Lead automation hook.
 *
 * - Auto-scores incoming leads into `rating` (1-5) using industry/title/email/phone weights.
 * - Refuses edits to a converted lead.
 * - When status flips to `qualified`, schedules a follow-up `crm_task` for the current user.
 */

const HIGH_VALUE_INDUSTRIES = new Set([
  'technology',
  'finance',
  'healthcare',
]);

const SENIOR_TITLE_PATTERN = /\b(ceo|cto|cfo|cio|coo|founder|vp|vice president|director|head of)\b/i;

function computeRating(input: Record<string, unknown>): number {
  let score = 0;
  const email = typeof input.email === 'string' ? input.email : '';
  const phone = typeof input.phone === 'string' ? input.phone : '';
  const title = typeof input.title === 'string' ? input.title : '';
  const industry = typeof input.industry === 'string' ? input.industry : '';
  const employees = typeof input.number_of_employees === 'number' ? input.number_of_employees : 0;
  const revenue = typeof input.annual_revenue === 'number' ? input.annual_revenue : 0;

  if (email && !/(gmail|yahoo|hotmail|outlook|qq|163)\.com$/i.test(email)) score += 1;
  if (phone.length > 0) score += 0.5;
  if (SENIOR_TITLE_PATTERN.test(title)) score += 1.5;
  if (HIGH_VALUE_INDUSTRIES.has(industry)) score += 1;
  if (employees >= 200) score += 0.5;
  if (revenue >= 10_000_000) score += 0.5;

  // Cap at 5, floor at 1, round to half.
  const clamped = Math.max(1, Math.min(5, score));
  return Math.round(clamped * 2) / 2;
}

/**
 * Lead auto-assignment (load-balanced round-robin).
 *
 * A lead created without an owner (CSV import, web-to-lead, API capture) used to
 * land ownerless and rely on a manager noticing it. This assigns it to the
 * sales rep with the FEWEST open leads — a self-balancing round-robin that needs
 * no rotation counter.
 *
 * The rep pool is whoever holds the `sales_rep` position (`sys_user_position`).
 * When that pool is empty (e.g. a fresh org before positions are assigned) the
 * hook is a NO-OP and the lead keeps whatever owner it had — so it never blocks
 * lead creation. UI-created leads already carry owner = creator (field default),
 * so this only kicks in for genuinely ownerless intake.
 *
 * Runs beforeInsert so the downstream lead_assignment flow (afterInsert) sees
 * the assigned owner and routes its SLA alert to that rep. Territory-based
 * routing is a future extension on top of this pool query.
 */
const leadAutoAssignHook: Hook = {
  name: 'lead_auto_assign',
  object: 'crm_lead',
  events: ['beforeInsert'],
  priority: 150,
  description: 'Assign ownerless new leads to the least-loaded sales rep.',
  handler: async (ctx: HookContext) => {
    const { input } = ctx;
    // Respect an explicit / creator-assigned owner.
    if (typeof input.owner === 'string' && input.owner) return;
    const api = ctx.api as HookApi | undefined;
    if (!api) return;

    // Rep pool = holders of the sales_rep position.
    const holders = await api.object('sys_user_position').find({
      where: { position: 'sales_rep' }, fields: ['user_id'], top: 1000,
    });
    const repIds = Array.from(
      new Set(
        (holders ?? [])
          .map((r) => (typeof r.user_id === 'string' ? r.user_id : ''))
          .filter(Boolean),
      ),
    );
    if (repIds.length === 0) return; // no pool → leave ownerless (no-op)

    // Pick the rep with the fewest OPEN (non-converted) leads.
    let best: string | undefined;
    let bestCount = Infinity;
    for (const repId of repIds) {
      const openCount = await api.object('crm_lead').count({
        where: { owner: repId, is_converted: false },
      });
      if (openCount < bestCount) {
        bestCount = openCount;
        best = repId;
      }
    }
    if (best) input.owner = best;
  },
};

const leadHook: Hook = {
  name: 'lead_automation',
  object: 'crm_lead',
  events: ['beforeInsert', 'beforeUpdate', 'afterUpdate'],
  priority: 200,
  description:
    'Score new leads, lock converted leads, and create follow-up task on qualification.',
  handler: async (ctx: HookContext) => {
    const { event, input } = ctx;

    const HIGH_VALUE_INDUSTRIES = new Set(['technology', 'finance', 'healthcare']);
    const SENIOR_TITLE_PATTERN = /\b(ceo|cto|cfo|cio|coo|founder|vp|vice president|director|head of)\b/i;
    function computeRating(input: Record<string, unknown>): number {
      let score = 0;
      const email = typeof input.email === 'string' ? input.email : '';
      const phone = typeof input.phone === 'string' ? input.phone : '';
      const title = typeof input.title === 'string' ? input.title : '';
      const industry = typeof input.industry === 'string' ? input.industry : '';
      const employees = typeof input.number_of_employees === 'number' ? input.number_of_employees : 0;
      const revenue = typeof input.annual_revenue === 'number' ? input.annual_revenue : 0;
      if (email && !/(gmail|yahoo|hotmail|outlook|qq|163)\.com$/i.test(email)) score += 1;
      if (phone.length > 0) score += 0.5;
      if (SENIOR_TITLE_PATTERN.test(title)) score += 1.5;
      if (HIGH_VALUE_INDUSTRIES.has(industry)) score += 1;
      if (employees >= 200) score += 0.5;
      if (revenue >= 10_000_000) score += 0.5;
      const clamped = Math.max(1, Math.min(5, score));
      return Math.round(clamped * 2) / 2;
    }

    if (event === 'beforeInsert') {
      // Web-to-Lead: anonymous submissions from the public form get
      // sensible defaults stamped server-side so they cannot be spoofed
      // by the client. Guests are unauthenticated, so we identify them
      // by the absence of `ctx.user?.id`. (The `guest_portal` profile
      // already restricts them to INSERT-only on `crm_lead`.)
      const isGuestSubmission = !ctx.user?.id;
      if (isGuestSubmission) {
        if (!input.lead_source) input.lead_source = 'web';
        if (!input.status)      input.status      = 'new';
        // Never trust client-supplied conversion / ownership fields on
        // a public form — strip them defensively.
        delete (input as Record<string, unknown>).is_converted;
        delete (input as Record<string, unknown>).converted_account;
        delete (input as Record<string, unknown>).converted_contact;
        delete (input as Record<string, unknown>).converted_opportunity;
        delete (input as Record<string, unknown>).converted_date;
        delete (input as Record<string, unknown>).owner;
      }

      if (typeof input.rating !== 'number') {
        input.rating = computeRating(input);
      }
    }

    if (event === 'beforeUpdate') {
      const previous = ctx.previous;
      if (previous?.is_converted === true || previous?.status === 'converted') {
        throw new Error('Cannot edit a converted lead. Make changes on the converted records instead.');
      }
    }

    if (event === 'afterUpdate') {
      const previous = ctx.previous;
      const becameQualified =
        input.status === 'qualified' && previous?.status !== 'qualified';
      if (!becameQualified) return;

      const api = ctx.api as HookApi | undefined;
      if (!api) return;

      const leadId =
        (typeof input.id === 'string' && input.id) ||
        (typeof previous?.id === 'string' && previous.id) ||
        undefined;
      const ownerId =
        (typeof input.owner === 'string' && input.owner) ||
        (typeof previous?.owner === 'string' && previous.owner) ||
        ctx.user?.id;

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 2);

      try {
        await api.object('crm_task').insert({
          subject: `Follow up with qualified lead${leadId ? ` (${leadId})` : ''}`,
          status: 'not_started',
          priority: 'high',
          type: 'follow_up',
          due_date: dueDate.toISOString().slice(0, 10),
          owner: ownerId,
          related_to_type: 'crm_lead',
          related_to_lead: leadId,
        });
      } catch (err) {
        // Side-effect failure must not break the parent transaction.
        console.warn('[lead_automation] failed to create follow-up task:', err);
      }
    }
  },
};

export default [leadAutoAssignHook, leadHook];
