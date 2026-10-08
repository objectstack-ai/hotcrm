// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { hotcrmStack, signUpPerson, guestInsert, systemUpdate, type Person } from './helpers/verify-stack';

type Rec = Record<string, any>;

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
 * Both branches therefore run on the shipped app booted by `@objectstack/verify`
 * — the real flow, the platform's automation engine and the app's real
 * `crm_case` hook chain — and differ ONLY in whether `sys_user_position` has a
 * `service_manager` in it, which is the one input the ruling turns on. The
 * EMPTY branch runs first; the pool is staffed for the NON-EMPTY one after.
 *
 * The sweep is started through the trigger door as the admin (`flows.run`),
 * and it processes EVERY breached case in the database — the boot's seed
 * cases included — so each branch first runs it once to SETTLE them (flagged,
 * they no longer match), then writes its own cases and runs it again. The
 * escalation follow-up task `case_status_side_effects` opens is real here too;
 * this file is about ownership and the alert, and
 * `test/hooks-runtime-service.test.ts` owns that hook.
 */

/**
 * UTC calendar throughout — `setUTCDate`, not `setDate`. Mixing local-calendar
 * arithmetic with UTC rendering lands one UTC day late across a DST
 * spring-forward, and no `TZ=UTC` run can tell the two spellings apart.
 * `test/helpers/verify-stack.ts`'s `daysFromNow` carries the full reasoning.
 */
const iso = (daysFromNow: number): string => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysFromNow);
  return d.toISOString();
};

/**
 * The shapes of "no owner" a write can leave: never written (a web-to-case
 * submission on an empty rota — NULL on this SQL datasource; the sparse
 * datasource's ABSENT key is run in `test/flow-sla-ownerless-case.test.ts`)
 * and BLANK ('   ', a system write's — `notify` trims before dropping, so it
 * is the same empty slate, and a gate that only tested null would let it
 * through and reopen the defect one input narrower).
 */
const OWNERLESS = ['c_unwritten', 'c_blank'] as const;

let verify: VerifyStack;
let admin: string;
let rep1: Person;
let rep2: Person;
let rep3: Person;
let k = 0;
beforeAll(async () => {
  verify = await hotcrmStack();
  admin = await verify.signIn();
  rep1 = await signUpPerson(verify, 'rep1@flow-sla-ownerless-assignment.test', { name: 'Rep One' });
  rep2 = await signUpPerson(verify, 'rep2@flow-sla-ownerless-assignment.test', { name: 'Rep Two' });
  rep3 = await signUpPerson(verify, 'rep3@flow-sla-ownerless-assignment.test', { name: 'Rep Three' });
}, 120_000);

/** A web-to-case submission, put in `state` by a system write. */
const caseIn = async (subject: string, state: Rec): Promise<string> => {
  const kase = await guestInsert(verify, 'crm_case', {
    subject: `${subject} ${++k}`, description: 'Came in through the web form.', status: 'new', priority: 'high',
  });
  await systemUpdate(verify, 'crm_case', { id: kase.id, ...state });
  return String(kase.id);
};

/**
 * Breached cases in a deliberate order: an owned control, the shapes of "no
 * owner", and an owned case BEHIND them all — plus a control that is not
 * breached. A fix that widened selection would pass every assertion and fail
 * that one.
 */
const seedCases = async () => ({
  c_owned: await caseIn('Owned breach', { status: 'in_progress', sla_due_date: iso(-3), owner_id: rep1.id }),
  c_unwritten: await caseIn('Owner never written', { sla_due_date: iso(-4) }),
  c_blank: await caseIn('Owner blank string', { sla_due_date: iso(-6), owner_id: '   ' }),
  // The blast-radius instrument: an ordinary owned breach behind the
  // ownerless rows, reachable only if none of them took the run down.
  c_after: await caseIn('Breach behind the ownerless ones', { status: 'in_progress', sla_due_date: iso(-7), owner_id: rep2.id }),
  c_future: await caseIn('Not due yet', { status: 'in_progress', sla_due_date: iso(+5), owner_id: rep3.id }),
});

