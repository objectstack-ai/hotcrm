// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from './_hook-api';

/**
 * ═══ Case ownership assignment — THE app-level stopgap for a missing queue ══
 *
 * # ⛔ This module is a STOPGAP. It is the code to delete.
 *
 * Salesforce-shaped case intake routes an ownerless case into a QUEUE and lets
 * agents pull from it. ObjectStack has no queue engine: `sys_queue` does not
 * exist, and the `queue` sharing-recipient and approver enum members are
 * deprecated upstream. So a web-to-case submission — whose `owner_id` is
 * deliberately stripped by the guest-sanitisation branch of `case_sla_defaults`
 * — has nowhere to sit, and lands ownerless with nobody accountable for it.
 *
 * This module substitutes a load-balanced round-robin for the missing queue, at
 * the app layer, copying the `lead_auto_assign` precedent (`lead.hook.ts`) that
 * already does the same thing for inbound leads. **When a platform `sys_queue`
 * (or an assignment-rule engine) lands, this whole module is the code that gets
 * reclaimed — not adapted.** Its replacement is declarative queue metadata; a
 * hook that picks an owner by counting rows is not something to keep alongside
 * one. Delete the module, delete its hook from `case.hook.ts`, and re-point the
 * triage view at the queue.
 *
 * # Why a MODULE and not a branch inside `case.hook.ts`
 *
 * #1070 (route an ESCALATED case to the `service_manager` pool) writes case
 * ownership too. Two independently-authored ownership paths on `crm_case` is
 * the "one operation, two implementations" shape that later has to be converged
 * by deleting one of them. This module is the single home for the question
 * "who should own this case", so #1070 landed here as a second factory —
 * {@link createCaseEscalationReassign} — rather than as a second answer
 * elsewhere. Both factories read a POSITION POOL and pick its least-loaded
 * holder; they differ in which pool, which seam and which trigger.
 *
 * # ⚠️ The sandbox constraint, and what "shared" can therefore mean here
 *
 * L2 hook bodies run BODY-ONLY inside QuickJS: the handler is lowered to a
 * source string with no module scope, so a body referencing an import, a
 * top-level const or a factory PARAMETER is a `ReferenceError` at runtime, not
 * a closure. `test/action-sandbox.test.ts` lowers every hook in `allHooks` with
 * the CLI build's own extraction pass and fails the ones that leak.
 *
 * So sharing here is the same authoring-time sharing
 * `_line-item-price-fill.ts` established: the FACTORY composes the hook and
 * owns the doc, the constants and the contract; the handler body closes over
 * nothing but its own `ctx` and spells its literals inline. That is not a
 * stylistic choice and the inline literals are not duplication by accident —
 * they are the only shape the runtime accepts. What keeps them honest is a
 * behavioural pin: `test/case-assignment.test.ts` drives the real handler and
 * asserts the pool it queries is exactly {@link SERVICE_AGENT_POSITION}, so the
 * exported constant and the literal in the body cannot drift apart quietly.
 * (Same technique as the `priority_rank` map and the SLA matrix in
 * `case.hook.ts`, for the same reason.)
 *
 * # The transfer gate — MEASURED, not assumed (the #596 precondition)
 *
 * Stamping another user's `owner_id` is an ownership TRANSFER, denied by the
 * platform's #3004 guard unless the caller holds `allowTransfer` on the object
 * (`@objectstack/spec` `security/permission.zod.ts`). `crm_case.allowTransfer`
 * is NOT granted to `service_agent`, and granting it would widen what an agent
 * may do to a case generally — a permission-model change, not a hook change.
 *
 * This hook needs no such grant, and that is measured rather than reasoned:
 * the guard is an operation middleware wrapping the whole call, and the
 * `beforeInsert` hook phase runs INSIDE it, so by the time this body writes,
 * the guard has already read and released the payload. Against a real ObjectQL
 * with a recorder on the same `registerMiddleware` seam the security plugin
 * uses, a `crm_case` insert of `{subject, status}` whose beforeInsert hook
 * stamped `owner_id` reached the middleware as:
 *
 *   {"object":"crm_case","operation":"insert","data":{"subject":"…","status":"new"}}
 *
 * — no `owner_id` at all — while the STORED row carried the stamped agent. The
 * pin lives in `test/case-assignment.test.ts` ("the transfer gate cannot see
 * this stamp"), with a negative control proving the recorder is not simply
 * blind. If a future platform release moves the guard downstream of the hook
 * phase that test goes red, and the signal is to grant `allowTransfer`
 * deliberately or to stop assigning in a hook — NOT to widen the permission
 * model to make a red test green.
 *
 * The asymmetry matters, because the sibling seam behaves the opposite way: a
 * hook's `ctx.api` WRITE is a fresh operation carrying the caller's identity, so
 * the guard does see it. That is why `case_status_side_effects` opening an
 * escalation task under the account owner needs
 * `service_agent.crm_task.allowTransfer`. Both seams are pinned in
 * `test/ownership-model.test.ts`.
 *
 * # The same question again, on the UPDATE door (#1070)
 *
 * The verdict above is a property of the SEAM, not of `crm_case`, so #1070 —
 * which reassigns on the escalation transition — measured its own door rather
 * than inheriting this one. Measured 2026-08-11 on @objectstack/* 17.0.0-rc.6,
 * same recorder technique, three readings:
 *
 *   A. a `beforeUpdate` hook stamping `owner_id`: the middleware observed
 *      `{"operation":"update","data":{"id":"…","status":"escalated"}}` — no
 *      `owner_id` — and the stored row came back owned by the hook's pick.
 *      INVISIBLE, exactly like the insert door.
 *   B. negative control, a caller-supplied `owner_id` on the same object
 *      through the same seam: `{"…","owner_id":"agent_explicit"}`. VISIBLE, so
 *      reading A as an absence is not vacuous.
 *   C. the `afterUpdate` shape the card proposed — a `ctx.api` update, i.e. a
 *      fresh operation: `{"…","owner_id":"mgr_from_after_update"}`. VISIBLE.
 *
 * C is why {@link createCaseEscalationReassign} runs on `beforeUpdate` and not
 * in `case_status_side_effects`: on that seam the reassignment would be a
 * transfer the guard reads, and would need `crm_case.allowTransfer` granted to
 * `service_agent` — a permission-model widening (#596's ruling forbids making
 * one quietly). Choosing the seam the guard cannot see is not a way around the
 * gate: it is the same standing the intake round-robin already has, and the
 * app's escalation is a service-level policy applied by the platform's own
 * automation rather than an agent reaching for someone else's record. All three
 * readings are pinned in `test/case-assignment.test.ts`; if a platform release
 * moves the guard, reading A flips and that test goes red — the signal is to
 * grant `allowTransfer` deliberately or to stop assigning in a hook, NOT to
 * widen the permission model to make a red test green.
 *
 * # The ORDER of the gate and the hook phase (#1096) — reading D
 *
 * Readings A–C answer "can the gate SEE a hook's stamp". #1096's claim seam
 * turns on the sharper question underneath: WHEN does the gate run relative to
 * the hook phase — because if a hook ran first it could sanitise a payload the
 * gate would otherwise refuse, and an agent could then spell a claim as
 * `{ owner_id: <self> }` after all.
 *
 * It cannot. Measured 2026-08-12 on `@objectstack/*` 17.0.0-rc.6, against the
 * FULL shipped stack (ObjectQL + `plugin-security` + `plugin-sharing` over this
 * app's own `objectstack.config.ts`) as a real `service_agent` holding the
 * `case_unassigned_triage_sharing` share, three readings:
 *
 *   D1. `update(unowned_open, { owner_id: <self> })` → denied,
 *       `PermissionDeniedError`, "'owner_id' on 'crm_case' is system-managed".
 *       So does `{ owner_id: <other> }`, and so does the same write against a
 *       case owned by somebody else. `{ internal_notes: … }` on the very same
 *       row is ALLOWED, which is the control that says the denial is about the
 *       ownership column and not about reach.
 *   D2. THE DECISIVE ONE. With a `beforeUpdate` hook installed that DELETES
 *       `input.owner_id`, the same claim write is still denied — and the hook
 *       never fired at all (its recorder logged nothing). The gate rejects
 *       inside the middleware, upstream of the hook phase, so no hook can
 *       rescue, launder or adjudicate a payload that carries `owner_id`.
 *   D3. A `beforeUpdate` hook stamping `owner_id` onto a payload that did NOT
 *       carry the key — `{ status: 'in_progress' }` — is ALLOWED, and the
 *       stored row comes back owned by the hook's pick. Reading A, re-measured
 *       through the real security plugin rather than a bare ObjectQL.
 *
 * ⇒ "An agent may set `owner_id` to themselves" is not implementable as an
 * adjudicated write, because the agent's payload may not contain the key at
 * all. It IS implementable one level up, as a GESTURE the hook interprets:
 * {@link createCaseSelfClaim}. That is a strictly stronger safety property —
 * see its own header.
 */

