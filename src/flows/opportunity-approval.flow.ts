// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { P } from '@objectstack/spec';
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
 * a rejection stamps `approval_status = rejected`; a submitter RECALL stamps
 * `approval_status = recalled`. The record is locked while a step is pending
 * and `approval_status` mirrors the live request status.
 *
 * The `reject` branch carries TWO outcomes (#1037)
 * ------------------------------------------------
 * `ApprovalService.recall()` — the submitter withdrawing their own request —
 * finalises the request as `recalled` and then resumes this run down
 * `APPROVAL_BRANCH_LABELS.reject`, the same label a real rejection uses. The
 * two are told apart ONLY by the resume envelope's `decision`:
 *
 *   | what happened            | request status | resume label | `decision` |
 *   | ------------------------ | -------------- | ------------ | ---------- |
 *   | approver rejected        | `rejected`     | `reject`     | `reject`   |
 *   | revision budget exceeded | `rejected`     | `reject`     | `reject`   |
 *   | submitter recalled       | `recalled`     | `reject`     | `recall`   |
 *
 * Before this was read, both landed on `mark_rejected`: a withdrawn deal was
 * stamped `rejected` (contradicting its own `recalled` request) AND its owner
 * was told the deal had been turned down. Anything reporting off this field
 * counted every withdrawal as a loss.
 *
 * `decision` reaches the edges as `vars.<approvalNodeId>.decision`: the engine
 * binds a resume signal's `output` under the SUSPENDED NODE's id
 * (`applyResumeSignal` → `variables.set('<nodeId>.<key>')`) and nests dotted
 * keys before evaluating CEL. Both approval branch labels therefore fan out
 * from the same node — narrowing by `label` happens first, edge `condition`s
 * are evaluated within the narrowed set, and `isDefault` takes the rest.
 */
export const OpportunityApprovalFlow: Flow = {
  name: 'opportunity_approval',
  label: 'Large Deal Approval',
  description: 'Tiered approval for opportunities: manager review > $100K, director sign-off > $500K.',
  type: 'record_change',
  status: 'active',
  // Same user-less exposure as every record-change flow (ADR-0049, #1888,
  // #3760) — and the one with teeth. Measured on 17.0.0-rc.2: a $150K renewal
  // created by the `runAs: 'system'` contract_renewal sweep fired this flow
  // with no trigger user, and the run died at `get_opportunity`. The deal sat
  // at `approval_status: 'not_required'`, unlocked, with no approval request
  // ever opened — the gate was bypassed by the writer simply not carrying a
  // session. An approval control that only engages for logged-in writers is
  // not a control.
  //
  // Elevating the USER-driven runs too is not merely acceptable here, it is
  // required. This gate exists to CONSTRAIN the submitter, so the submitter's
  // own scope is the wrong identity to evaluate it under; and
  // `mark_approved` / `mark_rejected` stamp `approval_status` on a record the
  // approval node holds locked (`lockRecord: true`), which only a platform
  // write may land. The approval node itself already opens its request under
  // the platform identity while re-attaching the deciding user for
  // attribution, so this declaration aligns the flow with the node it drives.
  runAs: 'system',

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
        // TOTALITY (#633): `has(...)` on every read, plus `!= null` on the
        // ordering comparison — `has()` passes an explicit null and
        // `record.amount > 100000` then aborts with
        // `no such overload: dyn<null> > int`. Measured total as authored
        // today (amount/stage are required, approval_status is defaulted), but
        // that is `crm_opportunity`'s schema doing the work, not the
        // predicate. An absent `approval_status` reads the same as the null
        // this condition already tolerates; an absent `stage` is not a settled
        // stage, so it must not block approval.
        condition: P`has(record.amount) && record.amount != null && record.amount > 100000
          && (!has(record.approval_status) || record.approval_status == "not_required" || record.approval_status == null)
          && (!has(record.stage) || (record.stage != "closed_won" && record.stage != "closed_lost"))`,
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
        // The empty-position dead-end (approvers snapshot at request creation,
        // so a position with no holders left the request undecidable while
        // lockRecord held the record hostage) is a NODE POLICY on @objectstack
        // 17, not something the approver list has to work around. The
        // `{ type: 'org_membership_level', value: 'owner' }` entry that used to
        // sit here was that workaround, and it overshot: with
        // `behavior: 'first_response'` it made an org owner a routine approver
        // for every deal, not just a rescue when the bench is empty.
        approvers: [{ type: 'position', value: 'sales_manager' }],
        // Explicit even though `admin_rescue` is the schema default — this is
        // the mechanism the node depends on, so it is authored, not inherited.
        onEmptyApprovers: 'admin_rescue',
        behavior: 'first_response',
        lockRecord: true,
        approvalStatusField: 'approval_status',
      },
    },

    // ── Tier gate: does this deal also need director sign-off? ──────
    {
      // No `config.condition` here: the branch is on edges `e5` / `e6`, which
      // is where the engine actually reads it. A copy on the node would be
      // inert and indistinguishable from the live one (17.0.0-rc.2's
      // `flow-inert-node-condition`, #4414).
      id: 'check_high_value',
      type: 'decision',
      label: 'High Value (> $500K)?',
    },

    // ── Tier 2: Sales Director sign-off (deals > $500K only) ────────
    {
      id: 'director_signoff',
      type: 'approval',
      label: 'Sales Director Sign-off',
      config: {
        // Same node policy as manager_review — see the note there.
        approvers: [{ type: 'position', value: 'sales_director' }],
        onEmptyApprovers: 'admin_rescue',
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
        recipients: ['{oppRecord.owner_id}'],
        channels: ['inbox', 'email'],
        topic: 'opportunity_approved',
        title: 'Deal approved: {oppRecord.name}',
        message: 'Your opportunity {oppRecord.name} has been approved.',
        actionUrl: '/crm_opportunity/{record.id}',
      },
    },

    // ── Recall: stamp status, and say nothing ───────────────────────
    //
    // The platform's mirror has ALREADY written `recalled` here by the time
    // this node runs (`recall()` mirrors before it resumes). This write is not
    // redundant: `mirrorStatusField` wraps its update in a try/catch that
    // downgrades any failure to a `warn`, so the app's own state machine must
    // not depend on it having landed. Same value, so the second write is a
    // no-op whenever the mirror worked.
    //
    // No `notify`: the recall is an action the SUBMITTER just took, so telling
    // them about it is noise, and the rejection message ("was not approved")
    // is actively wrong. The action is on the request's audit trail either way
    // (`sys_approval_action`, `action: 'recall'`).
    {
      id: 'mark_recalled',
      type: 'update_record',
      label: 'Mark Recalled',
      config: {
        objectName: 'crm_opportunity',
        filter: { id: '{record.id}' },
        fields: { approval_status: 'recalled' },
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
        recipients: ['{oppRecord.owner_id}'],
        channels: ['inbox', 'email'],
        severity: 'warning',
        topic: 'opportunity_rejected',
        title: 'Deal rejected: {oppRecord.name}',
        message: 'Your opportunity {oppRecord.name} was not approved. Review and revise before resubmitting.',
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

    // The `reject` label carries both a rejection and a recall — see the file
    // header. `label` narrows the edge set FIRST, then these two partition it:
    // the conditional claims the recall, `isDefault` takes everything else.
    // `isDefault` (not a second, opposite-polarity condition) because the
    // fallback must also cover a resume that carried no `decision` at all —
    // an inverted guard would then match nothing and the run would end with
    // the deal stuck at `pending`.
    //
    // TOTALITY (#643): `vars.`-scoped and `has()`-guarded on BOTH levels. The
    // variable is bound by the approval node itself on every path out of it —
    // the resume envelope always carries `decision` (`decide` → approve/reject,
    // `recall` → recall, the maxRevisions auto-rejection → reject), and the
    // `onEmptyApprovers: 'auto_approve'` shortcut returns it as node output —
    // so this is a guard against a shape that should not occur, not a policy
    // hidden in a predicate. Measured: the bare `has(manager_review.decision)`
    // spelling still aborts with `Unknown variable` on an unbound variable,
    // while `has(vars.manager_review)` answers `false`.
    {
      id: 'e4r', source: 'manager_review', target: 'mark_recalled', type: 'conditional', label: 'reject',
      condition: P`has(vars.manager_review) && has(vars.manager_review.decision)
        && vars.manager_review.decision == "recall"`,
    },
    { id: 'e4', source: 'manager_review', target: 'mark_rejected', type: 'default', label: 'reject', isDefault: true },

    // Tier gate (decision-node conditional branches). These EDGES are the live
    // sites — the engine never evaluates a `decision` node's singular
    // `config.condition` — and they must PARTITION, so the guards are written
    // in opposite polarity. A deal whose amount cannot be read lands on
    // `mark_approved`: the manager has already approved it, and an unreadable
    // amount must not strand an approved deal in a locked, undecidable
    // director step.
    //
    // TOTALITY (#643): `oppRecord` is a `get_record` OUTPUT, so the read needs
    // `has(vars.oppRecord)` (the variable), `has(vars.oppRecord.amount)` (the
    // column — `findOne` answers a miss with `null`, and a sparse driver row
    // omits an unwritten column outright) and `!= null` (an explicit null
    // passes `has()` and the ordering comparison then aborts with `no such
    // overload: dyn<null> > int`). Measured total as authored today — `amount`
    // is `required` on `crm_opportunity` and the `get_record` is keyed on the
    // row that just fired the trigger — but that is the neighbouring schema
    // doing the work, exactly as in the start condition above. `vars.`-scoped
    // rather than bare: `has(oppRecord.amount)` still aborts with `Unknown
    // variable: oppRecord` on an unbound variable, `has(vars.oppRecord)`
    // answers `false` (measured). From 17.0.0-rc.2 an unevaluable condition
    // ABORTS the step rather than skipping it (#4775), so a guard that was
    // belt-and-braces is now what keeps the run alive.
    { id: 'e5', source: 'check_high_value', target: 'director_signoff', type: 'conditional', condition: P`has(vars.oppRecord) && has(vars.oppRecord.amount)
      && vars.oppRecord.amount != null && vars.oppRecord.amount > 500000`, label: 'High value (> $500K)' },
    { id: 'e6', source: 'check_high_value', target: 'mark_approved', type: 'conditional', condition: P`!has(vars.oppRecord) || !has(vars.oppRecord.amount)
      || vars.oppRecord.amount == null || vars.oppRecord.amount <= 500000`, label: 'Standard (≤ $500K)' },

    // Director decision (approval-node branch labels). Same split as the
    // manager tier, keyed on the DIRECTOR node's own variable: at this point
    // `vars.manager_review.decision` is `"approve"` (that is how the run got
    // here), so reading the wrong node's variable would never see the recall.
    { id: 'e7', source: 'director_signoff', target: 'mark_approved', type: 'default', label: 'approve' },
    {
      id: 'e8r', source: 'director_signoff', target: 'mark_recalled', type: 'conditional', label: 'reject',
      condition: P`has(vars.director_signoff) && has(vars.director_signoff.decision)
        && vars.director_signoff.decision == "recall"`,
    },
    { id: 'e8', source: 'director_signoff', target: 'mark_rejected', type: 'default', label: 'reject', isDefault: true },

    // Terminal branches
    { id: 'e9', source: 'mark_approved', target: 'notify_approved', type: 'default' },
    { id: 'e10', source: 'notify_approved', target: 'end', type: 'default' },
    { id: 'e11', source: 'mark_rejected', target: 'notify_rejected', type: 'default' },
    { id: 'e12', source: 'notify_rejected', target: 'end', type: 'default' },
    { id: 'e13', source: 'mark_recalled', target: 'end', type: 'default' },
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
