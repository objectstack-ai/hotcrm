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
  ],

  nodes: [
    { id: 'start', type: 'start', label: 'Start', config: { objectName: 'crm_case' } },
    {
      id: 'screen_1', type: 'screen', label: 'Close Case',
      config: {
        fields: [
          { name: 'resolution', label: 'Resolution', type: 'textarea', required: true },
        ],
      },
    },
    {
      id: 'close', type: 'update_record', label: 'Close Case',
      config: {
        objectName: 'crm_case',
        filter: { id: '{recordId}' },
        fields: {
          is_closed: true,
          resolution: '{resolution}',
          status: 'closed',
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
