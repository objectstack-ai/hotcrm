// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type * as Automation from '@objectstack/spec/automation';
type Flow = Automation.Flow;

/**
 * Screen flows behind the Escalate Case / Close Case header actions.
 *
 * Why flows and not `body`-typed actions (verified against the running
 * 16.1.0 console, 2026-07-28):
 *
 *  - `type: 'modal'` never executes the body at all — on submit the console
 *    resolves the action `target` as an OBJECT name and dies on
 *    `GET /api/v1/meta/object/<target>` → 400 ("Error loading form").
 *  - `type: 'script'` DOES reach `POST /api/v1/actions/...`, but a body that
 *    UPDATES a record on an object with sharing rules is rejected by the
 *    sharing middleware ("FORBIDDEN: insufficient privileges to update
 *    crm_case …") — the sandbox execution context does not carry the caller
 *    identity, so `canEdit` fails even for the record owner. Inserts are
 *    unaffected (clone_opportunity works), updates are not.
 *  - Screen flows execute through the automation service, whose
 *    `update_record` nodes demonstrably write `crm_case` (the
 *    case_escalation record-change flow does exactly that in production).
 *
 * Same mechanism as `schedule_followup` / `lead_conversion`.
 */
export const EscalateCaseFlow: Flow = {
  name: 'escalate_case',
  label: 'Escalate Case',
  description: 'Collect an escalation reason, then flag and re-prioritise the case.',
  type: 'screen',
  status: 'active',

  variables: [
    // MUST be `recordId` — the console's flow-action contract seeds only that
    // name (and its camelCase object alias); a custom name arrives undefined.
    { name: 'recordId', type: 'text', isInput: true, isOutput: false },
    { name: 'reason', type: 'text', isInput: true, isOutput: false },
  ],

  nodes: [
    { id: 'start', type: 'start', label: 'Start', config: { objectName: 'crm_case' } },
    {
      id: 'screen_1', type: 'screen', label: 'Escalate Case',
      config: {
        fields: [
          { name: 'reason', label: 'Escalation Reason', type: 'textarea', required: true },
        ],
      },
    },
    {
      // Same writes as the case_escalation record-change flow: the
      // escalation_reason_required validation demands a reason whenever
      // is_escalated flips true, and status: 'escalated' is what suppresses a
      // double-fire of the automatic escalation flow.
      id: 'escalate', type: 'update_record', label: 'Escalate Case',
      config: {
        objectName: 'crm_case',
        filter: { id: '{recordId}' },
        fields: {
          is_escalated: true,
          escalation_reason: '{reason}',
          escalated_date: '{NOW()}',
          status: 'escalated',
          priority: 'critical',
        },
      },
    },
    { id: 'end', type: 'end', label: 'End' },
  ],

  edges: [
    { id: 'e1', source: 'start', target: 'screen_1', type: 'default' },
    { id: 'e2', source: 'screen_1', target: 'escalate', type: 'default' },
    { id: 'e3', source: 'escalate', target: 'end', type: 'default' },
  ],
};

export const CloseCaseFlow: Flow = {
  name: 'close_case',
  label: 'Close Case',
  description: 'Collect the resolution, then close the case and stop the SLA clock.',
  type: 'screen',
  status: 'active',
  // `is_closed` is a readonly lifecycle field. This trusted screen flow owns
  // the transition and must therefore run with the system writer.
  runAs: 'system',

  variables: [
    { name: 'recordId', type: 'text', isInput: true, isOutput: false },
    { name: 'resolution', type: 'text', isInput: true, isOutput: false },
    { name: 'resolved_by_article', type: 'text', isInput: true, isOutput: false },
  ],

  nodes: [
    { id: 'start', type: 'start', label: 'Start', config: { objectName: 'crm_case' } },
    {
      // The "attach the article that resolved it" affordance (#601). Optional
      // on purpose: most cases are not resolved out of the knowledge base, and
      // a required field here would be answered with a junk value rather than
      // left honest — which is worse than an absent link for a measure whose
      // whole job is to say how OFTEN the KB resolves a case.
      //
      // ⚠️ MEASURED LIMITATION, stated so nobody re-discovers it: a flow screen
      // field cannot name a target object. `ScreenFieldConfigSchema`
      // (`@objectstack/spec/automation`) has `name` / `label` / `type` /
      // `options` / `defaultValue` / `placeholder` / `visibleWhen` and NO
      // object or reference key, so `type: 'lookup'` has nothing to resolve a
      // record picker from — the same degradation `add_contact_to_campaign`
      // documents for a bare `{ type: 'lookup' }` action param, which it avoids
      // by being FIELD-BACKED, an escape a screen field does not have.
      //
      // So the real picker for this link is the `Resolved by Article` lookup in
      // the case's Resolution group, on the record form, and this screen field
      // is the CLOSE-PATH capture beside it. Both write the same column; the
      // action is `refreshAfter: true`, so the record form is what the agent
      // lands on immediately after closing.
      id: 'screen_1', type: 'screen', label: 'Close Case',
      config: {
        fields: [
          { name: 'resolution', label: 'Resolution', type: 'textarea', required: true },
          {
            name: 'resolved_by_article',
            label: 'Resolved by Article (optional)',
            type: 'lookup',
            required: false,
            placeholder: 'Knowledge article id, if the KB resolved this case',
          },
        ],
      },
    },
    {
      // `resolved_by_article` is written unconditionally, and a blank one is
      // normalised to NULL by `case_resolution_article_normalize`
      // (`src/objects/case.hook.ts`) rather than branched around here: MEASURED
      // on the real engine, a screen field left empty resumes as `''` and lands
      // as an empty string, which `count(resolved_by_article)` counts. A
      // `decision` node could not have branched it either — this repo has
      // measured `decision.config.condition` to be inert metadata
      // (`test/win-loss-capture.test.ts`'s table of five such surfaces).
      id: 'close', type: 'update_record', label: 'Close Case',
      config: {
        objectName: 'crm_case',
        filter: { id: '{recordId}' },
        fields: {
          is_closed: true,
          resolution: '{resolution}',
          status: 'closed',
          resolved_by_article: '{resolved_by_article}',
        },
      },
    },
    { id: 'end', type: 'end', label: 'End' },
  ],

  edges: [
    { id: 'e1', source: 'start', target: 'screen_1', type: 'default' },
    { id: 'e2', source: 'screen_1', target: 'close', type: 'default' },
    { id: 'e3', source: 'close', target: 'end', type: 'default' },
  ],
};
