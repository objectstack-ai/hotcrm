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
 * `crm_campaign_member` record for the dispatched lead, skipping leads already
 * on the campaign. The chosen campaign arrives as `input.crm_campaign`; the
 * lead arrives as `ctx.recordId`.
 *
 * PER-RECORD dispatch, deliberately. `src/views/lead.view.ts` wires this as the
 * BARE-STRING form — `bulkActions: ['create_campaign']` — and that string is a
 * dispatch contract, not a spelling of the other one:
 *
 *   - bare string    → the renderer promotes the action to a def carrying its
 *     own label / icon / params / `visible` and dispatches it ONCE PER selected
 *     row, each call carrying that row's `recordId` and NO selection array. A
 *     10-lead selection is 10 dispatches through this body, one lead each.
 *   - `bulkActionDefs` + `execution: 'aggregate'` → ONE dispatch for the whole
 *     selection, every id in the builtin `params._selectedIds` and no
 *     `recordId` (see `mass_update_stage` in `opportunity.actions.ts`, #508).
 *
 * So multi-select enrollment already works here — it just arrives one lead at a
 * time. This body reads `ctx.recordId` and nothing else, which is exactly what
 * the fan-out delivers.
 *
 * There is NO `input.selectedIds` read (no underscore), and re-adding one would
 * be dead code, not a fallback: nothing can deliver that key on either contract
 * (#813). A top-level `selectedIds` is never merged into the params bag, and a
 * `params.selectedIds` is refused by the strict params gate (ADR-0104) with
 * `Unknown action param "selectedIds" — not declared on this action`. The only
 * selection channel is the underscore-prefixed builtin, and only the aggregate
 * contract injects it (`@objectstack/spec` `ui/action-params.zod.ts`,
 * `ACTION_PARAM_BUILTIN_KEYS`; verified end to end in
 * objectstack-ai/objectstack#5568).
 *
 * Switching this action to the aggregate contract would be a PRODUCT change —
 * one audit entry and one dedupe read per run instead of per lead, and
 * all-or-nothing failure semantics — so it needs `lead.view.ts` changed with it
 * and is deliberately not done here (#813).
 */
export const CreateCampaignAction: Action = {
  name: 'create_campaign',
  label: 'Add to Campaign',
  objectName: 'crm_lead',
  icon: 'send',
  // script, not modal — a `type: 'modal'` action has NO server dispatch at all:
  // the renderer just opens its `target`, and the runtime refuses it over REST
  // (`headlessActionTypeError`, 400 "a client-side action with no server
  // dispatch"), so its `body` never runs. To collect input and then run
  // server-side, the shape is `type: 'script'` + `params` — the runner collects
  // the same dialog. See ScheduleFollowUpAction.
  type: 'script',
  body: {
    language: 'js',
    source: `
      // Value key = the param's field name ('crm_campaign') since the param
      // omits an explicit 'name'. Insert uses the REAL lookup field names on
      // crm_campaign_member (crm_campaign / crm_lead) — not the generic
      // campaign_id / lead_id an earlier revision of the doc example taught,
      // which don't exist here and left crm_campaign null → 'Campaign required'
      // validation failure.
      const campaignId = input.crm_campaign ?? null;
      if (!campaignId) throw new Error('create_campaign requires a campaign id');
      // One lead per dispatch — the bare-string \`bulkActions\` wiring fans this
      // body out once per selected row (see the note above). \`ids\` stays a
      // list so the dedupe + skip loop below reads the same on both contracts,
      // should this action ever move to an aggregate def.
      const ids = ctx.recordId ? [ctx.recordId] : [];
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
  // list_item gives every row a working record-scoped entry point. The
  // list_toolbar button is single-record by construction: with no `_selectedIds`
  // in the bag the dispatcher resolves a recordId from the grid selection, and a
  // multi-row selection there is ambiguous, so it is refused client-side with
  // "This action runs on a single record — select exactly one row."
  // Multi-lead enrollment is the SELECTION-BAR button instead, which the view's
  // `bulkActions: ['create_campaign']` produces and which fans out per row.
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
