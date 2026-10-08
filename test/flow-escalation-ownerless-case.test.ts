// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { CaseEscalationFlow, CaseEscalationOnCreateFlow } from '../src/service/flows/case-escalation.flow';
import {
  hotcrmStack, hotcrmMemoryStack, signUpPerson, guestInsert, systemUpdate, flowRuns, notificationsTo,
  runRecordFlow, type Person,
} from './helpers/verify-stack';

type Rec = Record<string, any>;

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
 *
 * Runs on the shipped app booted by `@objectstack/verify`: a real write fires
 * the bound flow, and its verdict is read where the platform records it — the
 * run history (`sys_automation_run`: `status`, `error`, the summary's node and
 * gate accounting), the case row, and the notification outbox. A run's
 * terminal failure is RECORDED there, never thrown at the writer, so "the
 * save did not throw" is no evidence of a healthy run.
 */

type FlowName = 'case_escalation' | 'case_escalation_on_create';
const FLOW_NAMES: FlowName[] = ['case_escalation', 'case_escalation_on_create'];

let sql: VerifyStack;
let sparse: VerifyStack;
let agent: Person;
let k = 0;
beforeAll(async () => {
  sql = await hotcrmStack();
  sparse = await hotcrmMemoryStack();
  // An agent with the service grants but NOT on the `service_agent` rota: the
  // cases below are raised while that rota is empty, so `case_auto_assign`
  // leaves them ownerless — and a case the agent opens stays theirs.
  agent = await signUpPerson(sql, 'agent@flow-escalation-ownerless-case.test', {
    name: 'Outgoing Owner', permissionSets: ['service_agent'],
  });
}, 120_000);

/**
 * A critical case that fires `flowName`, raised the way that flow is reached:
 *
 *  - `case_escalation_on_create` — a web-to-case submission (a GUEST insert)
 *    arriving critical. A guest submission carries no owner;
 *  - `case_escalation` — an ownerless case already in the queue, given
 *    `owner` by a system write (a backfill or an integration — a person's
 *    write is held to a real user, see below), then raised to critical by a
 *    system write.
 *
 * Returns the case id and the flow's run history for it.
 */
async function raise(stack: VerifyStack, flowName: FlowName, owner?: unknown) {
  const doc = { subject: `Server down ${++k}`, description: 'Everything is on fire.', status: 'new' };
  let id: string;
  if (flowName === 'case_escalation_on_create') {
    id = String((await guestInsert(stack, 'crm_case', { ...doc, priority: 'critical' })).id);
  } else {
    id = String((await guestInsert(stack, 'crm_case', { ...doc, priority: 'medium' })).id);
    if (owner !== undefined) await systemUpdate(stack, 'crm_case', { id, owner_id: owner });
    await systemUpdate(stack, 'crm_case', { id, priority: 'critical' });
  }
  const runs = await flowRuns(stack, flowName, id);
  expect(runs, `${flowName} did not run for the critical case`).toHaveLength(1);
  const run = runs[0]!;
  const [stored] = await stack.rows('crm_case', { id });
  return {
    id, run, stored: stored!,
    nodeOf: (nodeId: string) => (run.summary?.nodes ?? []).find((n: Rec) => n.nodeId === nodeId),
    gateOf: (nodeId: string) => (run.summary?.gates ?? []).find((g: Rec) => g.nodeId === nodeId),
  };
}

/**
 * The shapes of "no owner", each reachable in production and each with its
 * OWN failure mode against a weaker predicate — which is why the gate is four
 * terms and none of them is decoration.
 */
