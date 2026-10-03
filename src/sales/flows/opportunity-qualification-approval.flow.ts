// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { P } from '@objectstack/spec';
import type * as Automation from '@objectstack/spec/automation';
type Flow = Automation.Flow;

/**
 * Opportunity Qualification Approval — the 立项 sign-off a new deal needs
 * before its stage, its bid decision or its won/lost call may change.
 *
 * REQ-0006 step 11: 「销售立项需走审批流程；新增商机可跟进，立项通过后方可更新阶段、投标、
 * 赢丢单操作。」 Expressed as an **approval node** (`type: 'approval'`, ADR-0019),
 * the construct `opportunity-approval.flow.ts` already uses — ⛔ there is no
 * `workflow` metadata type and no standalone `ApprovalProcess` to author.
 *
 * Built on `opportunity-status-change-approval.flow.ts` (REQ-0006 step 14) and
 * deliberately the same in every load-bearing term: the switch is a verdict
 * field's `defaultValue`, the rep writes a REQUEST and the flow opens one
 * approval when the request is NEW, `rejected` re-opens on a new request,
 * `runAs: 'system'`, `onEmptyApprovers: 'admin_rescue'`. The refusal of the
 * three gated acts lives beside the step-14 refusal in `opportunity.hook.ts`'s
 * `opportunity_lifecycle`. Where it differs, the reason is written beside it
 * (`lockRecord`).
 *
 * ## ⚠️ This flow is INERT until an install arms the gate, and that is by design
 *
 * REQ-0006 *Disposition*: "**Both gates must be configurable — off by
 * default**, so existing installs keep today's amount-only behaviour."
 *
 * The switch is `crm_opportunity.qualification_approval_status`'s
 * `defaultValue`, ⛔ not this flow's `status` (`draft` still fires triggers and
 * `obsolete` is a gate no install can turn ON — measured and recorded in
 * `lead-conversion-approval.flow.ts`; ⛔ do not re-derive it here). Shipped,
 * that default is `not_required`, so no deal is ever born `pending`, the start
 * condition below is false for every record that has ever existed, and this
 * flow opens nothing — it costs one predicate evaluation per update. An
 * install arms the gate by changing that one value to `'pending'`.
 *
 * ## With the status-change gate armed too
 *
 * 立项 comes first: while this verdict is `pending` or `rejected`,
 * `opportunity_lifecycle` refuses a new `requested_status`, so no status-change
 * approval can be asked for. Once 立项 is `approved` this flow is out of reach
 * for good, and the status-change gate behaves exactly as it does alone. This
 * flow's own writes carry neither `stage` nor `requested_status`, so they can
 * trip neither gate; both columns sit in the hook's APPROVAL_FIELDS so the
 * closed-deal freeze cannot refuse them either.
 *
 * ⚠️ The platform holds ONE pending approval per record (`openNodeRequest`
 * throws `DUPLICATE_REQUEST` otherwise, `@objectstack/plugin-approvals`
 * 17.6.0), so the opportunity gates never stack on one deal: a request a
 * second gate would open while another is pending is refused, not queued.
 */
