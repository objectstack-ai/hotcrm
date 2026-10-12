// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import caseHooks from '../src/service/objects/case.hook';
import { caseSlaBreached } from '../src/service/objects/_case-sla';
import { CLOSED_CASE_STATUSES } from '../src/service/objects/_case-assignment';
import type { VerifyStack } from '@objectstack/verify';
import { hotcrmStack, signUpPerson, systemUpdate, runShippedHook, type Person } from './helpers/verify-stack';

/**
 * A case that finishes late records its breach when its clock stops (#2070).
 *
 * `is_sla_violated` used to have exactly one writer, the scheduled
 * `case_sla_monitor` sweep, and the sweep looks only at LIVE cases (status not
 * in `CLOSED_CASE_STATUSES`). So a case resolved or closed after its
 * `sla_due_date` — before an hourly sweep reached it, or on a deployment that
 * runs no scheduled work at all, which is the platform default — kept the flag
 * `false` for good. The closed-case SLA surfaces read that as "met": the
 * `sla_performance` report showed a 0.0% violation rate and the compliance
 * gauge 100%, against cases that had finished days after their deadline.
 *
 * The other half of the rule now lives on the write that settles the case
 * (`case_sla_defaults`), and this file pins it three ways:
 *
 *   1. the LOWERED hook body — what `objectstack build` ships — against
 *      `caseSlaBreached`, the rule's one declaration, on both sides of the
 *      boundary instant and for every status the case can move to;
 *   2. the real engine, as a service agent, through both closing doors: an
 *      agent's own status write (which the agent's `editable: false` mask on
 *      the flag must not refuse) and the `close_case` screen flow;
 *   3. the dataset query path the report, the gauge and the tile read —
 *      `case_metrics` through the booted analytics service, with each
 *      surface's SHIPPED binding.
 *
 * The truth table is spelled out longhand rather than recomputed from the
 * hook: the expected verdict of each row is what `caseSlaBreached` answers.
 */

type Rec = Record<string, any>;

const HOUR = 3_600_000;
const hook = (caseHooks as Rec[]).find((h) => h.name === 'case_sla_defaults') as Rec;

let verify: VerifyStack;
let agent: Person;
let k = 0;
beforeAll(async () => {
  verify = await hotcrmStack();
  agent = await signUpPerson(verify, 'agent@case-sla-breach-on-close.test', {
    name: 'Breach Agent', positions: ['service_agent'], permissionSets: ['service_agent'],
  });
}, 120_000);

/** The payload the shipped body hands the engine for one settling write. */
const settle = (input: Rec, previous: Rec): Promise<Rec> =>
  runShippedHook(verify, hook, { event: 'beforeUpdate', input, previous, as: agent.token });

const live = (over: Rec = {}): Rec => ({ id: 'case-under-test', status: 'in_progress', priority: 'high', ...over });

// ─────────────────────────────── 1. the lowered body against the rule ──

