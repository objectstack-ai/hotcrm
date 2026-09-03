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
      // The `label` names what this node actually does: it flags the case as
      // escalated (see `fields` below) and reassigns nothing. The `id` keeps
      // its original `assign_senior_agent` spelling on purpose — `edges[]`
      // reference nodes by id, and `CaseEscalationOnCreateFlow` rewrites the
      // node list by id, so renaming one is a behaviour change, not a wording
      // fix.
      id: 'assign_senior_agent', type: 'update_record', label: 'Flag as Escalated',
      config: {
        objectName: 'crm_case', filter: { id: '{record.id}' },
        // `escalation_reason` must be set whenever `is_escalated` flips true — the
        // object's `escalation_reason_required` validation rejects the write
        // otherwise (which silently aborted this flow until it was supplied).
        //
        // This node still writes NO owner, and still cannot: reassigning from a
        // flow would mean `{caseRecord.owner_id.manager}`, and a flow template
        // cannot traverse a lookup — it interpolates to the literal "undefined"
        // and would orphan the case under a phantom owner. What changed in
        // #1070 is that the hand-off no longer has to happen here: this very
        // update fires the `case_escalation_reassign` beforeUpdate hook
        // (`src/objects/_case-assignment.ts`), which puts the case with the
        // least-loaded holder of the flat `service_manager` position — a pool,
        // which the app can resolve, rather than a manager chain, which it
        // cannot. With that pool unstaffed the case keeps its owner and this
        // write is unchanged.
        fields: { is_escalated: true, escalation_reason: 'Auto-escalated: critical priority', escalated_date: '{NOW()}', status: 'escalated' },
      },
    },
    // No `create_task` node here: the escalation write above flips `status` to
    // `escalated`, which fires the `case_status_side_effects` hook — the single
    // owner of escalation follow-up tasks (it also covers the `escalate_case`
    // action and the SLA monitor). A second task node here produced duplicate,
    // disagreeing tasks (case owner/high vs account owner/urgent) per escalation.
    {
      // Gateway only — the live predicate is on the out-edge `e4` (#650). The
      // engine never reads a `decision` node's singular `config.condition`, so
      // a copy here would restate the gate without BEING the gate
      // (`flow-inert-node-condition`, #4414); `test/flow-decision-authority.test.ts`
      // enforces that.
      //
      // #1430: `crm_case.owner_id` is NULLABLE and an unowned case is an
      // ordinary state — this repo ships `scripts/backfill-owner-id.ts` and
      // `pnpm backfill:owner` precisely because ownerless rows happen, and
      // ordinary REST creation / import reach the same state. `notify_team`
      // below addresses exactly ONE recipient, so an ownerless case left it
      // with an empty slate, which the builtin node treats as a HARD failure:
      // `execute` returns `success: false`, `executeNode` turns that into a
      // throw, and the run ends `status: 'failed'`.
      //
      // BLAST RADIUS, stated precisely because it differs from the sibling
      // defect #1405 and the difference is structural: these two are
      // `record_change` flows with NO loop, so one ownerless case kills only
      // its OWN run — there is no queue of other records behind it. #1405 was
      // a `schedule` flow whose work sat inside a `loop` that awaits
      // `runRegion` with no try/catch, and there one ownerless row took down
      // every breached case ordered behind it.
      //
      // The gate sits AFTER `assign_senior_agent`, which stays UNCONDITIONAL:
      // the escalation itself must still land (measured `is_escalated: true`,
      // `status: 'escalated'` on every failing run), so an ownerless critical
      // case stays visible in views and reports. Only the notify is gated —
      // and here that loses nothing a reader would want, because `caseRecord`
      // is read by `get_case` UPSTREAM of the escalation write, so
      // `{caseRecord.owner_id}` is deliberately the owner the case had BEFORE
      // the hand-off. With no such person there is no "previous owner" for the
      // message to be addressed to.
      //
      // ⚠️ This guard is exactly the duplication objectstack#13682 exists to
      // retire — `notify` should treat an empty audience as a RECORDED SKIP
      // rather than a hard failure. When #13682 lands, delete this node and
      // edge `e4`'s predicate here, and the same pair in
      // `case-sla-monitor.flow.ts`.
      id: 'check_owner', type: 'decision', label: 'Case Has an Owner?',
    },
    {
      // ADR-0012: the dedicated `notify` node dispatches through the messaging
      // service (inbox + email + push). The legacy `script` + `actionType:'email'`
      // shape is a no-op stub in 7.4 and never delivered anything.
      // Owner only: `{caseRecord.owner_id.manager}` cannot traverse a lookup in
      // flow templates — it interpolates to the literal "undefined".
      // The `label` names the single recipient this node has (`recipients`
      // below); the `id` keeps its `notify_team` spelling because `edges[]`
      // reference it. Cf. the same node in `case-sla-monitor.flow.ts`, whose
      // label already says `Alert Owner`.
      id: 'notify_team', type: 'notify', label: 'Notify Case Owner',
      config: {
        // Owner only, and the owner it reaches is the one the case had BEFORE
        // the escalation: `caseRecord` was read by `get_case` upstream of the
        // write, so `{caseRecord.owner_id}` is the agent being handed off from
        // — exactly the person this message is for. Flow templates cannot
        // traverse a lookup (see the note on `assign_senior_agent` above):
        // `{caseRecord.owner_id.manager}` and `{caseRecord.crm_account.name}`
        // both interpolate to the literal string "undefined" — a phantom
        // recipient and a garbled body.
        recipients: ['{caseRecord.owner_id}'],
        channels: ['inbox', 'email'],
        severity: 'critical',
        topic: 'case_escalated',
        title: 'Case escalated: {caseRecord.case_number}',
        // ⚠️ The body must stay true on BOTH outcomes. `It remains assigned to
        // you.` was the old text and became false the moment #1070 landed; the
        // opposite claim ("it has been reassigned") is false whenever the
        // `service_manager` pool is unstaffed, which is the first-install norm.
        // So it states the rule and points at the record for the answer.
        message: 'Case {caseRecord.case_number} ({caseRecord.priority}) has been auto-escalated on critical priority. Ownership passes to the service manager with the lightest load; while nobody holds that position the case stays with you. Open the case to see who owns it now.',
        actionUrl: '/crm_case/{record.id}',
      },
    },
    { id: 'end', type: 'end', label: 'End' },
  ],

  edges: [
    { id: 'e1', source: 'start', target: 'get_case', type: 'default' },
    { id: 'e2', source: 'get_case', target: 'assign_senior_agent', type: 'default' },
    { id: 'e3', source: 'assign_senior_agent', target: 'check_owner', type: 'default' },
    // The gate. A `decision` with no matching out-edge simply ends the run
    // here, after the escalation has already been written.
    //
    // TOTALITY (#643): `caseRecord` is a `get_record` OUTPUT — a raw driver
    // row, sparse in exactly the way #633 measured, so only `has()` is total
    // and it must be `vars.`-scoped (measured: bare `has(caseRecord.owner_id)`
    // still aborts with `Unknown variable` on an unbound root, while
    // `has(vars.caseRecord)` answers `false`).
    //
    // EVERY TERM IS LOAD-BEARING, and the last one MIRRORS THE NOTIFY NODE'S
    // OWN emptiness rule rather than guessing at it: builtin `notify` builds
    // its audience with `String(v).trim()` + `.filter(Boolean)`, so null,
    // undefined, `''` and any all-whitespace value all collapse to the same
    // empty slate. Each term was measured through `evaluateCondition` on the
    // shape it alone covers, by dropping it and recording what the rest do:
    //   - `has(vars.caseRecord)` — an UNBOUND root. Without it the predicate
    //     aborts with `No such key: caseRecord`. `get_case` binds the variable
    //     on every path here (it sets it even when it matched nothing), so
    //     this term is the one that keeps a future graph edit from turning a
    //     gate into an abort — and the `vars.`-scoped `has()` pair is the
    //     house rule `test/flow-variable-conditions.test.ts` enforces.
    //   - `has(vars.caseRecord.owner_id)` — the ABSENT key (driver-memory /
    //     driver-mongodb store only the columns a row was written with).
    //     Without it, `vars.caseRecord.owner_id != null` aborts with
    //     `No such key: owner_id`.
    //   - `vars.caseRecord.owner_id != null` — the explicit NULL. Without it
    //     the wrap is handed one and aborts with
    //     `no matching overload for 'string(null)'`, so this term must
    //     short-circuit in front of it.
    //   - `string(...).trim() != ""` — the BLANK/whitespace id. `'   ' != ""`
    //     is TRUE in CEL, so a gate written that way opens for a whitespace
    //     owner_id and reproduces this very defect one input narrower. The
    //     `string()` wrap is not decoration either: measured, a bare
    //     `.trim()` on a numeric id aborts with
    //     `no matching overload for 'double.trim()'` and `.matches()` with
    //     `'double.matches(string)'` — a thrown condition, which is the fault
    //     mode this fix exists to remove, reintroduced on a different input.
    //
    // A `vars.caseRecord != null` term was drafted here for the row that is
    // GONE by the time `get_case` reads it — `get_record` with no match sets
    // the variable to `null`, key present. Measured INERT and removed: `has()`
    // on a null base answers `false` rather than aborting, so the four terms
    // above already close that shape (`test/flow-escalation-ownerless-case.test.ts`
    // covers it). A term that cannot change an answer is the inert-copy shape
    // #4414 deletes, not defence in depth.
    { id: 'e4', source: 'check_owner', target: 'notify_team', type: 'conditional', condition: P`has(vars.caseRecord) && has(vars.caseRecord.owner_id)
      && vars.caseRecord.owner_id != null && string(vars.caseRecord.owner_id).trim() != ""`, label: 'Has owner' },
    { id: 'e5', source: 'notify_team', target: 'end', type: 'default' },
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
