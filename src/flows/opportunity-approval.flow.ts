// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type * as Automation from '@objectstack/spec/automation';
type Flow = Automation.Flow;

/**
 * Opportunity Approval — tiered sign-off for large deals.
 *
 * ADR-0019 / ADR-0012 migration note
 * ----------------------------------
 * This flow replaces TWO legacy implementations that used capabilities removed
 * in ObjectStack 7.4:
 *   - the old `opportunity-approval` flow, which requested approvals through a
 *     `connector_action` (`connectorId: 'approval'`) — the pre-ADR-0019 pattern,
 *     no longer registered (it only ever type-checked behind an `as any` cast); and
 *   - the standalone `OpportunityDiscountApproval` `ApprovalProcess`, whose
 *     authoring type was deleted in 7.4.
 * Both are now expressed natively as **Approval nodes** (`type: 'approval'`,
 * ADR-0019): the engine opens an approval request on entry, suspends the run,
 * and resumes down the out-edge whose `label` matches the decision
 * (`approve` / `reject`). Notifications use the **`notify` node** (ADR-0012)
 * instead of the no-op `script` + `actionType:'email'` shape.
 *
 * Tiered policy (single source of truth — no double-firing):
 *   - amount > $100K          → Sales Manager review
 *   - amount > $500K          → additionally Sales Director sign-off
 * On full approval the deal is stamped `approval_status = approved` (+ date);
 * any rejection stamps `approval_status = rejected`. The record is locked while
 * a step is pending and `approval_status` mirrors the live request status.
 */
