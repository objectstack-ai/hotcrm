// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from '../../sales/objects/_hook-api';

/**
 * Campaign lifecycle hooks.
 *
 * - `campaign_validation` — start/end date ordering, and no `in_progress`
 *   without both dates.
 * - `campaign_metrics_refresh` — recompute the metric block when the campaign's
 *   own status moves.
 * The other two hooks of this family are attached to objects the SALES package
 * owns, so since the ADR-0130 layout they sit beside those objects instead
 * (plan item 6 — co-location is what enforces R4):
 *
 * - `campaign_attribution_refresh` (`crm_opportunity`) —
 *   `src/sales/objects/opportunity.campaign-metrics.hook.ts`
 * - `campaign_lead_conversion_refresh` (`crm_lead`) —
 *   `src/sales/objects/lead.campaign-metrics.hook.ts`
 *
 * The membership side of the same recompute lives in `campaign_member.hook.ts`.
 * Together these are what replaced the single completion-time snapshot (#597):
 * every input a campaign metric derives from now has a trigger that refreshes
 * the metric when it changes, so a LIVE campaign reports live numbers instead
 * of zeros until the day it ends.
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
 * So the arithmetic is inlined per handler, the same way `account_protection`
 * inlines the territory table rather than importing `_territory.ts`. The
 * duplication is NOT trusted: `test/campaign-member-lifecycle.test.ts` lowers
 * all four bodies and asserts the recompute block is character-identical across
 * them, so a fix landing on one copy and skipping three fails a test instead of
 * shipping four definitions of `num_sent`. Splitting the four across three
 * files by owning object changed none of that — the suite reads them by hook
 * name, not by file.
 */

const campaignValidation: Hook = {
  name: 'campaign_validation',
  object: 'crm_campaign',
  events: ['beforeInsert', 'beforeUpdate'],
  priority: 200,
  description: 'Validate campaign date range and required fields per status.',
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
    const { input } = ctx;
    const previous = ctx.previous;
    const start =
      (typeof input.start_date === 'string' && input.start_date) ||
      (typeof previous?.start_date === 'string' && (previous.start_date as string)) ||
      undefined;
    const end =
      (typeof input.end_date === 'string' && input.end_date) ||
      (typeof previous?.end_date === 'string' && (previous.end_date as string)) ||
      undefined;
    if (start && end && start > end) {
      throw refuse(`Campaign start_date (${start}) must not be after end_date (${end}).`, 'VALIDATION_FAILED', 400);
    }
    const status =
      (typeof input.status === 'string' && input.status) ||
      (typeof previous?.status === 'string' && (previous.status as string)) ||
      undefined;
    if (status === 'in_progress' && (!start || !end)) {
      throw refuse('Campaign cannot move to in_progress without both start_date and end_date.', 'VALIDATION_FAILED', 400);
    }
  },
};

/**
 * Recompute this campaign's metrics when its own status moves.
 *
 * ⚠️ RECURSION. This hook writes to the object it listens on, so its trigger
 * has to be a condition its own write cannot satisfy. It is: the write carries
 * the metric block and nothing else, and this fires only on a `status`
 * TRANSITION — `input.status` present AND different from `previous.status`. A
 * metric-only write has no `status` key at all, so the re-entry ends at the
 * first guard. `CAMPAIGN_METRIC_WRITE_KEYS` at the bottom of this file states
 * the other half of that contract as data the runtime test checks the recorded
 * write against, so a future writer that adds a non-metric key to the refresh
 * write fails a test instead of looping in production.
 *
 * The old `campaign_snapshot_metrics` fired on `→ completed` and nothing else,
 * which meant a campaign reported zeros for its entire useful life and became
 * accurate on the day everybody stopped looking at it. Completion is now simply
 * one of the transitions this catches.
 */
const campaignMetricsRefresh: Hook = {
  name: 'campaign_metrics_refresh',
  object: 'crm_campaign',
  events: ['afterUpdate'],
  priority: 800,
  async: true,
  onError: 'log',
  description: 'Recompute the campaign metric block whenever the campaign status moves.',
  handler: async (ctx: HookContext) => {
    const { input } = ctx;
    const previous = ctx.previous;
    // The recursion guard, stated positively: only a status TRANSITION runs.
    if (typeof input.status !== 'string') return;
    if (previous && input.status === previous.status) return;
    const api = ctx.api as HookApi | undefined;
    if (!api) return;
    const campaignId =
      (typeof input.id === 'string' && input.id) ||
      (typeof previous?.id === 'string' ? (previous.id as string) : '');
    if (!campaignId) return;
    for (const id of [campaignId]) {
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

/**
 * The metric block these hooks own. Nothing else may write these columns.
 *
 * Module scope, deliberately OUTSIDE every handler: this is read by the tests,
 * never by a sandboxed body — a body that referenced it would stop lowering
 * (see the header).
 */
export const CAMPAIGN_METRIC_FIELDS: readonly string[] = [
  'num_sent',
  'num_responses',
  'num_leads',
  'num_converted_leads',
  'num_opportunities',
  'num_won_opportunities',
  'actual_revenue',
];

/**
 * The recursion contract of `campaign_metrics_refresh`, asserted rather than
 * described: the refresh write may carry the metric block and `id`, nothing
 * else. A comment cannot fail; this is checked against the recorded write.
 */
export const CAMPAIGN_METRIC_WRITE_KEYS: readonly string[] = ['id', ...CAMPAIGN_METRIC_FIELDS];

export default [campaignValidation, campaignMetricsRefresh];
