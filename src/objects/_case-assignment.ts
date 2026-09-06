// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from './_hook-api';

/**
 * ═══ Case ownership assignment — the app-level stand-in for a missing queue ══
 *
 * # ⛔ This module is a STOPGAP. It is the code to delete.
 *
 * Salesforce-shaped case intake routes an ownerless case into a QUEUE and lets
 * agents pull from it. ObjectStack has no queue engine: `sys_queue` does not
 * exist, and the `queue` sharing-recipient and approver enum members are
 * deprecated upstream. So a web-to-case submission — whose `owner_id` is
 * deliberately stripped by the guest-sanitisation branch of `case_sla_defaults`
 * — has nowhere to sit and lands with nobody accountable for it.
 *
 * This module substitutes a load-balanced round-robin for the missing queue, at
 * the app layer, the same way `lead_auto_assign` (`lead.hook.ts`) does for
 * inbound leads. **When a platform `sys_queue` or assignment-rule engine lands,
 * this whole module is reclaimed — not adapted.** Its replacement is
 * declarative queue metadata; a hook that picks an owner by counting rows is not
 * something to keep alongside one. Delete the module, delete its hooks from
 * `case.hook.ts`, and re-point the triage view at the queue.
 *
 * It is a MODULE rather than a branch in `case.hook.ts` so that "who should own
 * this case" has ONE home: all three factories below read a POSITION POOL and
 * pick its least-loaded holder, differing only in pool, seam and trigger.
 *
 * # ⚠️ The L2 sandbox constraint — the shape every handler here must take
 *
 * L2 hook bodies run BODY-ONLY inside QuickJS: the handler is lowered to a
 * source string with no module scope, so a body referencing an import, a
 * top-level const or a factory PARAMETER is a `ReferenceError` at runtime, not
 * a closure. `test/action-sandbox.test.ts` lowers every hook in `allHooks` with
 * the CLI build's own extraction pass and fails the ones that leak.
 *
 * So sharing here is authoring-time sharing: the FACTORY composes the hook and
 * owns the doc, the constants and the contract; the handler body closes over
 * nothing but its own `ctx` and spells its literals INLINE. The duplication is
 * not accidental — it is the only shape the runtime accepts — and what keeps it
 * honest is a behavioural pin: `test/case-assignment.test.ts` drives the real
 * handler and asserts the pool it queries is exactly
 * {@link SERVICE_AGENT_POSITION}, so constant and literal cannot drift quietly.
 *
 * # ⚠️ The ownership-transfer gate (#3004), and the three doors through it
 *
 * Stamping another user's `owner_id` is an ownership TRANSFER, denied unless
 * the caller holds `allowTransfer` on the object (`@objectstack/spec`
 * `security/permission.zod.ts`). `crm_case.allowTransfer` is NOT granted to
 * `service_agent`, and granting it would widen what an agent may do to a case
 * generally — a permission-model change, not a hook change.
 *
 * The gate is an operation middleware wrapping the whole call, so what it sees
 * depends entirely on the seam a write uses. Measured against the full shipped
 * stack (ObjectQL + `plugin-security` + `plugin-sharing` over this app's own
 * `objectstack.config.ts`), with negative controls proving the observations are
 * not vacuous, and pinned in `test/case-assignment.test.ts` and
 * `test/ownership-model.test.ts`:
 *
 *   ① A `beforeInsert` / `beforeUpdate` hook STAMPING `owner_id` onto a payload
 *      that did not carry the key is INVISIBLE to the gate — the middleware
 *      observes the payload as authored, and the stored row carries the stamp.
 *      This is the door all three factories here use, and it is why none of
 *      them needs a permission grant.
 *   ② A hook's `ctx.api` WRITE is a fresh operation carrying the caller's
 *      identity, so the gate DOES see it. That is why `case_status_side_effects`
 *      opening an escalation task under the account owner needs
 *      `service_agent.crm_task.allowTransfer`.
 *   ③ A caller-supplied `owner_id` is refused INSIDE the middleware, upstream
 *      of the hook phase — the hook never fires at all. No hook can approve,
 *      launder or adjudicate a payload that carries the key.
 *
 * ⇒ "An agent may set `owner_id` to themselves" is not implementable as an
 * adjudicated write. It IS implementable one level up, as a GESTURE the hook
 * interprets: {@link createCaseSelfClaim}.
 *
 * ⚠️ If a platform release moves the gate downstream of the hook phase, door ①
 * flips and those tests go red. The signal is then to grant `allowTransfer`
 * deliberately or to stop assigning in a hook — NOT to widen the permission
 * model to make a red test green.
 */