/** Settle the database, write the cases, run the sweep; what it did. */
const runSweep = async (between: (ids: Record<string, string>) => Promise<void> = async () => undefined) => {
  await verify.flows.run('case_sla_monitor', {}, { as: admin });
  const ids: Record<string, string> = await seedCases();
  await between(ids);
  // A terminal failure is recorded, not thrown by the run — and the trigger
  // door turns a failed run into a refusal, so a dying sweep fails HERE.
  const result: Rec = await verify.flows.run('case_sla_monitor', {}, { as: admin });
  const byId: Record<string, Rec> = {};
  for (const [key, id] of Object.entries(ids)) byId[key] = (await verify.rows('crm_case', { id }))[0]!;
  const nodeOf = (id: string) => (result.summary?.nodes ?? []).find((n: Rec) => n.nodeId === id);
  // Selected by EDGE id, never by array position: the engine emits gate rows in
  // completion order, which differs run to run (measured — `b3` and `b5` swap).
  const gateOf = (edgeId: string) => (result.summary?.gates ?? []).find((g: Rec) => g.edgeId === edgeId);
  /**
   * Every delivery the messaging outbox holds about the case `key` names —
   * whatever its topic, whoever it is addressed to. The case is named by the
   * action URL the alert carries; that makes "the assigned owner is the one
   * notified" checkable as a per-case correspondence rather than as two set
   * memberships that happen to overlap: an implementation that assigned one
   * ownerless case and alerted the other's owner would satisfy every
   * set-shaped assertion and fail this one.
   */
  const alertsAbout = async (key: string) =>
    (await verify.rows('sys_notification_delivery', { channel: 'inbox' }))
      .filter((n) => n.payload?.actionUrl === `/crm_case/${ids[key]}`);
  const alertFor = async (key: string): Promise<string[]> =>
    (await alertsAbout(key)).map((n) => String(n.recipient_id));
  return { ids, result, byId, nodeOf, gateOf, alertsAbout, alertFor };
};
type Sweep = Awaited<ReturnType<typeof runSweep>>;

describe('pool EMPTY: a graceful no-op — unowned, unnotified, and the run survives', () => {
  let run: Sweep;
  beforeAll(async () => { run = await runSweep(); }, 120_000);

  it('leaves the ownerless breach unowned', () => {
    for (const id of OWNERLESS) {
      // ⛔ Not a fallback recipient and not a manager-chain dot-walk: with
      // nobody in the pool the sweep does NOTHING about ownership for this
      // case. Option B was refused precisely because a fallback resolves empty
      // on this repo's own demo data and re-enters notify's hard-failure path.
      //
      // "Unowned" is asserted as the notify node defines it — `String(v).trim()`
      // is falsy — rather than as `null`, because `c_blank` is written '   ' and
      // stays '   '. A rule written as `toBeNull()` would have called the
      // untouched blank a failure and hidden the one that matters: a POOL
      // MEMBER appearing in the column.
      const owner = run.byId[id]!.owner_id;
      expect(
        String(owner ?? '').trim(),
        `${id}: an empty pool invented an owner (${JSON.stringify(owner)})`,
      ).toBe('');
    }
  });

  it('skips the notification at a NAMED gate rather than in silence', async () => {
    const gate = run.gateOf('b5');
    expect(gate, 'the post-escalation gate is absent from the run summary').toBeTruthy();
    expect(gate?.nodeId).toBe('check_assigned');
    expect(gate?.targetNodeId).toBe('notify_team');
    // Run history says WHY the alerts did not go out, rather than showing
    // fewer notifications than cases and leaving the reader to infer it.
    expect(gate?.skipped, 'the gate did not account for the unplaceable cases').toBe(OWNERLESS.length);
    expect(run.nodeOf('notify_team')?.status, 'notify recorded a failure on the empty slate').toBe('success');
    // The two owned breaches still get theirs — an empty pool costs nobody
    // else their alert.
    expect([...await run.alertFor('c_owned'), ...await run.alertFor('c_after')].sort()).toEqual([rep1.id, rep2.id].sort());
    for (const id of OWNERLESS) expect(await run.alertsAbout(id), `${id} was alerted`).toHaveLength(0);
  });

  it('still records the breach on the unplaceable cases', () => {
    for (const id of OWNERLESS) {
      // The breach stays on the RECORD and in the run summary — visible in
      // views and reports, which is where a service manager finds it when the
      // bench that would have been assigned it is empty.
      expect(Boolean(run.byId[id]!.is_sla_violated), `${id}: ownerless breach was not flagged`).toBe(true);
      expect(run.byId[id]!.status, `${id}: status not escalated`).toBe('escalated');
    }
  });

  it('completes the run — ⛔ an empty pool is never a hard failure', () => {
    expect(run.result.success, `the scheduled run failed: ${run.result.error ?? ''}`).toBe(true);
    expect(run.result.status, 'a terminal failure was recorded').not.toBe('failed');
    expect(run.nodeOf('loop_cases')?.status, 'the loop container failed').toBe('success');
    expect(run.nodeOf('flag_breach')?.runs, 'a case was skipped by the empty-pool path').toBe(4);
  });
});

