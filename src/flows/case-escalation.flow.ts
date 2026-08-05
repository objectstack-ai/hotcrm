// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { P } from '@objectstack/spec';
import type * as Automation from '@objectstack/spec/automation';
type Flow = Automation.Flow;

/** Case Escalation — auto-escalate high-priority cases */
export const CaseEscalationFlow: Flow = {
  name: 'case_escalation',
  label: 'Case Escalation Process',
  description: 'Automatically escalate high-priority cases',
  type: 'record_change',
  status: 'active',
  // A record-change flow fired by a SYSTEM write carries no trigger user
  // either — the user-less exposure is NOT schedule-only (ADR-0049, #1888,
  // #3760), and the platform's own build-time lint cannot see this shape
  // because it is only knowable at run time. Measured on 17.0.0-rc.2: a
  // user-less run refuses the very first data node — "[runAs] refusing a data
  // operation (object 'crm_case', event 'record-after-update')" — so a case
  // raised by the seed loader, an integration, or another runAs:'system'
  // flow's write silently keeps its critical priority forever.
  //
  // Elevating the USER-driven runs too is correct here: escalation is a
  // service-level policy, not the writer's own edit. Both data nodes are keyed
  // to `{record.id}` — the row that just fired the trigger — so user scope
  // buys no restriction that matters, while it does add a failure mode: an
  // agent may legitimately raise a case without holding edit rights on the
  // escalation lifecycle fields (`is_escalated` / `escalated_date` / `status`).
  // This also puts the flow on the same footing as `case_sla_monitor`, which
  // performs the same escalation on a schedule under `runAs: 'system'`.
  runAs: 'system',

  variables: [
    { name: 'caseId', type: 'text', isInput: true, isOutput: false },
  ],

  nodes: [
    {
      // Trigger wiring (7.4): bind to afterUpdate and gate on the critical
      // transition. The re-fire guard MUST NOT rely on the boolean
      // `is_escalated`: this flow's own escalation write re-triggers
      // record-after-update, and on SQLite/libsql a boolean persists as integer
      // `1`, so `record.is_escalated != true` is `1 != true` = true — the guard
      // never trips and the flow loops forever (it wedged a first-boot seed on
      // 2026-07-06). Instead:
      // - `escalated_date == null` marks "never escalated" (the escalation write
      //   stamps it, suppressing the second fire AND any re-escalation when an
      //   agent later moves the case back to in_progress to work it);
      // - the status terms keep the flow off cases already escalated or already
      //   finished — without them a critical case could never be resolved or
      //   closed (the flow would yank `status` straight back to `escalated`).
      id: 'start', type: 'start', label: 'Start',
      config: {
        objectName: 'crm_case',
        triggerType: 'record-after-update',
        // Also suppress on closed/resolved: closing a critical case is itself
        // an afterUpdate, and with only the `!= "escalated"` guard this flow
        // re-escalated the case the moment it was closed (observed live:
        // close_case wrote status "closed", this flow immediately rewrote it
        // to "escalated"). Status strings are the reliable guard — comparing
        // the boolean is_closed suffers the SQLite `1 != true` trap above.
        // `escalated_date == null` additionally keeps a case that was already
        // escalated once (then reopened) from being escalated again.
        //
        // TOTALITY (#633): every `record.x` read carries a `has(record.x)`
        // guard — see the house-rule block in
        // `test/flow-condition-totality.test.ts`. Measured end-to-end on
        // driver-memory: a case BORN critical is stored without an
        // `escalated_date` column at all, `record.escalated_date == null`
        // aborted with `No such key: escalated_date`, and this flow never ran
        // on the very population it exists for. The guards below preserve the
        // predicate's answer on every shape where it previously had one.
        // `escalated_date` absent means the same as null ("never escalated");
        // an absent `status` cannot be a terminal status, so it must not
        // suppress the escalation.
        condition: P`has(record.priority) && record.priority == "critical"
          && (!has(record.escalated_date) || record.escalated_date == null)
          && (!has(record.status)
            || (record.status != "escalated" && record.status != "resolved" && record.status != "closed"))`,
      },
    },
    {
      id: 'get_case', type: 'get_record', label: 'Get Case Record',
      config: { objectName: 'crm_case', filter: { id: '{record.id}' }, outputVariable: 'caseRecord' },
    },
    {
      id: 'assign_senior_agent', type: 'update_record', label: 'Assign to Senior Agent',
      config: {
        objectName: 'crm_case', filter: { id: '{record.id}' },
        // `escalation_reason` must be set whenever `is_escalated` flips true — the
        // object's `escalation_reason_required` validation rejects the write
        // otherwise (which silently aborted this flow until it was supplied).
        // No owner reassignment: `{caseRecord.owner_id.manager}` cannot traverse a
        // lookup in flow templates — it interpolates to the literal "undefined",
        // orphaning the case under a phantom owner. The case stays with its
        // owner; the escalation flag + follow-up task carry the hand-off.
        fields: { is_escalated: true, escalation_reason: 'Auto-escalated: critical priority', escalated_date: '{NOW()}', status: 'escalated' },
      },
    },
    // No `create_task` node here: the escalation write above flips `status` to
    // `escalated`, which fires the `case_status_side_effects` hook — the single
    // owner of escalation follow-up tasks (it also covers the `escalate_case`
    // action and the SLA monitor). A second task node here produced duplicate,
    // disagreeing tasks (case owner/high vs account owner/urgent) per escalation.
    {
      // ADR-0012: the dedicated `notify` node dispatches through the messaging
      // service (inbox + email + push). The legacy `script` + `actionType:'email'`
      // shape is a no-op stub in 7.4 and never delivered anything.
      // Owner only: `{caseRecord.owner_id.manager}` cannot traverse a lookup in
      // flow templates — it interpolates to the literal "undefined".
      id: 'notify_team', type: 'notify', label: 'Notify Support Team',
      config: {
        // Owner only. Flow templates cannot traverse a lookup (see the note on
        // `assign_senior_agent` above): `{caseRecord.owner_id.manager}` and
        // `{caseRecord.crm_account.name}` both interpolate to the literal
        // string "undefined" — a phantom recipient and a garbled body.
        // "reassigned" was also false: this flow never changes the owner.
        recipients: ['{caseRecord.owner_id}'],
        channels: ['inbox', 'email'],
        severity: 'critical',
        topic: 'case_escalated',
        title: 'Case escalated: {caseRecord.case_number}',
        message: 'Case {caseRecord.case_number} ({caseRecord.priority}) has been auto-escalated on critical priority. It remains assigned to you.',
        actionUrl: '/crm_case/{record.id}',
      },
    },
    { id: 'end', type: 'end', label: 'End' },
  ],

  edges: [
    { id: 'e1', source: 'start', target: 'get_case', type: 'default' },
    { id: 'e2', source: 'get_case', target: 'assign_senior_agent', type: 'default' },
    { id: 'e3', source: 'assign_senior_agent', target: 'notify_team', type: 'default' },
    { id: 'e4', source: 'notify_team', target: 'end', type: 'default' },
  ],
};

/**
 * Insert-time twin of `case_escalation`: a record-change flow binds exactly one
 * hook event, so the afterUpdate flow above never sees cases that are BORN
 * critical (phone-in P1s — the common path). Same nodes/edges, only the start
 * node is rebound to afterInsert. The `escalated_date == null` + status guard
 * carries over untouched (a case born critical has neither).
 */
export const CaseEscalationOnCreateFlow: Flow = {
  ...CaseEscalationFlow,
  name: 'case_escalation_on_create',
  label: 'Case Escalation Process (on create)',
  description: 'Escalate cases created critical (insert-time twin of case_escalation)',
  nodes: CaseEscalationFlow.nodes.map((n) =>
    n.id === 'start'
      ? { ...n, config: { ...n.config, triggerType: 'record-after-create' } }
      : n,
  ),
};
