// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from '../../sales/objects/_hook-api';

/**
 * ═══ Case ownership on escalation — the one owner writer this app keeps ═════
 *
 * Who owns a NEW case is the platform's answer since @objectstack 18.3.0
 * (ADR-0142, hotcrm#2395): an ownerless case is routed by the declared
 * assignment rule `case_intake_assignment` into the `case_intake` queue and
 * handed to its least-loaded member, or parked there; an agent takes a parked
 * case with the console's **Claim** (an update of `owner_id` to themselves,
 * adjudicated by the platform's transfer gate, one winner per race). The app's
 * former stand-ins — the intake round-robin `case_auto_assign`, the
 * status-as-claim gesture `case_self_claim`, the `claim_case` screen flow and
 * the `case_unassigned_triage_sharing` rule — were deleted with that adoption,
 * not adapted (maintainer ruling 2026-11-04, option A: a claim writes the owner
 * only).
 *
 * What stays is the escalation hand-off below. ADR-0142 evaluates assignment
 * rules on INSERT only (its D8 table, merge question 5), so re-routing a case
 * on the transition to `escalated` has no platform spelling yet; when a
 * platform release takes update-time routing, this hook is reclaimed the same
 * way.
 *
 * # ⚠️ The L2 sandbox constraint — the shape the handler must take
 *
 * L2 hook bodies run BODY-ONLY inside QuickJS: the handler is lowered to a
 * source string with no module scope, so a body referencing an import, a
 * top-level const or a factory PARAMETER is a `ReferenceError` at runtime, not
 * a closure. `pnpm lint` (`os lint --strict`) lowers every registered hook with
 * the build's own extraction pass and refuses the ones that leak, as
 * `hook-body/not-lowerable`. So the FACTORY owns the doc and the constants and
 * the handler spells its literals INLINE; `test/case-assignment.test.ts`
 * drives the real handler and pins the literal to
 * {@link SERVICE_MANAGER_POSITION}, so constant and literal cannot drift.
 *
 * # ⚠️ The ownership-transfer gate (#3004), and why the hand-off is a beforeUpdate stamp
 *
 * Stamping another user's `owner_id` is an ownership TRANSFER, denied unless
 * the caller holds `allowTransfer` on the object. `crm_case.allowTransfer` is
 * NOT granted to `service_agent`, and granting it would widen what an agent
 * may do to a case generally. Measured against the full shipped stack and
 * pinned in `test/case-assignment.test.ts`:
 *
 *   ① A `beforeUpdate` hook STAMPING `owner_id` onto a payload that did not
 *      carry the key is INVISIBLE to the gate — the middleware observes the
 *      payload as authored, and the stored row carries the stamp. This is the
 *      door the hand-off uses, and why it needs no permission grant.
 *   ② A hook's `ctx.api` WRITE is a fresh operation carrying the caller's
 *      identity, so the gate DOES see it.
 *   ③ A caller-supplied `owner_id` is adjudicated INSIDE the middleware,
 *      upstream of the hook phase. Since 18.3.0 the gate admits one such write,
 *      the CLAIM (`owner_id` from empty to the caller's own id, on a record the
 *      sharing model admits them to — a member of the queue it sits in); every
 *      other foreign owner still needs the grant.
 *
 * ⚠️ If a platform release moves the gate downstream of the hook phase, door ①
 * flips and those tests go red. The signal is then to grant `allowTransfer`
 * deliberately or to stop assigning in a hook — NOT to widen the permission
 * model to make a red test green.
 */

/** The position ESCALATED cases are routed to. */
export const SERVICE_MANAGER_POSITION = 'crm_service_manager';

/**
 * Statuses that mean "this case is no longer live work".
 *
 * Load balancing counts OPEN cases (the escalation hand-off below, and the
 * `load` of `case_intake_assignment`), and `is_closed` is the wrong predicate:
 * it only flips on `closed`, so a pile of `resolved` cases would keep counting
 * against an agent who has already finished them. `case_sla_monitor` settles it
 * the same way — see the `$nin` note in `src/service/flows/case-sla-monitor.flow.ts`,
 * which also records that comparing the boolean `is_closed` walks into the
 * SQLite `1 != true` trap.
 */
export const CLOSED_CASE_STATUSES = ['resolved', 'closed'] as const;

/** Cap on the escalation pool read (`sys_user_position` holders of the manager position). */
export const POOL_QUERY_LIMIT = 1000;

