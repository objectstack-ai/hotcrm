// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { P } from '@objectstack/spec';
import type * as Automation from '@objectstack/spec/automation';
type Flow = Automation.Flow;

/**
 * Opportunity Stagnation — scheduled "deal-rot" detector.
 *
 * The opportunity carries `stage_entry_date` (stamped by the lifecycle hook on
 * insert and on every stage change), but nothing acted on it, so deals could
 * sit untouched in a stage indefinitely. This daily sweep finds open
 * opportunities stalled longer than the threshold, nudges the owner and books
 * a follow-up task so the deal re-enters the working set. A deal with an
 * open stall task is skipped (idempotency), so each stall episode produces
 * exactly one nudge; completing the task re-arms it.
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
        // Predicate on the STORED `stage_entry_date`, not on `days_in_stage`:
        // the latter is a formula, computed after the query, so as a filter key
        // it addressed a column that does not exist (#489). `entry < today − N`
        // is the same test as `days_in_stage > N`, resolved by the flow
        // template engine (same `{TODAY() ± n}` token as contract-renewal).
        // A row with a null `stage_entry_date` does not satisfy `$lt` and is
        // skipped, preserving "nothing has stagnated yet" for unstamped rows.
        filter: {
          stage: { $nin: ['closed_won', 'closed_lost'] },
          stage_entry_date: { $lt: `{TODAY() - ${STALE_THRESHOLD_DAYS}}` },
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
              // Idempotency gate: a still-open stall task means this deal was
              // already nudged. Without this the daily sweep re-notified and
              // re-created an identical task every morning for as long as the
              // deal stayed stalled (unbounded duplicate pile-up).
              id: 'find_existing_task', type: 'get_record', label: 'Already Nudged?',
              config: {
                objectName: 'crm_task',
                filter: {
                  related_to_opportunity: '{currentOpp.id}',
                  subject: 'Advance stalled deal: {currentOpp.name}',
                  status: { $nin: ['completed'] },
                },
                outputVariable: 'existingStallTask',
              },
            },
            {
              id: 'check_not_nudged', type: 'decision', label: 'First Nudge?',
              config: { condition: P`existingStallTask == null` },
            },
            {
              // Owner only: `{currentOpp.owner.manager}` cannot traverse a
              // lookup in flow templates — it interpolates to the literal
              // "undefined" (cf. opportunity_won_alert).
              id: 'notify_owner', type: 'notify', label: 'Nudge Owner',
              config: {
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
            { id: 'b1', source: 'find_existing_task', target: 'check_not_nudged', type: 'default' },
            // "Already nudged" has no edge, so the loop moves to the next item.
            { id: 'b2', source: 'check_not_nudged', target: 'notify_owner', type: 'conditional', condition: P`existingStallTask == null`, label: 'First nudge' },
            { id: 'b3', source: 'notify_owner', target: 'create_followup_task', type: 'default' },
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