/** The position whose holders form the case intake pool (`sys_user_position`). */
export const SERVICE_AGENT_POSITION = 'service_agent';

/** The position ESCALATED cases are routed to. */
export const SERVICE_MANAGER_POSITION = 'service_manager';

/**
 * Statuses that mean "this case is no longer live work".
 *
 * Load balancing counts OPEN cases, and `is_closed` is the wrong predicate:
 * it only flips on `closed`, so a pile of `resolved` cases would keep counting
 * against an agent who has already finished them. `case_sla_monitor` settles it
 * the same way — see the `$nin` note in `src/flows/case-sla-monitor.flow.ts`,
 * which also records that comparing the boolean `is_closed` walks into the
 * SQLite `1 != true` trap.
 */
export const CLOSED_CASE_STATUSES = ['resolved', 'closed'] as const;

/** Cap on the pool read — the same bound `lead_auto_assign` uses. */
export const POOL_QUERY_LIMIT = 1000;

/**
 * The statuses that mean "a human has picked this case up and it is not
 * finished" — the gesture {@link createCaseSelfClaim} reads as a claim.
 *
 * One concept, not three arbitrary picks: each says a person is engaged and the
 * work is still live. The four statuses NOT here are excluded for a reason
 * apiece:
 *
 *   - `new` — the state a triage row is already IN. Not a move, so not a claim.
 *   - `escalated` — {@link createCaseEscalationReassign} owns that transition
 *     and routes to the `service_manager` pool. Two hooks answering "who owns
 *     this case" for one status change is the "one operation, two
 *     implementations" shape this module exists to prevent.
 *   - `resolved` / `closed` — finishing a case is not picking it up. An agent
 *     may still resolve an unowned case straight out of triage (the share
 *     grants edit); that records them in `updated_by` and leaves the ownership
 *     column honest about the fact that nobody ever took the work.
 *
 * ⚠️ Declared here for the doc and the tests — the handler body spells the same
 * three strings INLINE, because the L2 sandbox gives it no module scope (see
 * this file's header). `test/unassigned-case-triage-reach.test.ts` drives every
 * one of them through the real engine, so the copies cannot drift.
 */
export const CLAIMABLE_TARGET_STATUSES = [
  'in_progress',
  'waiting_customer',
  'waiting_support',
] as const;

/**
 * Round-robin assignment for ownerless new cases.
 *
 * A case created without an owner — a web-to-case submission, an email-to-case
 * import, an API capture — is assigned to the service agent with the FEWEST
 * OPEN cases. Least-loaded is a self-balancing round-robin: no rotation
 * counter, no stored cursor, no coordination between concurrent inserts. It
 * writes `owner_id`, the platform ownership anchor that OWD, sharing rules and
 * the "My Open Cases" view all read, so the agent really owns the case rather
 * than merely being named on it.
 *
 * ## Priority 250: it MUST run after `case_sla_defaults` (200)
 *
 * Hooks run in ASCENDING priority order, and `case_sla_defaults` is where the
 * guest-sanitisation branch assigns `input.owner_id = null` to drop a
 * client-spoofed owner from an anonymous submission. Assigning first and being
 * stripped afterwards would land every web-to-case ownerless — the exact case
 * this hook exists for. `test/case-assignment.test.ts` pins the ordering.
 *
 * ## The empty pool is the FIRST-INSTALL NORM, not an edge case
 *
 * `sys_user_position` membership is runtime data. Before anyone holds the
 * `service_agent` position the pool is empty and this hook is a NO-OP: the case
 * is created and stays ownerless. Never blocking intake is correct, but silent
 * ownerlessness hides the problem, so the no-op path has a UI counterpart — the
 * `unassigned_triage` pinned tab on `crm_case` (`src/views/case.view.ts`) shows
 * exactly the cases this hook could not place.
 *
 * ## Best-effort, always
 *
 * Auto-assignment is an ENHANCEMENT and must never reject the insert. An
 * anonymous Web-to-Case submission runs under the public-form grant, which
 * permits create/read-back on `crm_case` and DENIES `find` on
 * `sys_user_position`; letting that denial propagate would 403 the whole
 * submission and break the public support form. So every read is wrapped and
 * ANY failure leaves the case ownerless for the triage view to surface.
 *
 * @param hookName registry name for the hook (metadata only — never read by
 *   the body, which the sandbox would not let it be).
 */
