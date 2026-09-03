// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type * as Automation from '@objectstack/spec/automation';
type Flow = Automation.Flow;

/**
 * The escalation STAMP — the one elevated step behind the Escalate Case
 * action (#1434, maintainer-approved decision batch #21 ②).
 *
 * ## Why this flow exists at all
 *
 * `crm_case.is_escalated` and `escalated_date` are `readonly: true`: nobody
 * types them, so that is the honest declaration. But the platform's readonly
 * strip is one branch of the UPDATE path —
 * `if (!opCtx.context?.isSystem)`, over CALLER-supplied keys — so a flow write
 * to a readonly column survives exactly when that flow's effective `runAs` is
 * `'system'` (the engine defaults it to `'user'`). The `escalate_case` screen
 * flow is invoked by a person from the UI and MUST keep running as that
 * person, so it cannot make this write itself.
 *
 * The resolution is to elevate the WRITE, not the FLOW: `escalate_case` stays
 * `runAs: 'user'` and calls this dedicated `runAs: 'system'` flow through a
 * `subflow` node. Everything the agent does keeps their identity; only these
 * two stamped columns are written with the elevated context.
 *
 * ⛔ Do NOT fold this back into `escalate_case` by giving that flow
 * `runAs: 'system'`. That option was costed and explicitly NOT adopted: it
 * elevates every write the screen flow makes, not just these two, and it stops
 * the flow carrying the acting user's context for anything downstream that
 * reads it. See `AGENTS.md` house rule 9 ("Elevate as little as possible").
 *
 * ## Measured, not assumed
 *
 * The direction rests on one falsifiable premise — that a callee flow's own
 * `runAs` governs its writes rather than inheriting the caller's context — and
 * it is measured against a real engine in
 * `test/readonly-write-semantics.test.ts` ("a system subflow called from a
 * user parent"). That measurement reports three things:
 *
 *  - a `runAs: 'system'` callee invoked from a `runAs: 'user'` parent has its
 *    write to a `readonly` column SURVIVE;
 *  - the same callee declared `runAs: 'user'` is STRIPPED — so it is the
 *    callee's declaration that decides, not the subflow hop;
 *  - the parent's own later write to a readonly column is STILL stripped — the
 *    elevation is scoped to this run and does not leak back up.
 *
 * The mechanism is `resolveRunContext`
 * (`@objectstack/service-automation`), which re-asserts
 * `runAs: flow.runAs ?? 'user'` AFTER spreading the caller's context, so the
 * callee's own declaration wins: "a COPY, never mutating the caller's context,
 * so the elevation is scoped to this run and the caller's identity is restored
 * when the run returns" (ADR-0049 / #1888).
 *
 * ## ⛔ What this flow deliberately does NOT write
 *
 * Only the two columns a person never types:
 *
 *   is_escalated    stamped here
 *   escalated_date  stamped here
 *
 * `escalation_reason` is the agent's screen input and `priority` / `status`
 * are ordinary editable columns — all three stay in `escalate_case`, written
 * with the USER's context. Moving `escalation_reason` here (or declaring it
 * `readonly`) would make the platform silently strip the reason the agent just
 * typed, which is the exact harm #1434 was filed about, inverted onto user
 * input.
 *
 * ⚠️ ORDERING IS LOAD-BEARING, and it is why this flow runs LAST rather than
 * first. `crm_case`'s `escalation_reason_required` validation rejects any write
 * whose merged record has `is_escalated == true` with a blank
 * `escalation_reason`. `escalate_case` therefore writes the reason FIRST and
 * calls this flow AFTER, so the reason is already stored when the flag flips.
 * Stamping first would fire that validation against a record that does not yet
 * carry a reason. BOTH orders are measured in
 * `test/readonly-write-semantics.test.ts` ("ordering: the reason must be stored
 * BEFORE the flag flips"), including the counterfactual: stamping first is
 * refused by that validation, and because a `subflow` node reports its child's
 * failure the run aborts before the reason is written either — the agent loses
 * the whole escalation.
 */
export const CaseEscalationStampFlow: Flow = {
  name: 'case_escalation_stamp',
  label: 'Stamp Case Escalation',
  description:
    'Write the two readonly escalation stamps (is_escalated, escalated_date) with the system context. Called by escalate_case through a subflow node.',
  type: 'autolaunched',
  status: 'active',

  // ⭐ THE ENTIRE POINT OF THIS FILE. This is the only elevation in the
  // escalate path, and it covers exactly one `update_record` node.
  runAs: 'system',

  variables: [
    // Supplied by the caller's `subflow` node as `input: { recordId: '{recordId}' }`.
    { name: 'recordId', type: 'text', isInput: true, isOutput: false },
  ],

  nodes: [
    // `config: {}` matches the shape measured in
    // `test/readonly-write-semantics.test.ts`: an autolaunched callee is handed
    // its params by the `subflow` executor and resolves no trigger record of
    // its own, so there is no `objectName` for the start node to load.
    { id: 'start', type: 'start', label: 'Start', config: {} },
    {
      id: 'stamp', type: 'update_record', label: 'Stamp Escalation Flags',
      config: {
        objectName: 'crm_case',
        filter: { id: '{recordId}' },
        // ⛔ Do not add fields here. Every column in this node is written with
        // the elevated context; anything a user can legitimately type belongs
        // in `escalate_case` instead.
        fields: {
          is_escalated: true,
          escalated_date: '{NOW()}',
        },
      },
    },
    { id: 'end', type: 'end', label: 'End' },
  ],

  edges: [
    { id: 'e1', source: 'start', target: 'stamp', type: 'default' },
    { id: 'e2', source: 'stamp', target: 'end', type: 'default' },
  ],
};