const OWNERLESS: Record<string, { stack: () => VerifyStack; owner?: unknown; flows: FlowName[] }> = {
  // The key is ABSENT. A driver row never written with the column is sparse
  // (driver-memory / driver-mongodb store only the columns a row was written
  // with) — an unguarded `vars.caseRecord.owner_id != null` aborts here with
  // `No such key` and takes the run down exactly the way the empty slate did.
  'owner column never written (sparse datasource)': { stack: () => sparse, flows: FLOW_NAMES },
  // An explicit NULL — the nullable column, as a SQL datasource stores an
  // ownerless row. `string(null)` has no overload, so the `!= null` term must
  // short-circuit before the wrap.
  'owner NULL (SQL datasource)': { stack: () => sql, flows: FLOW_NAMES },
  // BLANK. The notify node's own `toStringList` trims and drops falsy entries,
  // so '   ' reaches it as the same empty slate as an absent key. A system
  // write stores it as given (a person's write is refused — see below). A
  // gate testing only `!= ""` opens here — `'   ' != ""` is TRUE in CEL — and
  // reproduces the defect one input narrower. Only `case_escalation` can meet
  // it: the insert-time twin is reached by a guest submission, which carries
  // no owner at all.
  'owner blank whitespace (system-written)': { stack: () => sql, owner: '   ', flows: ['case_escalation'] },
};

