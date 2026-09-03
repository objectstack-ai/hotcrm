// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { CloseCaseFlow, EscalateCaseFlow } from '../src/flows/case-actions.flow';
import { CaseEscalationStampFlow } from '../src/flows/case-escalation-stamp.flow';
import { makeFlowHarness, type Rec } from './helpers/flow-harness';

/**
 * Runtime tests for the two case screen-flow actions.
 *
 * These are the console's record-action buttons. Two things about them are
 * silently breakable and neither is visible to metadata validation:
 *
 *  1. The input variable MUST be named `recordId` — the console's flow-action
 *     contract seeds only that name, so a renamed variable arrives `undefined`
 *     and the update targets `{ id: undefined }`, matching nothing.
 *  2. `escalate_case` must write `escalation_reason` alongside `is_escalated`,
 *     or the object's `escalation_reason_required` validation (severity: error)
 *     rejects the whole write and the button appears to do nothing.
 *
 * ⭐ Since #1434 the escalation is TWO flows, and these cases run the pair.
 * `escalate_case` (`runAs: 'user'`) writes what the agent supplies, then calls
 * `case_escalation_stamp` (`runAs: 'system'`) through a `subflow` node to write
 * the two `readonly` stamps. The composition is what is measured here — that
 * the child is reached and the record ends up in the same state as before the
 * split. ⚠️ NOT measured here: the readonly strip itself. This harness has no
 * readonly semantics (see `test/helpers/flow-harness.ts`), so a stamp landing
 * here is NOT evidence that it would land in production. That is measured
 * against a real ObjectQL in `test/readonly-write-semantics.test.ts`, which is
 * also where the ruling's premise (a callee's own `runAs` governs its writes)
 * and the write ORDER are pinned.
 */

const openCase = (over: Rec = {}): Rec => ({
  id: 'c1', case_number: 'CASE-1', status: 'new', priority: 'medium',
  is_escalated: false, is_closed: false, owner_id: 'agent1', ...over,
});

/**
 * Start a screen flow and resume it with the values the screen collects.
 *
 * `screen` carries the screen's DECLARED fields and nothing else: `recordId` is
 * seeded once on the trigger, and from 17.0.0-rc.2 a resume that carries a key
 * the screen never declared is refused with `INVALID_SCREEN_INPUT` (#4477).
 */
async function runScreen(
  flowName: string,
  flow: Rec,
  seed: Rec[],
  screen: Rec,
  /**
   * Flows the one under test CALLS. A `subflow` node resolves its target by
   * name off the engine's registry, so an unregistered callee fails the node —
   * `escalate_case` must be run with `case_escalation_stamp` alongside it.
   */
  alsoRegister: Record<string, Rec> = {},
): Promise<ReturnType<typeof makeFlowHarness>> {
  const h = makeFlowHarness(
    { [flowName]: flow as never, ...(alsoRegister as never) },
    { crm_case: seed },
  );
  const runId = await h.run(flowName, { recordId: 'c1' });
  expect(runId, `${flowName} did not start`).toBeTruthy();
  await h.resume(runId!, screen);
  return h;
}

