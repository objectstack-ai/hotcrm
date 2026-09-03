// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { CaseSlaMonitorFlow } from '../src/flows/case-sla-monitor.flow';
import caseHooks from '../src/objects/case.hook';
import { makeFlowHarness, type Rec } from './helpers/flow-harness';

/**
 * `case_sla_monitor` GIVES an ownerless breached case an owner (#1405, ruled).
 *
 * Maintainer ruling, 2026-09-03 — option C, quoted rather than paraphrased so
 * the two branches below are readable as the thing that was decided:
 *
 * > An ownerless breached case is assigned an owner through the existing
 * > `service_manager` least-loaded assignment; an empty pool is a graceful
 * > no-op.
 *
 * `test/flow-sla-ownerless-case.test.ts` is the OTHER half of this card and
 * stays as it is: it pins that the sweep SURVIVES an ownerless breach (PR
 * #1432's gate). This file pins what the sweep now DOES about one.
 *
 * ## What is actually under test — and why the hooks are not optional here
 *
 * The assignment is NOT authored in the flow. `flag_breach` writes
 * `status: 'escalated'`, which is the escalation TRANSITION
 * `case_escalation_reassign` (`src/objects/_case-assignment.ts`, `beforeUpdate`,
 * priority 250) fires on — it stamps the least-loaded `service_manager` onto the
 * payload of the update already in flight. So the sweep reaches the assignment
 * by PERFORMING the transition, and the flow's own contribution is the RE-READ
 * (`reload_case`) that lets the notify node address the owner the write just
 * produced instead of the pre-write snapshot the loop item carries.
 *
 * ⇒ A run of this flow WITHOUT the app's case hooks cannot observe any of that.
 * Both branches therefore drive the real flow, the real `AutomationEngine` and
 * the app's real `crm_case` hook chain, and differ ONLY in whether
 * `sys_user_position` has a `service_manager` in it — which is the one input the
 * ruling turns on.
 *
 * ⚠️ `case_status_side_effects` is an `afterUpdate` hook and the flow harness
 * runs before-hooks only, so the escalation follow-up task it opens is out of
 * frame here. That is a stated boundary, not an oversight: this file is about
 * ownership and the alert, and `test/hooks-runtime-service.test.ts` owns that
 * hook.
 */

const iso = (daysFromNow: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString();
};

/**
 * Breached cases in a deliberate order: an owned control, the three distinct
 * shapes of "no owner", and an owned case BEHIND them all.
 */
const seedCases = (): Rec[] => [
  {
    id: 'c_owned', case_number: 'CASE-1', subject: 'Owned breach', priority: 'high',
    status: 'in_progress', is_closed: false,
    is_sla_violated: false, sla_due_date: iso(-3), owner_id: 'rep1',
  },
  {
    // Shape 1 — the key is ABSENT, the shape a sparse driver hands back.
    id: 'c_absent', case_number: 'CASE-2', subject: 'Owner column never written', priority: 'critical',
    status: 'new', is_closed: false,
    is_sla_violated: false, sla_due_date: iso(-4),
  },
  {
    // Shape 2 — an explicit NULL. The nullable column, written empty.
    id: 'c_null', case_number: 'CASE-3', subject: 'Owner explicitly null', priority: 'high',
    status: 'new', is_closed: false,
    is_sla_violated: false, sla_due_date: iso(-5), owner_id: null,
  },
  {
    // Shape 3 — BLANK. `notify` trims before dropping, so '   ' is the same
    // empty slate as an absent key; a gate that only tested null would let it
    // through and reopen the defect one input narrower.
    id: 'c_blank', case_number: 'CASE-4', subject: 'Owner blank string', priority: 'high',
    status: 'new', is_closed: false,
    is_sla_violated: false, sla_due_date: iso(-6), owner_id: '   ',
  },
  {
    // The blast-radius instrument: an ordinary owned breach behind the
    // ownerless rows, reachable only if none of them took the run down.
    id: 'c_after', case_number: 'CASE-5', subject: 'Breach behind the ownerless ones', priority: 'high',
    status: 'in_progress', is_closed: false,
    is_sla_violated: false, sla_due_date: iso(-7), owner_id: 'rep2',
  },
  {
    // Control: not breached. A fix that widened selection would pass every
    // assertion above and fail this one.
    id: 'c_future', case_number: 'CASE-6', subject: 'Not due yet', priority: 'high',
    status: 'in_progress', is_closed: false,
    is_sla_violated: false, sla_due_date: iso(+5), owner_id: 'rep3',
  },
];

