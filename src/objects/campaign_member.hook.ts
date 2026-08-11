// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from './_hook-api';

/**
 * Campaign member hooks — the writers that make the trimmed lifecycle honest
 * (#597).
 *
 * `crm_campaign_member` was the app's clearest case of declared-but-inert
 * metadata: a seven-value engagement lifecycle and two tracker stamps, with the
 * enrollment flow writing `sent` and nothing writing anything else, ever. The
 * object trim removed the values no writer could reach; these three hooks are
 * the other half of that trade — they give every value that SURVIVED a writer
 * that actually runs.
 *
 * - `campaign_member_lifecycle` (before) — keeps `has_responded` /
 *   `response_date` in lockstep with `status`, whichever end a caller writes.
 * - `campaign_member_optout_sync` (after) — round-trips `unsubscribed` to the
 *   member's lead/contact `email_opt_out`.
 * - `campaign_member_metrics_refresh` (after) — recomputes the campaign's
 *   metric block on every membership change, which is what makes a live
 *   campaign show live numbers.
 *
 * ⚠️ The recompute block below is written out here and three more times in
 * `campaign.hook.ts`, deliberately: a sandboxed hook body cannot reach module
 * scope, so a shared import would stop the handler lowering to metadata (see
 * that file's header for the full reasoning). All four copies are asserted
 * character-identical by `test/campaign-member-lifecycle.test.ts`.
 */

/**
 * Keep the response summary fields honest, on every write path.
 *
 * There are two ways a member becomes "responded" and they must not disagree:
 * the `mark_responded` action (which stamps all three fields itself) and a rep
 * flipping `status` on the record detail page (which stamps only `status`). The
 * second path is why this hook exists — without it, a hand-flipped member reads
 * `Responded` on the status badge and `Has Responded: false` two rows below it,
 * and `test/seed-consistency.test.ts`'s "track the responded status exactly"
 * contract holds for seeded rows while runtime rows drift out of it.
 *
 * `converted` counts as responded too: a member cannot convert without having
 * responded first, and `has_responded` is the "did this person ever engage"
 * flag the response surfaces filter on.
 */
const campaignMemberLifecycle: Hook = {
  name: 'campaign_member_lifecycle',
  object: 'crm_campaign_member',
  events: ['beforeInsert', 'beforeUpdate'],
  priority: 200,
  description: 'Keep has_responded / response_date in lockstep with the member status.',
  handler: async (ctx: HookContext) => {
    const { input } = ctx;
    const previous = ctx.previous;
    const status =
      (typeof input.status === 'string' && input.status) ||
      (typeof previous?.status === 'string' ? (previous.status as string) : undefined);
    if (!status) return;

    // The responded set is spelled INLINE, not lifted to a module constant: a
    // sandboxed body cannot reach module scope, and a handler that reads one
    // stops lowering to metadata (see `campaign.hook.ts`'s header).
    const responded = status === 'responded' || status === 'converted';
    const priorStatus = typeof previous?.status === 'string' ? (previous.status as string) : '';
    const wasResponded = priorStatus === 'responded' || priorStatus === 'converted';

    if (responded) {
      input.has_responded = true;
      // Stamp a response date only when the member is CROSSING into a responded
      // state and does not already carry one. Re-stamping on every later edit
      // would quietly move the response date forward each time somebody touched
      // the row, and response-time reporting reads this column.
      const existing = input.response_date ?? previous?.response_date;
      if (!wasResponded && (existing === undefined || existing === null || existing === '')) {
        input.response_date = new Date().toISOString();
      }
      return;
    }

    // Moving BACK out of a responded state (a mis-click corrected, or a member
    // reset to `sent` for a re-send) clears the summary with it. Leaving
    // `has_responded: true` behind on a `sent` member is the same disagreement
    // in the other direction, and it inflates nothing visible — which is
    // exactly why it would survive review.
    if (wasResponded && typeof input.status === 'string') {
      input.has_responded = false;
      input.response_date = null;
      return;
    }
    if (ctx.event === 'beforeInsert' && input.has_responded === undefined) {
      input.has_responded = false;
    }
  },
};

/**
 * Round-trip `unsubscribed` to the person's `email_opt_out`.
 *
 * This closes a loop the app already had one half of: `campaign_enrollment`
 * filters on `email_opt_out: false`, and the `send_email` action hides itself
 * on an opted-out contact — but NOTHING ever set the flag, so honouring it was
 * a promise about a column no user action could reach. Unsubscribing a member
 * marked the junction row and left the person enrollable by the very next
 * campaign, which is the failure mode an opt-out exists to prevent.
 *
 * Deliberately one-directional: member `unsubscribed` ⇒ person opted out.
 * The reverse (person opts out ⇒ close their open memberships) is NOT done
 * here — a past campaign's membership is a historical record, and rewriting it
 * would falsify what happened at the time.
 *
 * `async` + `onError: 'log'`: the member write is the user's action and must
 * not fail because the lead row is locked or gone. A missed sync is recovered
 * by the next unsubscribe; a rejected write loses the unsubscribe itself.
 */
