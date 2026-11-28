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
  // The More menu only (#2574): cloning is rare, and a header slot it held
  // pushed Edit off the phone's two-button action bar. Protocol 19 spells the
  // old `record_more`-only placement as the record page plus the ⋯-menu
  // component.
  locations: ['record_page'],
  component: 'action:menu',
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
 * Update Stage — moves the selected opportunities to one OPEN stage.
 *
 * A DECLARED WRITE (`operation: 'update'`, spec #14092), with no body. The
 * platform action route writes the collected `stage` param to the current
 * record on the data plane AS THE CALLER, exactly as a `PATCH` of that row:
 * the caller's object, row and field permissions apply, a record locked by an
 * approval is refused (`RECORD_LOCKED`), and the object's hooks and
 * validations fire. A caller who may not edit the deal gets the refusal the
 * record page would have given, and nothing is written (#2586).
 *
 * Why not a script body any more (#2586): a body runs system-elevated, so the
 * old aggregate loop moved deals the caller could only read and deals an
 * approval had locked. Re-checking permission and lock state inside a body
 * would be a hand-written copy of the platform's own rules (AGENTS.md scope
 * rule 2); the declared write uses the rules themselves (objectstack#25468
 * ruled this route for record writes).
 *
 * ONE CALL PER ROW (`execution: 'perRecord'`), wired by the bare-string
 * `bulkActions: ['mass_update_stage']` on each opportunity grid list
 * (`src/sales/views/opportunity.view.ts`). The selection bar dispatches each
 * row on its own, so its result dialog counts what moved and prints each
 * refusal against its own row (#2587). The summary is the console's own, in
 * the reader's language (#2588): this action writes no sentence of its own.
 *
 * OPEN STAGES ONLY (#2589, ruled A). Closing a deal needs a reason the dialog
 * cannot collect (`win_reason` / `loss_reason`), and a large deal may need
 * approval, so closing stays one record at a time on the record page. The
 * param's options are the stage field's own `kind: 'open'` options, and the
 * params gate refuses any other value from every caller (REST and MCP too).
 *
 * Headless (`locations: []`): drawn only on the selection bar. A declared write
 * may not sit in `list` (no current record there), and the record page
 * moves a stage through its own path and edit form.
 */
export const MassUpdateStageAction: Action = {
  name: 'mass_update_stage',
  label: 'Update Stage',
  objectName: 'crm_opportunity',
  icon: 'layers',
  operation: 'update',
  execution: 'perRecord',
  locations: [],
  visible: P`current_user.can('crm_opportunity', 'edit')`,
  params: [
    {
      name: 'stage',
      label: 'New Stage',
      type: 'select',
      required: true,
      // crm_opportunity.stage's OWN open options, read off the object
      // definition and projected to bare `{ label, value }` pairs: an action
      // param's option entry is strict and refuses `color` / `default` / `kind`,
      // which mean something only on the field. An option without `kind` reads
      // as open (the field schema's rule), so it is offered.
      options: Opportunity.fields.stage.options!
        .filter((o) => (o.kind ?? 'open') === 'open')
        .map(({ label, value }) => ({ label, value })),
    },
  ],
  successMessage: 'Stage updated.',
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
  locations: ['record'],
  visible: P`has(record.stage) && record.stage != "closed_won" && record.stage != "closed_lost"`,
  successMessage: 'Quote created from opportunity!',
  refreshAfter: true,
};