describe.each(FLOW_NAMES)('%s — an ownerless critical case (#1430)', (flowName) => {
  const shapes = Object.entries(OWNERLESS).filter(([, shape]) => shape.flows.includes(flowName));
  describe.each(shapes)('%s', (_shape, shape) => {
    it('completes the run — it is not recorded as a terminal failure', async () => {
      const { run } = await raise(shape.stack(), flowName, shape.owner);
      expect(run.status, `the run failed: ${run.error ?? ''}`).toBe('completed');
      expect(run.error ?? '', 'the notify error is back').not.toContain('at least one recipient');
    });

    it('still escalates — the write is unconditional, only the notify is gated', async () => {
      const { stored } = await raise(shape.stack(), flowName, shape.owner);
      // Ruling: `assign_senior_agent` stays in front of the gate. Gating the
      // escalation away alongside the notify would trade a loud dead run for a
      // silently un-escalated critical case.
      expect(Boolean(stored.is_escalated), 'the ownerless case was not escalated').toBe(true);
      expect(stored.status, 'status not escalated').toBe('escalated');
      // `escalation_reason` must accompany `is_escalated` or the object's
      // `escalation_reason_required` validation rejects the whole write.
      expect(stored.escalation_reason, 'missing escalation_reason ⇒ write rejected').toBeTruthy();
      expect(stored.escalated_date, 'missing escalated_date ⇒ the flow re-fires forever').toBeTruthy();
    });

    it('addresses nobody rather than a phantom recipient', async () => {
      const { nodeOf } = await raise(shape.stack(), flowName, shape.owner);
      // The notify node never ran, so it addressed nobody — not an outbox row
      // to a blank or absent recipient.
      expect(nodeOf('notify_team')?.runs ?? 0, 'an ownerless case was notified').toBe(0);
    });

    it('records the skip as a NAMED GATE, not as silence', async () => {
      const { run, nodeOf, gateOf } = await raise(shape.stack(), flowName, shape.owner);
      // The gate accounting below is only meaningful on a run that COMPLETED:
      // a summary from a failed run would satisfy every assertion in this body
      // while the thing under test was broken. So state that first.
      expect(run.status, `the run failed: ${run.error ?? ''}`).toBe('completed');
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
    // The agent's own case, raised by the agent: opened critical
    // (insert-time twin), or opened medium and raised to critical.
    const opened = await sql.hooks.run('crm_case', 'insert', {
      subject: `Owned ${++k}`, description: 'Mine.', status: 'new',
      priority: flowName === 'case_escalation_on_create' ? 'critical' : 'medium',
    }, { as: agent.token });
    expect(opened.owner_id, 'the fixture case is not the agent’s').toBe(agent.id);
    if (flowName === 'case_escalation') {
      await sql.hooks.run('crm_case', 'update', { id: opened.id, priority: 'critical' }, { as: agent.token });
    }
    const [run] = await flowRuns(sql, flowName, opened.id);
    expect(run?.status, `the owned control failed: ${run?.error ?? ''}`).toBe('completed');
    const sent = (await notificationsTo(sql, agent.id, 'case_escalated'))
      .filter((n) => n.payload?.actionUrl === `/crm_case/${opened.id}`);
    expect(sent).toHaveLength(1);
    // No phantom audience and no garbled body: a flow template cannot traverse
    // a lookup, so a dot-walked recipient interpolates to the literal
    // "undefined" — the fault this gate must not start hiding.
    expect(JSON.stringify(sent[0]), 'a template resolved to "undefined"').not.toContain('undefined');
    const [stored] = await sql.rows('crm_case', { id: opened.id });
    expect(Boolean(stored!.is_escalated)).toBe(true);
  });

  if (flowName === 'case_escalation') {
    it('opens for an owner id written as a number — the string() wrap, not a bare .trim()', async () => {
      // Pins that a non-blank id the gate cannot `.trim()` natively does not
      // abort it. On the engine the column is text, so a system write of the
      // number 42 is stored — and read back by the flow — as "42"; the gate
      // must open for it and address it, not throw `no matching overload`.
      const { run, nodeOf } = await raise(sql, flowName, 42);
      expect(run.status, `a numeric owner id aborted the run: ${run.error ?? ''}`).toBe('completed');
      expect(nodeOf('notify_team')?.runs, 'a reachable numeric owner was gated away').toBe(1);
      expect(await notificationsTo(sql, '42', 'case_escalated')).toHaveLength(1);
    });
  }

  it('a case row gone by the time the flow runs: the escalation write fails, and nobody is notified', async () => {
    // The gate itself survives a null base: `get_record` with no match sets the
    // output variable to `null` — the key is PRESENT holding null — so
    // `has(vars.caseRecord)` answers true and the NEXT term has to survive it.
    // Measured: `has()` on a null base answers `false` rather than aborting, so
    // `has(vars.caseRecord.owner_id)` closes this shape on its own. An extra
    // `vars.caseRecord != null` term was drafted for it, measured inert on
    // every shape, and removed.
    //
    // On the real engine the run never gets that far: `assign_senior_agent`
    // updates the case by id, and an update addressed to a row that is not
    // there is REFUSED (`Record … not found`), so the run is recorded failed at
    // the escalation write — the gate is not what stops it, and no notification
    // about a case that is not there goes out.
    //
    // No write can stage a row that vanishes between its trigger and the
    // flow's read, so the flow is handed a trigger record the engine does not
    // hold (`runRecordFlow`).
    const ghost = {
      id: `ghost_${++k}`, case_number: 'CASE-GHOST', subject: 'Server down', priority: 'critical',
      status: 'new', is_closed: false, owner_id: agent.id,
    };
    const result = await runRecordFlow(sql, flowName, 'crm_case', ghost);
    expect(result.success, 'the escalation of a case that is not there succeeded').toBe(false);
    expect(String(result.error)).toContain('assign_senior_agent');
    expect(String(result.error)).toContain('not found');
    expect(
      (await notificationsTo(sql, agent.id, 'case_escalated')).filter((n) => n.payload?.actionUrl === `/crm_case/${ghost.id}`),
      'notified about a case that is not there',
    ).toHaveLength(0);
  });
});

describe('a blank owner is a system write\'s shape, never a person\'s', () => {
  it('a person cannot give a case an owner that is not a user', async () => {
    // Why the blank shape above is system-written: the engine holds a
    // person's write to a real `sys_user` row, so a blank, numeric or phantom
    // owner is refused there — even for the admin — and only a system write
    // (backfill, integration) can leave one behind.
    const admin = await sql.signIn();
    for (const owner of ['   ', 42]) {
      await expect(
        sql.hooks.run('crm_case', 'insert', {
          subject: `Phantom ${++k}`, description: 'x', status: 'new', priority: 'medium', owner_id: owner,
        }, { as: admin }),
        `owner ${JSON.stringify(owner)} was accepted from a person`,
      ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
    }
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
