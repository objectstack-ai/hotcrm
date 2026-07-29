// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type * as Automation from '@objectstack/spec/automation';
type Flow = Automation.Flow;

/** Case Escalation — auto-escalate high-priority cases */
export const CaseEscalationFlow: Flow = {
  name: 'case_escalation',
  label: 'Case Escalation Process',
  description: 'Automatically escalate high-priority cases',
  type: 'record_change',
  status: 'active',

  variables: [
    { name: 'caseId', type: 'text', isInput: true, isOutput: false },
  ],

  nodes: [
    {
      // Trigger wiring (7.4): bind to afterUpdate and gate on the critical
      // transition. The re-fire guard MUST use `status` (a string enum), NOT the
      // boolean `is_escalated`: this flow's own escalation write re-triggers
      // record-after-update, and on SQLite/libsql a boolean persists as integer
      // `1`, so `record.is_escalated != true` is `1 != true` = true — the guard
      // never trips and the flow loops forever (it wedged a first-boot seed on
      // 2026-07-06). The same write sets `status: 'escalated'`, so
      // `status != "escalated"` reliably suppresses the second fire.
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
        condition: 'record.priority == "critical" && record.status != "escalated" && record.status != "closed" && record.status != "resolved"',
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
        // No owner reassignment: `{caseRecord.owner.manager}` cannot traverse a
        // lookup in flow templates — it interpolates to the literal "undefined",
        // orphaning the case under a phantom owner. The case stays with its
        // owner; the escalation flag + follow-up task carry the hand-off.
        fields: { is_escalated: true, escalation_reason: 'Auto-escalated: critical priority', escalated_date: '{NOW()}', status: 'escalated' },
      },
    },
    {
      id: 'create_task', type: 'create_record', label: 'Create Follow-up Task',
      config: {
        objectName: 'crm_task',
        fields: {
          subject: 'Follow up on escalated case: {caseRecord.case_number}',
          related_to_type: 'crm_case',
          related_to_case: '{record.id}',
          owner: '{caseRecord.owner}',
          priority: 'high', status: 'not_started', due_date: '{TODAY() + 1}',
        },
      },
    },
    {
      // ADR-0012: the dedicated `notify` node dispatches through the messaging
      // service (inbox + email + push). The legacy `script` + `actionType:'email'`
      // shape is a no-op stub in 7.4 and never delivered anything.
      id: 'notify_team', type: 'notify', label: 'Notify Support Team',
      config: {
        // Owner only. Flow templates cannot traverse a lookup (see the note on
        // `assign_senior_agent` above): `{caseRecord.owner.manager}` and
        // `{caseRecord.crm_account.name}` both interpolate to the literal
        // string "undefined" — a phantom recipient and a garbled body.
        // "reassigned" was also false: this flow never changes the owner.
        to: ['{caseRecord.owner}'],
        channels: ['inbox', 'email'],
        severity: 'critical',
        topic: 'case_escalated',
        title: 'Case escalated: {caseRecord.case_number}',
        body: 'Case {caseRecord.case_number} ({caseRecord.priority}) has been escalated. See the case for account and SLA details.',
        actionUrl: '/crm_case/{record.id}',
      },
    },
    { id: 'end', type: 'end', label: 'End' },
  ],

  edges: [
    { id: 'e1', source: 'start', target: 'get_case', type: 'default' },
    { id: 'e2', source: 'get_case', target: 'assign_senior_agent', type: 'default' },
    { id: 'e3', source: 'assign_senior_agent', target: 'create_task', type: 'default' },
    { id: 'e4', source: 'create_task', target: 'notify_team', type: 'default' },
    { id: 'e5', source: 'notify_team', target: 'end', type: 'default' },
  ],
};

/**
 * Insert-time twin of `case_escalation`: a record-change flow binds exactly one
 * hook event, so the afterUpdate flow above never sees cases that are BORN
 * critical (phone-in P1s — the common path). Same nodes/edges, only the start
 * node is rebound to afterInsert. The `status != "escalated"` guard carries
 * over untouched.
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
