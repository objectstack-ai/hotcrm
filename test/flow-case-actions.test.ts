// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { ClaimCaseFlow, CloseCaseFlow, EscalateCaseFlow } from '../src/flows/case-actions.flow';
import { CaseEscalationStampFlow } from '../src/flows/case-escalation-stamp.flow';
import { makeFlowHarness, type Rec } from './helpers/flow-harness';

/**
 * Runtime tests for the three case screen-flow actions.
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
    { [flowName]: flow as never, ...(alsoRegister as Record<string, never>) },
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

/**
 * `claim_case` (#1144) — the button over the claim seam.
 *
 * ⚠️ Read what this harness can and cannot say. It runs FLOWS against a fake
 * store with **no hooks at all**, which is exactly why it is the right place to
 * measure the negative half of this feature: after a claim run, the case's
 * `owner_id` is still absent, because in this harness nothing exists that could
 * write it. That is the flow declining to be a second writer of ownership,
 * observed rather than asserted about metadata.
 *
 * ⛔ It is therefore NOT evidence that a claim CLAIMS. The positive half —
 * `case_self_claim` stamping the caller onto the row — runs against a real
 * ObjectQL kernel on both drivers in
 * `test/unassigned-case-triage-reach.test.ts`, which owns the seam. This file
 * owns the button.
 *
 * ⚠️ "Still unowned" reads as `null`, not `undefined`: this harness hands back
 * every DECLARED column and normalises an absent one to `null`
 * (`test/flow-harness-declared-columns.test.ts` pins that). So the assertion is
 * that the column holds no user — not that the key is missing.
 */
const unownedCase = (over: Rec = {}): Rec => {
  const rec = openCase(over);
  // The ABSENT-key shape, not `owner_id: null` — `driver-memory` stores only
  // the columns a row was written with, and an ownerless case is how a
  // web-to-case submission actually lands.
  delete rec.owner_id;
  return rec;
};

describe('claim_case — screen action', () => {
  it('seeds its input from the console’s `recordId` contract', () => {
    const names = (ClaimCaseFlow.variables ?? []).map((v) => v.name);
    expect(names, 'the console only seeds `recordId`').toContain('recordId');
  });

  it('moves the case to the status the agent picked, and writes nothing else', async () => {
    const h = await runScreen('claim_case', ClaimCaseFlow as unknown as Rec, [unownedCase()], {
      claimStatus: 'in_progress',
    });

    const updated = h.store.crm_case[0];
    expect(updated.status).toBe('in_progress');
    // The whole point, measured on a store with no hooks: the FLOW did not put
    // an owner on this row. In production `case_self_claim` does, from the
    // caller's identity — which is a thing this harness has no way to fake and
    // deliberately does not pretend to.
    expect(
      updated.owner_id ?? null,
      'claim_case wrote ownership itself. The status move is the whole write; the seam owns ' +
        '`owner_id` and stamps the CALLER (see test/unassigned-case-triage-reach.test.ts).',
    ).toBeNull();
    expect(updated.is_closed, 'claim_case touched the lifecycle flag').toBe(false);
  });

  it('carries every status the seam reads as a claim, not just the default', async () => {
    // The picker offers three, and a flow that only ever moved to the default
    // would pass the case above while quietly ignoring the other two.
    for (const status of ['waiting_customer', 'waiting_support'] as const) {
      const h = await runScreen('claim_case', ClaimCaseFlow as unknown as Rec, [unownedCase()], {
        claimStatus: status,
      });
      expect(h.store.crm_case[0].status, `claim to ${status} did not land`).toBe(status);
      expect(h.store.crm_case[0].owner_id ?? null).toBeNull();
    }
  });

  it('leaves other cases untouched', async () => {
    const h = await runScreen(
      'claim_case',
      ClaimCaseFlow as unknown as Rec,
      [unownedCase(), unownedCase({ id: 'c2', case_number: 'CASE-2' })],
      { claimStatus: 'in_progress' },
    );
    const other = h.store.crm_case.find((c) => c.id === 'c2')!;
    expect(other.status).toBe('new');
    expect(other.owner_id ?? null).toBeNull();
  });
});