const campaignMemberOptOutSync: Hook = {
  name: 'campaign_member_optout_sync',
  object: 'crm_campaign_member',
  events: ['afterInsert', 'afterUpdate'],
  priority: 300,
  async: true,
  onError: 'log',
  description: 'Sync an unsubscribed member back to the lead/contact email_opt_out flag.',
  handler: async (ctx: HookContext) => {
    const api = ctx.api as HookApi | undefined;
    if (!api) return;
    const { input } = ctx;
    const previous = ctx.previous;
    if (input?.status !== 'unsubscribed') return;
    // Already unsubscribed ⇒ already synced. Re-running would be harmless
    // (the write is idempotent) but it would also re-open a row on every
    // unrelated edit of an unsubscribed member.
    if (previous?.status === 'unsubscribed') return;

    const leadId =
      (typeof input?.crm_lead === 'string' && input.crm_lead) ||
      (typeof previous?.crm_lead === 'string' ? (previous.crm_lead as string) : undefined);
    const contactId =
      (typeof input?.crm_contact === 'string' && input.crm_contact) ||
      (typeof previous?.crm_contact === 'string' ? (previous.crm_contact as string) : undefined);

    // Exactly one of the two is set — `lead_or_contact_required` on the object
    // guarantees at least one, and the enrollment writers never set both. Both
    // branches run anyway rather than an if/else, so a row that somehow carries
    // both still opts out both people instead of half of them.
    if (leadId) {
      await api.object('crm_lead').update(
        { id: leadId, email_opt_out: true },
        { where: { id: leadId } },
      );
    }
    if (contactId) {
      await api.object('crm_contact').update(
        { id: contactId, email_opt_out: true },
        { where: { id: contactId } },
      );
    }
  },
};

/**
 * Recompute the campaign's metric block on every membership change.
 *
 * THIS is the hook the "metrics are live" acceptance criterion rests on:
 * enrolling a member, marking one responded, or removing one moves
 * `num_sent` / `num_responses` / `num_leads` / `num_converted_leads`
 * immediately — no waiting for the campaign to reach `completed`, which is
 * what the removed `campaign_snapshot_metrics` made everyone wait for.
 *
 * Both sides on update: moving a member between campaigns has to decrement the
 * old campaign as well as increment the new one.
 *
 * No loop: this writes `crm_campaign`, and the campaign-side refresh only fires
 * on a `status` transition, which a metric-only write does not carry.
 */
const campaignMemberMetricsRefresh: Hook = {
  name: 'campaign_member_metrics_refresh',
  object: 'crm_campaign_member',
  events: ['afterInsert', 'afterUpdate', 'afterDelete'],
  priority: 800,
  async: true,
  onError: 'log',
  description: 'Recompute the campaign metric block live whenever its membership changes.',
  handler: async (ctx: HookContext) => {
    const api = ctx.api as HookApi | undefined;
    if (!api) return;
    const { input } = ctx;
    const previous = ctx.previous;
    const campaignIds = Array.from(new Set([
      typeof input?.crm_campaign === 'string' ? input.crm_campaign : '',
      typeof previous?.crm_campaign === 'string' ? (previous.crm_campaign as string) : '',
    ].filter(Boolean)));
    for (const id of campaignIds) {
      // ── recompute ── identical in all four refresh hooks; see the header.
      const memberRows = await api.object('crm_campaign_member').find({
        where: { crm_campaign: id }, fields: ['crm_lead', 'status'], top: 5000,
      });
      const leadIds = Array.from(new Set(
        memberRows.map((r) => (typeof r.crm_lead === 'string' ? r.crm_lead : '')).filter(Boolean),
      ));
      const convertedLeads = leadIds.length > 0
        ? await api.object('crm_lead').count({ where: { id: { $in: leadIds }, is_converted: true } })
        : 0;
      const numOpportunities = await api.object('crm_opportunity').count({ where: { crm_campaign: id } });
      const numWon = await api.object('crm_opportunity').count({ where: { crm_campaign: id, stage: 'closed_won' } });
      const wonRows = await api.object('crm_opportunity').find({
        where: { crm_campaign: id, stage: 'closed_won' }, fields: ['amount'], top: 5000,
      });
      const actualRevenue = wonRows.reduce(
        (sum, row) => sum + (typeof row.amount === 'number' ? row.amount : Number(row.amount) || 0), 0,
      );
      await api.object('crm_campaign').update({
        id,
        num_sent: memberRows.length,
        num_responses: memberRows.filter((r) => r.status === 'responded' || r.status === 'converted').length,
        num_leads: leadIds.length,
        num_converted_leads: convertedLeads,
        num_opportunities: numOpportunities,
        num_won_opportunities: numWon,
        actual_revenue: actualRevenue,
      }, { where: { id } });
      // ── /recompute ──
    }
  },
};

export default [
  campaignMemberLifecycle,
  campaignMemberOptOutSync,
  campaignMemberMetricsRefresh,
];
