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
 * Both invocation halves work as of #508 (17.0.0-rc.2):
 *
 *   - SINGLE record (row selection / toolbar with one row): the console POSTs
 *     `{ recordId, params: { stage } }` and the body reads `ctx.recordId`. The
 *     write itself was fixed in #777 — this body used to call
 *     `update(id, { stage })`, but `ctx.api` is the engine repo facade whose
 *     update takes `(data, options)`, so the id landed in the `data` slot and
 *     every invocation 400'd with `update('crm_opportunity') does not
 *     recognise option 'stage'`.
 *   - MULTI record: the selection arrives in the BUILT-IN `_selectedIds`
 *     param — leading underscore — injected by the grid renderer for the
 *     view's `bulkActionDefs` entry with `execution: 'aggregate'`, which
 *     dispatches this action ONCE for the whole selection (no `recordId`).
 *
 * That underscore is the whole story of why #508 read as "bulk is impossible".
 * A script body's `input` IS the action's params bag
 * (`@objectstack/runtime` `sandbox/body-runner.ts:338`), and `_selectedIds` is
 * one of the params gate's builtin keys
 * (`@objectstack/spec` `ui/action-params.zod.ts:70`, alongside `recordId` /
 * `objectName`). The three rc.2 failure reports all probed UNDECLARED shapes —
 * a top-level `selectedIds` (never merged into the bag), and a
 * `params.selectedIds` without the underscore (correctly refused by the strict
 * params gate, ADR-0104) — while the console's own "select exactly one row"
 * toast fires precisely when `_selectedIds` was NOT injected, which is what
 * happens to a view carrying no bulk declaration at all (#588 had removed it).
 * Platform verified the declared channel end to end and closed
 * objectstack-ai/objectstack#5568 as works-as-declared.
 *
 * Do NOT declare `_selectedIds` in `params` below: builtin keys are injected by
 * the renderer, and the gate admits them without a declaration (declaring one
 * is not a supported authoring move). Do NOT re-add a no-underscore
 * `input.selectedIds` read either — nothing can deliver that key, so it would
 * be a limb that only ever reads `undefined`.
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
      // Selection first, single record as the fallback. An aggregate dispatch
      // carries the whole selection in \`_selectedIds\` and NO recordId; a
      // single-record dispatch carries recordId and no selection. The two are
      // never both present, so the order only decides which shape wins if the
      // platform ever sends both.
      const selected = Array.isArray(input._selectedIds) ? input._selectedIds : [];
      const ids = selected.length ? selected : (ctx.recordId ? [ctx.recordId] : []);
      if (!ids.length) throw new Error('mass_update_stage: no opportunity selected');
      const missed = [];
      let firstCause = '';
      let updated = 0;
      for (const id of ids) {
        // \`update(data, options)\` — \`ctx.api\` is the engine repo facade, whose
        // update takes a DOCUMENT, not an id. \`updateById(id, data)\` exists on
        // ObjectRepository but NOT on the facade the runtime builds when it has
        // no scoped context, so this spelling is the only one live on both.
        //
        // An id that matches no row is a MISS, not an abort, and the engine has
        // answered it both ways: through @objectstack/* 17.0.0-rc.6 \`update\`
        // RESOLVED WITH NULL, and from 17.0.0 it REJECTS (RECORD_NOT_FOUND /
        // 404). Both are handled here, and neither may end the loop — an
        // uncaught rejection on the first stale id would leave every id after
        // it unattempted, so re-running the action over the same selection
        // would fail at the same row forever and the live rows behind it could
        // never be covered. That is strictly worse than the silent-success
        // failure #588 pulled this button for, because it is unrecoverable
        // from the UI. Collect the miss, keep going, reject once at the end.
        //
        // The catch is deliberately cause-AGNOSTIC. A host rejection crosses
        // the QuickJS boundary as \`{ name, message }\` only — \`code\`, \`status\`
        // and \`details\` are dropped by the bridge (runtime \`vm.newError\`) — so
        // a body physically cannot test for RECORD_NOT_FOUND, and sniffing the
        // message text would pin engine wording that is not contract. Every
        // per-row failure is therefore reported as what the aggregate error
        // already claims — this id was not updated — with the first cause
        // carried along so the reason is not lost.
        let row = null;
        try {
          row = await ctx.api.object('crm_opportunity').update(
            { id: id, stage: newStage },
            { where: { id: id } },
          );
        } catch (err) {
          row = null;
          if (!firstCause) firstCause = (err && err.message) ? String(err.message) : String(err);
        }
        // Count only what came back: counting the ATTEMPT is how a stale or
        // invisible id turns into a success toast for a write that never
        // happened (#588).
        if (row) { updated++; } else { missed.push(id); }
      }
      // Aggregate dispatch is all-or-nothing (objectui#3139): a handler that
      // cannot cover the whole selection must reject rather than report partial
      // work, because the bar offers no per-row retry — the retry IS re-running
      // the action over the selection, which is safe here since setting a stage
      // is idempotent. Rows already moved in this run keep the new stage; the
      // error names the ones that did not so the rep can see the difference.
      if (missed.length) {
        throw new Error(
          'mass_update_stage: ' + missed.length + ' of ' + ids.length
          + ' selected opportunities could not be updated (' + missed.join(', ')
          + '). Re-run the action on the selection to retry.'
          + (firstCause ? ' First cause: ' + firstCause : '')
        );
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