describe('the shipped hook body applies caseSlaBreached at the clock stop', () => {
  // A fixed stop instant: a write that carries its own `closed_date` (a system
  // writer's) is judged at that instant, which makes the boundary exact.
  const stop = Date.parse('2026-10-09T12:00:00.000Z');
  const iso = (ms: number) => new Date(ms).toISOString();

  it.each([
    ['one hour late', stop - HOUR, true],
    ['one millisecond late', stop - 1, true],
    ['exactly on the deadline', stop, false],
    ['one hour early', stop + HOUR, false],
  ] as const)('a case closed %s', async (_label, dueMs, breached) => {
    expect(caseSlaBreached(dueMs, stop), 'the rule itself').toBe(breached);
    const out = await settle({ status: 'closed', closed_date: iso(stop) }, live({ sla_due_date: iso(dueMs) }));
    expect(out.is_sla_violated === true, 'the lowered body').toBe(breached);
    // An on-time finish writes nothing: the hook never sets the flag false.
    if (!breached) expect('is_sla_violated' in out).toBe(false);
  });

  it('judges a resolve at the instant of the write — resolved stops the clock too', async () => {
    const late = await settle({ status: 'resolved' }, live({ sla_due_date: iso(Date.now() - HOUR) }));
    expect(late.is_sla_violated).toBe(true);
    const early = await settle({ status: 'resolved' }, live({ sla_due_date: iso(Date.now() + HOUR) }));
    expect('is_sla_violated' in early).toBe(false);
  });

  it('records the breach on entry into exactly CLOSED_CASE_STATUSES, for every status option', async () => {
    // Behavioural parity with the one declared "no longer live work" set: a
    // status outside it keeps the clock running (the sweep's side), a status
    // inside it stops the clock (this hook's side). No status is neither.
    const options = ((verify.metadata.object('crm_case')?.fields as Rec)?.status?.options ?? [])
      .map((o: Rec) => String(o.value));
    expect(options.length, 'crm_case.status declares no options').toBeGreaterThan(4);
    const recorded: string[] = [];
    for (const status of options) {
      if (status === 'in_progress') continue;
      const out = await settle({ status }, live({ sla_due_date: iso(Date.now() - HOUR) }));
      if (out.is_sla_violated === true) recorded.push(status);
    }
    expect(recorded.sort()).toEqual([...CLOSED_CASE_STATUSES].sort());
  });

  it('does not judge a write between two settled statuses — the clock had already stopped', async () => {
    // Resolved on time, closed after the deadline: the sweep stopped watching
    // it at `resolved`, and so does this rule.
    const out = await settle(
      { status: 'closed', closed_date: iso(stop) },
      live({ status: 'resolved', sla_due_date: iso(stop - HOUR) }),
    );
    expect('is_sla_violated' in out).toBe(false);
  });

  it('leaves a case with no due date untouched', async () => {
    // No priority either, so the matrix stamp above it has nothing to stamp.
    const out = await settle({ status: 'closed', closed_date: iso(stop) }, live({ priority: undefined }));
    expect(out.sla_due_date, 'a due date was invented').toBeUndefined();
    expect('is_sla_violated' in out).toBe(false);
  });

  it('never clears a breach the sweep already recorded', async () => {
    const out = await settle(
      { status: 'closed', closed_date: iso(stop) },
      live({ is_sla_violated: true, sla_due_date: iso(stop + HOUR) }),
    );
    expect('is_sla_violated' in out).toBe(false);
  });
});

// ─────────────────────────────────── 2. the real engine, as an agent ──

/** A high-priority case the agent opened, with its deadline moved `dueInH` from now. */
const openCase = async (dueInH: number): Promise<string> => {
  const kase = await verify.hooks.run('crm_case', 'insert', {
    subject: `Breach on close ${++k}`, description: 'It stopped working.', priority: 'high',
  }, { as: agent.token });
  await systemUpdate(verify, 'crm_case', { id: kase.id, sla_due_date: new Date(Date.now() + dueInH * HOUR).toISOString() });
  return String(kase.id);
};

const stored = async (id: string): Promise<Rec> => (await verify.rows('crm_case', { id }))[0]!;

const closeThroughScreen = async (id: string): Promise<void> => {
  const run = await verify.flows.run('close_case', { recordId: id }, { as: agent.token });
  await verify.flows.resume(run, { resolution: 'Replaced the faulty unit' }, { as: agent.token });
};

/** Every case this block writes, for scoping the dataset reads below to them. */
const written: Record<'lateAgentClose' | 'lateScreenClose' | 'onTimeScreenClose' | 'lateResolve', string> = {} as never;

describe('a late finish is recorded through both closing doors', () => {
  it('an agent closing a past-due case records the breach — and the mask does not refuse the close', async () => {
    written.lateAgentClose = await openCase(-5);
    await verify.hooks.run('crm_case', 'update', {
      id: written.lateAgentClose, status: 'closed', resolution: 'Done',
    }, { as: agent.token });
    const row = await stored(written.lateAgentClose);
    expect(row.status).toBe('closed');
    expect(row.is_sla_violated).toBe(true);
  });

  it('the Close Case screen flow records it too', async () => {
    written.lateScreenClose = await openCase(-5);
    await closeThroughScreen(written.lateScreenClose);
    const row = await stored(written.lateScreenClose);
    expect(row.is_closed).toBe(true);
    expect(row.is_sla_violated).toBe(true);
  });

  it('a case closed on time stays within SLA', async () => {
    written.onTimeScreenClose = await openCase(+5);
    await closeThroughScreen(written.onTimeScreenClose);
    expect((await stored(written.onTimeScreenClose)).is_sla_violated).toBe(false);
  });

  it('an agent resolving a past-due case records the breach', async () => {
    written.lateResolve = await openCase(-5);
    await verify.hooks.run('crm_case', 'update', { id: written.lateResolve, status: 'resolved' }, { as: agent.token });
    expect((await stored(written.lateResolve)).is_sla_violated).toBe(true);
  });

  it('a case resolved on time and closed after its deadline stays within SLA', async () => {
    const id = await openCase(+5);
    await verify.hooks.run('crm_case', 'update', { id, status: 'resolved' }, { as: agent.token });
    // The deadline passes while the case waits in `resolved`.
    await systemUpdate(verify, 'crm_case', { id, sla_due_date: new Date(Date.now() - HOUR).toISOString() });
    await closeThroughScreen(id);
    const row = await stored(id);
    expect(row.is_closed).toBe(true);
    expect(row.is_sla_violated).toBe(false);
  });
});

