// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { P } from '@objectstack/spec';
import type * as Automation from '@objectstack/spec/automation';
import { guarded } from './_guarded-iteration';
type Flow = Automation.Flow;

/**
 * Case SLA Monitor — scheduled breach detection.
 *
 * Complements `case_escalation` (which reacts to *priority* the moment a case
 * is saved) by adding the missing *time* dimension. The schema carries
 * `sla_due_date` and `is_sla_violated`, but nothing watched the clock — a case
 * could silently blow its SLA. This flow sweeps open (not resolved/closed)
 * cases whose `sla_due_date` has passed, stamps the breach, escalates, and
 * alerts the owner.
 *
 * A breached case with NO owner is the hard case, and it is answered in two
 * halves. The escalation the sweep writes is itself what gives the case an
 * owner — `case_escalation_reassign` rides on that update and hands the case to
 * the least-loaded `service_manager` — so this flow re-reads the case
 * afterwards and alerts whoever it now belongs to. When the pool is empty the
 * assignment is a no-op, the case stays unowned, the alert is skipped at a
 * named gate, and the RUN SURVIVES: the breach is still recorded and every
 * other breached case is still swept. ⛔ No fallback recipient, no
 * manager-chain dot-walk, no hard failure (maintainer ruling 2026-09-03).
 *
 * Capabilities exercised: scheduled trigger + `loop` + `update_record` +
 * `get_record` + `notify`.
 */

/**
 * "The case in hand carries an owner the `notify` node can address."
 *
 * Authored ONCE and used on two edges (`b2` and `b5`) because the two ask the
 * same question at two points in the iteration — before the sweep's write and
 * after it — and a hand-copied second spelling is exactly the drift `#650`
 * measured on decision nodes. {@link CASE_HAS_NO_OWNER} is its complement.
 *
 * TOTALITY (#643): `currentCase` is a LOOP ITEM over `caseList`, which
 * `get_record` filled from `data.find` — every element is a raw driver row,
 * sparse in exactly the way #633 measured. A case that was never written with
 * an `owner_id` column carries no key at all, so `has()` is the only total
 * accessor; an unguarded `vars.currentCase.owner_id != null` aborts with
 * `No such key` and takes the run down the same way an empty recipient slate
 * once did.
 *
 * Every term is load-bearing, and the last one MIRRORS THE NOTIFY NODE'S OWN
 * emptiness rule rather than guessing at it: builtin `notify` builds its
 * audience with `String(v).trim()` + `.filter(Boolean)`, so null, undefined,
 * `''` AND any all-whitespace value all collapse to the same empty slate.
 * Measured: `'   ' != ""` is TRUE in CEL, so a gate written that way opened for
 * a whitespace `owner_id` and reproduced this very defect one input narrower.
 * `string(...).trim() != ""` is the same predicate the node applies, in CEL.
 *
 * The `string()` wrap is not decoration: bare `.matches()` / `.trim()` on a
 * non-string id fails with `no matching overload`, which is a thrown condition
 * — the fault mode this flow exists to keep out. `string()` is total for every
 * non-null scalar, and the `!= null` term in front short-circuits before it can
 * be handed a null (`string(null)` has no overload either).
 */
const CASE_HAS_OWNER = () => P`has(vars.currentCase) && has(vars.currentCase.owner_id)
  && vars.currentCase.owner_id != null && string(vars.currentCase.owner_id).trim() != ""`;

/**
 * The exact complement of {@link CASE_HAS_OWNER}, in the opposite polarity the
 * house rule prescribes for a partition (`!has(x) || … `).
 *
 * ⚠️ `has(vars.currentCase)` leads BOTH predicates rather than being negated
 * here, so the two edges partition only the cases where the iterator is bound.
 * That asymmetry is deliberate: with no `currentCase` at all NEITHER edge
 * matches and the iteration simply ends — the pre-existing behaviour — instead
 * of routing an unbindable row into `reload_case`, whose `{currentCase.id}`
 * filter token would then resolve to nothing and make `get_record` REFUSE the
 * step, killing the run for the exact reason this flow was repaired.
 */
const CASE_HAS_NO_OWNER = () => P`has(vars.currentCase) && (!has(vars.currentCase.owner_id)
  || vars.currentCase.owner_id == null || string(vars.currentCase.owner_id).trim() == "")`;

