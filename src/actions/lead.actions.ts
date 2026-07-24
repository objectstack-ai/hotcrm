// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Action } from '@objectstack/spec/ui';
import { P } from '@objectstack/spec';

/**
 * Convert Lead to Account, Contact, and Opportunity.
 *
 * Flow-typed action: invocation is delegated to the `lead_conversion`
 * flow defined under `src/flows/`. The flow engine handles the screen
 * + server steps; no metadata body is required here.
 */
export const ConvertLeadAction: Action = {
  name: 'convert_lead',
  label: 'Convert Lead',
  objectName: 'crm_lead',
  icon: 'arrow-right-circle',
  type: 'flow',
  target: 'lead_conversion',
  locations: ['record_header', 'list_item'],
  // Convert is the lead's most basic outcome — surface it on ANY open lead
  // (new / contacted / qualified), not just qualified. Gating to qualified-only
  // hid the button on most seeded leads, so it read as "conversion is missing".
  // Only already-converted or disqualified leads hide it.
  visible: P`record.is_converted == false && record.status != "unqualified" && record.status != "converted"`,
  confirmText: 'Are you sure you want to convert this lead?',
  successMessage: 'Lead converted successfully!',
  refreshAfter: true,
};

/**
 * Add selected leads to a Campaign.
 *
 * Modal-typed action: collects a campaign id then writes one
 * `crm_campaign_member` record per selected lead via the metadata body.
 * Selected ids are surfaced through `input.selectedIds` (populated by
 * the list toolbar) and the chosen campaign through `input.campaign`.
 */
export const CreateCampaignAction: Action = {
  name: 'create_campaign',
  label: 'Add to Campaign',
  objectName: 'crm_lead',
  icon: 'send',
  type: 'modal',
  target: 'create_campaign',
  body: {
    language: 'js',
    source: `
      // Value key = the param's field name ('crm_campaign') since the param
      // omits an explicit 'name'. Insert uses the REAL lookup field names on
      // crm_campaign_member (crm_campaign / crm_lead) — not the generic
      // campaign_id / lead_id from the doc example, which don't exist here and
      // left crm_campaign null → 'Campaign required' validation failure.
      const campaignId = input.crm_campaign ?? null;
      if (!campaignId) throw new Error('create_campaign requires a campaign id');
      const ids = Array.isArray(input.selectedIds) ? input.selectedIds : [];
      const inserted = [];
      for (const leadId of ids) {
        const row = await ctx.api.object('crm_campaign_member').insert({
          crm_campaign: campaignId,
          crm_lead: leadId,
          status: 'sent',
        });
        inserted.push(row?.id ?? null);
      }
      return { campaignId, count: inserted.length, ids: inserted };
    `,
    capabilities: ['api.write'],
    timeoutMs: 10000,
  },
  locations: ['list_toolbar'],
  params: [
    // Field-backed param: `field` + `objectOverride` make the console resolve
    // the widget from crm_campaign_member.crm_campaign (a lookup → crm_campaign),
    // rendering a RECORD PICKER. A bare `{ type:'lookup' }` with no field can't
    // resolve a target object and silently falls back to a paste-the-ID textbox.
    {
      field: 'crm_campaign',
      objectOverride: 'crm_campaign_member',
      label: 'Campaign',
      required: true,
    }
  ],
  successMessage: 'Leads added to campaign!',
  refreshAfter: true,
};