// ─────────────────────────────── 3. what the SLA surfaces now count ──

describe('the SLA surfaces count the late finishes, through the dataset query path', () => {
  /** A shipped item, looked up by name — a renamed one fails here rather than passing vacuously. */
  const item = (type: string, name: string): Rec => {
    const found = verify.metadata.items<Rec>(type).find((i) => i.name === name);
    expect(found, `no ${type} named ${name} is registered`).toBeTruthy();
    return found!;
  };
  const widget = (id: string): Rec => {
    const found = (item('dashboard', 'service_dashboard').widgets as Rec[]).find((w) => w.id === id);
    expect(found, `service_dashboard has no ${id} widget`).toBeTruthy();
    return found!;
  };

  /**
   * One binding through the booted `analytics` service — the service the
   * `POST /api/v1/analytics/dataset/query` route calls (the in-process handle
   * does not serve that route) — over the registered `case_metrics`, scoped
   * to the cases written above.
   */
  const query = async (binding: { dimensions?: string[]; measures: string[]; filter?: Rec }): Promise<Rec[]> => {
    const ids = Object.values(written);
    expect(ids.length, 'the closing block above wrote nothing to measure').toBe(4);
    const analytics = verify.kernel.getService<Rec>('analytics');
    const res = await analytics.queryDataset(item('dataset', 'case_metrics'), {
      ...(binding.dimensions ? { dimensions: binding.dimensions } : {}),
      measures: binding.measures,
      runtimeFilter: { ...(binding.filter ?? {}), id: { $in: ids } },
    }, { isSystem: true });
    return (res.rows ?? []) as Rec[];
  };

  it('the SLA Performance report reads the late closes as violations', async () => {
    const report = item('report', 'sla_performance');
    const rows = await query({ dimensions: report.rows, measures: report.values, filter: report.runtimeFilter });
    // Three CLOSED cases (two late, one on time); the late resolve is not
    // closed yet, and the report counts closed cases only.
    // One priority bucket: every case above is High.
    expect(rows).toHaveLength(1);
    expect(rows[0]!.case_count).toBe(3);
    expect(Number(rows[0]!.avg_sla_violated)).toBeCloseTo(2 / 3, 5);
  });

  it('the compliance gauge reads met ÷ closed, not 100%', async () => {
    const gauge = widget('sla_compliance_gauge');
    const [row] = await query({ measures: [...gauge.values, 'closed_count', 'sla_met_count'], filter: gauge.filter });
    expect(row!.closed_count).toBe(3);
    expect(row!.sla_met_count).toBe(1);
    expect(Number(row!.sla_compliance_rate)).toBeCloseTo(1 / 3, 5);
  });

  it('the SLA Violations tile counts every late finish, resolved or closed', async () => {
    const tile = widget('sla_violations');
    const [row] = await query({ measures: tile.values, filter: tile.filter });
    expect(row!.case_count).toBe(3);
  });
});

// ──────────────────────────── 4. both writers draw the same boundary ──

describe('the sweep and the close-time stamp agree on the boundary instant', () => {
  it('case_sla_monitor selects STRICTLY past-due cases, as caseSlaBreached does', () => {
    // A `$lte` here would flag a case exactly on its deadline as long as it is
    // open, while the close-time stamp calls the same instant "met".
    const flow = verify.metadata.items<Rec>('flow').find((f) => f.name === 'case_sla_monitor');
    const query = (flow?.nodes as Rec[] | undefined)?.find((n) => n.id === 'query_breached');
    expect(query?.config?.filter?.sla_due_date).toEqual({ $lt: '{NOW()}' });
  });
});
