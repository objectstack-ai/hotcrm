// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type * as Automation from '@objectstack/spec/automation';
import { guarded } from './_guarded-iteration';
type Flow = Automation.Flow;

/**
 * Campaign auto-completion — scheduled daily sweep.
 *
 * Migrated from the removed `campaign_completion_check` object workflow (7.7
 * dropped `workflows[]` on object schemas; scheduled automation is now a
 * `type: 'schedule'` flow). Each night it flips `in_progress` campaigns whose
 * `end_date` has passed to `completed` — a `status` transition, which is one of
 * the triggers `campaign_metrics_refresh` (`campaign.hook.ts`) recomputes the
 * metric block on.
 *
 * ⚠️ That is a REFRESH, not a snapshot. Since #597 the block is kept live by
 * four refresh hooks — `campaign_metrics_refresh`,
 * `campaign_attribution_refresh`, `campaign_lead_conversion_refresh` and
 * `campaign_member_metrics_refresh` — so this sweep is not the moment the
 * numbers arrive, it is just one more transition over numbers that were already
 * current.
 */
export const CampaignCompletionFlow: Flow = {
  name: 'campaign_completion',
  label: 'Campaign Auto-Completion',
  description: 'Daily: mark in_progress campaigns whose end_date has passed as completed.',
  type: 'schedule',
  status: 'active',
  // Scheduled runs have no trigger user, so under the default runAs:'user' the
  // data nodes execute UNSCOPED anyway. Declare runAs:'system' to make that
  // RLS-bypassing elevation explicit and intended (ADR-0049, #1888).
  runAs: 'system',
  variables: [],
  nodes: [
    { id: 'start', type: 'start', label: 'Start (daily 02:00)', config: { schedule: '0 2 * * *' } },
    {
      id: 'query_campaigns', type: 'get_record', label: 'Find Ended Campaigns',
      config: {
        objectName: 'crm_campaign',
        filter: { status: 'in_progress', end_date: { $lt: '{TODAY()}' } },
        limit: 500,
        outputVariable: 'campaignList',
      },
    },
    {
      id: 'loop_campaigns', type: 'loop', label: 'For Each Campaign',
      config: {
        collection: '{campaignList}',
        iteratorVariable: 'currentCampaign',
        body: guarded('campaign', {
          nodes: [
            {
              id: 'mark_completed', type: 'update_record', label: 'Mark Completed',
              config: { objectName: 'crm_campaign', filter: { id: '{currentCampaign.id}' }, fields: { status: 'completed' } },
            },
          ],
          edges: [],
        }),
      },
    },
    { id: 'end', type: 'end', label: 'End' },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'query_campaigns', type: 'default' },
    { id: 'e2', source: 'query_campaigns', target: 'loop_campaigns', type: 'default' },
    { id: 'e3', source: 'loop_campaigns', target: 'end', type: 'default' },
  ],
};
