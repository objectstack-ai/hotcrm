// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Action } from '@objectstack/spec/ui';
import { P } from '@objectstack/spec';
import { OPPORTUNITY_STAGE_OPTIONS, plainOptions } from '../objects/_picklists';

/**
 * Clone Opportunity.
 *
 * Script-typed action: clones the current record into a new
 * `prospecting`-stage opportunity. Runs sandboxed under `api.read`
 * (to fetch the source) and `api.write` (to write the copy).
 */
export const CloneOpportunityAction: Action = {
  name: 'clone_opportunity',
  label: 'Clone Opportunity',
  objectName: 'crm_opportunity',
  icon: 'copy',
  type: 'script',
  body: {
    language: 'js',
    source: `
      const id = ctx.recordId;
      if (!id) throw new Error('clone_opportunity requires a recordId');
      // Read the source from ctx.record (seeded by the runner for record-scoped
      // actions — same source send_email uses). This avoids the in-sandbox
      // find() that previously faulted, WHILE still copying the REQUIRED fields
      // (crm_account / amount / close_date). The old minimal insert set only
      // name+stage, so every clone failed the object's required-field + amount>0
      // validations at runtime and no opportunity was ever created.
      const src = ctx.record ?? {};
      if (!src.crm_account) {
        throw new Error('clone_opportunity: source account not loaded; cannot clone.');
      }
      // Give the clone a fresh 90-day close horizon so a copied past date can't
      // trip the "close date in the past" validation on a new prospecting deal.
      const horizon = new Date();
      horizon.setDate(horizon.getDate() + 90);
      const inserted = await ctx.api.object('crm_opportunity').insert({
        name: 'Copy of ' + (src.name ?? ('opportunity ' + id)),
        crm_account: src.crm_account,
        primary_contact: src.primary_contact ?? null,
        amount: src.amount ?? 1,
        stage: 'prospecting',
        probability: 10,
        close_date: horizon.toISOString().slice(0, 10),
        type: src.type ?? null,
        lead_source: src.lead_source ?? null,
        crm_campaign: src.crm_campaign ?? null,
        // Explicit because an action body runs \`isSystem\`, so nothing stamps
        // \`owner_id\` for it — see the note in global.actions.ts (#548).
        owner_id: ctx.user?.id ?? null,
      });
      return { id: inserted?.id ?? null };
    `,
    capabilities: ['api.read', 'api.write'],
    timeoutMs: 5000,
  },
  locations: ['record_header', 'record_more'],
  successMessage: 'Opportunity cloned successfully!',
  refreshAfter: true,
};

/**
 * Mass Update Opportunity Stage.
 *
 * SINGLE-RECORD ONLY today, and that half now works. #508 split into two on
 * the 17.0.0-rc.2 retest:
 *
 *   - the SINGLE-row toolbar path reaches this body — the param dialog renders
 *     and the console POSTs `{ recordId, params: { stage } }`. What it then hit
 *     was this body's own bug: it called `update(id, { stage })`, but `ctx.api`
 *     is the engine repo facade, whose update takes `(data, options)`. The id
 *     landed in the `data` slot and every invocation 400'd with
 *     `update('crm_opportunity') does not recognise option 'stage'`. Fixed
 *     below, and executed end-to-end in `test/action-sandbox.test.ts`.
 *   - the MULTI-row path is still dead upstream (objectstack-ai/objectstack
 *     #5568): the console rejects a multi-row selection client-side (zero
 *     network requests), a top-level `selectedIds` is not delivered to the
 *     body, and `params.selectedIds` is refused by the action-param validator
 *     as undeclared. So `input.selectedIds` cannot arrive by any route yet —
 *     the branch below is kept because it is what the fix lands into.
 *
 * The list view therefore still does NOT list it in `bulkActions` (#588): that
 * button was the one path that failed *silently* — success toast, nothing
 * written — so it read as data loss rather than as a tracked gap. Restoring it
 * is a one-line edit in `src/views/opportunity.view.ts`; do it in the PR that
 * closes #508, once objectstack#5568 ships multi-row delivery and the selection
 * bar is verified to POST `selectedIds`.
 *
 * Until then, multi-record stage moves happen via the pipeline kanban
 * drag-and-drop, inline grid editing, or the record form.
 */
export const MassUpdateStageAction: Action = {
  name: 'mass_update_stage',
  label: 'Update Stage',
  objectName: 'crm_opportunity',
  icon: 'layers',
  type: 'script',
  body: {
    language: 'js',
    source: `
      const newStage = input.stage ?? null;
      if (!newStage) throw new Error('mass_update_stage requires a stage');
      // Selection first, single record as the fallback (see the note above —
      // the console does not deliver multi-row selections to actions yet).
      const selected = Array.isArray(input.selectedIds) ? input.selectedIds : [];
      const ids = selected.length ? selected : (ctx.recordId ? [ctx.recordId] : []);
      if (!ids.length) throw new Error('mass_update_stage: no opportunity selected');
      let updated = 0;
      for (const id of ids) {
        // \`update(data, options)\` — \`ctx.api\` is the engine repo facade, whose
        // update takes a DOCUMENT, not an id. \`updateById(id, data)\` exists on
        // ObjectRepository but NOT on the facade the runtime builds when it has
        // no scoped context, so this spelling is the only one live on both.
        await ctx.api.object('crm_opportunity').update(
          { id: id, stage: newStage },
          { where: { id: id } },
        );
        updated++;
      }
      return { stage: newStage, updated };
    `,
    capabilities: ['api.write'],
    timeoutMs: 10000,
  },
  locations: ['list_toolbar'],
  params: [
    {
      name: 'stage',
      label: 'New Stage',
      type: 'select',
      required: true,
      // Mirrors crm_opportunity.stage exactly (#490) — see _picklists.ts.
      options: plainOptions(OPPORTUNITY_STAGE_OPTIONS),
    }
  ],
  successMessage: 'Opportunities updated successfully!',
  refreshAfter: true,
};

/**
 * Generate a Quote from this Opportunity.
 *
 * Flow-typed action: launches the `quote_generation` screen flow (name,
 * validity, discount) which creates the draft crm_quote and moves the deal
 * to `proposal`. Without this action the flow was unreachable from the UI —
 * the CPQ leg (opportunity → quote) had no entry point.
 */
export const GenerateQuoteAction: Action = {
  name: 'generate_quote',
  label: 'Generate Quote',
  objectName: 'crm_opportunity',
  icon: 'receipt',
  type: 'flow',
  target: 'quote_generation',
  // Mirror clone_opportunity's placement (header + overflow menu) so the action
  // is reachable both as a primary button and from the "…" menu on narrow
  // viewports where the header collapses.
  locations: ['record_header', 'record_more', 'list_item'],
  visible: P`record.stage != "closed_won" && record.stage != "closed_lost"`,
  successMessage: 'Quote created from opportunity!',
  refreshAfter: true,
};