export function createCaseRoundRobinAssign(hookName = 'case_auto_assign'): Hook {
  return {
    name: hookName,
    object: 'crm_case',
    events: ['beforeInsert'],
    priority: 250,
    description: 'Assign ownerless new cases to the least-loaded service agent.',
    handler: async (ctx: HookContext) => {
      const { input } = ctx;
      // Respect an explicit / creator-assigned owner. On any write that carries
      // a user the security middleware has ALREADY stamped `owner_id` to that
      // user by the time this runs, so this is also what keeps the round-robin
      // scoped to genuinely ownerless intake rather than firing on every
      // agent-created case.
      if (typeof input.owner_id === 'string' && input.owner_id) return;
      const api = ctx.api as HookApi | undefined;
      if (!api) return;

      try {
        // The pool = holders of the `service_agent` position. This literal is
        // the exported SERVICE_AGENT_POSITION; the sandbox forbids reading the
        // constant here, and `test/case-assignment.test.ts` pins the parity.
        const holders = await api.object('sys_user_position').find({
          where: { position: 'service_agent' }, fields: ['user_id'], top: 1000,
        });
        const agentIds = Array.from(
          new Set(
            (holders ?? [])
              .map((r) => (typeof r.user_id === 'string' ? r.user_id : ''))
              .filter(Boolean),
          ),
        );
        // No pool → leave the case ownerless (no-op). The `unassigned_triage`
        // view is what makes this visible instead of silent.
        if (agentIds.length === 0) return;

        // Fewest OPEN cases wins. `$nin` over statuses rather than
        // `is_closed: false`: a resolved case is finished work and must stop
        // counting against its agent (same predicate as `case_sla_monitor`).
        let best: string | undefined;
        let bestCount = Infinity;
        for (const agentId of agentIds) {
          const openCount = await api.object('crm_case').count({
            where: { owner_id: agentId, status: { $nin: ['resolved', 'closed'] } },
          });
          if (openCount < bestCount) {
            bestCount = openCount;
            best = agentId;
          }
        }
        if (best) input.owner_id = best;
      } catch {
        // Swallow: assignment must never block case creation. The common case
        // is the anonymous public-form context, which cannot read
        // `sys_user_position` — the case is still captured, ownerless, and the
        // triage view surfaces it. (No `console` here — the L2 hook sandbox
        // does not define one.)
      }
    },
  };
}

