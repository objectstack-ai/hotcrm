// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { P } from '@objectstack/spec';
import type * as Automation from '@objectstack/spec/automation';
type Flow = Automation.Flow;

/**
 * Opportunity Status Change Approval — sign-off before a deal is declared won
 * or abandoned.
 *
 * REQ-0006 steps 13 + 14: 「发起赢单、弃单…状态变更操作，填写变更原因与说明」 then
 * 「重要状态变更需审批，**通过后商机状态正式生效**」. Expressed as an **approval node**
 * (`type: 'approval'`, ADR-0019), the construct `opportunity-approval.flow.ts`
 * already uses — ⛔ there is no `workflow` metadata type and no standalone
 * `ApprovalProcess` to author.
 *
 * ## Why the STAGE is not what the rep writes
 *
 * REQ-0006 acceptance 3: the request opens "and the stage does not change
 * until it is decided". A `record_change` flow binds an AFTER hook, so by the
 * time it runs the stage has already moved — an after-flow can lock the record
 * but it cannot un-move it. So the rep writes the REQUEST
 * (`requested_status`) and the approved decision writes the STAGE, which is
 * also literally what the customer's own step 14 says ("通过后…正式生效").
 * `opportunity.hook.ts` refuses a direct user move into a closed stage while
 * the gate is armed, and names this field in the refusal.
 *
 * ## ⚠️ This flow is INERT until an install arms the gate, and that is by design
 *
 * REQ-0006 acceptance 3 again: "with it off (the default), the existing
 * amount-tiered behaviour of `opportunity-approval.flow.ts` is bit-for-bit
 * what it is today."
 *
 * The switch is `crm_opportunity.status_change_approval_status`'s
 * `defaultValue`, ⛔ not this flow's `status`. Shipped, that default is
 * `not_required`, so no deal is ever born `pending`, the start condition below
 * is false for every record that has ever existed, and this flow opens nothing
 * — it costs one predicate evaluation per update. An install arms the gate by
 * changing that one value to `'pending'`.
 *
 * ⛔ Do NOT reach for `status: 'draft'` as the off switch instead, and ⛔ not
 * `'obsolete'` either. Both readings are measured and recorded in
 * `lead-conversion-approval.flow.ts`'s docstring on the pinned
 * `@objectstack/service-automation` 17.4.0: draft flows still fire their
 * triggers, and `isFlowEnabled` composes `obsolete` with the installation's
 * activation ledger into a gate no install can ever turn ON. ⛔ Do not
 * re-derive it here.
 *
 * ⇒ A deal that predates the arming keeps `not_required` and never enters,
 * so arming the gate invalidates no existing record.
 *
 * ## ⚠️ Its own verdict column, NOT `approval_status`
 *
 * `approval_status` belongs to the amount-tiered flow. Sharing it would make
 * either gate's verdict erase the other's — and worse, re-arm the amount flow,
 * whose entry condition fires on `approval_status == "not_required"`.
 */
