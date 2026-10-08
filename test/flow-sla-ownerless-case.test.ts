// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import {
  hotcrmStack, hotcrmMemoryStack, signUpPerson, guestInsert, systemUpdate, type Person,
} from './helpers/verify-stack';

type Rec = Record<string, any>;

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
 *
 * ⚠️ SCOPE, after the 2026-09-03 ruling: who an ownerless breach reaches is no
 * longer open, and it is NOT pinned here. The sweep now re-reads the case after
 * `flag_breach` and alerts the owner the escalation hand-off assigned — see
 * `test/flow-sla-ownerless-assignment.test.ts`, which drives both ruled
 * branches with the app's real `crm_case` hooks installed.
 *
 * This file runs the sweep with NOBODY in the `service_manager` position — the
 * shape where no assignment can happen: the app's real case hooks run, and
 * every ownerless case reaches the second gate still ownerless. That makes it
 * the survival pin — the sweep completes and flags every case even when nothing
 * can be done about ownership — and it is the reason the two files do not
 * overlap.
 *
 * It runs on the shipped app booted by `@objectstack/verify`, once per
 * datasource: on SQL an ownerless row holds a NULL `owner_id`, and on the
 * sparse datasource (`driver-memory`, like `driver-mongodb`) a column a row was
 * never written with is ABSENT. The sweep is started through the trigger door
 * as the admin (`flows.run`), and it processes EVERY breached case in the
 * database — the boot's seed cases included — so it is run once first to
 * SETTLE them (flagged, they no longer match), and the fixture's own sweep is
 * the second.
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
 * The two shapes of "no owner" a write can leave on this datasource, each
 * reachable in production:
 *
 *  - NEVER WRITTEN — a web-to-case submission (a guest insert) carries no
 *    owner, and the rota is empty. On SQL the column reads NULL; on the
 *    sparse datasource the key is absent, and an unguarded
 *    `vars.currentCase.owner_id != null` aborts there with `No such key` and
 *    takes the run down exactly the way the empty recipient slate did. Only
 *    `has()` is total.
 *  - BLANK — '   ', left by a system write (a backfill, an integration; a
 *    person's write is held to a real user). The notify node's own
 *    `toStringList` trims and drops falsy entries, so it reaches the node as
 *    the same empty slate. A gate that only tested null would reopen the
 *    defect on this narrower input.
 */
const OWNERLESS = ['c_unwritten', 'c_blank'] as const;

const DATASOURCES = [
  ['SQL datasource (NULL owner)', hotcrmStack],
  ['sparse datasource (absent owner)', hotcrmMemoryStack],
] as const;

describe.each(DATASOURCES)('case_sla_monitor — an ownerless breached case (#1405), %s', (_label, boot) => {
  let verify: VerifyStack;
  let rep1: Person;
  let rep2: Person;
  let ids: Record<string, string>;
  let result: Rec;
  let byId: Record<string, Rec>;
  const nodeOf = (id: string) => (result.summary?.nodes ?? []).find((n: Rec) => n.nodeId === id);

  /**
   * Breached cases in a deliberate ORDER, with the shapes of "no owner"
   * sandwiched between two ordinary owned ones. The TRAILING owned case is the
   * instrument: it can only be reached if none of the ownerless rows in front
   * of it took the run down. Each is a web-to-case submission, put in its
   * state by a system write.
   */
  const breach = async (subject: string, state: Rec): Promise<string> => {
    const kase = await guestInsert(verify, 'crm_case', { subject, description: 'Came in through the web form.', status: 'new', priority: 'high' });
    await systemUpdate(verify, 'crm_case', { id: kase.id, ...state });
    return String(kase.id);
  };

  beforeAll(async () => {
    verify = await boot();
    const admin = await verify.signIn();
    rep1 = await signUpPerson(verify, `rep1.${_label.length}@flow-sla-ownerless-case.test`, { name: 'Rep One' });
    rep2 = await signUpPerson(verify, `rep2.${_label.length}@flow-sla-ownerless-case.test`, { name: 'Rep Two' });
    const rep3 = await signUpPerson(verify, `rep3.${_label.length}@flow-sla-ownerless-case.test`, { name: 'Rep Three' });
    await verify.flows.run('case_sla_monitor', {}, { as: admin });
    ids = {
      c_first: await breach('First breach', { status: 'in_progress', sla_due_date: iso(-3), owner_id: rep1.id }),
      c_unwritten: await breach('Owner never written', { sla_due_date: iso(-4) }),
      c_blank: await breach('Owner blank string', { sla_due_date: iso(-6), owner_id: '   ' }),
      // The blast-radius instrument. Nothing special about it — an ordinary
      // breached, owned case that this sweep exists to flag, sitting behind the
      // ownerless rows.
      c_after: await breach('Breach behind the ownerless ones', { status: 'in_progress', sla_due_date: iso(-7), owner_id: rep2.id }),
      // Control: not breached. Proves the gate did not widen what the sweep
      // selects — a fix that flagged everything would pass every assertion above.
      c_future: await breach('Not due yet', { status: 'in_progress', sla_due_date: iso(+5), owner_id: rep3.id }),
    };
    // A terminal failure is recorded, not thrown by the run — and the trigger
    // door turns a failed run into a refusal, so a dying sweep fails HERE.
    result = await verify.flows.run('case_sla_monitor', {}, { as: admin });
    byId = {};
    for (const [key, id] of Object.entries(ids)) byId[key] = (await verify.rows('crm_case', { id }))[0]!;
  }, 120_000);

  /** Every outbox delivery about the case `key` names, whoever it is addressed to. */
  const alertsAbout = async (key: string) =>
    (await verify.rows('sys_notification_delivery', { topic: 'case_sla_breach', channel: 'inbox' }))
      .filter((n) => n.payload?.actionUrl === `/crm_case/${ids[key]}`);

  it('completes the sweep — the run does not die on the ownerless cases', () => {
    expect(result.success, `the scheduled run failed: ${result.error ?? ''}`).toBe(true);
    expect(result.status, 'a terminal failure was recorded').not.toBe('failed');
    // The loop container itself must not be the thing that failed — before the
    // fix its summary node read `status: 'failure'` with the notify error.
    expect(nodeOf('loop_cases')?.status, 'the loop container failed').toBe('success');
  });

  it('reaches EVERY selected case, and the run summary says so', () => {
    // 4 breached rows selected (the 5th is not due). `flag_breach` running once
    // per selected case is the machine-checkable form of "the sweep finished
    // its work" — before the fix it ran twice and the run reported `acted: 0`.
    //
    // Read off the QUERY NODE, not off `summary.selected`. The run-level figure
    // is the SUM of every `get_record`'s `selected` metric, so the per-case
    // `reload_case` added by the assignment half of #1405 contributes to it.
    // The node-level number is the one that means "how many breached cases
    // this sweep picked up", and it is what the selection claim was always
    // about.
    expect(nodeOf('query_breached')?.selected, 'the sweep selected the wrong set').toBe(4);
    expect(nodeOf('flag_breach')?.runs, 'flag_breach did not reach every case').toBe(4);
    expect(nodeOf('check_owner')?.runs, 'the gate did not see every case').toBe(4);
  });

  it('records the skipped notifications as a GATE, not as silence', () => {
    // The second half of "visible, not silent": besides the breach landing on
    // the record, the engine's own run summary attributes the skipped
    // notifications to the named gate — so run history shows WHY they were
    // skipped rather than just showing fewer notifications than cases.
    //
    // Selected by EDGE id, never by node id alone: `check_owner` carries TWO
    // out-edges (`b2` to the notify, `b3` to the re-read the assignment half of
    // #1405 added), and the engine emits gate rows in completion order, which
    // varies run to run.
    const gates = result.summary?.gates ?? [];
    const gate = gates.find((g: Rec) => g.edgeId === 'b2');
    expect(gate, 'the gate is absent from the run summary').toBeTruthy();
    expect(gate?.nodeId).toBe('check_owner');
    expect(gate?.targetNodeId).toBe('notify_team');
    expect(gate?.skipped, 'the gate did not account for the ownerless cases').toBe(OWNERLESS.length);
    // …and the second gate accounts for the same cases again, after the
    // re-read found no owner to have been assigned. Two named skips per case,
    // not one — nobody holds `service_manager`, so nothing could place them.
    expect(gates.find((g: Rec) => g.edgeId === 'b5')?.skipped).toBe(OWNERLESS.length);
    const notify = nodeOf('notify_team');
    expect(notify?.status, 'notify recorded a failure').toBe('success');
    expect(notify?.skipped, 'the notify skips are unaccounted for').toBe(OWNERLESS.length * 2);
    expect(notify?.runs, 'notify ran for a case with no owner').toBe(2);
  });

  it('still RECORDS the breach on every ownerless case — the skip is visible, not silent', () => {
    for (const id of OWNERLESS) {
      // `flag_breach` is what puts the breach in views and reports, where a
      // service manager finds it. Gating it away alongside the notify would
      // trade a dead run for a silently dropped alert on exactly the cases most
      // likely to be neglected.
      expect(Boolean(byId[id]!.is_sla_violated), `${id}: ownerless breach was not flagged`).toBe(true);
      expect(Boolean(byId[id]!.is_escalated), `${id}: ownerless breach was not escalated`).toBe(true);
      expect(byId[id]!.status, `${id}: status not escalated`).toBe('escalated');
      // `escalation_reason` must accompany `is_escalated` or the object's
      // `escalation_reason_required` validation rejects the whole write.
      expect(byId[id]!.escalation_reason, `${id}: missing escalation_reason ⇒ write rejected`).toBeTruthy();
    }
  });

  it('does not skip the breached cases QUEUED BEHIND the ownerless ones', () => {
    // The blast radius. Before the fix this is the assertion that failed: the
    // loop aborted on the first ownerless case and `c_after` was never visited.
    expect(Boolean(byId.c_after!.is_sla_violated), 'a breached case behind the ownerless ones was skipped').toBe(true);
    expect(byId.c_after!.status).toBe('escalated');
    expect(Boolean(byId.c_first!.is_sla_violated), 'the case in front was not processed').toBe(true);
  });

  it('leaves the not-yet-due case alone — the gate did not widen selection', () => {
    expect(Boolean(byId.c_future!.is_sla_violated), 'a future-due case was wrongly flagged').toBe(false);
    expect(Boolean(byId.c_future!.is_escalated), 'a future-due case was wrongly escalated').toBe(false);
  });

  it('notifies every owner it can reach, and addresses nobody for the ownerless cases', async () => {
    const owned = [...await alertsAbout('c_first'), ...await alertsAbout('c_after')];
    expect(owned.map((n) => n.recipient_id).sort(), 'expected exactly one alert per OWNED breach').toEqual([rep1.id, rep2.id].sort());
    for (const id of OWNERLESS) {
      // No phantom audience: an ownerless case must be SKIPPED, never addressed
      // to a stringified nothing.
      expect(await alertsAbout(id), `${id} was alerted`).toHaveLength(0);
    }
    for (const n of owned) {
      expect(JSON.stringify(n), 'a template resolved to a phantom recipient').not.toContain('undefined');
      expect(String(n.recipient_id).trim(), 'a notification went out with an empty audience').not.toBe('');
    }
  });
});