export const OpportunityQualificationApprovalFlow: Flow = {
  name: 'opportunity_qualification_approval',
  label: 'Opportunity Qualification Approval',
  description:
    'The 立项 sign-off a deal needs before its stage, bid decision or won/lost call may change. Inert unless the install arms the gate on crm_opportunity.qualification_approval_status.',
  type: 'record_change',
  status: 'active',
  // The reading both sibling gates record from `opportunity_approval`'s
  // measured failure: a gate that engages only for writers carrying a session
  // is not a control. The verdict writes below also land on a column the
  // readonly strip protects, which only a platform write reaches.
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
        // on every read; the absent case reads as "not gated".
        //
        // Three halves, the status-change gate's own:
        //
        // - the gate is ARMED: `pending` or `rejected`. `rejected` re-opens on a
        //   new request because the hook refuses the gated acts in both states —
        //   if only `pending` entered here, a rejected deal could never qualify.
        // - the request is ticked;
        // - the request is NEW on this write. TRANSITION, not current value:
        //   the approval node's `pending` stamp through `approvalStatusField` is
        //   an update of this record while the request is still ticked, and a
        //   current-value test re-fires on it (measured for the sibling on
        //   17.6.0: one re-entry per request). `previous.*` is guarded
        //   FAIL-CLOSED: no visible prior value, no visible new request.
        //
        // `mark_qualified` leaves the gate `approved` (out of reach) and
        // `clear_request` unticks the request, so neither re-enters.
        condition: P`has(record.qualification_approval_status)
          && (record.qualification_approval_status == "pending" || record.qualification_approval_status == "rejected")
          && has(record.qualification_requested) && record.qualification_requested == true
          && has(previous.qualification_requested) && previous.qualification_requested != true`,
      },
    },
    {
      id: 'get_opportunity',
      type: 'get_record',
      label: 'Get Opportunity',
      config: { objectName: 'crm_opportunity', filter: { id: '{record.id}' }, outputVariable: 'oppRecord' },
    },
    {
      id: 'qualification_review',
      type: 'approval',
      label: 'Qualification Review',
      config: {
        // The customer's chain is 销售负责人 / 事业部审批岗 → 事业部负责人; the generic
        // shape core ships is the manager bench both sibling gates route to. A
        // second tier, or a different position, is overlay configuration
        // (REQ-0006: the named approval chains are C).
        approvers: [{ type: 'position', value: 'sales_manager' }],
        // Explicit though it is the schema default, as every sibling authors
        // it: an empty bench would leave the request undecidable — here, a
        // deal that can never move its stage.
        onEmptyApprovers: 'admin_rescue',
        behavior: 'first_response',
        // ⚠️ `false`, NOT the status-change gate's `true` — the one term this
        // node deliberately takes from the LEAD gate instead. Step 11 says it
        // in as many words: 「新增商机可跟进」. A deal awaiting 立项 is still being
        // worked — the narrative, the customer calendar and the amount are
        // what the approver reads — and locking it would stop that work for as
        // long as the approver takes. The three acts the gate exists to hold
        // are refused by `opportunity_lifecycle` whether or not a request is
        // open, so the lock would add nothing but the freeze.
        lockRecord: false,
        approvalStatusField: 'qualification_approval_status',
      },
    },
    {
      id: 'mark_qualified',
      type: 'update_record',
      label: 'Mark Qualified',
      config: {
        objectName: 'crm_opportunity',
        filter: { id: '{record.id}' },
        fields: { qualification_approval_status: 'approved' },
      },
    },
    {
      // A rejected request is cleared, not left standing, and the verdict stays
      // `rejected` so the hook keeps refusing the gated acts: the way on is a
      // new request, which the start condition opens as a fresh approval.
      id: 'clear_request',
      type: 'update_record',
      label: 'Clear Rejected Request',
      config: {
        objectName: 'crm_opportunity',
        filter: { id: '{record.id}' },
        fields: { qualification_approval_status: 'rejected', qualification_requested: false },
      },
    },
    { id: 'end', type: 'end', label: 'End' },
  ],

  edges: [
    { id: 'e1', source: 'start', target: 'get_opportunity', type: 'default' },
    { id: 'e2', source: 'get_opportunity', target: 'qualification_review', type: 'default' },
    // Approval-node branch labels.
    { id: 'e3', source: 'qualification_review', target: 'mark_qualified', type: 'default', label: 'approve' },
    { id: 'e4', source: 'qualification_review', target: 'clear_request', type: 'default', label: 'reject' },
    { id: 'e5', source: 'mark_qualified', target: 'end', type: 'default' },
    { id: 'e6', source: 'clear_request', target: 'end', type: 'default' },
  ],
};
