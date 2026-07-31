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
  // ADR-0011 — opt this Action in to AI, which materialises the
  // `action_convert_lead` tool the `lead_qualification` skill references.
  // Flow-typed with a target, so it has a headless path. `confirmText` makes
  // the runtime treat it as approval-requiring, so an agent invocation lands
  // in the HITL queue rather than converting a lead unattended — which is the
  // behaviour we want for an irreversible outcome.
  ai: {
    exposed: true,
    description:
      'Converts a qualified lead into an account, contact and opportunity. Irreversible — requires human approval before it runs.',
  },
};

/**
 * Schedule the next follow-up on a lead.
 *
 * The gap this fills: `log_call` / `log_meeting` record what already happened
 * (a `sys_activity` timeline entry), but nothing put the NEXT touch on the
 * rep's list. Filing that follow-up meant leaving the lead, opening the
 * Related tab, finding the Tasks block, and hand-picking the lead back as the
 * parent — four steps for the single most common thing a rep does after a call.
 *
 * Flow-typed, not `type: 'modal'`: modal actions are non-functional in 16.1.0
 * (the console resolves the action's `target` as an object name, so submitting
 * one dies on `GET /api/v1/meta/object/<target>` → 400 — reproducible on the
 * pre-existing `log_call` too). The screen flow under
 * `src/flows/schedule-followup.flow.ts` collects the same fields and does the
 * write; that mechanism is proven by `convert_lead` above.
 */
export const ScheduleFollowUpAction: Action = {
  name: 'schedule_followup',
  label: 'Schedule Follow-up',
  objectName: 'crm_lead',
  icon: 'calendar-plus',
  type: 'flow',
  target: 'schedule_followup',
  locations: ['record_header', 'list_item'],
  // A converted or disqualified lead has no next touch to schedule.
  visible: P`record.is_converted == false && record.status != "unqualified" && record.status != "converted"`,
  successMessage: 'Follow-up scheduled.',
  refreshAfter: true,
  // ADR-0011 — materialises `action_schedule_followup` for the
  // `lead_qualification` skill. Additive and reversible, so no approval gate.
  ai: {
    exposed: true,
    description:
      'Schedules the next follow-up task on a lead, assigned to its owner, so the next touch lands on the rep list.',
  },
};

/**
 * Add selected leads to a Campaign.
 *
 * Script-typed action: collects a campaign id (param dialog) then writes one
 * `crm_campaign_member` record per selected lead via the metadata body,
 * skipping leads already on the campaign. Selected ids are surfaced through
 * `input.selectedIds` (populated by the list toolbar) and the chosen
 * campaign through `input.crm_campaign`.
 */
export const CreateCampaignAction: Action = {
  name: 'create_campaign',
  label: 'Add to Campaign',
  objectName: 'crm_lead',
  icon: 'send',
  // script, not modal — modal submits never execute the body in 16.1.0 (the
  // console resolves `target` as an object name; see ScheduleFollowUpAction).
  type: 'script',
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
      // Selection first, single record as the fallback: console 16.1.0 does
      // not deliver multi-row selections to actions (the toolbar path rejects
      // them), so the working invocation today is one lead at a time via the
      // row menu / a single-row selection. When the runtime starts passing
      // selectedIds, the bulk path lights up with no further change here.
      const selected = Array.isArray(input.selectedIds) ? input.selectedIds : [];
      const ids = selected.length ? selected : (ctx.recordId ? [ctx.recordId] : []);
      if (!ids.length) throw new Error('create_campaign: no lead selected');
      // Skip leads already on this campaign — the modal copy promises
      // duplicates are skipped, and re-running the action on the same
      // selection must not double-count marketing touches.
      const raw = await ctx.api.object('crm_campaign_member').find({
        where: { crm_campaign: campaignId },
        fields: ['crm_lead'],
        top: 5000,
      });
      const existingRows = Array.isArray(raw) ? raw : (raw?.records ?? []);
      const existing = new Set(existingRows.map((r) => r.crm_lead));
      const inserted = [];
      let skipped = 0;
      for (const leadId of ids) {
        if (existing.has(leadId)) { skipped++; continue; }
        const row = await ctx.api.object('crm_campaign_member').insert({
          crm_campaign: campaignId,
          crm_lead: leadId,
          status: 'sent',
        });
        inserted.push(row?.id ?? null);
      }
      return { campaignId, count: inserted.length, skipped, ids: inserted };
    `,
    capabilities: ['api.read', 'api.write'],
    timeoutMs: 10000,
  },
  // list_item gives every row a working record-scoped entry point; the
  // toolbar button works for a single-row selection (multi-row selections are
  // rejected client-side in 16.1.0).
  locations: ['list_toolbar', 'list_item'],
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