/**
 * Hand an escalating case to the least-loaded service manager.
 *
 * On the escalation TRANSITION the case moves to the holder of
 * {@link SERVICE_MANAGER_POSITION} with the fewest open cases — the same
 * least-loaded balance the intake round-robin computes, against a different
 * pool. Without it, escalation is only a flag, a status and an inbox message:
 * the agent who could not get to the case in time stays the only person who can
 * work it.
 *
 * ⚠️ Positions are FLAT (`src/sharing/positions.ts`), so "the owner's manager"
 * is not resolvable in this app — and a flow template referencing a lookup
 * traversal such as `{caseRecord.owner_id.manager}` interpolates to the literal
 * string `undefined` rather than failing. That is why the hand-off is a hook
 * and not a flow, and why the pool substitutes for the chain.
 *
 * ## `beforeUpdate`, not `afterUpdate`
 *
 * The `afterUpdate` shape (a `ctx.api` write) is a fresh operation and is
 * therefore VISIBLE to the transfer gate — it would need `crm_case.allowTransfer`
 * on `service_agent`, widening what an agent may do to a case generally. The
 * `beforeUpdate` door is invisible to the gate (this module's header, door ①),
 * so the hand-off costs no permission change.
 *
 * It also disposes of re-entrancy rather than guarding it: the hook performs NO
 * operation, mutating the payload of the update already in flight, so there is
 * no second write and no second `record-after-update` event for
 * `case_escalation` or `case_status_side_effects` to fire on. The predicate is
 * a TRANSITION rather than a state, so it is false on a replay, and the write
 * is idempotent — a case already owned by a pool member is left alone.
 * `test/case-assignment.test.ts` drives all three properties.
 *
 * ## The SLA sweep reaches this hook, and depends on it (#1405)
 *
 * `case_sla_monitor`'s `flag_breach` node writes `status: 'escalated'` on every
 * breached case, which IS the transition below — so the scheduled sweep puts an
 * ownerless breached case through this assignment without any flow-callable
 * seam, and the flow then re-reads the case (`reload_case`) to alert the owner
 * this hook produced. ⚠️ That makes the TRANSITION predicate load-bearing for a
 * second caller: narrowing it to record-triggered escalations, or moving the
 * assignment to an `afterUpdate` write, silently returns the sweep to alerting
 * nobody for an unowned breach. `test/flow-sla-ownerless-assignment.test.ts`
 * drives the real flow through the real hook chain and goes red if it does.
 *
 * ## The empty pool: a no-op that is still VISIBLE
 *
 * `sys_user_position` membership is runtime data, and `service_manager` is
 * unstaffed on a fresh install. ⚠️ The demo org is NO LONGER one of those: #1102
 * staffs Tomas Okafor into the position (`src/sharing/demo-staffing.ts`), so the
 * exemplar now demonstrates the hand-off rather than the stand-down — which is
 * also what makes the sweep's assignment visible on this repo's own seed.
 *
 * With no pool the case keeps
 * its owner and the escalation completes as before. Unlike the intake path that
 * needs no new surface to stay visible: an escalated case is not ownerless, it
 * sits in the `escalated_cases` view, and `case_escalation_sharing` already
 * grants every `service_manager` edit access to open critical cases.
 *
 * ## Best-effort, always
 *
 * Reassignment is an ENHANCEMENT to the escalation, never a precondition. A
 * read denial, an empty pool or any other failure leaves the case with its
 * current owner and lets the escalation write through untouched.
 *
 * @param hookName registry name for the hook (metadata only — never read by
 *   the body, which the sandbox would not let it be).
 */
