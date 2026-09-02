// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { CaseEscalationFlow, CaseEscalationOnCreateFlow } from '../src/flows/case-escalation.flow';
import { makeFlowHarness, type Rec } from './helpers/flow-harness';

/**
 * `case_escalation` / `case_escalation_on_create` and the OWNERLESS case
 * (#1430).
 *
 * `crm_case.owner_id` is nullable and an unowned case is an ordinary state —
 * this repo ships `scripts/backfill-owner-id.ts` and `pnpm backfill:owner`
 * precisely because ownerless rows happen, and ordinary REST creation / import
 * reach the same state with no race involved.
 *
 * The `notify_team` node addresses exactly ONE recipient,
 * `{caseRecord.owner_id}`. When that resolves to nothing the builtin node
 * returns `success: false` ("at least one recipient is required"),
 * `AutomationEngine.executeNode` turns that into a THROW, and the run is
 * recorded `status: 'failed'`.
 *
 * BLAST RADIUS — the reason this is its own card and not a fold-in of #1405,
 * and the reason it must not be described as "the same defect" without the
 * qualifier: #1405 is a `schedule` flow whose work sits inside a `loop` that
 * awaits `runRegion` with no try/catch, so one ownerless row took down every
 * breached case queued behind it (60% of a sweep). These two are
 * `record_change` flows with NO loop — one ownerless case kills only its own
 * run. What is lost is the notification to the OUTGOING owner plus a terminal
 * failure written into run history where nobody looks.
 *
 * Who an ownerless escalation should reach — a service-manager role or
 * position — is a product decision and stays open on #1405. Nothing here adds
 * a fallback recipient.
 */

const FLOWS = {
  case_escalation: CaseEscalationFlow,
  case_escalation_on_create: CaseEscalationOnCreateFlow,
} as const;

type FlowName = keyof typeof FLOWS;
const FLOW_NAMES = Object.keys(FLOWS) as FlowName[];

/** A critical case that the start condition selects: no `escalated_date`, live status. */
const criticalCase = (extra: Rec = {}): Rec => ({
  id: 'c1', case_number: 'CASE-1', subject: 'Server down', priority: 'critical',
  status: 'new', is_closed: false, ...extra,
});

interface RunSummary {
  nodes?: { nodeId: string; status?: string; runs?: number; skipped?: number }[];
  gates?: { nodeId: string; targetNodeId?: string; edgeId?: string; label?: string; skipped?: number }[];
}
interface RunResult { success?: boolean; status?: string; error?: string; summary?: RunSummary }

/**
 * `engine.execute` directly, not `harness.run`: the engine RECORDS a terminal
 * failure rather than rejecting to its caller, so "no exception escaped" is NOT
 * evidence of a healthy run — an assertion written that way passes while the
 * run is dying. `result.success` is the engine's own verdict and is present on
 * both the success and the failure shape (`status: 'failed'` appears only on
 * the failure one).
 *
 * `record` is a TOP-LEVEL key on the execute context, not a member of `params`
 * — the engine binds it before evaluating the start condition.
 */
const runEscalation = async (flowName: FlowName, row: Rec | null, trigger: Rec = row ?? {}) => {
  const h = makeFlowHarness(FLOWS, { crm_case: row ? [{ ...row }] : [] });
  const result = (await (h.engine as unknown as {
    execute(name: string, ctx: unknown): Promise<RunResult>;
  }).execute(flowName, {
    params: {}, userId: 'user_1', event: 'record_change', record: { ...trigger },
  }));
  return {
    h, result,
    stored: h.store.crm_case[0],
    nodeOf: (id: string) => (result.summary?.nodes ?? []).find((n) => n.nodeId === id),
    gateOf: (id: string) => (result.summary?.gates ?? []).find((g) => g.nodeId === id),
  };
};

/**
 * The three shapes of "no owner", each reachable in production and each with
 * its OWN failure mode against a weaker predicate — which is why the gate is
 * five terms and none of them is decoration.
 */
const OWNERLESS: Record<string, Rec> = {
  // The key is ABSENT. A driver row never written with the column is sparse
  // (driver-memory / driver-mongodb store only the columns a row was written
  // with) — an unguarded `vars.caseRecord.owner_id != null` aborts here with
  // `No such key` and takes the run down exactly the way the empty slate did.
  'owner column never written': criticalCase(),
  // An explicit NULL — the nullable column, written empty. `string(null)` has
  // no overload, so the `!= null` term must short-circuit before the wrap.
  'owner explicitly null': criticalCase({ owner_id: null }),
  // BLANK. The notify node's own `toStringList` trims and drops falsy entries,
  // so '   ' reaches it as the same empty slate as an absent key. Reachable
  // through REST. A gate testing only `!= ""` opens here — `'   ' != ""` is
  // TRUE in CEL — and reproduces the defect one input narrower.
  'owner blank whitespace': criticalCase({ owner_id: '   ' }),
};

