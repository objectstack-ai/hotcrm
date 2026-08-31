// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { P } from '@objectstack/spec';
import type * as Automation from '@objectstack/spec/automation';
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
 * Capabilities exercised: scheduled trigger + `loop` + `update_record` +
 * `notify`.
 */
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
        body: {
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
              // finds it — and only the push notification is skipped. Gating
              // both would trade a dead run for a silently dropped alert on
              // exactly the cases most likely to be neglected.
              id: 'check_owner', type: 'decision', label: 'Case Has an Owner?',
            },
            {
              // Owner only: `{currentCase.owner_id.manager}` cannot traverse a
              // lookup in flow templates — it interpolates to the literal
              // "undefined" (cf. case_escalation / opportunity_won_alert).
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
            // A gate with no matching edge simply ends the iteration, so the
            // loop moves on to the next breached case — that is the whole fix.
            //
            // TOTALITY (#643): `currentCase` is a LOOP ITEM over `caseList`,
            // which `get_record` filled from `data.find` — every element is a
            // raw driver row, sparse in exactly the way #633 measured. A case
            // that was never written with an `owner_id` column carries no key
            // at all, so `has()` is the only total accessor; an unguarded
            // `vars.currentCase.owner_id != null` aborts with `No such key`
            // and takes the run down the same way the empty slate did.
            //
            // Every term is load-bearing, and the last one MIRRORS THE NOTIFY
            // NODE'S OWN emptiness rule rather than guessing at it: builtin
            // `notify` builds its audience with `String(v).trim()` +
            // `.filter(Boolean)`, so null, undefined, `''` AND any all-whitespace
            // value all collapse to the same empty slate. Measured: `'   ' != ""`
            // is TRUE in CEL, so a gate written that way opened for a
            // whitespace owner_id and reproduced this very defect one input
            // narrower. `string(...).trim() != ""` is the same predicate the
            // node applies, written in CEL.
            //
            // The `string()` wrap is not decoration: bare `.matches()` /
            // `.trim()` on a non-string id fails with `no matching overload`,
            // which is a thrown condition — the fault mode this fix exists to
            // remove. `string()` is total for every non-null scalar, and the
            // `!= null` term in front short-circuits before it can be handed a
            // null (`string(null)` has no overload either).
            { id: 'b2', source: 'check_owner', target: 'notify_team', type: 'conditional', condition: P`has(vars.currentCase) && has(vars.currentCase.owner_id)
              && vars.currentCase.owner_id != null && string(vars.currentCase.owner_id).trim() != ""`, label: 'Has owner' },
          ],
        },
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
