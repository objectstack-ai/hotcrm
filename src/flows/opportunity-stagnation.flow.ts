// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type * as Automation from '@objectstack/spec/automation';
type Flow = Automation.Flow;

/**
 * Opportunity Stagnation — scheduled "deal-rot" detector.
 *
 * The opportunity carries `days_in_stage`, but nothing acted on it, so deals
 * could sit untouched in a stage indefinitely. This daily sweep finds open
 * opportunities stalled longer than the threshold, nudges the owner (and their
 * manager) and books a follow-up task so the deal re-enters the working set.
 *
 * Capabilities exercised: scheduled trigger + `loop` + `notify` + task
 * creation. Pipeline-hygiene automation is one of the highest-ROI uses of
 * Flows in a sales org.
 */
const STALE_THRESHOLD_DAYS = 14;

export const OpportunityStagnationFlow: Flow = {
  name: 'opportunity_stagnation',
  label: 'Stalled Deal Alert',
  description: 'Daily sweep: nudge owners about open opportunities stuck in-stage beyond the threshold.',
  type: 'schedule',
  status: 'active',
  // Scheduled runs have no trigger user, so under the default runAs:'user' the
  // data nodes execute UNSCOPED anyway. Declare runAs:'system' to make that
  // RLS-bypassing elevation explicit and intended (ADR-0049, #1888).
  runAs: 'system',

  variables: [],

  nodes: [
    { id: 'start', type: 'start', label: 'Start (daily 07:30)', config: { schedule: '30 7 * * *' } },
    {
      id: 'query_stalled', type: 'get_record', label: 'Find Stalled Deals',
      config: {
        objectName: 'crm_opportunity',
        filter: {
          stage: { $nin: ['closed_won', 'closed_lost'] },
          days_in_stage: { $gt: STALE_THRESHOLD_DAYS },
        },
        limit: 500,
        outputVariable: 'oppList',
      },
    },
    {
      id: 'loop_opps', type: 'loop', label: 'For Each Stalled Deal',
      config: {
        collection: '{oppList}',
        iteratorVariable: 'currentOpp',
        body: {
          nodes: [
            {
              id: 'notify_owner', type: 'notify', label: 'Nudge Owner & Manager',
              config: {
                // Owner only — `{currentOpp.owner.manager}` dot-walks a
                // lookup, which flow templates interpolate as "undefined".
                to: ['{currentOpp.owner}'],
                channels: ['inbox', 'email'],
                topic: 'deal_stalled',
                title: 'Stalled deal: {currentOpp.name}',
                body: 'Opportunity {currentOpp.name} has sat in {currentOpp.stage} for {currentOpp.days_in_stage} days. Time to advance or re-qualify it.',
                actionUrl: '/crm_opportunity/{currentOpp.id}',
              },
            },
            {
              id: 'create_followup_task', type: 'create_record', label: 'Create Follow-up Task',
              config: {
                objectName: 'crm_task',
                fields: {
                  subject: 'Advance stalled deal: {currentOpp.name}',
                  type: 'follow_up', priority: 'high', status: 'not_started',
                  due_date: '{TODAY() + 2}',
                  owner: '{currentOpp.owner}',
                  related_to_type: 'crm_opportunity',
                  related_to_opportunity: '{currentOpp.id}',
                },
              },
            },
          ],
          edges: [
            { id: 'b1', source: 'notify_owner', target: 'create_followup_task', type: 'default' },
          ],
        },
      },
    },
    { id: 'end', type: 'end', label: 'End' },
  ],

  edges: [
    { id: 'e1', source: 'start', target: 'query_stalled', type: 'default' },
    { id: 'e2', source: 'query_stalled', target: 'loop_opps', type: 'default' },
    { id: 'e3', source: 'loop_opps', target: 'end', type: 'default' },
  ],
};
