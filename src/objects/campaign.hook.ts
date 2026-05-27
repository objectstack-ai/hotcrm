// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';

/**
 * Campaign lifecycle hook.
 *
 * - Validates start/end date ordering and prevents `in_progress` without dates.
 * - On `completed`: snapshots the lead/opportunity counts attributed to the campaign
 *   into the campaign's metric fields.
 */

type ApiShape = {
  object: (n: string) => {
    count: (q: { filter: Record<string, unknown> }) => Promise<number>;
    find: (q: { filter: Record<string, unknown>; fields?: string[]; top?: number }) => Promise<Array<Record<string, unknown>>>;
    update: (id: string, doc: Record<string, unknown>) => Promise<unknown>;
  };
};

const campaignValidation: Hook = {
  name: 'campaign_validation',
  object: 'crm_campaign',
  events: ['beforeInsert', 'beforeUpdate'],
  priority: 200,
  description: 'Validate campaign date range and required fields per status.',
  handler: async (ctx: HookContext) => {
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
      throw new Error(`Campaign start_date (${start}) must not be after end_date (${end}).`);
    }
    const status =
      (typeof input.status === 'string' && input.status) ||
      (typeof previous?.status === 'string' && (previous.status as string)) ||
      undefined;
    if (status === 'in_progress' && (!start || !end)) {
      throw new Error('Campaign cannot move to in_progress without both start_date and end_date.');
    }
  },
};

const campaignCompleted: Hook = {
  name: 'campaign_snapshot_metrics',
  object: 'crm_campaign',
  events: ['afterUpdate'],
  priority: 800,
  async: true,
  onError: 'log',
  description: 'On completion, snapshot attributed lead/opportunity counts and ROI metrics.',
  handler: async (ctx: HookContext) => {
    const { input } = ctx;
    const previous = ctx.previous;
    if (input.status !== 'completed' || previous?.status === 'completed') return;
    const api = ctx.api as ApiShape | undefined;
    if (!api) return;
    const id =
      (typeof input.id === 'string' && input.id) ||
      (typeof previous?.id === 'string' ? (previous.id as string) : undefined);
    if (!id) return;

    const [
      leads,
      convertedLeads,
      opportunities,
      wonOpps,
      members,
      responded,
      sent,
      wonOppRecords,
    ] = await Promise.all([
      api.object('crm_lead').count({ filter: { campaign: id } }),
      api.object('crm_lead').count({ filter: { campaign: id, is_converted: true } }),
      api.object('crm_opportunity').count({ filter: { crm_campaign: id } }),
      api.object('crm_opportunity').count({ filter: { crm_campaign: id, stage: 'closed_won' } }),
      api.object('crm_campaign_member').count({ filter: { crm_campaign: id } }),
      api.object('crm_campaign_member').count({ filter: { crm_campaign: id, status: 'responded' } }),
      api.object('crm_campaign_member').count({ filter: { crm_campaign: id, status: 'sent' } }),
      api.object('crm_opportunity').find({
        filter: { crm_campaign: id, stage: 'closed_won' },
        fields: ['amount'],
        top: 5000,
      }),
    ]);

    const actualRevenue = wonOppRecords.reduce((sum, row) => {
      const amt = typeof row.amount === 'number' ? row.amount : Number(row.amount) || 0;
      return sum + amt;
    }, 0);

    await api.object('crm_campaign').update(id, {
      num_leads: leads,
      num_converted_leads: convertedLeads,
      num_opportunities: opportunities,
      num_won_opportunities: wonOpps,
      num_sent: sent || members,
      num_responses: responded,
      actual_revenue: actualRevenue,
    });
  },
};

export default [campaignValidation, campaignCompleted];
