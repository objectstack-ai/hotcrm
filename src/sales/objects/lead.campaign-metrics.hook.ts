// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from './_hook-api';

/**
 * Campaign metric refresh, triggered by a LEAD conversion.
 *
 * Attached to `crm_lead`, which the sales package owns, so it lives here
 * beside that object rather than with the campaign metadata it maintains
 * (plan item 6: a hook sits beside its object, which is what enforces R4).
 * Its three siblings: `campaign_validation` and `campaign_metrics_refresh` on
 * `crm_campaign` in `src/marketing/objects/campaign.hook.ts`, and
 * `campaign_attribution_refresh` on `crm_opportunity` next door in
 * `opportunity.campaign-metrics.hook.ts`.
 *
 * ⚠️ WHY THE RECOMPUTE IS WRITTEN OUT FOUR TIMES.
 *
 * L2 hook bodies are lowered to metadata and evaluated BODY-ONLY in the QuickJS
 * sandbox: a handler cannot reach module scope at runtime, so a shared
 * `refreshCampaignMetrics()` import would be a free identifier — the CLI build
 * silently declines to lower the handler, keeps it in a bundled runtime file,
 * and the hook stops being deployable as pure metadata (the build says so in
 * one line nobody reads). `test/action-sandbox.test.ts` is what catches it.
 *
 * So the arithmetic is inlined per handler. The duplication is NOT trusted:
 * `test/campaign-member-lifecycle.test.ts` lowers all four bodies and asserts
 * the recompute block is character-identical across them, so a fix landing on
 * one copy and skipping three fails a test instead of shipping four definitions
 * of `num_sent`. Splitting the four across three files by owning object changed
 * none of that — the suite reads them by hook name, not by file.
 */

/**
 * Promote the member rows of a converting lead, then recompute.
 *
 * This hook is `converted`'s ONLY writer, and without it that status option
 * would be exactly the kind of inert vocabulary #597 removed the tracker states
 * for — a value the picklist offers, the ROI surfaces segment by, and nothing
 * produces. Conversion is the one campaign outcome the app can observe by
 * itself: `crm_lead.is_converted` flips (the `lead_conversion` flow, or the
 * convert action), and every campaign that lead was enrolled in has just
 * recorded a conversion.
 *
 * Only members still `sent` or `responded` are promoted. An `unsubscribed`
 * member is NOT: that person asked to be left alone, and overwriting their
 * opt-out state with a marketing outcome is precisely the kind of quiet rewrite
 * `campaign_member_optout_sync` exists to prevent.
 *
 * `num_converted_leads` also counts `crm_lead.is_converted` across the
 * membership, so this same event is the metric's trigger — a lead can sit in
 * several campaigns and every one of them is refreshed.
 */
const campaignLeadConversionRefresh: Hook = {
  name: 'campaign_lead_conversion_refresh',
  object: 'crm_lead',
  events: ['afterUpdate'],
  priority: 810,
  async: true,
  onError: 'log',
  description: 'Promote campaign members of a converting lead and recompute campaign metrics.',
  handler: async (ctx: HookContext) => {
    const api = ctx.api as HookApi | undefined;
    if (!api) return;
    const { input } = ctx;
    const previous = ctx.previous;
    if (input?.is_converted !== true) return;
    if (previous?.is_converted === true) return;
    const leadId =
      (typeof input?.id === 'string' && input.id) ||
      (typeof previous?.id === 'string' ? (previous.id as string) : '');
    if (!leadId) return;
    const memberships = await api.object('crm_campaign_member').find({
      where: { crm_lead: leadId }, fields: ['crm_campaign', 'status'], top: 500,
    });
    for (const m of memberships) {
      const memberId = typeof m.id === 'string' ? m.id : '';
      if (!memberId) continue;
      if (m.status !== 'sent' && m.status !== 'responded') continue;
      await api.object('crm_campaign_member').update(
        { id: memberId, status: 'converted' },
        { where: { id: memberId } },
      );
    }
    const campaignIds = Array.from(new Set(
      memberships.map((m) => (typeof m.crm_campaign === 'string' ? m.crm_campaign : '')).filter(Boolean),
    ));
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

export default [campaignLeadConversionRefresh];
