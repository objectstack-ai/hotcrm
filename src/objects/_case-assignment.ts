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
 * "who should own this case", so #1070 extends it rather than authoring a
 * second answer — see "Extending this for #1070" at the bottom.
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
 * ─── Extending this for #1070 (escalation → `service_manager` pool) ─────────
 *
 * #1070 reassigns an ESCALATED case to the least-loaded holder of
 * {@link SERVICE_MANAGER_POSITION}. It belongs in THIS module, as a second
 * exported factory beside {@link createCaseRoundRobinAssign} — not as a fresh
 * ownership path in `case.hook.ts`. Three things that card must account for,
 * all of which differ from the intake path above and none of which are
 * cosmetic:
 *
 *  1. **Different seam, different verdict.** Escalation reassignment is an
 *     UPDATE to an existing row, which cannot be done by mutating `input` in a
 *     `beforeInsert`. Whether it runs as a `beforeUpdate` `input` mutation
 *     (invisible to the guard, like this hook) or a `ctx.api` update (VISIBLE
 *     to the guard, and therefore needing `crm_case.allowTransfer` on the
 *     writing profile — a permission-model widening) decides whether that card
 *     is a hook change or a security change. ⛔ Do not assume this module's
 *     measured "no grant needed" answer carries over: it is a property of the
 *     `beforeInsert` seam, not of `crm_case`. Measure the chosen seam the same
 *     way `test/case-assignment.test.ts` measures this one.
 *  2. **Re-entrancy.** `case_status_side_effects` is an `afterUpdate` hook on a
 *     file that has looped before (the `is_escalated` re-fire that wedged a
 *     first-boot seed on 2026-07-06, and the `closed_date`-as-`resolved_date`
 *     write). An ownership write on the escalation transition re-enters the
 *     record-change trigger surface and must be reasoned about, not assumed.
 *  3. **The empty pool is still the norm**, and the answer is still a no-op
 *     that leaves the case where it is — plus a way to SEE it. The
 *     `unassigned_triage` view covers ownerless cases; an escalated case that
 *     could not be handed over is not ownerless, so #1070 needs its own
 *     visibility answer rather than inheriting this one.
 */