/**
 * Hand an escalating case to the least-loaded service manager.
 *
 * On the escalation TRANSITION the case moves to the holder of
 * {@link SERVICE_MANAGER_POSITION} with the fewest open cases — the same
 * least-loaded balance `case_intake_assignment` declares for intake, against a
 * different pool. Without it, escalation is only a flag, a status and an inbox message:
 * the agent who could not get to the case in time stays the only person who can
 * work it.
 *
 * ⚠️ Positions are FLAT (`src/sales/sharing/positions.ts`), so "the owner's manager"
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
 * staffs Tomas Okafor into the position (`src/sales/sharing/demo-staffing.ts`), so the
 * exemplar now demonstrates the hand-off rather than the stand-down — which is
 * also what makes the sweep's assignment visible on this repo's own seed.
 *
 * With no pool the case keeps its owner and the escalation completes as
 * before. That needs no surface of its own to stay visible: an escalated case
 * is not ownerless, it sits in the `escalated_cases` view, and `case_escalation_sharing` already
 * grants every `service_manager` edit access to open critical cases.
 *
 * ## Best-effort, always
 *
 * Reassignment is an ENHANCEMENT to the escalation, never a precondition. A
 * read denial, an empty pool or any other failure leaves the case with its
 * current owner and lets the escalation write through untouched.
 *
 * ## `runAs: 'system'` (#2014), and the organization pin
 *
 * The pool is `sys_user_position`, which a service agent may not read — so an
 * agent escalating their own case (the record form, or the `escalate_case`
 * action, whose `escalate` node deliberately keeps the status write in the
 * acting user's context) was refused the read, stood down, and the case stayed
 * with the agent who could not get to it; only the SLA sweep's system write
 * reached the pool. Choosing the escalation desk is the business's routing, not
 * the agent's privilege, so the hook elevates. What elevation reaches is the
 * two READS: the hook still issues no write of its own (door ① above), so it
 * needs no transfer grant and moves nothing the escalation write is not
 * already moving.
 *
 * AGENTS.md rule 10: the pool and the load counts are organization-NEUTRAL
 * predicates (a position name, an owner id), so both are pinned to the
 * escalating case's own `organization_id` when it carries one. A person's
 * escalation is already confined by the driver — the elevated `ctx.api` keeps
 * the trigger's tenant — but the SLA sweep writes as the system with no
 * tenant at all, and without the pin its escalation would pick the
 * least-loaded manager of ANY organization. A case with no organization (a
 * single-organization install) has no wall to stay inside, and is not pinned.
 * Pinned, a manager whose position assignment is global (no organization)
 * does not receive a tenant's case.
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
    runAs: 'system',
    description: 'Hand a case being escalated to the least-loaded service manager.',
    handler: async (ctx: HookContext) => {
      // D3 stand-down: the escalation TRANSITION is read off this row's
      // `previous`, so on a predicate update the new owner would be written to
      // every matched case. `events` is `beforeUpdate` only, so the event half
      // of the idiom in `forecast.hook.ts` would be a constant here.
      if (ctx.dispatch?.mode === 'per-row') return;

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

      // The escalating case's own organization — the rule-10 pin on both
      // reads below. Read off the stored row: an update payload does not carry
      // it, and the platform stamped it there.
      const organizationId =
        typeof previous.organization_id === 'string' && previous.organization_id !== ''
          ? previous.organization_id
          : undefined;
      const inOrganization: Record<string, string> = organizationId ? { organization_id: organizationId } : {};

      try {
        // The pool = holders of the `crm_service_manager` position. This literal is
        // the exported SERVICE_MANAGER_POSITION; the sandbox forbids reading the
        // constant here, and `test/case-assignment.test.ts` pins the parity.
        const holders = await api.object('sys_user_position').find({
          where: { position: 'crm_service_manager', ...inOrganization }, fields: ['user_id'], top: 1000,
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

        // Fewest OPEN cases wins — same predicate as `case_intake_assignment`'s `load`:
        // `$nin` over statuses rather than `is_closed: false`, because a
        // resolved case is finished work and must stop counting.
        let best: string | undefined;
        let bestCount = Infinity;
        for (const managerId of managerIds) {
          const openCount = await api.object('crm_case').count({
            where: { owner_id: managerId, status: { $nin: ['resolved', 'closed'] }, ...inOrganization },
          });
          if (openCount < bestCount) {
            bestCount = openCount;
            best = managerId;
          }
        }
        if (!best) return;
        input.owner_id = best;
        // Record whom the case was taken from, in the same payload: the owner
        // loses own-scope read the moment this write lands, and
        // `case_escalated_from_sharing` keeps them on it, read-only, while it
        // is open (#2060 item 3). An ownerless case was taken from nobody.
        if (currentOwner) input.escalated_from = currentOwner;
      } catch {
        // Swallow: the hand-off must never reject the escalation. A failed
        // pool read leaves the case where it is, escalated.
        // (No `console` here — the L2 hook sandbox does not define one.)
      }
    },
  };
}
