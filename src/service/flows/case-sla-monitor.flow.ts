// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { P, cel } from '@objectstack/spec';
import type * as Automation from '@objectstack/spec/automation';
import { guarded } from '../../sales/flows/_guarded-iteration';
type Flow = Automation.Flow;

/**
 * Case SLA Monitor — scheduled breach detection.
 *
 * Complements `case_escalation` (which reacts to *priority* the moment a case
 * is saved) by adding the missing *time* dimension. The schema carries
 * `sla_due_date` and `is_sla_violated`, but nothing watched the clock — a case
 * could silently blow its SLA. This flow sweeps open (not resolved/closed)
 * cases whose `sla_due_date` has passed, stamps the breach, escalates, and
 * alerts the owner. A case that is already escalated keeps the escalation it
 * has — the agent's reason and the date — and gets the breach on top of it.
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
 * after it — and a hand-copied second spelling is exactly the drift measured on
 * decision nodes. {@link CASE_HAS_NO_OWNER} is its complement.
 *
 * TOTALITY: `currentCase` is a LOOP ITEM over `caseList`, which
 * `get_record` filled from `data.find` — every element is a raw driver row,
 * sparse in the way a raw driver row is. A case that was never written with
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

/**
 * "The case in hand is escalated already" — by the agent's Escalate Case, by
 * `case_escalation` on a Critical priority, or by an earlier sweep of a case
 * that was then worked (back to `in_progress`) and has breached again.
 *
 * Such a case already carries its escalation's record: the reason the agent
 * typed and the Escalated Date. The sweep adds the breach and leaves that
 * record as it is (#2073 item 9). {@link CASE_NOT_YET_ESCALATED} is its
 * complement, in the partition polarity of {@link CASE_HAS_NO_OWNER}.
 *
 * Read off `is_escalated`, the flag the record page shows, and not off
 * `escalated_date`: the seed's escalated cases carry the flag and a reason but
 * no date, so a date-keyed gate would still replace their reasons. The flag
 * reads back as a boolean (measured on the verify boot's SQLite driver;
 * `driver-sql` coerces a declared boolean column on read), so the `1 != true`
 * trap `case_escalation` documents does not reach a loop item.
 *
 * TOTALITY: the same loop item as above, so `has()` before every field read.
 */
const CASE_ALREADY_ESCALATED = () => P`has(vars.currentCase) && has(vars.currentCase.is_escalated)
  && vars.currentCase.is_escalated == true`;

/** The exact complement of {@link CASE_ALREADY_ESCALATED} over a bound `currentCase`. */
const CASE_NOT_YET_ESCALATED = () => P`has(vars.currentCase) && (!has(vars.currentCase.is_escalated)
  || vars.currentCase.is_escalated != true)`;

/**
 * What every breached case is written, escalated before or not: the flag, and
 * the `escalated` status. Authored once for the two breach writes below.
 *
 * The status is kept on BOTH writes so everything after them behaves as it did
 * before they were split. On a case not in `escalated` it is the transition
 * `case_escalation_reassign` and `case_status_side_effects` fire on (the
 * hand-off, the follow-up task); on a case already in `escalated` it is no
 * transition, and both stand down, as they always did.
 */
const SLA_BREACH = { is_sla_violated: true, status: 'escalated' } as const;