describe.each(FLOW_NAMES)('%s — an ownerless critical case (#1430)', (flowName) => {
  describe.each(Object.entries(OWNERLESS))('%s', (_shape, row) => {
    it('completes the run — it is not recorded as a terminal failure', async () => {
      const { result } = await runEscalation(flowName, row);
      expect(result.success, `the run failed: ${result.error ?? ''}`).toBe(true);
      expect(result.status, 'a terminal failure was recorded').not.toBe('failed');
      expect(result.error ?? '', 'the notify error is back').not.toContain('at least one recipient');
    });

    it('still escalates — the write is unconditional, only the notify is gated', async () => {
      const { stored } = await runEscalation(flowName, row);
      // Ruling: `assign_senior_agent` stays in front of the gate. Gating the
      // escalation away alongside the notify would trade a loud dead run for a
      // silently un-escalated critical case.
      expect(stored.is_escalated, 'the ownerless case was not escalated').toBe(true);
      expect(stored.status, 'status not escalated').toBe('escalated');
      // `escalation_reason` must accompany `is_escalated` or the object's
      // `escalation_reason_required` validation rejects the whole write.
      expect(stored.escalation_reason, 'missing escalation_reason ⇒ write rejected').toBeTruthy();
      expect(stored.escalated_date, 'missing escalated_date ⇒ the flow re-fires forever').toBeTruthy();
    });

    it('addresses nobody rather than a phantom recipient', async () => {
      const { h } = await runEscalation(flowName, row);
      expect(
        h.notifications,
        `an ownerless case was notified: ${JSON.stringify(h.notifications.map((n) => n.to))}`,
      ).toHaveLength(0);
    });

    it('records the skip as a NAMED GATE, not as silence', async () => {
      const { result, nodeOf, gateOf } = await runEscalation(flowName, row);
      // The second half of "visible, not silent": besides the escalation
      // landing on the record, the engine's own run summary attributes the
      // skipped notification to the named gate — so run history shows WHY it
      // was skipped rather than just showing no notification at all.
      const gate = gateOf('check_owner');
      expect(gate, 'the gate is absent from the run summary').toBeTruthy();
      expect(gate?.targetNodeId).toBe('notify_team');
      expect(gate?.skipped, 'the gate did not account for the ownerless case').toBe(1);
      const notify = nodeOf('notify_team');
      expect(notify?.status, 'notify recorded a failure').not.toBe('failure');
      expect(notify?.runs ?? 0, 'notify ran for a case with no owner').toBe(0);
    });
  });

  it('notifies the outgoing owner when there IS one — the gate did not close on everybody', async () => {
    const { result, h, stored } = await runEscalation(flowName, criticalCase({ owner_id: 'rep1' }));
    expect(result.success, `the owned control failed: ${result.error ?? ''}`).toBe(true);
    expect(h.notifications).toHaveLength(1);
    expect(h.notifications[0].to).toEqual(['rep1']);
    // No phantom audience and no garbled body: a flow template cannot traverse
    // a lookup, so a dot-walked recipient interpolates to the literal
    // "undefined" — the fault this gate must not start hiding.
    expect(JSON.stringify(h.notifications[0]), 'a template resolved to "undefined"').not.toContain('undefined');
    expect(h.notifications[0].topic).toBe('case_escalated');
    expect(stored.is_escalated).toBe(true);
  });

  it('opens for a NUMERIC owner id — the string() wrap, not a bare .trim()', async () => {
    // Pins the `string(...)` wrap specifically. A bare `.trim()` / `.matches()`
    // on a non-string id fails with `no matching overload`, which is a THROWN
    // condition — the very fault mode this gate exists to remove, reintroduced
    // on a different input.
    const { result, h } = await runEscalation(flowName, criticalCase({ owner_id: 42 }));
    expect(result.success, `a numeric owner id aborted the run: ${result.error ?? ''}`).toBe(true);
    expect(h.notifications.map((n) => n.to), 'a reachable numeric owner was gated away').toEqual([['42']]);
  });

  it('survives the case row being gone by the time get_case reads it', async () => {
    // `get_record` with no match sets the output variable to `null` — the key
    // is PRESENT holding null — so `has(vars.caseRecord)` answers true and the
    // NEXT term has to survive a null base. Measured: `has()` on a null base
    // answers `false` rather than aborting, so `has(vars.caseRecord.owner_id)`
    // closes this shape on its own. An extra `vars.caseRecord != null` term
    // was drafted for it, measured inert on every shape, and removed.
    const { result, h } = await runEscalation(flowName, null, criticalCase({ owner_id: 'rep1' }));
    expect(result.success, `a vanished case row aborted the run: ${result.error ?? ''}`).toBe(true);
    expect(h.notifications, 'notified about a case that is not there').toHaveLength(0);
  });
});

describe('the escalation write stays in front of the gate (#1430 ruling)', () => {
  it('routes assign_senior_agent unconditionally and gates only notify_team', () => {
    const edges = (CaseEscalationFlow.edges ?? []) as Rec[];
    const intoGate = edges.filter((e) => e.target === 'check_owner');
    const outOfGate = edges.filter((e) => e.source === 'check_owner');
    // Structural, because it is a RULING and not an emergent property: any
    // future edit that moves the escalation behind the gate fails here rather
    // than silently shipping un-escalated critical cases.
    expect(intoGate.map((e) => e.source), 'the gate is no longer fed by the escalation write').toEqual(['assign_senior_agent']);
    expect(intoGate.every((e) => !e.condition), 'the escalation write was put behind a condition').toBe(true);
    expect(outOfGate.map((e) => e.target), 'the gate no longer guards exactly the notify').toEqual(['notify_team']);
    expect(outOfGate.every((e) => Boolean(e.condition)), 'the gate stopped gating').toBe(true);
    // The insert-time twin rewrites nodes by id and inherits these edges, so
    // both flows are covered by the one assertion — pin that inheritance.
    expect(CaseEscalationOnCreateFlow.edges).toBe(CaseEscalationFlow.edges);
  });
});
