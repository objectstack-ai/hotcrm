// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { P } from '@objectstack/spec';

/**
 * Campaign leadership sharing.
 *
 * `crm_campaign` is `public_read` (`src/objects/campaign.object.ts`), so the OWD
 * baseline already hands READ to everyone holding object-level read on it: a
 * marketing manager or director opens any campaign with or without this file.
 * What `public_read` does NOT hand out is WRITE. `@objectstack/plugin-sharing`
 * 17.0.0-rc.2 states the boundary in `buildWriteFilter`'s own comment — the
 * editable set "applies to BOTH `private` and `read` (public_read) models —
 * public_read is read-open but write-owned; only a fully `public` object is
 * write-open" — i.e. owner-match OR records shared at a write access level.
 *
 * These two rules are that second branch, and `accessLevel: 'edit'` is the part
 * doing the work: they let a marketing manager / director EDIT a live campaign a
 * specialist owns, rather than having to take ownership of it. Nor does the
 * `marketing_user` permission set make them redundant — its
 * `marketing_campaign_updates` RLS policy (`id != null`) widens the RLS layer
 * only, and the sharing layer's write-owned baseline still refuses the update.
 *
 * MEASURED on 17.0.0-rc.2 against this app's own metadata (#724), for a user
 * holding the `marketing_user` set plus position `marketing_manager` and owning
 * no campaign: reads return EVERY campaign at all times; before these rules
 * materialise, `buildWriteFilter` is `{ owner_id: specialist }` and updating a
 * specialist-owned campaign is FORBIDDEN; after, the filter gains
 * `{ id: { $in: [live campaign] } }` and the same update succeeds, while the
 * completed campaign stays FORBIDDEN. So deleting these rules costs the two
 * rungs their only edit path and changes nothing about what they can READ —
 * which is exactly what makes the loss easy to miss.
 *
 * ADR-0090 D3 positions are FLAT (no hierarchy to roll visibility up), so each
 * rung that needs the access carries its own grant. Scoped to live campaigns:
 * finished ones stay with their owner and the analytics surfaces that report on
 * them.
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
