// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { P } from '@objectstack/spec';
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
      // Branching lives on edges `e2` / `e3` — see the totality note there.
      // This node carries no `config.condition`: the engine never evaluates a
      // `decision` node's singular one, so a copy here would restate the gate
      // without being the gate (17.0.0-rc.2's `flow-inert-node-condition`,
      // #4414).
      id: 'check_hot', type: 'decision', label: 'Hot Lead (rating ≥ 4)?',
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
        recipients: ['{record.owner}'],
        channels: ['inbox', 'email'],
        severity: 'warning',
        topic: 'lead_routing',
        title: 'Hot lead — assign within 24h: {record.first_name} {record.last_name}',
        message: '{record.first_name} {record.last_name} from {record.company} (rating {record.rating}) needs an owner today.',
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
        recipients: ['{record.owner}'],
        channels: ['inbox'],
        topic: 'lead_routing',
        title: 'New lead to assign: {record.first_name} {record.last_name}',
        message: '{record.first_name} {record.last_name} from {record.company} is awaiting assignment.',
        actionUrl: '/crm_lead/{record.id}',
      },
    },

    { id: 'end', type: 'end', label: 'End' },
  ],

  edges: [
    { id: 'e1', source: 'start', target: 'check_hot', type: 'default' },
    // TOTALITY (#633): these two edges must PARTITION every lead — a rating
    // the predicate cannot read has to fall down one branch, never neither.
    // Guarding both with `has(...) &&` would have traded a loud abort for a
    // silent no-op (unrated lead → no SLA, no alert, no error), which is the
    // "declared ≠ enforced" shape this repo keeps deleting rules over. So the
    // hot branch demands a readable rating and the standard branch absorbs
    // everything else: an unrated lead is, correctly, not a hot lead.
    //
    // `rating` is neither required nor defaulted, so a lead written without one
    // is stored with NO `rating` column on driver-memory / driver-mongodb.
    // Measured end-to-end: the unguarded `record.rating >= 4` aborted with `No
    // such key: rating` and an unrated lead got no SLA stamp and no alert at
    // all. `has()` alone is not enough on an ORDERING comparison — an explicit
    // `rating: null` passes `has()` and then aborts with `no such overload:
    // dyn<null> >= int` — so both guards are required, in this order.
    { id: 'e2', source: 'check_hot', target: 'sla_hot', type: 'conditional', condition: P`has(record.rating) && record.rating != null && record.rating >= 4`, label: 'Hot' },
    { id: 'e3', source: 'check_hot', target: 'sla_std', type: 'conditional', condition: P`!has(record.rating) || record.rating == null || record.rating < 4`, label: 'Standard' },
    { id: 'e4', source: 'sla_hot', target: 'notify_hot', type: 'default' },
    { id: 'e5', source: 'notify_hot', target: 'end', type: 'default' },
    { id: 'e6', source: 'sla_std', target: 'notify_std', type: 'default' },
    { id: 'e7', source: 'notify_std', target: 'end', type: 'default' },
  ],
};
