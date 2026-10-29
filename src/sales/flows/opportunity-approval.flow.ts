// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { P, cel } from '@objectstack/spec';
import type * as Automation from '@objectstack/spec/automation';
import { HIGH_VALUE_DEAL_AMOUNT, LARGE_DEAL_AMOUNT } from '../objects/_thresholds';
type Flow = Automation.Flow;

/**
 * Opportunity Approval — tiered sign-off for large deals.
 *
 * Expressed as **Approval nodes** (`type: 'approval'`, ADR-0019): the engine
 * opens an approval request on entry, suspends the run, and resumes down the
 * out-edge whose `label` matches the decision (`approve` / `reject`). A
 * recall resumes down `reject` too, and ends the run there without the
 * rejection's notice (#2349).
 * Notifications use the **`notify` node** (ADR-0012). ⛔ Neither a
 * `connector_action` nor a standalone `ApprovalProcess` is available — both
 * authoring surfaces were removed in ObjectStack 7.4.
 *
 * Tiered policy (single source of truth — no double-firing):
 *   - amount >= $100K         → Sales Manager review
 *   - amount > $500K          → additionally Sales Director sign-off
 *
 * The entry gate is INCLUSIVE at the line (`>=`) and the director tier is
 * exclusive (`>`): those are not the same kind of number. `LARGE_DEAL_AMOUNT` is
 * the one line this app draws around "large deal", and every consumer of it —
 * this gate, its insert twin, the won-deal alert and both sharing rules — must
 * cut the same way, so a deal at exactly $100,000 is large everywhere or
 * nowhere. `HIGH_VALUE_DEAL_AMOUNT` below is a matched PAIR (`> 500000` /
 * `<= 500000`) whose two halves must partition, which is a different property
 * and is left alone.
 *
 * `approval_status` mirrors the live request status, and the record is locked
 * while a step is pending. The mirror alone writes a rejection; on full
 * approval `mark_approved` adds `approved_date`. A rejected or recalled deal is
 * handed back to the rep unlocked, and their next save sends it for approval
 * again (#2334). Until then `opportunity_lifecycle` refuses its close-won.
 */
/**
 * Whether the deal's owner is the user whose save fired the run, and so the
 * submitter the platform tells the outcome (#2371 row 5). Each term is
 * guarded, so the pair partitions every run.
 */
const OWNER_SUBMITTED = P`has(vars.oppRecord) && has(vars.oppRecord.owner_id) && vars.oppRecord.owner_id != null
  && has(record.updated_by) && record.updated_by != null && record.updated_by == vars.oppRecord.owner_id`;
const OWNER_DID_NOT_SUBMIT = P`!has(vars.oppRecord) || !has(vars.oppRecord.owner_id) || vars.oppRecord.owner_id == null
  || !has(record.updated_by) || record.updated_by == null || record.updated_by != vars.oppRecord.owner_id`;