export const CaseSlaMonitorFlow: Flow = {
  name: 'case_sla_monitor',
  label: 'Case SLA Monitor',
  description: 'Hourly sweep: flag and escalate open cases that have breached their SLA due date.',
  type: 'schedule',
  status: 'active',
  // Scheduled runs have no trigger user, so under the default runAs:'user' the
  // data nodes execute UNSCOPED anyway. Declare runAs:'system' to make that
  // RLS-bypassing elevation explicit and intended (ADR-0049).
  runAs: 'system',

  variables: [],

  nodes: [
    { id: 'start', type: 'start', label: 'Start (hourly)', config: { schedule: '0 * * * *' } },
    {
      id: 'query_breached', type: 'get_record', label: 'Find Breached Cases',
      config: {
        objectName: 'crm_case',
        // ⛔ `$nin` on `status`, never `is_closed: false`: a case in `resolved`
        // has met its SLA — work is finished — but `is_closed` only flips on
        // `closed`, so the boolean filter stamps false breaches on resolved
        // cases and drags them back to `escalated`.
        //
        // `$lt` is `caseSlaBreached` (`src/service/objects/_case-sla.ts`) read
        // with "now" as the instant: STRICTLY past due. Its other half is
        // `case_sla_defaults`, which applies the same rule on the write that
        // settles a case — so a case settled late is flagged even when this
        // sweep never reached it, or never runs (#2070).
        //
        // "Now" is the query engine's own `{now}` placeholder, which an
        // 18.0.0-next.0 filter operand leaves to the engine as written. It
        // renders the instant's ISO text, as the retired `{NOW()}` flow token
        // did, and it is the spelling the SLA Violations tile reads, so the
        // sweep and the tile say "past due" in one wording.
        filter: {
          status: { $nin: ['resolved', 'closed'] },
          is_sla_violated: false,
          sla_due_date: { $lt: '{now}' },
        },
        limit: 500,
        outputVariable: 'caseList',
      },
    },
    {
      id: 'loop_cases', type: 'loop', label: 'For Each Breached Case',
      config: {
        collection: cel`caseList`,
        iteratorVariable: 'currentCase',
        body: guarded('case', {
          nodes: [
            {
              // Gateway only — the predicate lives on the out-edges (`b6` /
              // `b7`), an exact partition like `check_owner`'s below.
              //
              // The breach write splits on whether the case is escalated
              // already (#2073 item 9). A first escalation writes its reason
              // and date; an existing escalation keeps the ones it has.
              id: 'check_escalated', type: 'decision', label: 'Already Escalated?',
            },
            {
              // The FIRST escalation of a breached case.
              id: 'flag_breach', type: 'update_record', label: 'Flag SLA Breach',
              config: {
                objectName: 'crm_case',
                filter: { id: cel`currentCase.id` },
                // `escalation_reason` must accompany `is_escalated: true` — the
                // object's `escalation_reason_required` validation (severity:
                // error) rejects the whole write otherwise, turning this sweep
                // into a silent no-op (cf. the same fix in case_escalation).
                fields: {
                  ...SLA_BREACH,
                  is_escalated: true,
                  escalated_date: cel`isoDatetime(now())`,
                  escalation_reason: 'Auto-escalated: SLA due date breached',
                },
              },
            },
            {
              // The breach on a case that is ALREADY ESCALATED: the flag and
              // the status, and nothing of the escalation's own record.
              //
              // ⛔ No `escalation_reason`, `escalated_date` or `is_escalated`
              // here. The case carries all three already, and the reason has
              // no history: when one write served every case, the agent's
              // reason was replaced by the auto text, and the date moved to the
              // sweep, for good (measured, #2073 item 9).
              //
              // Leaving the keys OUT is the fix, not writing the stored values
              // back: `currentCase` is the snapshot `query_breached` took, so a
              // write-back would undo an edit made while the sweep ran.
              // `escalation_reason_required` is satisfied without the key — it
              // reads the merged record, and an escalated case has its reason.
              id: 'flag_breach_escalated', type: 'update_record', label: 'Flag SLA Breach (Already Escalated)',
              config: {
                objectName: 'crm_case',
                filter: { id: cel`currentCase.id` },
                fields: { ...SLA_BREACH },
              },
            },
            {
              // Gateway only — the predicate lives on the out-edge.
              //
              // `crm_case.owner_id` is NULLABLE and an unowned case is an
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
              // The gate sits AFTER the breach write on purpose. One of the two
              // breach writes runs on every case, owned or not, so an ownerless
              // breach is still RECORDED on the record — visible in views and
              // reports, where a service manager finds it. Gating both would
              // trade a dead run for a silently dropped alert on exactly the
              // cases most likely to be neglected.
              //
              // The ownerless branch is not a dead end: it goes to
              // `reload_case`, because by the time the gate is reached the
              // sweep's own write may ALREADY HAVE GIVEN THE CASE AN OWNER —
              // see that node (maintainer ruling 2026-09-03, option C).
              id: 'check_owner', type: 'decision', label: 'Case Has an Owner?',
            },
            {
              // Re-read the case the sweep just wrote.
              //
              // ⚠️ THE ASSIGNMENT IS NOT AUTHORED HERE, AND MUST NOT BE.
              // The breach write carries `status: 'escalated'`, and that IS the
              // escalation transition `case_escalation_reassign`
              // (`src/service/objects/_case-assignment.ts`, `beforeUpdate`, priority
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
              // ⛔ The READ is what this node is for, not a second write:
              // `currentCase` is the loop item bound by `query_breached` BEFORE
              // the breach write ran, so the owner the sweep just assigned is
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
                filter: { id: cel`currentCase.id` },
                outputVariable: 'currentCase',
              },
            },
            {
              // Gateway only — the predicate lives on the out-edge.
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
              //
              // ⚠️ THE RECIPIENT IS RULED, NOT INCIDENTAL — #1535, maintainer
              // ruling 2026-09-07, option A. On a breached
              // case that ALREADY HAS AN OWNER, the breach write carries
              // `status: 'escalated'` and `case_escalation_reassign` hands the
              // case to the least-loaded `service_manager` inside that same
              // write — yet this node addresses `currentCase` as
              // `query_breached` bound it, BEFORE the hand-off. So the breach
              // alert deliberately reaches the agent the case is being taken
              // FROM, not the manager who now owns it.
              //
              // It is the SAME etiquette `case_escalation` already states in
              // `content/docs/service/sla-and-escalation.mdx` — "the
              // notification goes to the previous owner alone" — and that page
              // now states it for this sweep too. One escalation etiquette
              // across both mechanisms.
              //
              // ⛔ Do not "fix" this into an alert for the new owner. That is
              // option C, and it would have to re-rule `case_escalation` in the
              // same stroke — ⛔ never one mechanism only.
              //
              // `test/flow-sla-ownerless-assignment.test.ts` pins the pairing
              // (the owned breach IS handed over AND its alert still goes to
              // the pre-hand-off owner), and records the ruling's declared gap
              // as measured: the hand-off hook issues no notice of its own, so
              // the receiving manager is told nothing by this run.
              id: 'notify_team', type: 'notify', label: 'Alert Owner',
              config: {
                // Owner only — `{currentCase.owner_id.manager}` dot-walks a
                // lookup, which flow templates interpolate as "undefined".
                recipients: [cel`currentCase.owner_id`],
                channels: ['inbox', 'email'],
                severity: 'critical',
                topic: 'case_sla_breach',
                template: 'crm.case_sla_breach',
                templateData: {
                  case_number: cel`currentCase.case_number`, priority: cel`currentCase.priority`,
                },
                actionUrl: '/crm_case/{{currentCase.id}}',
                // A schedule run has no organization: since 18.0.0-next.1 the
                // notification takes its owner from this record (objectstack#23284).
                sourceObject: 'crm_case',
                sourceId: cel`currentCase.id`,
              },
            },
          ],
          edges: [
            // Exactly one breach write per bound case: the same partition
            // discipline as `check_owner` below, never a `default` edge beside
            // a conditional one.
            { id: 'b6', source: 'check_escalated', target: 'flag_breach', type: 'conditional', condition: CASE_NOT_YET_ESCALATED(), label: 'Not escalated yet' },
            { id: 'b7', source: 'check_escalated', target: 'flag_breach_escalated', type: 'conditional', condition: CASE_ALREADY_ESCALATED(), label: 'Already escalated — keep its reason and date' },
            { id: 'b1', source: 'flag_breach', target: 'check_owner', type: 'default' },
            { id: 'b8', source: 'flag_breach_escalated', target: 'check_owner', type: 'default' },
            // The two out-edges of `check_owner` are an exact PARTITION of the
            // cases where `currentCase` is bound (see {@link CASE_HAS_OWNER} /
            // {@link CASE_HAS_NO_OWNER}) — never a `default` edge alongside a
            // conditional one, which would traverse BOTH and notify twice.
            //
            // ⚠️ The owned branch reads `currentCase` as `query_breached` bound
            // it, deliberately: a case that already had an
            // owner keeps alerting THAT owner, which is what the sweep has
            // always done. ⚠️ That is RULED intent now, no longer an open
            // question — the `notify_team` node carries the ruling.
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