export function createCaseEscalationReassign(hookName = 'case_escalation_reassign'): Hook {
  return {
    name: hookName,
    object: 'crm_case',
    events: ['beforeUpdate'],
    priority: 250,
    description: 'Hand a case being escalated to the least-loaded service manager.',
    handler: async (ctx: HookContext) => {
      const { input } = ctx;
      const previous = ctx.previous;
      if (!previous) return;

      // The escalation TRANSITION, not the escalated STATE: a state predicate
      // re-fires on any write that leaves the status alone, including a replay
      // of this very update. Comparing status strings also stays clear of the
      // SQLite boolean trap that `is_escalated != true` walks into.
      if (input.status !== 'escalated' || previous.status === 'escalated') return;

      // An explicit owner in the SAME payload wins: a manual "escalate and hand
      // it to Dana" must not be overwritten by the pool's arithmetic.
      if (typeof input.owner_id === 'string' && input.owner_id) return;

      const api = ctx.api as HookApi | undefined;
      if (!api) return;

      try {
        // The pool = holders of the `service_manager` position. This literal is
        // the exported SERVICE_MANAGER_POSITION; the sandbox forbids reading the
        // constant here, and `test/case-assignment.test.ts` pins the parity.
        const holders = await api.object('sys_user_position').find({
          where: { position: 'service_manager' }, fields: ['user_id'], top: 1000,
        });
        const managerIds = Array.from(
          new Set(
            (holders ?? [])
              .map((r) => (typeof r.user_id === 'string' ? r.user_id : ''))
              .filter(Boolean),
          ),
        );
        // No pool → the case keeps its owner and the escalation still lands.
        if (managerIds.length === 0) return;

        // Already with the pool → leave it alone. This is what makes the write
        // idempotent: a manager escalating their own case, or a second
        // escalation of a case handed over once already, moves nothing.
        const currentOwner =
          (typeof previous.owner_id === 'string' && previous.owner_id) || '';
        if (currentOwner && managerIds.indexOf(currentOwner) !== -1) return;

        // Fewest OPEN cases wins — same predicate as the intake round-robin:
        // `$nin` over statuses rather than `is_closed: false`, because a
        // resolved case is finished work and must stop counting.
        let best: string | undefined;
        let bestCount = Infinity;
        for (const managerId of managerIds) {
          const openCount = await api.object('crm_case').count({
            where: { owner_id: managerId, status: { $nin: ['resolved', 'closed'] } },
          });
          if (openCount < bestCount) {
            bestCount = openCount;
            best = managerId;
          }
        }
        if (best) input.owner_id = best;
      } catch {
        // Swallow: the hand-off must never reject the escalation. A denied
        // `sys_user_position` read leaves the case where it is, escalated.
        // (No `console` here — the L2 hook sandbox does not define one.)
      }
    },
  };
}

/**
 * Let a user CLAIM an unowned case out of triage.
 *
 * Contract: a caller may take ownership only for THEMSELVES, only while the
 * case is unowned, and only while it is not closed.
 *
 * ## Why the claim is a GESTURE, not a value the caller supplies
 *
 * ⚠️ The ownership-transfer gate (#3004) rejects a payload carrying `owner_id`
 * INSIDE the operation middleware, upstream of the hook phase — the hook never
 * fires, so it cannot approve, launder or adjudicate such a write (door ③ in
 * this module's header). "Let the agent write `{ owner_id: <self> }` and have a
 * hook vet it" is therefore not implementable at all.
 *
 * So the claim is spelled as a MOVE: the caller puts an unowned open case into
 * a status meaning they picked it up ({@link CLAIMABLE_TARGET_STATUSES}) and
 * this hook stamps `ctx.user.id`, the only user id it has. That inverts the
 * safety burden in the app's favour — "claim it for somebody else" and "claim
 * an owned case" have no spelling, because the hook reads no target from the
 * payload and is inert unless the STORED row is ownerless. The alternative,
 * granting `crm_case.allowTransfer`, cannot express "to yourself only": it
 * would let an agent reassign any case they can edit, to anyone.
 * `src/profiles/service-agent.profile.ts` needs no new grant for this hook.
 *
 * ## The four boundaries
 *
 * | write, as a `service_agent`                         | outcome |
 * | --- | --- |
 * | `{ status: 'in_progress' }` on an unowned OPEN case | claimed — owner becomes the caller |
 * | the same on a case owned by SOMEBODY ELSE           | refused: no reach, and guard 3 below |
 * | `{ owner_id: <anyone> }`, unowned or not            | refused by the transfer gate, upstream |
 * | the same on an unowned CLOSED case                  | refused: not shared, and guard 4 below |
 *
 * Each guard is doubled on purpose: `case_unassigned_triage_sharing` already
 * hides a closed or otherwise-owned case from an agent, but this hook also runs
 * for callers that rule does not constrain (an admin, a manager holding the
 * escalation share). `test/unassigned-case-triage-reach.test.ts` drives both
 * layers separately so neither can pass on the other's behalf.
 *
 * ## Re-entrancy
 *
 * The hook performs NO operation — it mutates the payload of the update already
 * in flight, so there is no second write and no second `record-after-update`
 * event for `case_escalation`, `case_sla_monitor` or `case_status_side_effects`
 * to re-fire on. Its predicate is a TRANSITION, not a state, so it is false on
 * a replay; and after a successful claim the stored row HAS an owner, so guard
 * 3 stops every later run. It cannot collide with the escalation hand-off:
 * `escalated` is deliberately not claimable, and at priority 260 this runs
 * after `case_escalation_reassign` (250) and stands down the moment `owner_id`
 * is already in the payload.
 *
 * ## Who this runs for
 *
 * A claim is something a PERSON does, so a write with no user (a seed, a
 * system-context migration, the anonymous web-to-case path) never claims —
 * ownerless intake stays ownerless and stays in the triage tab. A write
 * carrying a real user id claims for that user, whoever they are.
 *
 * @param hookName registry name for the hook (metadata only — never read by
 *   the body, which the sandbox would not let it be).
 */