const OWNERLESS = ['c_absent', 'c_null', 'c_blank'];

/**
 * The pool the assignment reads: holders of `service_manager` in
 * `sys_user_position`.
 *
 * TWO holders, and a `service_agent` row beside them. Both are load-bearing: a
 * single-holder pool cannot tell "read the pool" apart from "write a constant",
 * and the agent row is what fails a read that took every row in the table
 * instead of filtering by position.
 *
 * ⚠️ The pin below deliberately does NOT name which manager gets which case.
 * Least-loaded is recomputed per case against LIVE counts, so the sweep spreads
 * its breaches across the bench (measured: with `mgr_agent_1` already carrying
 * one case, five breaches landed `mgr_free`, `mgr_busy`, `mgr_free`,
 * `mgr_busy`…). Pinning a name would pin the arithmetic of the fixture rather
 * than the contract, and `test/case-assignment.test.ts` already owns the
 * least-loaded rule itself.
 */
const staffedPool = (): Rec[] => [
  { id: 'pos_1', position: 'service_manager', user_id: 'mgr_busy' },
  { id: 'pos_2', position: 'service_manager', user_id: 'mgr_free' },
  // A service AGENT in the same table: the pool read must filter by position,
  // not take every row it finds.
  { id: 'pos_3', position: 'service_agent', user_id: 'agent_1' },
];

/** The holders the sweep may legitimately hand a case to. */
const MANAGERS = ['mgr_busy', 'mgr_free'];

/** `mgr_busy`'s existing workload — what makes the two holders distinguishable. */
const managerWorkload = (): Rec[] => [
  {
    id: 'c_busy', case_number: 'CASE-9', subject: 'Already on the busy manager', priority: 'low',
    status: 'in_progress', is_closed: false,
    is_sla_violated: false, sla_due_date: iso(+30), owner_id: 'mgr_busy',
  },
];

interface RunSummary {
  selected?: number;
  acted?: number;
  nodes?: { nodeId: string; status?: string; runs?: number; skipped?: number; acted?: number; selected?: number }[];
  gates?: { nodeId: string; targetNodeId?: string; edgeId?: string; label?: string; skipped?: number }[];
}
interface RunResult { success?: boolean; status?: string; error?: string; summary?: RunSummary }

const runSweep = async (positions: Rec[]) => {
  const h = makeFlowHarness(
    { case_sla_monitor: CaseSlaMonitorFlow },
    { crm_case: [...seedCases(), ...managerWorkload()], sys_user_position: positions },
    { hooks: caseHooks as never[] },
  );
  // `engine.execute` directly, not `h.run`: the engine RECORDS a terminal
  // failure rather than rejecting to its caller, so "no exception escaped" is
  // not evidence of a healthy run.
  const result = await (h.engine as unknown as {
    execute(name: string, ctx: unknown): Promise<RunResult>;
  }).execute('case_sla_monitor', { params: {}, userId: 'user_1', event: 'schedule' });
  const byId = Object.fromEntries(h.store.crm_case.map((c) => [c.id, c]));
  const nodeOf = (id: string) => (result.summary?.nodes ?? []).find((n) => n.nodeId === id);
  // Selected by EDGE id, never by array position: the engine emits gate rows in
  // completion order, which differs run to run (measured — `b3` and `b5` swap).
  const gateOf = (edgeId: string) => (result.summary?.gates ?? []).find((g) => g.edgeId === edgeId);
  const audiences = h.notifications.flatMap((n) => n.to);
  /**
   * Who the alert for one case was addressed to, matched by the case NUMBER the
   * notify node puts in its own title.
   *
   * This is what makes "the assigned owner is the one notified" checkable as a
   * per-case correspondence rather than as two set memberships that happen to
   * overlap: an implementation that assigned `c_null` and alerted `c_blank`'s
   * owner would satisfy every set-shaped assertion and fail this one.
   */
  const alertFor = (caseNumber: string): string[] =>
    h.notifications
      .filter((n) => String(n.title ?? '').includes(caseNumber))
      .flatMap((n) => n.to);
  return { h, result, byId, nodeOf, gateOf, audiences, alertFor };
};

