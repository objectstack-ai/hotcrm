// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { CaseSlaMonitorFlow } from '../src/flows/case-sla-monitor.flow';
import { makeFlowHarness, type Rec } from './helpers/flow-harness';

/**
 * `case_sla_monitor` and the OWNERLESS breached case (#1405).
 *
 * `crm_case.owner_id` is nullable and an unowned case is an ordinary state —
 * this repo ships `scripts/backfill-owner-id.ts` and `pnpm backfill:owner`
 * precisely because ownerless rows happen, and ordinary REST creation / import
 * reach the same state with no race involved.
 *
 * The `notify` node addresses exactly ONE recipient, `{currentCase.owner_id}`.
 * When that resolves to nothing the builtin node returns `success: false`
 * ("at least one recipient is required"), `AutomationEngine.executeNode` turns
 * that into a THROW, and the `loop` node awaits `runRegion` with no try/catch —
 * so the throw unwinds the entire `loop_cases` container. The sweep dies on the
 * ownerless case and every breached case ORDERED BEHIND IT is never even
 * flagged.
 *
 * That blast radius — not the missing notification — is what these tests pin.
 * Who an ownerless breach should escalate TO is a product decision and stays
 * open on #1405.
 */

const iso = (daysFromNow: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString();
};

/**
 * Breached cases in a deliberate ORDER, with the three distinct shapes of "no
 * owner" sandwiched between two ordinary owned ones. The TRAILING owned case is
 * the instrument: it can only be reached if none of the ownerless rows in front
 * of it took the run down.
 */
const seedCases = (): Rec[] => [
  {
    id: 'c_first', case_number: 'CASE-1', subject: 'First breach', priority: 'high',
    status: 'in_progress', is_closed: false,
    is_sla_violated: false, sla_due_date: iso(-3), owner_id: 'rep1',
  },
  {
    // Shape 1 — the key is ABSENT. A driver row never written with the column
    // is sparse, and that is the shape #633/#643 measured: an unguarded
    // `vars.currentCase.owner_id != null` aborts here with `No such key` and
    // takes the run down exactly the way the empty recipient slate did. Only
    // `has()` is total.
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
    // Shape 3 — BLANK. The notify node's own `toStringList` trims and drops
    // falsy entries, so '   ' reaches the node as the same empty slate as an
    // absent key. Reachable through REST. A gate that only tested null would
    // reopen the defect on this narrower input.
    id: 'c_blank', case_number: 'CASE-4', subject: 'Owner blank string', priority: 'high',
    status: 'new', is_closed: false,
    is_sla_violated: false, sla_due_date: iso(-6), owner_id: '   ',
  },
  {
    // The blast-radius instrument. Nothing special about it — an ordinary
    // breached, owned case that this sweep exists to flag, sitting behind the
    // ownerless rows.
    id: 'c_after', case_number: 'CASE-5', subject: 'Breach behind the ownerless ones', priority: 'high',
    status: 'in_progress', is_closed: false,
    is_sla_violated: false, sla_due_date: iso(-7), owner_id: 'rep2',
  },
  {
    // Control: not breached. Proves the gate did not widen what the sweep
    // selects — a fix that flagged everything would pass every assertion above.
    id: 'c_future', case_number: 'CASE-6', subject: 'Not due yet', priority: 'high',
    status: 'in_progress', is_closed: false,
    is_sla_violated: false, sla_due_date: iso(+5), owner_id: 'rep3',
  },
];

const OWNERLESS = ['c_absent', 'c_null', 'c_blank'];

interface RunSummary {
  selected?: number;
  acted?: number;
  nodes?: { nodeId: string; status?: string; runs?: number; skipped?: number; acted?: number }[];
  gates?: { nodeId: string; targetNodeId?: string; edgeId?: string; label?: string; skipped?: number }[];
}
interface RunResult { success?: boolean; status?: string; error?: string; summary?: RunSummary }

const runSweep = async () => {
  const h = makeFlowHarness({ case_sla_monitor: CaseSlaMonitorFlow }, { crm_case: seedCases() });
  // `engine.execute` directly, not `h.run`: the engine RECORDS a terminal
  // failure rather than rejecting to its caller, so "no exception escaped" is
  // NOT evidence of a healthy run — measured, an earlier draft of this test
  // asserted exactly that and passed while the sweep was dying. `result.success`
  // is the engine's own verdict and is present on both the success and failure
  // shapes (`status: 'failed'` appears only on the failure one).
  const result = (await (h.engine as unknown as {
    execute(name: string, ctx: unknown): Promise<RunResult>;
  }).execute('case_sla_monitor', { params: {}, userId: 'user_1', event: 'schedule' }));
  const byId = Object.fromEntries(h.store.crm_case.map((c) => [c.id, c]));
  const nodeOf = (id: string) => (result.summary?.nodes ?? []).find((n) => n.nodeId === id);
  return { h, result, byId, nodeOf };
};

