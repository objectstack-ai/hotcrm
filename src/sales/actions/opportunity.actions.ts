// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Action } from '@objectstack/spec/ui';
import { P } from '@objectstack/spec';
import { Opportunity } from '../objects/opportunity.object';

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
      //
      // The step is on the UTC calendar because the render below is
      // (\`toISOString()\`). The base is \`new Date()\` — an instant, not a
      // stored \`YYYY-MM-DD\` — so unlike quote.hook/task.hook there is no
      // UTC-midnight anchor being read back on the wrong calendar here; the
      // only mixture was the step itself. A local \`getDate\`/\`setDate\` step
      // preserves WALL-CLOCK time, so a 90-day window containing a DST
      // transition is 23 h or 25 h long and the rendered UTC day lands one off
      // whenever the clone instant is within an hour of a UTC day boundary.
      const horizon = new Date();
      horizon.setUTCDate(horizon.getUTCDate() + 90);
      const name = 'Copy of ' + (src.name ?? ('opportunity ' + id));
      const inserted = await ctx.api.object('crm_opportunity').insert({
        name,
        crm_account: src.crm_account,
        primary_contact: src.primary_contact ?? null,
        amount: src.amount ?? 1,
        stage: 'prospecting',
        probability: 10,
        close_date: horizon.toISOString().slice(0, 10),
        type: src.type ?? null,
        lead_source: src.lead_source ?? null,
        crm_campaign: src.crm_campaign ?? null,
        // A copy of a PRIVATE deal is private too. A deal flagged Private is
        // visible only to its owner (\`src/docs/crm_admin_access.md\`), and the copy
        // carries its name and amount, so it keeps the flag; the person cloning
        // owns the copy and can clear it there. Only \`true\` counts, the field's
        // own boolean (\`test/private-opportunity-derived-records.test.ts\`).
        is_private: src.is_private === true,
        // Explicit because an action body runs \`isSystem\`, so nothing stamps
        // \`owner_id\` for it — see the note in activity-actions.ts (#548).
        owner_id: ctx.user?.id ?? null,
      });
      // \`name\` feeds the success toast below, so the rep knows the page
      // they land on is the copy (#2371 row 4).
      return { id: inserted?.id ?? null, name };
    `,
    capabilities: ['api.read', 'api.write'],
    timeoutMs: 5000,
  },
  locations: ['record_header', 'record_more'],
  // Names the copy: the runner navigates to it straight after, and the
  // record page looks like the source but for the "Copy of" prefix and the
  // stage (#2371 row 4). `result` is the body's return value.
  successMessage: 'Created "{{ result.name }}". You are now on the copy.',
  // Open the clone once it exists: the body returns `{ id }`, and the
  // console's ActionRunner resolves `${result.id}` against that result and
  // navigates in the same tab (`openIn` defaults to 'self'). No
  // `refreshAfter`: the runner refreshes before it navigates, so it would only
  // re-read the source page being left. (#2247, rulings 6366949124, 6367379843)
  //
  // The full app path is spelled out until the platform supports an
  // app-relative navigate (upstream gap): a bare `/crm_opportunity/<id>` is
  // resolved against the console's `/_console` basename and lands on home.
  onSuccess: { navigate: '/apps/app.objectstack.hotcrm/crm_opportunity/record/${result.id}' },
};

/**
 * Mass Update Opportunity Stage.
 *
 * Both invocation halves work:
 *
 *   - SINGLE record (a REST or MCP caller naming one `recordId`; the list
 *     header copy that also reached this half is gone, see `locations`): the
 *     call carries `{ recordId, params: { stage } }` and the body reads
 *     `ctx.recordId`.
 *   - MULTI record: the selection arrives in the BUILT-IN `_selectedIds`
 *     param — leading underscore — injected by the grid renderer for the
 *     view's `bulkActionDefs` entry with `execution: 'aggregate'`, which
 *     dispatches this action ONCE for the whole selection (no `recordId`).
 *
 * That underscore is the whole of the contract. A script body's `input` IS the
 * action's params bag (`@objectstack/runtime` `sandbox/body-runner.ts:338`), and
 * `_selectedIds` is one of the params gate's builtin keys (`@objectstack/spec`
 * `ui/action-params.zod.ts:70`, alongside `recordId` / `objectName`). Every
 * other shape is undeclared and cannot arrive: a top-level `selectedIds` is
 * never merged into the bag, and a `params.selectedIds` without the underscore
 * is refused by the strict params gate (ADR-0104). The console's own "select
 * exactly one row" toast fires precisely when `_selectedIds` was NOT injected,
 * which is what happens to a view carrying no bulk declaration at all — read
 * that toast as a missing declaration on the view, never as a platform limit.
 *
 * ⛔ Do NOT declare `_selectedIds` in `params` below: builtin keys are injected
 * by the renderer, and the gate admits them without a declaration (declaring one
 * is not a supported authoring move). ⛔ Do NOT re-add a no-underscore
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
        // The catch is cause-AGNOSTIC about the OUTCOME (every cause leaves the
        // row unmoved, so collect it and keep going; narrowing the catch to a
        // roster of codes would let an unlisted cause abort the loop), and it
        // keeps what the rep needs to read (#2511). Measured on 18.5.0, a host
        // rejection reaches a body as \`name\`, \`message\`, \`code\`, \`status\`
        // and \`userMessage\`, and a hook refusal's \`userMessage\` is already its
        // catalogue sentence in the CALLER's locale (the closed-deal freeze
        // answered "商机… 已关闭（成交）；只能修改它的描述和下一步。" to a zh-CN
        // caller). \`message\` is the engine's wrapper text ("hook '…' threw:
        // Error: …"): diagnostic only, never shown as the reason.
        let row = null;
        let cause = null;
        try {
          row = await ctx.api.object('crm_opportunity').update(
            { id: id, stage: newStage },
            { where: { id: id } },
          );
        } catch (err) {
          row = null;
          cause = {
            code: err && typeof err.code === 'string' ? err.code : '',
            status: err && typeof err.status === 'number' ? err.status : 0,
            message: err && err.message ? String(err.message) : String(err),
            userMessage: err && typeof err.userMessage === 'string' ? err.userMessage.trim() : '',
          };
        }
        // Count only what came back: counting the ATTEMPT is how a stale or
        // invisible id turns into a success toast for a write that never
        // happened (#588).
        if (row) { updated++; } else { missed.push({ id: id, cause: cause }); }
      }
      // Aggregate dispatch is all-or-nothing (objectui#3139): a handler that
      // cannot cover the whole selection must reject rather than report partial
      // work, because the bar offers no per-row retry. Rows already moved in
      // this run keep the new stage; the rejection says which deals did not
      // move and why (#2511).
      if (missed.length) {
        // What the rep reads (#2511), in this order:
        // 1. each refusal's own sentence. It names the deal as every screen
        //    does, and the engine has already put it in the caller's language;
        // 2. a deal that did not move without such a sentence, by its NAME. A
        //    deal that is gone (404), or whose name cannot be read, is counted
        //    instead;
        // 3. how many did and did not move, since the rows that moved keep
        //    their new stage;
        // 4. the retry line, only when a re-run could change the answer.
        // ⛔ Never a record id and never the engine's wrapper text ("hook '…'
        // threw: …") in what the rep reads (#1243); the engine logs that.
        // On 18.5.0 a script body is given no locale (\`ctx.session\` carries
        // userId, organizationId and positions only), so 2 to 4 are English.
        const lines = [];
        let unnamed = 0;
        let retryable = false;
        for (const m of missed) {
          const c = m.cause || { code: '', status: 0, message: 'the engine returned no row', userMessage: '' };
          // A refusal with a code and a status below 500 is the app saying no
          // (a closed deal, an approval, a validation, a row that is gone): it
          // answers the same on a re-run. Only a fault, or a write that
          // returned nothing, might move on a re-run.
          if (!c.code || c.status >= 500 || c.status === 0) retryable = true;
          if (c.status === 404 || c.code === 'RECORD_NOT_FOUND') { unnamed++; continue; }
          if (c.userMessage) { lines.push(c.userMessage); continue; }
          let name = '';
          try {
            const r = await ctx.api.object('crm_opportunity').findOne({ where: { id: m.id }, fields: ['name'] });
            name = r && typeof r.name === 'string' ? r.name : '';
          } catch (e) { name = ''; }
          if (name) { lines.push('Opportunity ' + name + ' did not move to the new stage.'); } else { unnamed++; }
        }
        if (unnamed) {
          lines.push(unnamed === 1
            ? '1 selected opportunity no longer exists or is not visible to you.'
            : unnamed + ' selected opportunities no longer exist or are not visible to you.');
        }
        lines.push(missed.length + ' of ' + ids.length + ' selected opportunities did not move to the new stage; '
          + updated + ' did.');
        if (retryable) lines.push('Run Update Stage on the selection again to retry the ones that did not move.');
        // \`message\` is what the console's bulk result dialog prints against
        // the selection (measured on 18.5.0), so it is the readable text too,
        // with \`userMessage\` the same lines one per line, for the toast and
        // REST. The envelope as every refusal in this app sets it: the shared
        // code when every miss has the same one, else a conflict.
        const err = new Error(lines.join(' '));
        const codes = missed.map((m) => (m.cause && m.cause.code) || '');
        const same = codes.every((x) => x && x === codes[0]);
        err.code = same ? codes[0] : 'CONFLICT';
        err.status = same && missed[0].cause && missed[0].cause.status ? missed[0].cause.status : 409;
        err.userMessage = lines.join('\\n');
        throw err;
      }
      return { stage: newStage, updated };
    `,
    capabilities: ['api.read', 'api.write'],
    timeoutMs: 10000,
  },
  // Headless (#2338 item 4): drawn only on the SELECTION BAR, which the
  // opportunity list opens by naming this action in its `bulkActionDefs`
  // (`src/sales/views/opportunity.view.ts`) and which places it by name, with
  // no location here. List views do not inherit the def: each grid list of
  // the object declares it itself, through `GRID_BAR` in that file.
  // ⛔ Do not add `list_toolbar` back. Measured on 18.2.0, the console's server
  // dispatch from the list header injects no `_selectedIds`: with two rows
  // ticked it refused ("This action runs on a single record — select exactly
  // one row"), and with none it opened the New Stage dialog over no record and
  // the body threw. The header copy failed on every selection, while the bar's
  // aggregate run moved them all.
  locations: [],
  params: [
    {
      name: 'stage',
      label: 'New Stage',
      type: 'select',
      required: true,
      // crm_opportunity.stage's OWN options, read off the object definition
      // and projected to bare `{ label, value }` pairs: an action param's
      // option entry is strict and refuses `color` / `default`, which mean
      // something only on the field.
      options: Opportunity.fields.stage.options!.map(({ label, value }) => ({ label, value })),
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
  visible: P`has(record.stage) && record.stage != "closed_won" && record.stage != "closed_lost"`,
  successMessage: 'Quote created from opportunity!',
  refreshAfter: true,
};