export const OpportunityApprovalFlow: Flow = {
  name: 'opportunity_approval',
  label: 'Large Deal Approval',
  description: 'Tiered approval for opportunities: manager review > $100K, director sign-off > $500K.',
  type: 'record_change',
  status: 'active',

  variables: [
    { name: 'opportunityId', type: 'text', isInput: true, isOutput: false },
  ],

  nodes: [
    {
      id: 'start',
      type: 'start',
      label: 'Start',
      // Trigger wiring (7.4): bind to afterUpdate; gate on crossing the entry
      // threshold while not already in an approval state. The `not_required`
      // guard stops the flow's own approval_status writes from re-triggering it.
      config: {
        objectName: 'crm_opportunity',
        triggerType: 'record-after-update',
        // Null-tolerant: rows inserted before approval_status had a field-level
        // defaultValue (e.g. flow-created opportunities) carry null, which must
        // still enter approval.
        // Stage guard: a settled deal must never (re-)enter approval — the
        // freeze hook rejects approval-status writes on closed records, so
        // without this guard the flow opened a locked approval request it
        // could never resolve (lockRecord held the closed record hostage).
        condition:
          'record.amount > 100000 && (record.approval_status == "not_required" || record.approval_status == null)'
          + ' && record.stage != "closed_won" && record.stage != "closed_lost"',
      },
    },
    {
      id: 'get_opportunity',
      type: 'get_record',
      label: 'Get Opportunity',
      config: { objectName: 'crm_opportunity', filter: { id: '{record.id}' }, outputVariable: 'oppRecord' },
    },

    // ── Tier 1: Sales Manager review (all deals > $100K) ────────────
    {
      id: 'manager_review',
      type: 'approval',
      label: 'Sales Manager Review',
      config: {
        // Org-owner backstop: approvers snapshot at request creation, and a
        // position with no holders leaves the request undecidable while
        // lockRecord holds the record hostage (no admin override exists).
        // behavior:'first_response' means whoever responds first wins, so the
        // backstop changes nothing when the sales-manager bench is staffed.
        approvers: [
          { type: 'position', value: 'sales_manager' },
          { type: 'org_membership_level', value: 'owner' },
        ],
        behavior: 'first_response',
        lockRecord: true,
        approvalStatusField: 'approval_status',
      },
    },

    // ── Tier gate: does this deal also need director sign-off? ──────
    {
      id: 'check_high_value',
      type: 'decision',
      label: 'High Value (> $500K)?',
      config: { condition: 'oppRecord.amount > 500000' },
    },

    // ── Tier 2: Sales Director sign-off (deals > $500K only) ────────
    {
      id: 'director_signoff',
      type: 'approval',
      label: 'Sales Director Sign-off',
      config: {
        // Same org-owner backstop as manager_review (empty-position dead-end).
        approvers: [
          { type: 'position', value: 'sales_director' },
          { type: 'org_membership_level', value: 'owner' },
        ],
        behavior: 'first_response',
        lockRecord: true,
        approvalStatusField: 'approval_status',
      },
    },

    // ── Final approve: stamp status + notify owner ──────────────────
    {
      id: 'mark_approved',
      type: 'update_record',
      label: 'Mark Approved',
      config: {
        objectName: 'crm_opportunity',
        filter: { id: '{record.id}' },
        fields: { approval_status: 'approved', approved_date: '{NOW()}' },
      },
    },
    {
      id: 'notify_approved',
      type: 'notify',
      label: 'Notify Owner — Approved',
      config: {
        to: ['{oppRecord.owner}'],
        channels: ['inbox', 'email'],
        topic: 'opportunity_approved',
        title: 'Deal approved: {oppRecord.name}',
        body: 'Your opportunity {oppRecord.name} has been approved.',
        actionUrl: '/crm_opportunity/{record.id}',
      },
    },

    // ── Rejection: stamp status + notify owner ──────────────────────
    {
      id: 'mark_rejected',
      type: 'update_record',
      label: 'Mark Rejected',
      config: {
        objectName: 'crm_opportunity',
        filter: { id: '{record.id}' },
        fields: { approval_status: 'rejected' },
      },
    },
    {
      id: 'notify_rejected',
      type: 'notify',
      label: 'Notify Owner — Rejected',
      config: {
        to: ['{oppRecord.owner}'],
        channels: ['inbox', 'email'],
        severity: 'warning',
        topic: 'opportunity_rejected',
        title: 'Deal rejected: {oppRecord.name}',
        body: 'Your opportunity {oppRecord.name} was not approved. Review and revise before resubmitting.',
        actionUrl: '/crm_opportunity/{record.id}',
      },
    },

    { id: 'end', type: 'end', label: 'End' },
  ],

  edges: [
    { id: 'e1', source: 'start', target: 'get_opportunity', type: 'default' },
    { id: 'e2', source: 'get_opportunity', target: 'manager_review', type: 'default' },

    // Manager decision (approval-node branch labels)
    { id: 'e3', source: 'manager_review', target: 'check_high_value', type: 'default', label: 'approve' },
    { id: 'e4', source: 'manager_review', target: 'mark_rejected', type: 'default', label: 'reject' },

    // Tier gate (decision-node conditional branches)
    { id: 'e5', source: 'check_high_value', target: 'director_signoff', type: 'conditional', condition: 'oppRecord.amount > 500000', label: 'High value (> $500K)' },
    { id: 'e6', source: 'check_high_value', target: 'mark_approved', type: 'conditional', condition: 'oppRecord.amount <= 500000', label: 'Standard (≤ $500K)' },

    // Director decision (approval-node branch labels)
    { id: 'e7', source: 'director_signoff', target: 'mark_approved', type: 'default', label: 'approve' },
    { id: 'e8', source: 'director_signoff', target: 'mark_rejected', type: 'default', label: 'reject' },

    // Terminal branches
    { id: 'e9', source: 'mark_approved', target: 'notify_approved', type: 'default' },
    { id: 'e10', source: 'notify_approved', target: 'end', type: 'default' },
    { id: 'e11', source: 'mark_rejected', target: 'notify_rejected', type: 'default' },
    { id: 'e12', source: 'notify_rejected', target: 'end', type: 'default' },
  ],
};

/**
 * Insert-time twin of `opportunity_approval`: a record-change flow binds
 * exactly one hook event, so the afterUpdate flow above never saw
 * opportunities BORN over the threshold — flow-created deals (contract
 * renewals, lead conversion) and API inserts skipped approval entirely,
 * which is the exact population the start condition's null-tolerance was
 * written for. Same nodes/edges, only the start node is rebound to
 * afterInsert (mirrors `CaseEscalationOnCreateFlow`). The stage guard
 * carries over, keeping seeded/imported closed deals out of approval.
 */
export const OpportunityApprovalOnCreateFlow: Flow = {
  ...OpportunityApprovalFlow,
  name: 'opportunity_approval_on_create',
  label: 'Large Deal Approval (on create)',
  description: 'Approval intake for opportunities created above the threshold (insert-time twin of opportunity_approval).',
  nodes: OpportunityApprovalFlow.nodes.map((n) =>
    n.id === 'start'
      ? { ...n, config: { ...n.config, triggerType: 'record-after-create' } }
      : n,
  ),
};
