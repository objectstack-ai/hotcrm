// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { P, cel } from '@objectstack/spec';
import type * as Automation from '@objectstack/spec/automation';
type Flow = Automation.Flow;

/**
 * Lead Assignment & Routing — react the instant a new lead lands.
 *
 * Fires on lead *insert*, sets a rating-based `next_followup_date` SLA, and
 * alerts the lead's OWNER — the accountable party — to follow up:
 *
 * - a HOT lead alerts its owner whoever wrote it. The alert IS the 24h
 *   follow-up SLA, and "hot" is the system's verdict (the rating is scored on
 *   insert when the writer gave none), so the owner hears it even for a lead
 *   they typed in themselves.
 * - a STANDARD lead alerts its owner only when someone ELSE put it in their
 *   name: `lead_auto_assign`'s pick on web-to-lead or a user-less import, an
 *   integration's named owner, a colleague with transfer rights logging it for
 *   them. A write that carries a user is stamped with that user as owner, so
 *   before the creator test on `e10` every lead a rep created told that same
 *   rep "New lead to assign … is awaiting assignment" (#2073 item 7).
 *
 * Both templates address the owner: the lead is theirs to follow up. ⛔ Neither
 * may say the lead awaits assignment: no lead reaching a notify node does (the
 * owner gates below), and whoever assigns leads is no messaging audience (the
 * position note below), so an "awaiting assignment" alert has nobody to go to.
 *
 * A lead with NO owner gets its SLA stamp and no alert, and the run ends
 * there successfully (#2060 item 6). Web-to-lead lands ownerless whenever
 * `lead_auto_assign` stands down (an empty `sales_rep` pool, or a pool the
 * writer cannot read), and so can a seed or integration write. There is
 * nobody to alert: the business declares no recipient for ownerless intake
 * (no queue, no position — `content/docs/administration/setup.mdx` §8), and
 * `notify` REFUSES an audience that evaluates to nothing, so before the owner
 * gates below the run FAILED at the notify node, after the stamp had landed.
 *
 * ⛔ Never address a CRM position (`sales_manager` and friends) as a recipient.
 * Positions are not a messaging audience: the messaging service resolves
 * `user:` / `role:` (sys_member) / `team:` / `owner_of:`, and a bare position
 * name is stored verbatim as `sys_inbox_message.user_id`, matching no real user,
 * so the alert reaches nobody. `role:` is organization membership
 * (owner / admin / member), not a sales rung, and this app seeds no `team:`.
 * With no territory / round-robin table modelled, the owner is the correct
 * recipient. (Swap to a `team:`/`role:` audience once a manager group is seeded.)
 *
 * Trigger wiring: the `start` node declares `triggerType: 'record-after-create'`
 * so the record-change trigger provider binds it to the ObjectQL `afterInsert`
 * lifecycle hook. Firing on insert only means the SLA write does not re-trigger
 * the flow. The full record is seeded into the run, so fields are read via
 * `record.*` (no get_record round-trip needed).
 */