describe('pool NON-EMPTY: the ownerless breach is assigned, then that owner is alerted', () => {
  /**
   * The pool the assignment reads: holders of `service_manager` in
   * `sys_user_position`.
   *
   * TWO holders, and a `service_agent` holder beside them. Both are
   * load-bearing: a single-holder pool cannot tell "read the pool" apart from
   * "write a constant", and the agent row is what fails a read that took every
   * row in the table instead of filtering by position. The pool is staffed
   * AFTER this branch's cases are written: a case written while a
   * `service_agent` holds the rota is round-robined onto them by
   * `case_auto_assign`, and would not be ownerless at all.
   *
   * ⚠️ The pin below deliberately does NOT name which manager gets which case.
   * Least-loaded is recomputed per case against LIVE counts, so the sweep
   * spreads its breaches across the bench. Pinning a name would pin the
   * arithmetic of the fixture rather than the contract, and
   * `test/case-assignment.test.ts` already owns the least-loaded rule itself.
   */
  let run: Sweep;
  let managers: string[];
  let agent: Person;
  let busy: string;
  beforeAll(async () => {
    const mgrBusy = await signUpPerson(verify, 'mgr.busy@flow-sla-ownerless-assignment.test', { name: 'Busy Manager' });
    const mgrFree = await signUpPerson(verify, 'mgr.free@flow-sla-ownerless-assignment.test', { name: 'Free Manager' });
    agent = await signUpPerson(verify, 'agent@flow-sla-ownerless-assignment.test', { name: 'Service Agent' });
    managers = [mgrBusy.id, mgrFree.id];
    run = await runSweep(async () => {
      // `mgr_busy`'s existing workload — what makes the two holders
      // distinguishable.
      busy = await caseIn('Already on the busy manager', { status: 'in_progress', priority: 'low', sla_due_date: iso(+30), owner_id: mgrBusy.id });
      await verify.seed('sys_user_position', [
        { user_id: mgrBusy.id, position: 'service_manager' },
        { user_id: mgrFree.id, position: 'service_manager' },
        // A service AGENT in the same table: the pool read must filter by
        // position, not take every row it finds.
        { user_id: agent.id, position: 'service_agent' },
      ]);
    });
  }, 120_000);

  it('gives every ownerless breached case an owner out of the service_manager pool', () => {
    for (const id of OWNERLESS) {
      expect(
        managers,
        `${id}: the ownerless breach was not assigned a service manager (got ${JSON.stringify(run.byId[id]!.owner_id)})`,
      ).toContain(run.byId[id]!.owner_id);
    }
    // The pool read filters by POSITION: the `service_agent` sharing the table
    // is not a candidate for an escalated case.
    expect(OWNERLESS.map((id) => run.byId[id]!.owner_id)).not.toContain(agent.id);
  });

  it('alerts the owner the assignment produced, not the empty slate it replaced', async () => {
    for (const id of OWNERLESS) {
      // The correspondence, per case: whoever the case now belongs to is
      // whoever its alert was addressed to. Before this change the alert for an
      // ownerless case was not sent at all.
      expect(
        await run.alertFor(id),
        `${id}: the alert did not reach the owner the sweep just assigned`,
      ).toEqual([run.byId[id]!.owner_id]);
    }
    // Two owned breaches + the newly assigned ones. Before this change notify
    // ran twice and the ownerless cases were skipped at the gate.
    expect(run.nodeOf('notify_team')?.runs, 'notify did not run for every breach').toBe(4);
    expect(run.nodeOf('notify_team')?.status, 'notify recorded a failure').toBe('success');
  });

  it('addresses a real recipient every time — never a phantom or an empty slate', async () => {
    for (const key of Object.keys(run.ids)) {
      for (const n of await run.alertsAbout(key)) {
        expect(String(n.recipient_id).trim(), 'a notification went out with an empty audience').not.toBe('');
        expect(JSON.stringify(n), 'a template resolved to a phantom recipient').not.toContain('undefined');
      }
    }
  });

  it('hands an already-owned breach over AND still alerts the owner it was taken from', async () => {
    // ⚠️ RULED, not incidental — #1535, maintainer ruling 2026-09-07
    // (director batch #73), option A: `case_sla_monitor` follows the
    // `case_escalation` precedent, so the breach alert goes to the PREVIOUS
    // owner — the agent the case is being taken from — and
    // `content/docs/service/sla-and-escalation.mdx` now states that as intent
    // for this sweep the way it always has for `case_escalation`. ⛔ Alerting
    // the receiving manager instead is option C, and it would have to re-rule
    // `case_escalation` in the same stroke.
    //
    // The two halves are pinned TOGETHER because either one alone is satisfied
    // by the wrong app: `rep1` was alerted holds on a build where no hand-off
    // happens at all, and the case is owned by a manager holds on one that
    // re-routed the alert. Only the PAIR says what was ruled.
    expect(
      managers,
      `the owned breach was not handed to the manager pool (got ${JSON.stringify(run.byId.c_owned!.owner_id)})`,
    ).toContain(run.byId.c_owned!.owner_id);
    expect(
      await run.alertFor('c_owned'),
      'the breach alert did not reach the pre-hand-off owner alone',
    ).toEqual([rep1.id]);
    expect(await run.alertFor('c_after')).toContain(rep2.id);
    expect(Boolean(run.byId.c_owned!.is_sla_violated), 'the owned breach was not flagged').toBe(true);
  });

  it('sends one alert per breach — the hand-off issues no notice of its own', async () => {
    // The ruling's DECLARED GAP, measured instead of left open: whether
    // `case_escalation_reassign` tells the NEW owner anything itself. It does
    // not — the hook mutates the payload of the update already in flight and
    // performs no operation at all — so four breaches produce four
    // notifications about them, and `notify_team` is the run's only sender.
    // Read on the real engine with the messaging service mounted: a hook that
    // DID notify would show up here as a second delivery about the case.
    const breached = ['c_owned', ...OWNERLESS, 'c_after'];
    let total = 0;
    for (const key of breached) total += (await run.alertsAbout(key)).length;
    expect(total, 'a second sender added a notice to the run').toBe(breached.length);
    expect(run.nodeOf('notify_team')?.runs, 'notify did not run once per breach').toBe(breached.length);
  });

  it('records the breach on every case and reaches the ones queued behind', async () => {
    for (const id of [...OWNERLESS, 'c_owned', 'c_after']) {
      expect(Boolean(run.byId[id]!.is_sla_violated), `${id}: breach not flagged`).toBe(true);
      expect(run.byId[id]!.status, `${id}: status not escalated`).toBe('escalated');
      // `escalation_reason` must accompany `is_escalated` or the object's
      // `escalation_reason_required` validation rejects the whole write.
      expect(run.byId[id]!.escalation_reason, `${id}: missing escalation_reason ⇒ write rejected`).toBeTruthy();
    }
    expect(run.nodeOf('flag_breach')?.runs, 'flag_breach did not reach every selected case').toBe(4);
    expect(Boolean(run.byId.c_future!.is_sla_violated), 'a future-due case was wrongly flagged').toBe(false);
    const [own] = await verify.rows('crm_case', { id: busy });
    expect(Boolean(own!.is_sla_violated), "the manager's own open case was wrongly flagged").toBe(false);
  });

  it('completes the run', () => {
    expect(run.result.success, `the scheduled run failed: ${run.result.error ?? ''}`).toBe(true);
    expect(run.result.status, 'a terminal failure was recorded').not.toBe('failed');
    expect(run.nodeOf('loop_cases')?.status, 'the loop container failed').toBe('success');
  });
});
