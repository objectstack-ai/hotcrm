// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import caseHooks from '../src/service/objects/case.hook';
import { caseSlaBreached } from '../src/service/objects/_case-sla';
import { CLOSED_CASE_STATUSES } from '../src/service/objects/_case-assignment';
import type { VerifyStack } from '@objectstack/verify';
import { hotcrmStack, signUpPerson, systemUpdate, runShippedHook, runScheduledFlow, type Person } from './helpers/verify-stack';

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
 *
 * Section 4 is the parity pin for the rule's THIRD reader. The Open Cases Past
 * SLA tile (titled SLA Violations until #2370) counts at read time — an open
 * case that is flagged or past its due date — so it reads true where no sweep
 * runs (#2070, acceptance 3, ruled C). Its open set and deadline branch are
 * pinned to the selection `case_sla_monitor` makes, first
 * as metadata and then by running the sweep over the cases the tile counted:
 * the sweep must flag exactly those, and the tile's number must not move.
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

  it('the SLA on Closed Cases report reads the late closes as violations', async () => {
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

  it('the Open Cases Past SLA tile counts none of the late finishes: its base is open cases (#2370)', async () => {
    // It counted all three until #2370 row 1, which put "SLA Violations 4"
    // beside "SLA Compliance 100%" with neither title naming its base. The
    // late closes are the gauge's to count, as missed SLAs over closed cases.
    const tile = widget('sla_violations');
    const [row] = await query({ measures: tile.values, filter: tile.filter });
    expect(Number(row?.case_count ?? 0)).toBe(0);
  });
});

// ─────────────── 4. the sweep, the close-time stamp and the tile draw one boundary ──

describe('the sweep, the close-time stamp and the tile draw one boundary', () => {
  /** The shipped sweep's selection — the one place the open-case side of the rule is written. */
  const sweepSelection = (): Rec => {
    const flow = verify.metadata.items<Rec>('flow').find((f) => f.name === 'case_sla_monitor');
    const query = (flow?.nodes as Rec[] | undefined)?.find((n) => n.id === 'query_breached');
    expect(query?.config?.filter, 'case_sla_monitor has no query_breached filter').toBeTruthy();
    return query!.config.filter as Rec;
  };
  const tileFilter = (): Rec => {
    const dashboard = verify.metadata.items<Rec>('dashboard').find((d) => d.name === 'service_dashboard');
    const tile = (dashboard?.widgets as Rec[] | undefined)?.find((w) => w.id === 'sla_violations');
    expect(tile, 'service_dashboard has no sla_violations widget').toBeTruthy();
    return tile!.filter as Rec;
  };

  it('case_sla_monitor selects STRICTLY past-due cases, as caseSlaBreached does', () => {
    // A `$lte` here would flag a case exactly on its deadline as long as it is
    // open, while the close-time stamp calls the same instant "met".
    expect(sweepSelection().sla_due_date).toEqual({ $lt: '{now}' });
  });

  it('the Open Cases Past SLA tile counts the sweep\'s open set, flagged or past due', () => {
    // The sweep selects "open, past due, not yet flagged"; the tile counts
    // "open, and flagged or past due" — the same open set, with the flag
    // clause beside the deadline one. Since 18.0.0-next.0 the two spell the
    // instant the same way too: a flow filter operand refuses the `{NOW()}`
    // template token, and the sweep reads the query engine's own `{now}`
    // placeholder, which the tile reads. So the tile's status set and its
    // deadline branch ARE the sweep's, compared whole: a `$lte` on either
    // side, a different status set, another spelling of the instant, or a
    // third clause on the sweep turns this red. Open only since #2370 row 1.
    const { is_sla_violated: unflagged, status, sla_due_date, ...rest } = sweepSelection();
    expect(unflagged, 'the sweep no longer selects unflagged cases only').toBe(false);
    expect(rest, 'the sweep selects on a clause the tile does not carry').toEqual({});
    const operators = Object.keys(sla_due_date ?? {});
    expect(operators, 'the sweep compares sla_due_date with something other than one operator').toHaveLength(1);
    expect(tileFilter()).toEqual({
      status,
      $or: [
        { is_sla_violated: true },
        { sla_due_date },
      ],
    });
  });
});

// ──────────────── 5. the tile counts an open breach nothing flagged, and the sweep agrees ──

describe('the Open Cases Past SLA tile counts open breaches at read time, with no sweep', () => {
  /**
   * Cases in every state the tile has to tell apart, none of them flagged by
   * a sweep — nothing in this file has run one yet. Each row's verdict is
   * written longhand beside it.
   */
  const rows: Record<string, string> = {};
  const COUNTED = ['openLate', 'parkedLate', 'flaggedLate', 'flaggedRenegotiated'];

  beforeAll(async () => {
    rows.openLate = await openCase(-5); // open, due five hours ago: counted
    rows.openOnTime = await openCase(+5); // open, due in five hours: not counted
    rows.parkedLate = await openCase(-5); // parked on the customer — the clock runs on: counted
    await systemUpdate(verify, 'crm_case', { id: rows.parkedLate, status: 'waiting_customer' });
    rows.flaggedLate = await openCase(-5); // flagged AND past due: counted ONCE
    await systemUpdate(verify, 'crm_case', { id: rows.flaggedLate, is_sla_violated: true });
    rows.flaggedRenegotiated = await openCase(+5); // flagged, deadline moved out later: counted
    await systemUpdate(verify, 'crm_case', { id: rows.flaggedRenegotiated, is_sla_violated: true });
    rows.resolvedOnTime = await openCase(+5); // resolved in time, deadline passed since: not counted
    await verify.hooks.run('crm_case', 'update', { id: rows.resolvedOnTime, status: 'resolved' }, { as: agent.token });
    await systemUpdate(verify, 'crm_case', { id: rows.resolvedOnTime, sla_due_date: new Date(Date.now() - HOUR).toISOString() });
    rows.noDeadline = await openCase(-5); // no due date, no clock: not counted
    await systemUpdate(verify, 'crm_case', { id: rows.noDeadline, sla_due_date: null });
  }, 60_000);

  /** The tile's count over these rows, through the booted analytics service, with its SHIPPED binding. */
  const tileCount = async (): Promise<number> => {
    const dashboard = verify.metadata.items<Rec>('dashboard').find((d) => d.name === 'service_dashboard');
    const tile = (dashboard?.widgets as Rec[]).find((w) => w.id === 'sla_violations')!;
    const dataset = verify.metadata.items<Rec>('dataset').find((d) => d.name === tile.dataset);
    const analytics = verify.kernel.getService<Rec>('analytics');
    const res = await analytics.queryDataset(dataset, {
      measures: tile.values,
      // The tile's filter ANDed with the scope, as the runtime ANDs a dashboard filter in.
      runtimeFilter: { $and: [tile.filter, { id: { $in: Object.values(rows) } }] },
    }, { isSystem: true });
    return Number((res.rows as Rec[] | undefined)?.[0]?.case_count ?? 0);
  };

  /** Which of these rows carry the flag. */
  const flagged = async (): Promise<string[]> => {
    const stored = await verify.rows('crm_case', { id: { $in: Object.values(rows) } });
    const byId = new Map(Object.entries(rows).map(([name, id]) => [id, name]));
    return stored.filter((r: Rec) => r.is_sla_violated === true).map((r: Rec) => byId.get(String(r.id))!).sort();
  };

  it('counts the flagged cases and the open ones past due — not the flag alone', async () => {
    expect(await flagged(), 'only the two flagged rows carry the flag').toEqual(['flaggedLate', 'flaggedRenegotiated']);
    expect(await tileCount()).toBe(COUNTED.length);
  }, 30_000);

  it('the sweep then flags exactly the open cases the tile already counted, and the number holds', async () => {
    // The behavioural half of section 4: whatever the two spellings, the
    // sweep's selection and the tile's open-case branch are one set of rows.
    await runScheduledFlow(verify, 'case_sla_monitor');
    expect(await flagged()).toEqual([...COUNTED].sort());
    expect(await tileCount()).toBe(COUNTED.length);
  }, 120_000);
});
