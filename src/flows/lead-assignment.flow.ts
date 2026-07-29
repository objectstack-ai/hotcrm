// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type * as Automation from '@objectstack/spec/automation';
type Flow = Automation.Flow;

/**
 * Lead Assignment & Routing — react the instant a new lead lands.
 *
 * New leads previously sat with no follow-up SLA and no routing, so hot leads
 * could go cold before anyone looked. This flow fires on lead *insert*, sets a
 * rating-based `next_followup_date` SLA, and alerts the lead's OWNER (the
 * accountable party) to follow up. The alert originally targeted a
 * 'sales_manager' position, but positions aren't a messaging audience so it
 * reached nobody; with no territory / round-robin table modelled, the owner is
 * the correct recipient. (Swap to a `team:`/`role:` audience once a manager
 * group is seeded.)
 *
 * Trigger wiring (7.4): the `start` node declares `triggerType:
 * 'record-after-create'` so the record-change trigger provider binds it to the
 * ObjectQL `afterInsert` lifecycle hook. Firing on insert only means the SLA
 * write does not re-trigger the flow. The full record is seeded into the run,
 * so fields are read via `{record.*}` (no get_record round-trip needed).
 *
 * Capabilities exercised: record-change trigger + `decision` branching on lead
 * quality + `update_record` (SLA stamp) + `notify` to a role queue.
 */
export const LeadAssignmentFlow: Flow = {
  name: 'lead_assignment',
  label: 'New Lead Routing & SLA',
  description: 'On new lead: set a rating-based follow-up SLA and alert the lead owner.',
  type: 'record_change',
  status: 'active',

  variables: [],

  nodes: [
    {
      id: 'start', type: 'start', label: 'Start (lead created)',
      config: { objectName: 'crm_lead', triggerType: 'record-after-create' },
    },
    {
      id: 'check_hot', type: 'decision', label: 'Hot Lead (rating ≥ 4)?',
      config: { condition: 'record.rating >= 4' },
    },

    // ── Hot path: 1-day SLA, high-severity alert ───────────────────
    {
      id: 'sla_hot', type: 'update_record', label: 'Set 1-Day SLA',
      config: { objectName: 'crm_lead', filter: { id: '{record.id}' }, fields: { next_followup_date: '{TODAY() + 1}' } },
    },
    {
      id: 'notify_hot', type: 'notify', label: 'Alert — Hot Lead',
      config: {
        // Route to the lead's OWNER (a real user id). A CRM position like
        // 'sales_manager' is NOT a messaging audience — the messaging service
        // resolves user:/role:(sys_member)/team:/owner_of:, and a bare
        // 'sales_manager' was stored verbatim as sys_inbox_message.user_id,
        // matching no real user, so these alerts reached nobody. owner is set
        // on insert (defaultValue os.user.id) and is the accountable party.
        to: ['{record.owner}'],
        channels: ['inbox', 'email'],
        severity: 'warning',
        topic: 'lead_routing',
        title: 'Hot lead — assign within 24h: {record.first_name} {record.last_name}',
        body: '{record.first_name} {record.last_name} from {record.company} (rating {record.rating}) needs an owner today.',
        actionUrl: '/crm_lead/{record.id}',
      },
    },

    // ── Standard path: 3-day SLA, normal alert ─────────────────────
    {
      id: 'sla_std', type: 'update_record', label: 'Set 3-Day SLA',
      config: { objectName: 'crm_lead', filter: { id: '{record.id}' }, fields: { next_followup_date: '{TODAY() + 3}' } },
    },
    {
      id: 'notify_std', type: 'notify', label: 'Alert — New Lead',
      config: {
        // Route to the lead's owner — see notify_hot for why a bare
        // 'sales_manager' position never reached anyone.
        to: ['{record.owner}'],
        channels: ['inbox'],
        topic: 'lead_routing',
        title: 'New lead to assign: {record.first_name} {record.last_name}',
        body: '{record.first_name} {record.last_name} from {record.company} is awaiting assignment.',
        actionUrl: '/crm_lead/{record.id}',
      },
    },

    { id: 'end', type: 'end', label: 'End' },
  ],

  edges: [
    { id: 'e1', source: 'start', target: 'check_hot', type: 'default' },
    { id: 'e2', source: 'check_hot', target: 'sla_hot', type: 'conditional', condition: 'record.rating >= 4', label: 'Hot' },
    { id: 'e3', source: 'check_hot', target: 'sla_std', type: 'conditional', condition: 'record.rating < 4', label: 'Standard' },
    { id: 'e4', source: 'sla_hot', target: 'notify_hot', type: 'default' },
    { id: 'e5', source: 'notify_hot', target: 'end', type: 'default' },
    { id: 'e6', source: 'sla_std', target: 'notify_std', type: 'default' },
    { id: 'e7', source: 'notify_std', target: 'end', type: 'default' },
  ],
};