export function createCaseSelfClaim(hookName = 'case_self_claim'): Hook {
  return {
    name: hookName,
    object: 'crm_case',
    events: ['beforeUpdate'],
    priority: 260,
    description: 'Let a user claim an unowned open case by picking it up; the owner written is always the caller.',
    handler: async (ctx: HookContext) => {
      const { input } = ctx;
      const previous = ctx.previous;
      if (!previous) return;

      // 1. A claim is something a PERSON does. A system or seed write leaves
      //    the case ownerless for the triage tab to keep showing.
      const claimant = ctx.user?.id;
      if (typeof claimant !== 'string' || !claimant) return;
      if (ctx.session?.isSystem) return;

      // 2. An explicit `owner_id` in the payload WINS and is never touched. For
      //    an agent that branch is unreachable (the transfer gate refuses such
      //    a payload upstream), so in practice it means a caller who
      //    legitimately holds `allowTransfer` gets the owner they named.
      if ('owner_id' in input) return;

      // 3. Only an UNOWNED case can be claimed. Covers both storage shapes of
      //    "no owner": the key ABSENT (memory/mongo) and the column NULL (SQL).
      if (typeof previous.owner_id === 'string' && previous.owner_id) return;

      // 4. …and only one that is not CLOSED. ⚠️ This guard and the triage
      //    sharing grant draw DIFFERENT lines on purpose, and ⛔ neither is to
      //    be "aligned" onto the other. `case_unassigned_triage_sharing`
      //    (`src/sharing/case.sharing.ts`) excludes `resolved` as well as
      //    `closed`, because a resolved unowned case is history, not backlog,
      //    and the tab's row count has to keep meaning "work waiting for a
      //    human". This guard stops at `closed` alone, because REOPENING a
      //    resolved case IS picking the work up, so whoever does it should
      //    become its owner. The gap between the two lines is live for exactly
      //    the callers that rule does not reach — the admin, the manager
      //    holding the escalation share — which is why
      //    `test/unassigned-case-triage-reach.test.ts` drives the closed guard
      //    once per layer, the second time with an actor that CAN reach the
      //    row.
      //
      //    ⚠️ The `is_closed == false` conditions elsewhere in that sharing
      //    file are NOT this grant and NOT drift: they belong to the manager
      //    and director rules on critical-priority cases, which keep standing
      //    reach through the `resolved → closed` review window by their own
      //    ruling. Their ⚠️ headers carry it; ⛔ do not read them as this one.
      //
      //    `status` is read first because it is a string on every driver;
      //    `is_closed` is accepted as `true` or `1` because SQLite hands
      //    booleans back as integers.
      if (previous.status === 'closed') return;
      if (previous.is_closed === true || previous.is_closed === 1) return;

      // 5. The gesture: the status MOVES to one meaning a human picked the case
      //    up. Inline copies of CLAIMABLE_TARGET_STATUSES — the sandbox forbids
      //    reading the constant here; `test/unassigned-case-triage-reach.test.ts`
      //    pins the two in step. `escalated` is absent on purpose: that
      //    transition belongs to `case_escalation_reassign`.
      const next = input.status;
      if (typeof next !== 'string' || next === previous.status) return;
      if (next !== 'in_progress' && next !== 'waiting_customer' && next !== 'waiting_support') return;

      // The only user id this hook has, and the only one it can write.
      input.owner_id = claimant;
    },
  };
}
