// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { P } from '@objectstack/spec';
import type * as Automation from '@objectstack/spec/automation';
type Flow = Automation.Flow;

/**
 * Large-deal-won alert — record-change flow on opportunity update.
 *
 * Migrated from the removed `notify_on_large_deal_won` object workflow (7.7
 * dropped `workflows[]`). When a deal > $100K is marked closed_won, notify the
 * owner — the owner alone, not their manager (see the notify node for why the
 * manager cannot be reached).
 *
 * NB: `record.amount > 100000` is authored as bare CEL against the (string-
 * serialized) currency field — this relies on the 7.7 numeric-hydration fix
 * (framework #1534); pre-7.7 it would have needed `double(record.amount)`.
 */
export const OpportunityWonAlertFlow: Flow = {
  name: 'opportunity_won_alert',
  label: 'Large Deal Won Alert',
  description: 'On closed_won opportunities over $100K: notify the owner — the owner alone, not their manager.',
  type: 'record_change',
  status: 'active',
  // A record-change flow fired by a SYSTEM write carries no trigger user
  // either (ADR-0049, #1888, #3760). Deals reach `closed_won` through
  // machinery as well as through a rep's own save — `lead_conversion` and the
  // `contract_renewal` sweep both write opportunities, and the latter is
  // itself `runAs: 'system'`.
  //
  // Measured honestly on 17.0.0-rc.2: this flow has NO data node (start →
  // notify → end), so the refusal does not reach it today and declaring
  // `system` changes nothing observable. Declared for the same reason as
  // `contact_welcome` — see the fuller note there. Nothing to scope, so
  // elevating the user-driven runs costs nothing.
  runAs: 'system',
  variables: [],
  nodes: [
    {
      id: 'start', type: 'start', label: 'Start (opp updated)',
      config: {
        objectName: 'crm_opportunity',
        triggerType: 'record-after-update',
        // `previous.stage` guard: fire on the TRANSITION into closed_won only.
        // Without it every later edit of a won deal (demo-bootstrap owner
        // claims, approval-status stamps, description tweaks) re-sent the
        // congratulations blast. The trigger forwards `previous` into the
        // condition scope (cf. the engine's record-change context).
        // TOTALITY (#633): `has(...)` on every read, plus `!= null` on the
        // ordering comparison (`has()` passes an explicit null and
        // `record.amount > 100000` then aborts with
        // `no such overload: dyn<null> > int`).
        //
        // `previous.stage` is guarded FAIL-CLOSED — `has(previous.stage) &&`,
        // not `!has(previous.stage) ||` — which is the opposite of how
        // `record.stage` is guarded, deliberately. This term exists solely to
        // suppress a re-fire, and the failure it was written for (a
        // congratulations blast to management re-sent on every later edit of a
        // won deal) is worse than a missed one. When the engine cannot see
        // what the prior stage was it cannot see a TRANSITION either, so it
        // must not claim one. In practice `previous` is a full prior row on
        // every record-after-update; the shape this covers is a bulk
        // `updateMany`, where ObjectQL never reads a prior row and `previous`
        // arrives null — and firing one blast per row of a bulk update is
        // exactly what nobody wants.
        condition: P`has(record.stage) && record.stage == "closed_won"
          && has(previous.stage) && previous.stage != "closed_won"
          && has(record.amount) && record.amount != null && record.amount > 100000`,
      },
    },
    {
      // The `label` names what this node actually does: it notifies the owner
      // and nobody else. The `id` keeps its original `notify_management`
      // spelling on purpose — `edges[]` reference nodes by id, so renaming one
      // is a behaviour change, not a wording fix.
      id: 'notify_management', type: 'notify', label: 'Notify Owner',
      config: {
        // Owner only: `{record.owner_id.manager}` cannot traverse a lookup on the
        // raw trigger snapshot — it interpolates to the literal "undefined"
        // and the message is delivered to a phantom user.
        recipients: ['{record.owner_id}'],
        channels: ['inbox', 'email'],
        severity: 'info',
        topic: 'large_deal_won',
        title: 'Large deal won: {record.name}',
        message: '{record.name} closed at {record.amount}. Congratulations to the team.',
        actionUrl: '/crm_opportunity/{record.id}',
      },
    },
    { id: 'end', type: 'end', label: 'End' },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'notify_management', type: 'default' },
    { id: 'e2', source: 'notify_management', target: 'end', type: 'default' },
  ],
};