export const CaseSlaMonitorFlow: Flow = {
  name: 'case_sla_monitor',
  label: 'Case SLA Monitor',
  description: 'Hourly sweep: flag and escalate open cases that have breached their SLA due date.',
  type: 'schedule',
  status: 'active',
  // Scheduled runs have no trigger user, so under the default runAs:'user' the
  // data nodes execute UNSCOPED anyway. Declare runAs:'system' to make that
  // RLS-bypassing elevation explicit and intended (ADR-0049, #1888).
  runAs: 'system',

  variables: [],

  nodes: [
    { id: 'start', type: 'start', label: 'Start (hourly)', config: { schedule: '0 * * * *' } },
    {
      id: 'query_breached', type: 'get_record', label: 'Find Breached Cases',
      config: {
        objectName: 'crm_case',
        // `$nin` (not `is_closed: false`): a case in `resolved` has met its SLA —
        // work is finished — but `is_closed` only flips on `closed`, so the old
        // filter stamped false breaches on resolved cases and dragged them back
        // to `escalated`.
        filter: {
          status: { $nin: ['resolved', 'closed'] },
          is_sla_violated: false,
          sla_due_date: { $lt: '{NOW()}' },
        },
        limit: 500,
        outputVariable: 'caseList',
      },
    },
    {
      id: 'loop_cases', type: 'loop', label: 'For Each Breached Case',
      config: {
        collection: '{caseList}',
        iteratorVariable: 'currentCase',
        body: guarded('case', {
          nodes: [
            {
              id: 'flag_breach', type: 'update_record', label: 'Flag SLA Breach',
              config: {
                objectName: 'crm_case',
                filter: { id: '{currentCase.id}' },
                // `escalation_reason` must accompany `is_escalated: true` — the
                // object's `escalation_reason_required` validation (severity:
                // error) rejects the whole write otherwise, turning this sweep
                // into a silent no-op (cf. the same fix in case_escalation).
                fields: {
                  is_sla_violated: true,
                  is_escalated: true,
                  status: 'escalated',
                  escalated_date: '{NOW()}',
                  escalation_reason: 'Auto-escalated: SLA due date breached',
                },
              },
            },
            {
              // Gateway only — the predicate lives on the out-edge (#650).
              //
              // #1405: `crm_case.owner_id` is NULLABLE and an unowned case is an
              // ordinary state (this repo ships `scripts/backfill-owner-id.ts` /
              // `pnpm backfill:owner` precisely because ownerless rows happen;
              // ordinary REST creation and import reach it too). The `notify`
              // node below addresses exactly one recipient, so an ownerless case
              // left it with an empty slate — which the builtin node treats as a
              // HARD failure, and that failure is not scoped to the one case:
              // `executeNode` throws, `runRegion` rethrows, and the `loop` node
              // awaits it with no try/catch, so the whole sweep died on the
              // ownerless row and every breached case ORDERED BEHIND IT was
              // never even flagged. Measured, not assumed — see
              // `test/flow-sla-ownerless-case.test.ts`.
              //
              // The gate sits AFTER `flag_breach` on purpose. `flag_breach` is
              // unconditional, so an ownerless breach is still RECORDED on the
              // record — visible in views and reports, where a service manager
              // finds it. Gating both would trade a dead run for a silently
              // dropped alert on exactly the cases most likely to be neglected.
              //
              // #1405, second half (maintainer ruling 2026-09-03, option C):
              // the ownerless branch is no longer a dead end. It now goes to
              // `reload_case`, because by the time the gate is reached the
              // sweep's own write may ALREADY HAVE GIVEN THE CASE AN OWNER —
              // see that node.
              id: 'check_owner', type: 'decision', label: 'Case Has an Owner?',
            },
            {
              // Re-read the case the sweep just wrote (#1405).
              //
              // ⚠️ THE ASSIGNMENT IS NOT AUTHORED HERE, AND MUST NOT BE.
              // `flag_breach` writes `status: 'escalated'`, and that IS the
              // escalation transition `case_escalation_reassign`
              // (`src/objects/_case-assignment.ts`, `beforeUpdate`, priority
              // 250) fires on: it stamps the least-loaded holder of the
              // `service_manager` position onto the payload of the update
              // already in flight. So the sweep does not need a seam to "call"
              // the assignment — performing the transition IS putting the case
              // through it, and the app keeps ONE answer to "who should own
              // this case" instead of a flow-shaped second implementation of
              // least-loaded balancing.
              //
              // MEASURED, not assumed (`test/flow-sla-ownerless-case.test.ts`
              // drives the real flow, the real engine and the real hooks): with
              // a staffed pool an ownerless breached case comes back owned; with
              // an empty pool the hook stands down and the case comes back
              // ownerless. No second write, no re-entry, no loop — the hook
              // mutates the in-flight payload and issues no operation of its
              // own.
              //
              // What the flow was missing is therefore the READ, not the write:
              // `currentCase` is the loop item bound by `query_breached` BEFORE
              // `flag_breach` ran, so the owner the sweep just assigned is
              // invisible to it and `{currentCase.owner_id}` addresses the
              // pre-write state. Re-binding the SAME variable is what makes the
              // rest of the iteration — the gate below and the notify node's
              // whole template — read the case as it now stands, with no second
              // notify node to keep in step.
              //
              // No `limit`: `get_record` calls `findOne` at or below 1 and binds
              // the single row itself, which is what `{currentCase.<field>}`
              // needs. A miss binds `null` — `get_record` always binds — which
              // `check_assigned` below is there to read.
              id: 'reload_case', type: 'get_record', label: 'Re-read Case After Escalation',
              config: {
                objectName: 'crm_case',
                filter: { id: '{currentCase.id}' },
                outputVariable: 'currentCase',
              },
            },
            {
              // Gateway only — the predicate lives on the out-edge (#650).
              //
              // The ruled empty-pool clause, as a gate rather than a failure:
              // when the `service_manager` pool resolves empty the hook assigns
              // nobody, the re-read case is still ownerless, no edge matches and
              // the iteration ends. The breach stays on the record and in the
              // run summary, the notification is skipped at a NAMED gate, and
              // the run survives. ⛔ No hard failure, no fallback recipient, no
              // manager-chain dot-walk.
              id: 'check_assigned', type: 'decision', label: 'Escalation Found an Owner?',
            },
            {
              // Owner only: `{currentCase.owner_id.manager}` cannot traverse a
              // lookup in flow templates — it interpolates to the literal
              // "undefined" (cf. case_escalation / opportunity_won_alert).
              //
              // Reached from BOTH gates, and the whole template reads
              // `currentCase` either way: on the owned branch that is the row
              // `query_breached` bound, on the ownerless branch the row
              // `reload_case` re-bound. One node, one wording, one recipient
              // rule — a second notify node would be the same alert authored
              // twice, free to drift on the half nobody is looking at.
              id: 'notify_team', type: 'notify', label: 'Alert Owner',
              config: {
                // Owner only — `{currentCase.owner_id.manager}` dot-walks a
                // lookup, which flow templates interpolate as "undefined".
                recipients: ['{currentCase.owner_id}'],
                channels: ['inbox', 'email'],
                severity: 'critical',
                topic: 'case_sla_breach',
                title: 'SLA breached: case {currentCase.case_number}',
                message: 'Case {currentCase.case_number} ({currentCase.priority}) passed its SLA due date and has been auto-escalated.',
                actionUrl: '/crm_case/{currentCase.id}',
              },
            },
          ],
          edges: [
            { id: 'b1', source: 'flag_breach', target: 'check_owner', type: 'default' },
            // The two out-edges of `check_owner` are an exact PARTITION of the
            // cases where `currentCase` is bound (see {@link CASE_HAS_OWNER} /
            // {@link CASE_HAS_NO_OWNER}) — never a `default` edge alongside a
            // conditional one, which would traverse BOTH and notify twice.
            //
            // ⚠️ The owned branch reads `currentCase` as `query_breached` bound
            // it, deliberately unchanged by #1405: a case that already had an
            // owner keeps alerting THAT owner, which is what the sweep has
            // always done. Re-routing an owned case's alert is a separate
            // product question and is filed as one, not decided here.
            { id: 'b2', source: 'check_owner', target: 'notify_team', type: 'conditional', condition: CASE_HAS_OWNER(), label: 'Has owner' },
            { id: 'b3', source: 'check_owner', target: 'reload_case', type: 'conditional', condition: CASE_HAS_NO_OWNER(), label: 'No owner — re-read after escalation' },
            { id: 'b4', source: 'reload_case', target: 'check_assigned', type: 'default' },
            // Both branches converge on the ONE notify node, which is why the
            // re-read re-binds `currentCase` rather than a second variable: the
            // recipient, the title, the message and the action URL are authored
            // once and cannot drift into two versions of the same alert.
            //
            // A gate with no matching edge simply ends the iteration, so an
            // ownerless case the pool could not place is skipped and the loop
            // moves on to the next breached case — the run survives, which is
            // the property this flow was repaired for.
            { id: 'b5', source: 'check_assigned', target: 'notify_team', type: 'conditional', condition: CASE_HAS_OWNER(), label: 'Escalation assigned an owner' },
          ],
        }),
      },
    },
    { id: 'end', type: 'end', label: 'End' },
  ],

  edges: [
    { id: 'e1', source: 'start', target: 'query_breached', type: 'default' },
    { id: 'e2', source: 'query_breached', target: 'loop_cases', type: 'default' },
    { id: 'e3', source: 'loop_cases', target: 'end', type: 'default' },
  ],
};
