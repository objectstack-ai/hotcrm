// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from './_hook-api';

/**
 * Campaign metric refresh, triggered by an OPPORTUNITY write.
 *
 * The hook is campaign arithmetic, but it is attached to `crm_opportunity`,
 * which the sales package owns — and since the ADR-0130 layout a hook lives
 * beside the object it names (plan item 6: R4 is enforced by co-location
 * rather than by reading). Its three siblings: `campaign_validation` and
 * `campaign_metrics_refresh` on `crm_campaign` in
 * `src/marketing/objects/campaign.hook.ts`, and
 * `campaign_lead_conversion_refresh` on `crm_lead` next door in
 * `lead.campaign-metrics.hook.ts`. The membership side of the same recompute
 * is `src/marketing/objects/campaign_member.hook.ts`.
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
 * Recompute when an opportunity's campaign attribution changes.
 *
 * `num_opportunities`, `num_won_opportunities` and `actual_revenue` derive from
 * opportunities, not from members — so the membership trigger alone would leave
 * exactly the three metrics `roi` is built on stale. Insert / update / delete,
 * and both sides of a re-attribution (old and new campaign), the same way the
 * line-item rollup handles re-parenting.
 *
 * Declared here rather than in `opportunity.hook.ts` on purpose: it is campaign
 * arithmetic that happens to be triggered by an opportunity write, and the
 * hooks barrel flattens each `*.hook.ts` default export regardless of which
 * object each entry names.
 */
const campaignAttributionRefresh: Hook = {
  name: 'campaign_attribution_refresh',
  object: 'crm_opportunity',
  events: ['afterInsert', 'afterUpdate', 'afterDelete'],
  priority: 810,
  async: true,
  onError: 'log',
  description: 'Recompute campaign metrics when an opportunity’s campaign attribution changes.',
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

export default [campaignAttributionRefresh];
