// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type * as Automation from '@objectstack/spec/automation';
type Flow = Automation.Flow;

/**
 * Large-deal-won alert — record-change flow on opportunity update.
 *
 * Migrated from the removed `notify_on_large_deal_won` object workflow (7.7
 * dropped `workflows[]`). When a deal > $100K is marked closed_won, notify the
 * owner and their manager.
 *
 * NB: `record.amount > 100000` is authored as bare CEL against the (string-
 * serialized) currency field — this relies on the 7.7 numeric-hydration fix
 * (framework #1534); pre-7.7 it would have needed `double(record.amount)`.
 */
export const OpportunityWonAlertFlow: Flow = {
  name: 'opportunity_won_alert',
  label: 'Large Deal Won Alert',
  description: 'On closed_won opportunities over $100K: notify owner + manager.',
  type: 'record_change',
  status: 'active',
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
        condition: 'record.stage == "closed_won" && previous.stage != "closed_won" && record.amount > 100000',
      },
    },
    {
      id: 'notify_management', type: 'notify', label: 'Notify Management',
      config: {
        // Owner only: `{record.owner.manager}` cannot traverse a lookup on the
        // raw trigger snapshot — it interpolates to the literal "undefined"
        // and the message is delivered to a phantom user.
        to: ['{record.owner}'],
        channels: ['inbox', 'email'],
        severity: 'info',
        topic: 'large_deal_won',
        title: 'Large deal won: {record.name}',
        body: '{record.name} closed at {record.amount}. Congratulations to the team.',
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