describe('pool NON-EMPTY: the ownerless breach is assigned, then that owner is alerted', () => {
  it('gives every ownerless breached case an owner out of the service_manager pool', async () => {
    const { byId } = await runSweep(staffedPool());
    for (const id of OWNERLESS) {
      expect(
        MANAGERS,
        `${id}: the ownerless breach was not assigned a service manager (got ${JSON.stringify(byId[id].owner_id)})`,
      ).toContain(byId[id].owner_id);
    }
    // The pool read filters by POSITION: the `service_agent` sharing the table
    // is not a candidate for an escalated case.
    expect(OWNERLESS.map((id) => byId[id].owner_id)).not.toContain('agent_1');
  });

  it('alerts the owner the assignment produced, not the empty slate it replaced', async () => {
    const { byId, alertFor, nodeOf } = await runSweep(staffedPool());
    for (const id of OWNERLESS) {
      // The correspondence, per case: whoever the case now belongs to is
      // whoever its alert was addressed to. Before this change the alert for an
      // ownerless case was not sent at all.
      expect(
        alertFor(byId[id].case_number as string),
        `${id}: the alert did not reach the owner the sweep just assigned`,
      ).toEqual([byId[id].owner_id]);
    }
    // Two owned breaches + three newly assigned ones. Before this change notify
    // ran twice and the three ownerless cases were skipped at the gate.
    expect(nodeOf('notify_team')?.runs, 'notify did not run for every breach').toBe(5);
    expect(nodeOf('notify_team')?.status, 'notify recorded a failure').toBe('success');
  });

  it('addresses a real recipient every time — never a phantom or an empty slate', async () => {
    const { h } = await runSweep(staffedPool());
    for (const n of h.notifications) {
      expect(n.to.length, 'a notification went out with an empty audience').toBeGreaterThan(0);
      expect(JSON.stringify(n), 'a template resolved to a phantom recipient').not.toContain('undefined');
    }
  });

  it('leaves an already-owned breach with its own owner and its own alert', async () => {
    const { byId, audiences } = await runSweep(staffedPool());
    // ⚠️ The OWNED path is deliberately untouched by #1405. The escalation
    // hand-off does move an owned case to the manager pool — that is
    // `case_escalation_reassign`'s shipped behaviour, not this card's — and the
    // alert still goes to the agent the case is being taken FROM, exactly as
    // the sweep has always addressed it. Re-routing that alert is a separate
    // product question and is filed as one.
    expect(audiences).toContain('rep1');
    expect(audiences).toContain('rep2');
    expect(byId.c_owned.is_sla_violated, 'the owned breach was not flagged').toBe(true);
  });

  it('records the breach on every case and reaches the ones queued behind', async () => {
    const { byId, nodeOf } = await runSweep(staffedPool());
    for (const id of [...OWNERLESS, 'c_owned', 'c_after']) {
      expect(byId[id].is_sla_violated, `${id}: breach not flagged`).toBe(true);
      expect(byId[id].status, `${id}: status not escalated`).toBe('escalated');
      // `escalation_reason` must accompany `is_escalated` or the object's
      // `escalation_reason_required` validation rejects the whole write.
      expect(byId[id].escalation_reason, `${id}: missing escalation_reason ⇒ write rejected`).toBeTruthy();
    }
    expect(nodeOf('flag_breach')?.runs, 'flag_breach did not reach every selected case').toBe(5);
    expect(byId.c_future.is_sla_violated, 'a future-due case was wrongly flagged').toBe(false);
    expect(byId.c_busy.is_sla_violated, "the manager's own open case was wrongly flagged").toBe(false);
  });

  it('completes the run', async () => {
    const { result, nodeOf } = await runSweep(staffedPool());
    expect(result.success, `the scheduled run failed: ${result.error ?? ''}`).toBe(true);
    expect(result.status, 'a terminal failure was recorded').not.toBe('failed');
    expect(nodeOf('loop_cases')?.status, 'the loop container failed').toBe('success');
  });
});