export const LeadAssignmentFlow: Flow = {
  name: 'lead_assignment',
  label: 'New Lead Routing & SLA',
  description: 'On new lead: set a rating-based follow-up SLA and alert the lead owner (a standard lead only when someone else assigned it).',
  type: 'record_change',
  status: 'active',
  // A record-change flow fired by a SYSTEM write carries no trigger user
  // either (ADR-0049). This is the population the flow is FOR:
  // leads arrive from web-to-lead, a CSV import, a partner integration or a
  // seed load, none of which carry a user session. Measured on 17.0.0-rc.2, a
  // user-less run refuses `sla_hot` / `sla_std` outright, so the lead lands
  // with no follow-up SLA and no alert at all — silently, since the refusal
  // surfaces only in the server log.
  //
  // Elevating the USER-driven runs too is correct: the SLA stamp is the
  // platform's routing decision about the row that just fired the trigger
  // (keyed to `{record.id}`), not the submitting rep's own edit, and a rep who
  // may create a lead is not thereby guaranteed edit rights on it.
  runAs: 'system',

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
      // without being the gate (17.0.0-rc.2's `flow-inert-node-condition`).
      id: 'check_hot', type: 'decision', label: 'Hot Lead (rating ≥ 4)?',
    },

    // ── Hot path: 1-day SLA, high-severity alert ───────────────────
    {
      id: 'sla_hot', type: 'update_record', label: 'Set 1-Day SLA',
      config: { objectName: 'crm_lead', filter: { id: cel`record.id` }, fields: { next_followup_date: cel`isoDate(daysFromNow(1))` } },
    },
    {
      // Gateway only — the predicate lives on its out-edges `e8` / `e9`.
      id: 'owner_hot', type: 'decision', label: 'Has an Owner?',
    },
    {
      id: 'notify_hot', type: 'notify', label: 'Alert — Hot Lead',
      config: {
        // Route to the lead's OWNER (a real user id). A CRM position like
        // 'sales_manager' is NOT a messaging audience — the messaging service
        // resolves user:/role:(sys_member)/team:/owner_of:, and a bare
        // 'sales_manager' was stored verbatim as sys_inbox_message.user_id,
        // matching no real user, so these alerts reached nobody. A write that
        // carries a user is stamped with that user as owner, and
        // `lead_auto_assign` fills an ownerless one from the rep pool when it
        // can; a lead still ownerless never reaches this node (`owner_hot`).
        // Unlike `notify_std`, a lead its owner wrote still comes here — see
        // the header.
        recipients: [cel`record.owner_id`],
        channels: ['inbox', 'email'],
        severity: 'warning',
        topic: 'lead_routing',
        template: 'crm.lead_routing_hot',
        templateData: {
          first_name: cel`record.first_name`, last_name: cel`record.last_name`,
          company: cel`record.company`, rating: cel`record.rating`,
        },
        actionUrl: '/crm_lead/{{record.id}}',
      },
    },

    // ── Standard path: 3-day SLA, normal alert ─────────────────────
    {
      id: 'sla_std', type: 'update_record', label: 'Set 3-Day SLA',
      config: { objectName: 'crm_lead', filter: { id: cel`record.id` }, fields: { next_followup_date: cel`isoDate(daysFromNow(3))` } },
    },
    {
      // Gateway only — the predicate lives on its out-edges `e10` / `e11`.
      id: 'owner_std', type: 'decision', label: 'Assigned by Someone Else?',
    },
    {
      id: 'notify_std', type: 'notify', label: 'Alert — New Lead Assigned',
      config: {
        // Route to the lead's owner — see notify_hot for why a bare
        // 'sales_manager' position never reached anyone, and `owner_std` for
        // the lead that has no owner or was written by its owner.
        recipients: [cel`record.owner_id`],
        channels: ['inbox'],
        topic: 'lead_routing',
        template: 'crm.lead_routing_new',
        templateData: {
          first_name: cel`record.first_name`, last_name: cel`record.last_name`, company: cel`record.company`,
        },
        actionUrl: '/crm_lead/{{record.id}}',
      },
    },

    { id: 'end', type: 'end', label: 'End' },
  ],

  edges: [
    { id: 'e1', source: 'start', target: 'check_hot', type: 'default' },
    // TOTALITY: these two edges must PARTITION every lead — a rating
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
    { id: 'e4', source: 'sla_hot', target: 'owner_hot', type: 'default' },
    { id: 'e5', source: 'notify_hot', target: 'end', type: 'default' },
    { id: 'e6', source: 'sla_std', target: 'owner_std', type: 'default' },
    { id: 'e7', source: 'notify_std', target: 'end', type: 'default' },
    // OWNER GATES, one per branch so the hot/standard split stays the single
    // rating cut on `e2` / `e3`. The SLA stamp has already landed either way;
    // only the alert needs someone to go to. "Has an owner" is the one
    // predicate, and the ownerless route is the `isDefault` fallback rather
    // than a hand-written complement, so the pair cannot drift apart: a
    // `decision` with no `config.conditions` takes its first conditioned
    // out-edge that holds, and its default edge only when none does.
    // `isBlank` answers true for exactly what `notify` would refuse as no
    // recipient — null, a blank string, an empty list — and `has()` covers the
    // key a sparse driver leaves absent.
    //
    // The standard gate `e10` also asks WHO put the lead in the owner's name
    // (#2073 item 7; the hot gate `e8` deliberately does not — see the header).
    // `created_by` is the platform's insert stamp of the writing user: equal
    // to `owner_id` when a person created the lead for themselves (their own
    // owner stamp), and blank or absent on a write with no user (web-to-lead,
    // an import or integration), whose owner is then the round-robin's pick or
    // the one the writer named. A colleague who logs a lead for a rep differs
    // from the owner too. Only the owner's own lead takes the default edge.
    { id: 'e8', source: 'owner_hot', target: 'notify_hot', type: 'conditional', condition: P`has(record.owner_id) && !isBlank(record.owner_id)`, label: 'Owned' },
    { id: 'e9', source: 'owner_hot', target: 'end', type: 'default', isDefault: true, label: 'No owner' },
    { id: 'e10', source: 'owner_std', target: 'notify_std', type: 'conditional', condition: P`has(record.owner_id) && !isBlank(record.owner_id) && (!has(record.created_by) || isBlank(record.created_by) || record.created_by != record.owner_id)`, label: 'Assigned by someone else' },
    { id: 'e11', source: 'owner_std', target: 'end', type: 'default', isDefault: true, label: 'No owner, or the owner wrote it' },
  ],
};
