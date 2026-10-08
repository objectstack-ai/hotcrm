// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { ClaimCaseFlow, CloseCaseFlow, EscalateCaseFlow } from '../src/service/flows/case-actions.flow';
import { CaseEscalationStampFlow } from '../src/service/flows/case-escalation-stamp.flow';
import { hotcrmStack, signUpPerson, recordEngineWrites, guestInsert, type Person } from './helpers/verify-stack';

type Rec = Record<string, any>;

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
 * split — on the shipped app booted by `@objectstack/verify`, a service agent
 * starting each flow on their case (`flows.run`) and submitting its screen
 * (`flows.resume`). The write ORDER and the ruling's premise (a callee's own
 * `runAs` governs its writes) are pinned in
 * `test/readonly-write-semantics.test.ts`.
 */

let verify: VerifyStack;
let agent: Person;
let accountId: string;
let k = 0;
/** Unowned open cases for the claim block — see `unownedCase` below. */
const UNOWNED_CASES = 5;
const unowned: Rec[] = [];
beforeAll(async () => {
  verify = await hotcrmStack();
  // The agent's grants first, their place on the `service_agent` rota LAST:
  // the claim block's unowned cases are written while the rota is empty.
  agent = await signUpPerson(verify, 'agent@flow-case-actions.test', {
    name: 'Case Agent', permissionSets: ['service_agent'],
  });
  const [account] = await verify.seed('crm_account', [{ name: 'Case Actions Co', owner_id: agent.id }]);
  accountId = String(account!.id);
  for (let i = 0; i < UNOWNED_CASES; i++) {
    unowned.push(await guestInsert(verify, 'crm_case', {
      subject: `Unowned ${i}`, description: 'Came in through the web form.',
      status: 'new', priority: 'medium',
    }));
  }
  await verify.seed('sys_user_position', [{ user_id: agent.id, position: 'service_agent' }]);
  // The triage grant (`case_unassigned_triage_sharing`) expands its
  // `service_agent` recipients when it is evaluated, and the cases above were
  // written while that position was empty. Reconcile it now that the agent
  // holds it — the reconcile the platform runs on every boot. The sharing
  // service is a kernel service the handle does not front, so it is driven
  // directly, as `test/unassigned-case-triage-reach.test.ts` does.
  await verify.kernel.getService<Rec>('sharingRules').evaluateRule('case_unassigned_triage_sharing', { isSystem: true });
}, 120_000);

/** A new, medium-priority case the agent opened and works. */
const openCase = (over: Rec = {}): Promise<Rec> =>
  verify.hooks.run('crm_case', 'insert', {
    subject: `Printer on fire ${++k}`, description: 'It is on fire.', crm_account: accountId,
    status: 'new', priority: 'medium', ...over,
  }, { as: agent.token });

/** The stored case, read fresh. */
const stored = async (id: string): Promise<Rec> => (await verify.rows('crm_case', { id }))[0]!;

/**
 * Start a screen flow on `caseId` as the agent and resume it with the values the
 * screen collects.
 *
 * `screen` carries the screen's DECLARED fields and nothing else: `recordId` is
 * seeded once on the trigger, and from 17.0.0-rc.2 a resume that carries a key
 * the screen never declared is refused with `INVALID_SCREEN_INPUT` (#4477). A
 * `subflow` node resolves its callee by name off the engine's registry — the
 * real one, where `case_escalation_stamp` is registered beside it.
 */
async function runScreen(flowName: string, caseId: string, screen: Rec): Promise<void> {
  const run = await verify.flows.run(flowName, { recordId: caseId }, { as: agent.token });
  expect(run.runId, `${flowName} did not start`).toBeTruthy();
  await verify.flows.resume(run, screen, { as: agent.token });
}

describe('escalate_case — screen action', () => {
  it('seeds its input from the console’s `recordId` contract', () => {
    const names = (EscalateCaseFlow.variables ?? []).map((v) => v.name);
    // A custom name (e.g. `caseId`) arrives undefined and the update matches
    // nothing — the button silently no-ops.
    expect(names, 'the console only seeds `recordId`').toContain('recordId');
  });

  it('flags, re-prioritises and stamps the case from the collected reason', async () => {
    const kase = await openCase();
    await runScreen('escalate_case', kase.id, { reason: 'Customer threatening churn' });

    // The end state is unchanged by the #1434 split — which is the point: the
    // agent sees the same result, only the privilege of each write differs.
    const updated = await stored(kase.id);
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
    const kase = await openCase();
    await runScreen('escalate_case', kase.id, { reason: 'Breach' });
    const updated = await stored(kase.id);
    expect(updated.is_escalated && !!updated.escalation_reason).toBe(true);
  });

  it('stamps escalated_date so the automatic escalation flow does not re-fire', async () => {
    // `case_escalation`'s start condition is `escalated_date == null`; without
    // this stamp the record-change flow escalates the case a second time.
    const kase = await openCase();
    await runScreen('escalate_case', kase.id, { reason: 'Breach' });
    expect((await stored(kase.id)).escalated_date).toBeTruthy();
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
    const kase = await openCase({ escalation_reason: 'Breach' });
    // No runId assertion here: this flow declares no screen, so it runs to
    // completion synchronously and the engine returns no paused run to resume
    // (unlike the screen flows above). The stored row is the evidence it ran —
    // the case was opened with `is_escalated: false`, so a flow that never
    // executed leaves it false and the assertions below fail.
    expect(kase.is_escalated).toBe(false);
    await verify.flows.run(CaseEscalationStampFlow.name, { recordId: kase.id }, { as: agent.token });
    const updated = await stored(kase.id);
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
    const kase = await openCase();
    await runScreen('close_case', kase.id, { resolution: 'Replaced the faulty unit' });

    const updated = await stored(kase.id);
    expect(updated.status).toBe('closed');
    expect(updated.is_closed).toBe(true);
    expect(updated.resolution).toBe('Replaced the faulty unit');
  });

  it('leaves other cases untouched', async () => {
    const kase = await openCase();
    const neighbour = await openCase();
    await runScreen('close_case', kase.id, { resolution: 'Done' });
    const other = await stored(neighbour.id);
    expect(other.status).toBe('new');
    expect(other.is_closed).toBe(false);
  });
});