describe('escalate_case — screen action', () => {
  it('seeds its input from the console’s `recordId` contract', () => {
    const names = (EscalateCaseFlow.variables ?? []).map((v) => v.name);
    // A custom name (e.g. `caseId`) arrives undefined and the update matches
    // nothing — the button silently no-ops.
    expect(names, 'the console only seeds `recordId`').toContain('recordId');
  });

  /** `escalate_case` plus the callee its `subflow` node names (#1434). */
  const escalatePair = { [CaseEscalationStampFlow.name]: CaseEscalationStampFlow as unknown as Rec };

  it('flags, re-prioritises and stamps the case from the collected reason', async () => {
    const h = await runScreen(
      'escalate_case', EscalateCaseFlow as unknown as Rec, [openCase()],
      { reason: 'Customer threatening churn' }, escalatePair,
    );

    // The end state is unchanged by the #1434 split — which is the point: the
    // agent sees the same result, only the privilege of each write differs.
    const updated = h.store.crm_case[0];
    expect(updated.is_escalated).toBe(true);
    expect(updated.status).toBe('escalated');
    expect(updated.priority).toBe('critical');
    expect(updated.escalation_reason).toBe('Customer threatening churn');
    expect(updated.escalated_date, 'escalated_date suppresses a double-fire').toBeTruthy();
  });

  it('always supplies the reason its validation rule requires', async () => {
    // `escalation_reason_required` rejects any write that flips is_escalated
    // without a reason, which silently aborted the action. Post-#1434 the two
    // are written by different flows, so the ORDER carries this: the reason
    // lands first and the stamp follows. Both orders are measured against a
    // real engine in `test/readonly-write-semantics.test.ts`.
    const h = await runScreen(
      'escalate_case', EscalateCaseFlow as unknown as Rec, [openCase()],
      { reason: 'Breach' }, escalatePair,
    );
    const updated = h.store.crm_case[0];
    expect(updated.is_escalated && !!updated.escalation_reason).toBe(true);
  });

  it('stamps escalated_date so the automatic escalation flow does not re-fire', async () => {
    // `case_escalation`'s start condition is `escalated_date == null`; without
    // this stamp the record-change flow escalates the case a second time.
    const h = await runScreen(
      'escalate_case', EscalateCaseFlow as unknown as Rec, [openCase()],
      { reason: 'Breach' }, escalatePair,
    );
    expect(h.store.crm_case[0].escalated_date).toBeTruthy();
  });

  it('reaches case_escalation_stamp through its subflow node, and nothing else', async () => {
    // Anti-vacuity for the three cases above: they would also pass if the
    // stamps were still written by the parent node. This asserts the parent
    // does NOT write them and the registered callee does — so a regression that
    // folded the stamp back into the user-context node (option A) is caught
    // here as well as in the readonly measurement.
    const parentWrites = (EscalateCaseFlow.nodes ?? [])
      .filter((n) => (n as Rec).type === 'update_record')
      .flatMap((n) => Object.keys((n as Rec).config?.fields ?? {}));
    expect(parentWrites).not.toContain('is_escalated');
    expect(parentWrites).not.toContain('escalated_date');

    const sub = (EscalateCaseFlow.nodes ?? []).find((n) => (n as Rec).type === 'subflow') as Rec;
    expect(sub?.config?.flowName).toBe(CaseEscalationStampFlow.name);
  });
});

describe('case_escalation_stamp — the elevated stamping subflow (#1434)', () => {
  it('is the ONE elevated flow, and writes only the two readonly stamps', () => {
    expect(CaseEscalationStampFlow.runAs, 'this flow exists to be the elevation').toBe('system');
    const writes = (CaseEscalationStampFlow.nodes ?? []).filter((n) => (n as Rec).type === 'update_record');
    expect(writes, 'one write, not a general-purpose system flow').toHaveLength(1);
    expect(Object.keys((writes[0] as Rec).config.fields).sort()).toEqual([
      'escalated_date', 'is_escalated',
    ]);
  });

  it('takes the record id from its caller', () => {
    const names = (CaseEscalationStampFlow.variables ?? []).map((v) => v.name);
    // Supplied by the parent's `subflow` config as `input: { recordId: … }`,
    // not by the console — this flow is never a record action itself.
    expect(names).toContain('recordId');
  });

  it('stamps the case when run directly', async () => {
    const h = makeFlowHarness(
      { [CaseEscalationStampFlow.name]: CaseEscalationStampFlow as never },
      { crm_case: [openCase({ escalation_reason: 'Breach' })] },
    );
    // No runId assertion here: this flow declares no screen, so it runs to
    // completion synchronously and the engine returns no paused run to resume
    // (unlike the screen flows above). The stored row is the evidence it ran —
    // the seed has `is_escalated: false`, so a flow that never executed leaves
    // it false and the assertions below fail.
    await h.run(CaseEscalationStampFlow.name, { recordId: 'c1' });
    const updated = h.store.crm_case[0];
    expect(updated.is_escalated).toBe(true);
    expect(updated.escalated_date).toBeTruthy();
    // ⛔ It must not touch the agent's own columns.
    expect(updated.escalation_reason).toBe('Breach');
    expect(updated.priority).toBe('medium');
  });
});

describe('close_case — screen action', () => {
  it('seeds its input from the console’s `recordId` contract', () => {
    const names = (CloseCaseFlow.variables ?? []).map((v) => v.name);
    expect(names).toContain('recordId');
  });

  it('closes the case and records the resolution', async () => {
    const h = await runScreen('close_case', CloseCaseFlow as unknown as Rec, [openCase()], {
      resolution: 'Replaced the faulty unit',
    });

    const updated = h.store.crm_case[0];
    expect(updated.status).toBe('closed');
    expect(updated.is_closed).toBe(true);
    expect(updated.resolution).toBe('Replaced the faulty unit');
  });

  it('leaves other cases untouched', async () => {
    const h = await runScreen(
      'close_case',
      CloseCaseFlow as unknown as Rec,
      [openCase(), openCase({ id: 'c2', case_number: 'CASE-2' })],
      { resolution: 'Done' },
    );
    const other = h.store.crm_case.find((c) => c.id === 'c2')!;
    expect(other.status).toBe('new');
    expect(other.is_closed).toBe(false);
  });
});