/** The position whose holders form the case intake pool (`sys_user_position`). */
export const SERVICE_AGENT_POSITION = 'service_agent';

/**
 * The position #1070 routes ESCALATED cases to. Exported here so that card
 * extends this module rather than re-deriving the pool concept elsewhere.
 */
export const SERVICE_MANAGER_POSITION = 'service_manager';

/**
 * Statuses that mean "this case is no longer live work".
 *
 * Load balancing counts OPEN cases, and `is_closed` is the wrong predicate for
 * that: it only flips on `closed`, so a pile of `resolved` cases would keep
 * counting against an agent who has already finished them. `case_sla_monitor`
 * settled the same question the same way — see the `$nin` note in
 * `src/flows/case-sla-monitor.flow.ts`, which also records that comparing the
 * boolean `is_closed` suffers the SQLite `1 != true` trap.
 */
export const CLOSED_CASE_STATUSES = ['resolved', 'closed'] as const;

/** Cap on the pool read — the same bound `lead_auto_assign` uses. */
export const POOL_QUERY_LIMIT = 1000;

/**
 * The statuses that mean "a human has picked this case up and it is not
 * finished" — the gesture {@link createCaseSelfClaim} reads as a claim (#1096).
 *
 * One concept, not three arbitrary picks: each of these says a person is
 * engaged with the case and the work is still live. The four statuses NOT here
 * are excluded for a stated reason apiece:
 *
 *   - `new` — the state a triage row is already IN. Not a move, so not a claim.
 *   - `escalated` — {@link createCaseEscalationReassign} owns that transition
 *     and routes the case to the `service_manager` pool. Two hooks answering
 *     "who owns this case" for one status change is the "one operation, two
 *     implementations" shape this whole module exists to prevent.
 *   - `resolved` / `closed` — finishing a case is not picking it up. An agent
 *     may still resolve an unowned case straight out of triage (the share
 *     grants edit); doing so records them in `updated_by` and leaves the
 *     ownership column honest about the fact that nobody ever took the work.
 *
 * ⚠️ Declared here for the doc, the tests and future readers — the handler body
 * spells the same three strings INLINE, because the L2 sandbox gives it no
 * module scope (see this file's header).
 * `test/unassigned-case-triage-reach.test.ts` drives every one of them through
 * the real engine, so the two copies cannot drift apart quietly.
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
 * OPEN cases. Least-loaded is a self-balancing round-robin: it needs no
 * rotation counter, no stored cursor and no coordination between concurrent
 * inserts.
 *
 * It writes `owner_id`, the platform ownership anchor (#548) — the column OWD,
 * sharing rules and the "My Open Cases" view all read — so the assigned agent
 * really owns the case rather than merely being named on it.
 *
 * ## Priority 250: it MUST run after `case_sla_defaults` (200)
 *
 * Hooks run in ASCENDING priority order, and `case_sla_defaults` is where the
 * guest-sanitisation branch does `delete input.owner_id` to drop a
 * client-spoofed owner from an anonymous submission. Assigning first and being
 * stripped afterwards would land every web-to-case ownerless — the exact case
 * this hook exists for. `lead_auto_assign` shipped at priority 150 and had to
 * be moved to 250 for precisely this reason; this one starts where that one
 * ended up, and `test/case-assignment.test.ts` pins the ordering.
 *
 * ## The empty pool is the FIRST-INSTALL NORM, not an edge case
 *
 * `sys_user_position` membership is runtime data. On a fresh install — before
 * anyone has been given the `service_agent` position — the pool is empty and
 * this hook is a NO-OP: the case is created and stays ownerless. That is the
 * correct behaviour (never block intake), but silent ownerlessness is how the
 * original defect hid, so the no-op path has a UI counterpart: the
 * `unassigned_triage` list view on `crm_case` (`src/views/case.view.ts`), a
 * pinned tab that shows exactly the cases this hook could not place.
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
        // constant from here, and the parity assertion in
        // `test/case-assignment.test.ts` is what keeps the two in step.
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

        // Fewest OPEN cases wins. `$nin` rather than `is_closed: false`: a
        // resolved case is finished work and must stop counting against its
        // agent (same predicate as `case_sla_monitor`).
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
 * Hand an escalating case to the least-loaded service manager (#1070).
 *
 * Escalation used to change hands with nobody: `case_escalation`,
 * `case_escalation_on_create`, `case_sla_monitor` and the `escalate_case`
 * screen flow all write the same four fields — `is_escalated`,
 * `escalation_reason`, `escalated_date`, `status` — and none of them touches
 * `owner_id`. The agent who could not get to the case in time stayed the only
 * person who could work it, and "escalated" meant a flag, a status and an inbox
 * message. This hook is the hand-off: on the escalation TRANSITION the case
 * moves to the holder of {@link SERVICE_MANAGER_POSITION} with the fewest open
 * cases — the same least-loaded balance the intake round-robin above computes,
 * against a different pool.
 *
 * Positions are FLAT (`src/sharing/positions.ts`): there is no manager chain to
 * walk, so "the owner's manager" is not a thing this app can resolve — and
 * `{caseRecord.owner_id.manager}` in a flow template interpolates to the
 * literal string `undefined`, which is why the flow cannot do this itself and a
 * hook must. The pool substitute is the same technique `lead_auto_assign`
 * established for reps.
 *
 * ## `beforeUpdate`, not `afterUpdate` — and both halves of that matter
 *
 * The card proposed `case_status_side_effects` (an `afterUpdate` hook writing
 * through `ctx.api`). Measured, that seam is VISIBLE to the #3004 transfer
 * guard (reading C in this module's header), so it would need
 * `crm_case.allowTransfer` on `service_agent` — widening what an agent may do
 * to a case generally. The `beforeUpdate` door is invisible to it (reading A,
 * with reading B as the negative control), so the hand-off costs no permission
 * change at all.
 *
 * It also disposes of the re-entrancy risk rather than guarding it. This hook
 * performs NO operation: it mutates the payload of the update already in
 * flight, so there is no second write, no second `record-after-update` event,
 * and nothing for `case_escalation` or `case_status_side_effects` to re-fire
 * on. Compare the two accidents this file's neighbourhood has already had — the
 * `closed_date`-as-`resolved_date` write, and the `is_escalated` re-fire loop
 * that wedged a first-boot seed on 2026-07-06 — both of which were EXTRA
 * writes. On top of that the predicate is a TRANSITION (`status` becomes
 * `escalated` having not been), not a state: it reads two status strings and is
 * false on a replay, where the 2026-07-06 loop read the boolean `is_escalated`
 * and met SQLite's `1 != true`. And the write is idempotent by construction —
 * a case already owned by a pool member is left alone, so re-running this on
 * the same record moves nothing. `test/case-assignment.test.ts` drives all
 * three of those properties.
 *
 * ## The empty pool: a no-op that is still VISIBLE
 *
 * `sys_user_position` membership is runtime data and `service_manager` is
 * unstaffed on a fresh install (and in the demo org — see
 * `src/sharing/demo-staffing.ts`, where leaving the leadership bench empty is a
 * decision, not an oversight). With no pool, the case keeps its current owner
 * and the escalation completes exactly as before. Unlike the intake path, that
 * no-op needs no new view to be visible: an escalated case is not ownerless,
 * it sits in the `escalated_cases` list view, and `case_escalation_sharing`
 * already grants every `service_manager` edit access to open critical cases —
 * so a case the pool could not be handed can still be seen, and taken, by the
 * people the pool names.
 *
 * ## Best-effort, always
 *
 * Reassignment is an ENHANCEMENT to the escalation, never a precondition for
 * it.
 * A read denial (the `sys_user_position` find), an empty pool or any other
 * failure leaves the case with its current owner and lets the escalation write
 * through untouched.
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

      // The escalation TRANSITION, not the escalated STATE. A state predicate
      // is what looped on 2026-07-06; this one is false on every write that
      // does not move the status, including a replay of this very update.
      if (input.status !== 'escalated' || previous.status === 'escalated') return;

      // An explicit owner in the SAME payload wins: a manual "escalate and hand
      // it to Dana" must not be overwritten by the pool's arithmetic.
      if (typeof input.owner_id === 'string' && input.owner_id) return;

      const api = ctx.api as HookApi | undefined;
      if (!api) return;

      try {
        // The pool = holders of the `service_manager` position. This literal is
        // the exported SERVICE_MANAGER_POSITION; the sandbox forbids reading
        // the constant from here, and the parity assertion in
        // `test/case-assignment.test.ts` is what keeps the two in step.
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
        // `$nin` rather than `is_closed: false`, because a resolved case is
        // finished work and must stop counting against whoever holds it.
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
 * Let an agent CLAIM an unowned case out of triage (#1096, acceptance #1's
 * write half).
 *
 * `case_unassigned_triage_sharing` (#1134) gave `service_agent` sight of, and
 * `edit` on, every unowned open case — so the pinned `Unassigned — triage` tab
 * finally has rows for the persona it was built for. It could not give them the
 * other half of the sentence: *"and can take ownership"*. This hook is that
 * half.
 *
 * ## The contract, and why it is STRUCTURAL rather than adjudicated
 *
 * The ruled contract is: **an agent may set `owner_id` to THEMSELVES, only
 * while it is currently null, only on a case that is not closed.**
 *
 * The obvious implementation — let the agent write `{ owner_id: <self> }` and
 * have a hook approve or refuse it — is not available, and that is measured,
 * not assumed: reading D2 in this file's header shows the #3004 gate rejecting
 * such a payload INSIDE the middleware, upstream of the hook phase, with the
 * hook never firing at all. A hook cannot approve a write it never sees.
 *
 * So the claim is not a value the agent supplies; it is a GESTURE the hook
 * reads. The agent moves an unowned open case into a status that means they
 * have picked it up ({@link CLAIMABLE_TARGET_STATUSES}) and this hook stamps
 * the ownership column — with `ctx.user.id`, the only user id it has.
 *
 * That inverts the usual safety burden, and it is the reason this shape is
 * preferable to `crm_case.allowTransfer` even setting the blast radius aside:
 *
 *   - **"claim it for somebody else" has no spelling.** The hook writes the
 *     caller's own id and reads no target from the payload; a payload that
 *     names a third party is refused one layer up by the gate, before this code
 *     runs, and a payload that carries `owner_id` at all makes this hook stand
 *     down. There is no lenient branch to find, because there is no input to be
 *     lenient about.
 *   - **"claim a case that already has an owner" has no spelling either.** The
 *     hook is inert unless the STORED row is ownerless.
 *   - A transfer grant, by contrast, is a general capability being installed to
 *     obtain a specific one: it would let an agent reassign any case they can
 *     edit, to anyone, and it cannot express "to yourself only".
 *
 * `src/profiles/service-agent.profile.ts` is therefore UNCHANGED by this card —
 * no new grant of any kind — which is the same standing the intake round-robin
 * and the escalation hand-off already have.
 *
 * ## The four boundaries
 *
 * | write, as a `service_agent`                       | outcome |
 * | --- | --- |
 * | `{ status: 'in_progress' }` on an unowned OPEN case | claimed — owner becomes the caller |
 * | the same on a case owned by SOMEBODY ELSE           | refused: no reach, and the ownership guard below |
 * | `{ owner_id: <anyone> }`, unowned or not            | refused by the transfer gate, upstream |
 * | the same on an unowned CLOSED case                  | refused: not shared, and the closed guard below |
 *
 * Each guard is doubled on purpose. The sharing rule already hides a closed
 * unowned case and a case owned by someone else, so an agent's write is refused
 * before reaching here — but the hook must not depend on that, because the hook
 * also runs for callers the sharing rule does not constrain (an admin, a
 * manager holding the escalation share). `is_closed == false` in the predicate
 * and `previous.status !== 'closed'` here are the SAME rule stated at two
 * layers, and the reach test drives both layers separately so neither can pass
 * on the other's behalf.
 *
 * ## Re-entrancy — reasoned, not assumed
 *
 * This file's neighbourhood has been bitten twice (the `closed_date` write, and
 * the `is_escalated` re-fire loop that wedged a first-boot seed on 2026-07-06),
 * and both accidents were EXTRA WRITES. Four properties keep this hook off that
 * surface, in descending order of how much work they do:
 *
 *   1. **It performs no operation.** It mutates the payload of the update
 *      already in flight — no second write, no second `record-after-update`
 *      event, nothing for `case_escalation`, `case_sla_monitor` or
 *      `case_status_side_effects` to re-fire on. Same disposal as
 *      {@link createCaseEscalationReassign}, and it is a disposal rather than a
 *      guard: there is no loop to break.
 *   2. **The predicate is a TRANSITION, not a state** (`input.status` present
 *      AND different from `previous.status`), so it is false on a replay of the
 *      very update it fired on. The 2026-07-06 loop read a boolean STATE and
 *      met SQLite's `1 != true`; this one compares two status strings, a
 *      column with no boolean round-trip to get wrong. The closed guard reads
 *      `previous.status` first for the same reason, and accepts `is_closed`
 *      as either `true` or `1` rather than trusting the driver's spelling.
 *   3. **It is idempotent by construction.** After a successful claim the
 *      stored row HAS an owner, so guard 3 stops every subsequent run — the
 *      claim cannot be re-applied, and cannot move a case a second time.
 *   4. **It cannot collide with the escalation hand-off.** The two hooks are
 *      disjoint by target status (`escalated` is deliberately not claimable),
 *      and doubly so by order: at priority 260 this runs AFTER
 *      `case_escalation_reassign` (250), and stands down entirely the moment
 *      `owner_id` is already in the payload — so whichever of them speaks
 *      first, the other is silent.
 *
 * ## Who this runs for
 *
 * A claim is something a PERSON does, so a write with no user (a seed, a
 * system-context migration, the anonymous web-to-case path) never claims —
 * ownerless intake stays ownerless and stays in the tab, which is the whole
 * point of #596's no-op. A write carrying a real user id claims for that user,
 * whoever they are: an admin or a service manager who moves an unowned case
 * into progress has picked it up in exactly the sense an agent has, and both
 * can hand it on afterwards because both hold the transfer grant an agent does
 * not.
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

      // 2. An explicit `owner_id` in the payload WINS and is never touched.
      //    For an agent this branch is unreachable — the transfer gate refuses
      //    that payload upstream (reading D2) — so in practice it means: a
      //    caller who legitimately holds `allowTransfer` and named an owner
      //    gets the owner they named, not this hook's opinion.
      if ('owner_id' in input) return;

      // 3. Only an UNOWNED case can be claimed. Covers both storage shapes of
      //    "no owner": the key ABSENT (memory/mongo) and the column NULL (SQL).
      if (typeof previous.owner_id === 'string' && previous.owner_id) return;

      // 4. …and only one that is not CLOSED — the same line the sharing rule
      //    draws with `is_closed == false`. `status` is read first because it
      //    is a string on every driver; `is_closed` is accepted as `true` or
      //    `1` because SQLite hands booleans back as integers.
      if (previous.status === 'closed') return;
      if (previous.is_closed === true || previous.is_closed === 1) return;

      // 5. The gesture: the status MOVES to one that means a human has picked
      //    the case up. These three literals are CLAIMABLE_TARGET_STATUSES;
      //    the sandbox forbids reading the constant from here, and the parity
      //    assertion in `test/unassigned-case-triage-reach.test.ts` is what
      //    keeps the two in step. `escalated` is absent on purpose — that
      //    transition belongs to `case_escalation_reassign`.
      const next = input.status;
      if (typeof next !== 'string' || next === previous.status) return;
      if (next !== 'in_progress' && next !== 'waiting_customer' && next !== 'waiting_support') return;

      // The only user id this hook has, and the only one it can write.
      input.owner_id = claimant;
    },
  };
}