/**
 * `claim_case` (#1144) — the button over the claim seam.
 *
 * The flow is NOT a second writer of ownership: its one write is the status
 * the agent picked, and `case_self_claim` (`src/service/objects/_case-assignment.ts`)
 * — the seam — stamps the CALLER as owner inside that same write. On the real
 * engine both happen in one update, so the stored row cannot tell them apart;
 * what tells them apart is the payload the FLOW handed the engine, read off
 * the engine's own `update` before its hooks write into it
 * (`recordEngineWrites`). That payload must carry no `owner_id` — and the seam
 * yields to any payload that does (`'owner_id' in input` returns early), so a
 * flow that wrote ownership itself would silently replace the caller-only
 * stamp.
 *
 * The positive half at the seam's own boundaries — every guard, both row
 * shapes — runs in `test/unassigned-case-triage-reach.test.ts`, which owns the
 * seam; `claim-case-one-owner-writer` guards the flow's field map as metadata.
 * This file owns the button.
 *
 * The unowned cases are written before anyone holds the `service_agent`
 * position (see `beforeAll`): `case_auto_assign` round-robins a new case onto
 * that pool, so with the agent on it there would be nothing unowned to claim.
 * That is the first-install state #596 describes — an empty rota is the norm.
 */
const unownedCase = async (): Promise<Rec> => {
  const kase = unowned.shift();
  if (!kase) throw new Error('raise UNOWNED_CASES: the claim block used more unowned cases than beforeAll wrote');
  expect(kase.owner_id ?? null, 'the fixture case already has an owner').toBeNull();
  return kase;
};

/** Claim `caseId` to `claimStatus` as the agent; return what the flow handed the engine for it. */
async function claim(caseId: string, claimStatus: string): Promise<Rec[]> {
  const engine = recordEngineWrites(verify);
  try {
    await runScreen('claim_case', caseId, { claimStatus });
  } finally {
    engine.restore();
  }
  return engine.of('crm_case', 'update')
    .filter((w) => (w.args[2] as Rec | undefined)?.where?.id === caseId)
    .map((w) => w.args[1] as Rec);
}

describe('claim_case — screen action', () => {
  it('seeds its input from the console’s `recordId` contract', () => {
    const names = (ClaimCaseFlow.variables ?? []).map((v) => v.name);
    expect(names, 'the console only seeds `recordId`').toContain('recordId');
  });

  it('moves the case to the status the agent picked, and writes nothing else', async () => {
    const kase = await unownedCase();
    const payloads = await claim(kase.id, 'in_progress');

    expect(payloads.length, 'claim_case wrote nothing to the case').toBeGreaterThan(0);
    for (const payload of payloads) {
      expect(
        payload,
        'claim_case wrote ownership itself. The status move is the whole write; the seam owns ' +
          '`owner_id` and stamps the CALLER (see test/unassigned-case-triage-reach.test.ts).',
      ).not.toHaveProperty('owner_id');
      expect(payload, 'claim_case touched the lifecycle flag').not.toHaveProperty('is_closed');
    }
    const updated = await stored(kase.id);
    expect(updated.status).toBe('in_progress');
    // …and the seam did its half: the caller, and only the caller, owns it now.
    expect(updated.owner_id).toBe(agent.id);
    expect(Boolean(updated.is_closed), 'the claim closed the case').toBe(false);
  });

  it('carries every status the seam reads as a claim, not just the default', async () => {
    // The picker offers three, and a flow that only ever moved to the default
    // would pass the case above while quietly ignoring the other two.
    for (const status of ['waiting_customer', 'waiting_support'] as const) {
      const kase = await unownedCase();
      const payloads = await claim(kase.id, status);
      expect((await stored(kase.id)).status, `claim to ${status} did not land`).toBe(status);
      for (const payload of payloads) expect(payload).not.toHaveProperty('owner_id');
    }
  });

  it('leaves other cases untouched', async () => {
    const kase = await unownedCase();
    const neighbour = await unownedCase();
    await claim(kase.id, 'in_progress');
    const other = await stored(neighbour.id);
    expect(other.status).toBe('new');
    expect(other.owner_id ?? null).toBeNull();
  });
});