describe('case_sla_monitor — an ownerless breached case (#1405)', () => {
  it('completes the sweep — the run does not die on the ownerless cases', async () => {
    const { result, nodeOf } = await runSweep();
    expect(result.success, `the scheduled run failed: ${result.error ?? ''}`).toBe(true);
    expect(result.status, 'a terminal failure was recorded').not.toBe('failed');
    // The loop container itself must not be the thing that failed — before the
    // fix its summary node read `status: 'failure'` with the notify error.
    expect(nodeOf('loop_cases')?.status, 'the loop container failed').toBe('success');
  });

  it('reaches EVERY selected case, and the run summary says so', async () => {
    const { result, nodeOf } = await runSweep();
    // 5 breached rows selected (the 6th is not due). `flag_breach` running once
    // per selected case is the machine-checkable form of "the sweep finished
    // its work" — before the fix it ran twice and the run reported `acted: 0`.
    expect(result.summary?.selected, 'the sweep selected the wrong set').toBe(5);
    expect(nodeOf('flag_breach')?.runs, 'flag_breach did not reach every case').toBe(5);
    expect(nodeOf('check_owner')?.runs, 'the gate did not see every case').toBe(5);
  });

  it('records the skipped notifications as a GATE, not as silence', async () => {
    const { result, nodeOf } = await runSweep();
    // The second half of "visible, not silent": besides the breach landing on
    // the record, the engine's own run summary attributes the three skipped
    // notifications to the named gate — so run history shows WHY they were
    // skipped rather than just showing fewer notifications than cases.
    const gate = (result.summary?.gates ?? []).find((g) => g.nodeId === 'check_owner');
    expect(gate, 'the gate is absent from the run summary').toBeTruthy();
    expect(gate?.targetNodeId).toBe('notify_team');
    expect(gate?.skipped, 'the gate did not account for the ownerless cases').toBe(OWNERLESS.length);
    const notify = nodeOf('notify_team');
    expect(notify?.status, 'notify recorded a failure').toBe('success');
    expect(notify?.skipped).toBe(OWNERLESS.length);
    expect(notify?.runs, 'notify ran for a case with no owner').toBe(2);
  });

  it('still RECORDS the breach on every ownerless case — the skip is visible, not silent', async () => {
    const { byId } = await runSweep();
    for (const id of OWNERLESS) {
      // `flag_breach` is what puts the breach in views and reports, where a
      // service manager finds it. Gating it away alongside the notify would
      // trade a dead run for a silently dropped alert on exactly the cases most
      // likely to be neglected.
      expect(byId[id].is_sla_violated, `${id}: ownerless breach was not flagged`).toBe(true);
      expect(byId[id].is_escalated, `${id}: ownerless breach was not escalated`).toBe(true);
      expect(byId[id].status, `${id}: status not escalated`).toBe('escalated');
      // `escalation_reason` must accompany `is_escalated` or the object's
      // `escalation_reason_required` validation rejects the whole write.
      expect(byId[id].escalation_reason, `${id}: missing escalation_reason ⇒ write rejected`).toBeTruthy();
    }
  });

  it('does not skip the breached cases QUEUED BEHIND the ownerless ones', async () => {
    const { byId } = await runSweep();
    // The blast radius. Before the fix this is the assertion that failed: the
    // loop aborted on `c_absent` and `c_after` was never visited.
    expect(byId.c_after.is_sla_violated, 'a breached case behind the ownerless ones was skipped').toBe(true);
    expect(byId.c_after.status).toBe('escalated');
    expect(byId.c_first.is_sla_violated, 'the case in front was not processed').toBe(true);
  });

  it('leaves the not-yet-due case alone — the gate did not widen selection', async () => {
    const { byId } = await runSweep();
    expect(byId.c_future.is_sla_violated, 'a future-due case was wrongly flagged').toBe(false);
    expect(byId.c_future.is_escalated, 'a future-due case was wrongly escalated').toBeFalsy();
  });

  it('notifies every owner it can reach, and addresses nobody for the ownerless cases', async () => {
    const { h } = await runSweep();
    const audiences = h.notifications.map((n) => JSON.stringify(n.to));
    expect(
      h.notifications.length,
      `expected exactly one alert per OWNED breach, got ${audiences.join(' ')}`,
    ).toBe(2);
    expect(audiences.join(' ')).toContain('rep1');
    expect(audiences.join(' ')).toContain('rep2');
    for (const n of h.notifications) {
      // No phantom audience: an ownerless case must be SKIPPED, never addressed
      // to a stringified nothing.
      expect(JSON.stringify(n), 'a template resolved to a phantom recipient').not.toContain('undefined');
      expect(n.to.length, 'a notification went out with an empty audience').toBeGreaterThan(0);
    }
  });
});
