// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { CloseCaseFlow, EscalateCaseFlow } from '../src/flows/case-actions.flow';
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
 */

const openCase = (over: Rec = {}): Rec => ({
  id: 'c1', case_number: 'CASE-1', status: 'new', priority: 'medium',
  is_escalated: false, is_closed: false, owner: 'agent1', ...over,
});

/** Start a screen flow and resume it with the values the screen collects. */
async function runScreen(
  flowName: string,
  flow: Rec,
  seed: Rec[],
  screen: Rec,
): Promise<ReturnType<typeof makeFlowHarness>> {
  const h = makeFlowHarness({ [flowName]: flow as never }, { crm_case: seed });
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

  it('flags, re-prioritises and stamps the case from the collected reason', async () => {
    const h = await runScreen('escalate_case', EscalateCaseFlow as unknown as Rec, [openCase()], {
      recordId: 'c1', reason: 'Customer threatening churn',
    });

    const updated = h.store.crm_case[0];
    expect(updated.is_escalated).toBe(true);
    expect(updated.status).toBe('escalated');
    expect(updated.priority).toBe('critical');
    expect(updated.escalation_reason).toBe('Customer threatening churn');
    expect(updated.escalated_date, 'escalated_date suppresses a double-fire').toBeTruthy();
  });

  it('always supplies the reason its validation rule requires', async () => {
    // `escalation_reason_required` rejects any write that flips is_escalated
    // without a reason, which silently aborted the action.
    const h = await runScreen('escalate_case', EscalateCaseFlow as unknown as Rec, [openCase()], {
      recordId: 'c1', reason: 'Breach',
    });
    const updated = h.store.crm_case[0];
    expect(updated.is_escalated && !!updated.escalation_reason).toBe(true);
  });

  it('stamps escalated_date so the automatic escalation flow does not re-fire', async () => {
    // `case_escalation`'s start condition is `escalated_date == null`; without
    // this stamp the record-change flow escalates the case a second time.
    const h = await runScreen('escalate_case', EscalateCaseFlow as unknown as Rec, [openCase()], {
      recordId: 'c1', reason: 'Breach',
    });
    expect(h.store.crm_case[0].escalated_date).toBeTruthy();
  });
});

describe('close_case — screen action', () => {
  it('seeds its input from the console’s `recordId` contract', () => {
    const names = (CloseCaseFlow.variables ?? []).map((v) => v.name);
    expect(names).toContain('recordId');
  });

  it('closes the case and records the resolution', async () => {
    const h = await runScreen('close_case', CloseCaseFlow as unknown as Rec, [openCase()], {
      recordId: 'c1', resolution: 'Replaced the faulty unit',
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
      { recordId: 'c1', resolution: 'Done' },
    );
    const other = h.store.crm_case.find((c) => c.id === 'c2')!;
    expect(other.status).toBe('new');
    expect(other.is_closed).toBe(false);
  });
});
