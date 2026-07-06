// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type * as Automation from '@objectstack/spec/automation';
type Flow = Automation.Flow;

/**
 * Campaign auto-completion — scheduled daily sweep.
 *
 * Migrated from the removed `campaign_completion_check` object workflow (7.7
 * dropped `workflows[]` on object schemas; scheduled automation is now a
 * `type: 'schedule'` flow). Each night it flips `in_progress` campaigns whose
 * `end_date` has passed to `completed` — which the existing
 * `campaign_snapshot_metrics` afterUpdate hook then snapshots into metrics.
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
        body: {
          nodes: [
            {
              id: 'mark_completed', type: 'update_record', label: 'Mark Completed',
              config: { objectName: 'crm_campaign', filter: { id: '{currentCampaign.id}' }, fields: { status: 'completed' } },
            },
          ],
          edges: [],
        },
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