export const OpportunityApprovalFlow: Flow = {
  name: 'opportunity_approval',
  label: 'Large Deal Approval',
  description: 'Tiered approval for opportunities: manager review at $100K or more, director sign-off > $500K.',
  type: 'record_change',
  status: 'active',
  // Same user-less exposure as every record-change flow (ADR-0049) — and the
  // one with teeth. Measured on 17.0.0-rc.2: a $150K renewal
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
  // `mark_approved` stamps `approved_date` on a record the approval node holds
  // locked (`lockRecord: true`), which only a platform write may land. The approval node itself already opens its request under
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
      // Trigger wiring (7.4): bind to afterUpdate; gate on a save of a deal at
      // or over the entry threshold that no request holds and none has granted.
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
        // TOTALITY: `has(...)` on every read, plus `!= null` on the
        // ordering comparison — `has()` passes an explicit null and
        // `record.amount >= 100000` then aborts with
        // `no such overload: dyn<null> >= int`. Measured total as authored
        // today (amount/stage are required, approval_status is defaulted), but
        // that is `crm_opportunity`'s schema doing the work, not the
        // predicate. An absent `approval_status` reads the same as the null
        // this condition already tolerates; an absent `stage` is not a settled
        // stage, so it must not block approval.
        //
        // ── Which saves are a submission (#2334) ──
        // `rejected` enters as `not_required` does: a rejection is not a
        // release, and the way on from it is a NEW request. Before #2334 only
        // `not_required`/null entered, so no save could ever send a rejected
        // deal back, and `opportunity_lifecycle` had nothing to refuse its
        // close-won with either.
        //
        // ⚠️ `previous.approval_status != "pending"` is the one term that
        // tells a write that ENDS a request from a later save, and both halves
        // of #2334 turn on it. The platform writes the end of a request onto
        // the deal itself, through `approvalStatusField`, and the deal was
        // `pending` an instant before: a reject writes `rejected`, and a recall
        // restores the status the request was submitted from — `not_required`,
        // or `rejected` for a resubmission (`mirroredStatusValue`,
        // `@objectstack/plugin-approvals` 18.2.0, which leaves whether the
        // record re-enters to "the app's own gate"). Without the term both
        // writes re-entered: a recall opened a fresh request in the same
        // second and kept the deal locked (#2320 Sales D5, measured), and
        // `rejected` could not be admitted at all. No user save starts from
        // `pending`, because the approval node's lock refuses it. So the
        // writes that end a request open nothing, and the save after them —
        // the rep's revision — is the resubmission. The other approval writes
        // need no term: the node's own `pending` stamp and `mark_approved`
        // land outside the admitted statuses.
        //
        // TOTALITY: a prior status that cannot be read — a sparse prior row,
        // or the `null` prior row of a bulk `updateMany` — is not `pending`,
        // so it reads as a submission: fail-OPEN on purpose, the direction
        // that keeps the control engaged. (The status-change and 立项 gates
        // fail CLOSED on the same shape, because there the term asks whether
        // a NEW request was written.)
        // ⛔ The insert twin below does not share this condition: an insert
        // has no prior row to read.
        condition: P`has(record.amount) && record.amount != null && record.amount >= ${LARGE_DEAL_AMOUNT}
          && (!has(record.approval_status) || record.approval_status == "not_required" || record.approval_status == null
            || record.approval_status == "rejected")
          && (!has(previous.approval_status) || previous.approval_status != "pending")
          && (!has(record.stage) || (record.stage != "closed_won" && record.stage != "closed_lost"))`,
      },
    },
    {
      id: 'get_opportunity',
      type: 'get_record',
      label: 'Get Opportunity',
      config: { objectName: 'crm_opportunity', filter: { id: cel`record.id` }, outputVariable: 'oppRecord' },
    },

    // ── Tier 1: Sales Manager review (all deals at $100K or more) ───
    {
      id: 'manager_review',
      type: 'approval',
      label: 'Sales Manager Review',
      config: {
        // ⛔ Never add an org-owner approver as an empty-bench workaround.
        // `onEmptyApprovers: 'admin_rescue'` is the node policy for an empty
        // position on @objectstack 17 (approvers snapshot at request creation,
        // so a position with no holders would otherwise leave the request
        // undecidable while `lockRecord` held the record hostage). An
        // `{ type: 'org_membership_level', value: 'owner' }` entry overshoots:
        // with `behavior: 'first_response'` it makes an org owner a routine
        // approver for every deal, not a rescue when the bench is empty.
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
      // `flow-inert-node-condition`).
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

    // ── Final approve: stamp the date + notify owner ────────────────
    {
      // Kept, unlike the rejection's twin (#2061): `approved_date` is a value
      // only this node writes. Through 18.0.0-next.5 it ran as the run's
      // trigger user, the submitter, and stamped `updated_by` as them. From
      // 18.0.0 the platform runs the nodes after a decision as the person who
      // decided (objectstack changeset `24321-resume-as-decider`); measured on
      // 18.0.0, it stamps the approver. The restated `approved` changes
      // nothing about that, since the node writes either way.
      id: 'mark_approved',
      type: 'update_record',
      label: 'Mark Approved',
      config: {
        objectName: 'crm_opportunity',
        filter: { id: cel`record.id` },
        fields: { approval_status: 'approved', approved_date: cel`isoDatetime(now())` },
      },
    },
    {
      // ── One notice per decision (#2371 row 5) ──
      // The platform already tells the SUBMITTER the outcome in the inbox
      // ("Request approved — Your Opportunity … was approved.", with the
      // approver's comment): `ApprovalService.notifyDecisionOutcome`,
      // `@objectstack/plugin-approvals` 18.2.0, topic `approval.approved` /
      // `approval.rejected`, inbox only. This node's inbox copy was the same
      // news a second time for the usual submitter, the deal's own rep. So
      // the owner's email stays here (the platform sends none), and the
      // owner's inbox notice is sent only when the platform's does not reach
      // them: when someone else's save sent the deal for approval
      // (`check_owner_submitted_*` below).
      id: 'notify_approved',
      type: 'notify',
      label: 'Email Owner — Approved',
      config: {
        recipients: [cel`has(oppRecord.owner_id) ? oppRecord.owner_id : null`],
        channels: ['email'],
        topic: 'opportunity_approved',
        template: 'crm.opportunity_approved',
        templateData: { name: cel`oppRecord.name` },
        actionUrl: '/crm_opportunity/{{record.id}}',
      },
    },

    // ── Rejection: notify owner ─────────────────────────────────────
    // The approval node's mirror has already written `rejected`, as the person
    // who decided. ⛔ No `update_record` here restates it (#2061): a write from
    // the resumed run carries the run's trigger user, the submitter, so it
    // re-stamped `updated_by` from the approver back to the submitter while
    // changing no value. Measured on 18.0.0-next.3, pinned in
    // `test/approval-decision-attribution.test.ts`.
    {
      // Email only, as `notify_approved` (#2371 row 5).
      id: 'notify_rejected',
      type: 'notify',
      label: 'Email Owner — Rejected',
      config: {
        recipients: [cel`has(oppRecord.owner_id) ? oppRecord.owner_id : null`],
        channels: ['email'],
        severity: 'warning',
        topic: 'opportunity_rejected',
        template: 'crm.opportunity_rejected',
        templateData: { name: cel`oppRecord.name` },
        actionUrl: '/crm_opportunity/{{record.id}}',
      },
    },

    // ── The owner's inbox notice, when the platform's misses them ──
    // The platform's notice goes to the request's submitter, the user whose
    // save fired this run (`runTriggerUser`). That save stamped
    // `record.updated_by` (on an insert, `record.created_by` too), so an
    // owner who is not that user — a manager raised the rep's amount, or a
    // system write with no user started the run — hears it here instead.
    // TOTALITY: an unreadable writer or owner reads as "not the owner", so
    // the inbox notice is sent: a duplicate is the old behaviour, a missed
    // notice is not.
    { id: 'check_owner_submitted_approved', type: 'decision', label: 'Owner Submitted?' },
    {
      id: 'notify_approved_inbox',
      type: 'notify',
      label: 'Notify Owner — Approved',
      config: {
        recipients: [cel`has(oppRecord.owner_id) ? oppRecord.owner_id : null`],
        channels: ['inbox'],
        topic: 'opportunity_approved',
        template: 'crm.opportunity_approved',
        templateData: { name: cel`oppRecord.name` },
        actionUrl: '/crm_opportunity/{{record.id}}',
      },
    },
    { id: 'check_owner_submitted_rejected', type: 'decision', label: 'Owner Submitted?' },
    {
      id: 'notify_rejected_inbox',
      type: 'notify',
      label: 'Notify Owner — Rejected',
      config: {
        recipients: [cel`has(oppRecord.owner_id) ? oppRecord.owner_id : null`],
        channels: ['inbox'],
        severity: 'warning',
        topic: 'opportunity_rejected',
        template: 'crm.opportunity_rejected',
        templateData: { name: cel`oppRecord.name` },
        actionUrl: '/crm_opportunity/{{record.id}}',
      },
    },

    { id: 'end', type: 'end', label: 'End' },
  ],

  edges: [
    { id: 'e1', source: 'start', target: 'get_opportunity', type: 'default' },
    { id: 'e2', source: 'get_opportunity', target: 'manager_review', type: 'default' },

    // Manager decision (approval-node branch labels)
    { id: 'e3', source: 'manager_review', target: 'check_high_value', type: 'default', label: 'approve' },

    // ── A recall is not a rejection (#2349) ──
    // The platform resumes a RECALLED request down this same `reject` edge
    // (`ApprovalService.recall`, `@objectstack/plugin-approvals` 18.2.0), so
    // the label alone sent the rep a "rejected" notice for a request nobody
    // decided. What tells the two apart is the decision the resume lands as
    // `vars.<nodeId>.decision`: `'recall'` for a recall, `'reject'` for an
    // approver's rejection or an auto-rejection. Both edges carry the label
    // (the resume picks among them by it), and their conditions PARTITION in
    // opposite polarity, as `e5`/`e6` do. A decision that cannot be read
    // notifies: an unreadable decision is today's behaviour, not a silent
    // loss of a real rejection's notice.
    { id: 'e4', source: 'manager_review', target: 'notify_rejected', type: 'conditional', label: 'reject',
      condition: P`!has(vars.manager_review) || !has(vars.manager_review.decision) || vars.manager_review.decision != "recall"` },
    { id: 'e4_recall', source: 'manager_review', target: 'end', type: 'conditional', label: 'reject',
      condition: P`has(vars.manager_review) && has(vars.manager_review.decision) && vars.manager_review.decision == "recall"` },

    // Tier gate (decision-node conditional branches). These EDGES are the live
    // sites — the engine never evaluates a `decision` node's singular
    // `config.condition` — and they must PARTITION, so the guards are written
    // in opposite polarity. A deal whose amount cannot be read lands on
    // `mark_approved`: the manager has already approved it, and an unreadable
    // amount must not strand an approved deal in a locked, undecidable
    // director step.
    //
    // TOTALITY: `oppRecord` is a `get_record` OUTPUT, so the read needs
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
    // ABORTS the step rather than skipping it, so a guard that was
    // belt-and-braces is now what keeps the run alive.
    { id: 'e5', source: 'check_high_value', target: 'director_signoff', type: 'conditional', condition: P`has(vars.oppRecord) && has(vars.oppRecord.amount)
      && vars.oppRecord.amount != null && vars.oppRecord.amount > ${HIGH_VALUE_DEAL_AMOUNT}`, label: 'High value (> $500K)' },
    { id: 'e6', source: 'check_high_value', target: 'mark_approved', type: 'conditional', condition: P`!has(vars.oppRecord) || !has(vars.oppRecord.amount)
      || vars.oppRecord.amount == null || vars.oppRecord.amount <= ${HIGH_VALUE_DEAL_AMOUNT}`, label: 'Standard (≤ $500K)' },

    // Director decision (approval-node branch labels). A recall here — the
    // rep withdrawing a deal the manager already approved — ends the run the
    // same way (see `e4`).
    { id: 'e7', source: 'director_signoff', target: 'mark_approved', type: 'default', label: 'approve' },
    { id: 'e8', source: 'director_signoff', target: 'notify_rejected', type: 'conditional', label: 'reject',
      condition: P`!has(vars.director_signoff) || !has(vars.director_signoff.decision) || vars.director_signoff.decision != "recall"` },
    { id: 'e8_recall', source: 'director_signoff', target: 'end', type: 'conditional', label: 'reject',
      condition: P`has(vars.director_signoff) && has(vars.director_signoff.decision) && vars.director_signoff.decision == "recall"` },

    // Terminal branches
    { id: 'e9', source: 'mark_approved', target: 'notify_approved', type: 'default' },
    { id: 'e10', source: 'notify_approved', target: 'check_owner_submitted_approved', type: 'default' },
    { id: 'e12', source: 'notify_rejected', target: 'check_owner_submitted_rejected', type: 'default' },

    // The owner's inbox notice (#2371 row 5): partitioned in opposite
    // polarity, as `e5`/`e6` are.
    { id: 'e13', source: 'check_owner_submitted_approved', target: 'end', type: 'conditional',
      label: 'Owner submitted', condition: OWNER_SUBMITTED },
    { id: 'e14', source: 'check_owner_submitted_approved', target: 'notify_approved_inbox', type: 'conditional',
      label: 'Someone else submitted', condition: OWNER_DID_NOT_SUBMIT },
    { id: 'e15', source: 'notify_approved_inbox', target: 'end', type: 'default' },
    { id: 'e16', source: 'check_owner_submitted_rejected', target: 'end', type: 'conditional',
      label: 'Owner submitted', condition: OWNER_SUBMITTED },
    { id: 'e17', source: 'check_owner_submitted_rejected', target: 'notify_rejected_inbox', type: 'conditional',
      label: 'Someone else submitted', condition: OWNER_DID_NOT_SUBMIT },
    { id: 'e18', source: 'notify_rejected_inbox', target: 'end', type: 'default' },
  ],
};

