import { P } from '@objectstack/spec';
// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Campaign leadership sharing.
 *
 * `crm_campaign` is a private-OWD object and the only set with org-wide campaign
 * access is `marketing_user` — so a marketing manager or director could not open
 * a campaign a specialist owned. ADR-0090 D3 positions are FLAT (no hierarchy
 * to roll visibility up), so each rung that needs the access carries its own
 * grant. Scoped to live campaigns: finished ones stay with their owner and the
 * analytics surfaces that report on them.
 */
export const CampaignLeadershipSharingRules = [
  {
    name: 'campaign_leadership_manager',
    label: 'Live Campaigns — Marketing Manager',
    object: 'crm_campaign',
    type: 'criteria' as const,
    condition: P`record.status in ["planning", "in_progress"] && record.is_active == true`,
    accessLevel: 'edit' as const,
    sharedWith: { type: 'position' as const, value: 'marketing_manager' },
  },
  {
    name: 'campaign_leadership_director',
    label: 'Live Campaigns — Marketing Director',
    object: 'crm_campaign',
    type: 'criteria' as const,
    condition: P`record.status in ["planning", "in_progress"] && record.is_active == true`,
    accessLevel: 'edit' as const,
    sharedWith: { type: 'position' as const, value: 'marketing_director' },
  },
];