describe('pool EMPTY: a graceful no-op — unowned, unnotified, and the run survives', () => {
  it('leaves the ownerless breach unowned', async () => {
    const { byId } = await runSweep([]);
    for (const id of OWNERLESS) {
      // ⛔ Not a fallback recipient and not a manager-chain dot-walk: with
      // nobody in the pool the sweep does NOTHING about ownership for this
      // case. Option B was refused precisely because a fallback resolves empty
      // on this repo's own demo data and re-enters notify's hard-failure path.
      //
      // "Unowned" is asserted as the notify node defines it — `String(v).trim()`
      // is falsy — rather than as `null`, because `c_blank` is seeded '   ' and
      // stays '   '. A rule written as `toBeNull()` would have called the
      // untouched blank a failure and hidden the one that matters: a POOL
      // MEMBER appearing in the column.
      const owner = byId[id].owner_id;
      expect(
        String(owner ?? '').trim(),
        `${id}: an empty pool invented an owner (${JSON.stringify(owner)})`,
      ).toBe('');
      expect(MANAGERS, `${id}: a pool member was written from an EMPTY pool`).not.toContain(owner);
    }
  });

  it('skips the notification at a NAMED gate rather than in silence', async () => {
    const { gateOf, nodeOf, audiences } = await runSweep([]);
    const gate = gateOf('b5');
    expect(gate, 'the post-escalation gate is absent from the run summary').toBeTruthy();
    expect(gate?.nodeId).toBe('check_assigned');
    expect(gate?.targetNodeId).toBe('notify_team');
    // Run history says WHY three alerts did not go out, rather than showing
    // fewer notifications than cases and leaving the reader to infer it.
    expect(gate?.skipped, 'the gate did not account for the unplaceable cases').toBe(OWNERLESS.length);
    expect(nodeOf('notify_team')?.status, 'notify recorded a failure on the empty slate').toBe('success');
    // The two owned breaches still get theirs — an empty pool costs nobody
    // else their alert.
    expect(audiences.sort()).toEqual(['rep1', 'rep2']);
  });

  it('still records the breach on the unplaceable cases', async () => {
    const { byId } = await runSweep([]);
    for (const id of OWNERLESS) {
      // The breach stays on the RECORD and in the run summary — visible in
      // views and reports, which is where a service manager finds it when the
      // bench that would have been assigned it is empty.
      expect(byId[id].is_sla_violated, `${id}: ownerless breach was not flagged`).toBe(true);
      expect(byId[id].status, `${id}: status not escalated`).toBe('escalated');
    }
  });

  it('completes the run — ⛔ an empty pool is never a hard failure', async () => {
    const { result, nodeOf } = await runSweep([]);
    expect(result.success, `the scheduled run failed: ${result.error ?? ''}`).toBe(true);
    expect(result.status, 'a terminal failure was recorded').not.toBe('failed');
    expect(nodeOf('loop_cases')?.status, 'the loop container failed').toBe('success');
    expect(nodeOf('flag_breach')?.runs, 'a case was skipped by the empty-pool path').toBe(5);
  });
});