export const OpportunityStatusChangeApprovalFlow: Flow = {
  name: 'opportunity_status_change_approval',
  label: 'Opportunity Status Change Approval',
  description:
    'Sign-off a deal needs before it is declared won or lost. Inert unless the install arms the gate on crm_opportunity.status_change_approval_status.',
  type: 'record_change',
  status: 'active',
  // REQ-0006 acceptance 4, and the same reading `opportunity_approval` records
  // from its own measured failure: a gate that engages only for writers
  // carrying a session is not a control — a `runAs: 'system'` sweep or import
  // would simply bypass it. The verdict and the stage write below also land on
  // columns the readonly strip protects, which only a platform write reaches.
  runAs: 'system',

  variables: [
    { name: 'opportunityId', type: 'text', isInput: true, isOutput: false },
  ],

  nodes: [
    {
      id: 'start',
      type: 'start',
      label: 'Start',
      config: {
        objectName: 'crm_opportunity',
        triggerType: 'record-after-update',
        // TOTALITY (AGENTS.md — validation predicates must be TOTAL): `has()`
        // on every read. A flow condition is strict CEL on every run and an
        // unguarded read against a driver that omits absent columns aborts,
        // which from 17.0.0-rc.2 FAILS THE RUN rather than skipping it. The
        // absent case must read as "not gated": a deal with no gate column at
        // all predates the field and closes the way it always did.
        //
        // The `pending` half is the arming switch; the `requested_status` half
        // is what makes this an UPDATE trigger without re-entering on every
        // subsequent edit — once the approval node stamps a verdict the status
        // is no longer `pending`, and `apply_status` / `clear_request` below
        // leave the pair unable to satisfy this condition again.
        condition: P`has(record.status_change_approval_status) && record.status_change_approval_status == "pending"
          && has(record.requested_status) && record.requested_status != null && record.requested_status != ""`,
      },
    },
    {
      id: 'get_opportunity',
      type: 'get_record',
      label: 'Get Opportunity',
      config: { objectName: 'crm_opportunity', filter: { id: '{record.id}' }, outputVariable: 'oppRecord' },
    },
    {
      id: 'status_review',
      type: 'approval',
      label: 'Status Change Review',
      config: {
        // The customer's chain is 销售负责人 → 事业部负责人; the generic shape core
        // ships is the manager bench this app already declares approvers
        // against. A second tier, or a different position, is overlay
        // configuration (REQ-0006 acceptance 5).
        approvers: [{ type: 'position', value: 'sales_manager' }],
        // Explicit though it is the schema default, exactly as both sibling
        // approvals author it: approvers snapshot at request creation, so an
        // empty bench would leave the request undecidable — and here that
        // means a deal nobody can ever close.
        onEmptyApprovers: 'admin_rescue',
        behavior: 'first_response',
        // `true`, matching `opportunity_approval` and NOT the lead gate: a deal
        // awaiting a won/lost verdict must not keep moving underneath the
        // approver. Its narrative fields are what the freeze hook leaves open
        // anyway.
        lockRecord: true,
        approvalStatusField: 'status_change_approval_status',
      },
    },
    {
      // The approved decision is what moves the stage — "通过后正式生效".
      //
      // ⚠️ Both fields in ONE write, and that is load-bearing: the
      // status-change guard in `opportunity.hook.ts` reads the gate column
      // INPUT-FIRST, so this write presents itself as already-approved and the
      // guard lets the stage through. Splitting it into two writes would have
      // the guard refuse the flow's own write (ELEVATION IS NOT ANONYMITY —
      // `runAs: 'system'` carries the triggering user, so `ctx.user?.id` is
      // present in this run).
      //
      // `win_reason` / `loss_reason` are `requiredWhen` the stage is closed and
      // are evaluated against the merged record, so the values the rep captured
      // when requesting satisfy them here.
      id: 'apply_status',
      type: 'update_record',
      label: 'Apply Requested Status',
      config: {
        objectName: 'crm_opportunity',
        filter: { id: '{record.id}' },
        fields: {
          stage: '{oppRecord.requested_status}',
          status_change_approval_status: 'approved',
          approved_date: '{NOW()}',
        },
      },
    },
    {
      // A rejected request is cleared, not left standing: the rep may capture a
      // different one, and leaving `requested_status` set would re-open this
      // request the moment an install re-armed the record.
      id: 'clear_request',
      type: 'update_record',
      label: 'Clear Rejected Request',
      config: {
        objectName: 'crm_opportunity',
        filter: { id: '{record.id}' },
        fields: { status_change_approval_status: 'rejected', requested_status: null },
      },
    },
    { id: 'end', type: 'end', label: 'End' },
  ],

  edges: [
    { id: 'e1', source: 'start', target: 'get_opportunity', type: 'default' },
    { id: 'e2', source: 'get_opportunity', target: 'status_review', type: 'default' },
    // Approval-node branch labels.
    { id: 'e3', source: 'status_review', target: 'apply_status', type: 'default', label: 'approve' },
    { id: 'e4', source: 'status_review', target: 'clear_request', type: 'default', label: 'reject' },
    { id: 'e5', source: 'apply_status', target: 'end', type: 'default' },
    { id: 'e6', source: 'clear_request', target: 'end', type: 'default' },
  ],
};