/**
 * Insert-time twin of `opportunity_approval`. A record-change flow binds
 * exactly one hook event, so the afterUpdate flow above never sees
 * opportunities BORN over the threshold — flow-created deals (contract
 * renewals, lead conversion) and API inserts. ⛔ Do not delete this twin
 * expecting the afterUpdate flow to cover them; that population is exactly what
 * the start condition's null-tolerance is written for. Same nodes/edges; the
 * start node is rebound to afterInsert (mirrors `CaseEscalationOnCreateFlow`)
 * and keeps the entry condition the update flow had before #2334. An insert has
 * no prior row, so the `previous` term has nothing to read, and a deal is never
 * born `rejected`. The stage guard carries over, keeping seeded/imported closed
 * deals out.
 */
export const OpportunityApprovalOnCreateFlow: Flow = {
  ...OpportunityApprovalFlow,
  name: 'opportunity_approval_on_create',
  label: 'Large Deal Approval (on create)',
  description: 'Approval intake for opportunities created above the threshold (insert-time twin of opportunity_approval).',
  nodes: OpportunityApprovalFlow.nodes.map((n) =>
    n.id === 'start'
      ? {
        ...n,
        config: {
          ...n.config,
          triggerType: 'record-after-create',
          condition: P`has(record.amount) && record.amount != null && record.amount >= ${LARGE_DEAL_AMOUNT}
            && (!has(record.approval_status) || record.approval_status == "not_required" || record.approval_status == null)
            && (!has(record.stage) || (record.stage != "closed_won" && record.stage != "closed_lost"))`,
        },
      }
      : n,
  ),
};
