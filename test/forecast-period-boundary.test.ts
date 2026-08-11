// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ObjectQL, applySystemFields } from '@objectstack/objectql';
import { InMemoryDriver } from '@objectstack/driver-memory';
import { SqliteWasmDriver } from '@objectstack/driver-sqlite-wasm';
import stack from '../objectstack.config';
import forecastHook from '../src/objects/forecast.hook';
import { forecasts } from '../src/data/revenue.seed';
import { makeCtx, hookNamed } from './helpers/hook-harness';

/**
 * A forecast may only start on a calendar-period boundary (#1008).
 *
 * ### What this closes
 *
 * `forecast_derive_period` keeps a caller-supplied `period_start` as given and
 * then derives `period_end` as "start + one period" — a ROLLING window, not
 * "the last day of the calendar period this start belongs to". So the window
 * length was right and its POSITION drifted with the hand-filled value, under a
 * `period_label` that named the period the START fell in. Measured on the real
 * handler before the fix:
 *
 *   | period  | period_start | derived period_end | derived period_label |
 *   | ------- | ------------ | ------------------ | -------------------- |
 *   | quarter | 2026-07-15   | 2026-09-30         | Q3 2026              |
 *   | quarter | 2026-08-15   | **2026-10-31**     | Q3 2026              |
 *   | quarter | 2026-09-20   | **2026-11-30**     | Q3 2026              |
 *   | month   | 2026-08-17   | 2026-08-31         | Aug 2026 (half)      |
 *
 * The last three rows are internally inconsistent and nothing downstream can
 * tell: `this_quarter_forecasts` and the quota-attainment widget filter
 * `period_start` by equality, and the nightly `forecast_snapshot` sweep picks
 * the current row with `period_start <= today <= period_end`.
 *
 * The maintainer's ruling (2026-08-11, verbatim: 「接受你的全部建议」) was the
 * issue's **option 3** — refuse the write rather than re-derive `period_end`
 * off the label (option 1) or snap the value to the boundary (option 2). Only
 * refusing makes the inconsistent row structurally unwritable.
 *
 * ### Where the refusal lives, and what the refusal LOOKS like
 *
 * Two `validations[]` rules on `crm_forecast`, not a throw in the hook: one
 * enforcement point (the `annual_revenue` lesson, #514 item 7), declared where
 * the platform acts on it. Measured envelope for this app's declarative
 * refusals — asserted below exactly as measured, and no further:
 *
 *   name  : "ValidationError"
 *   code  : "VALIDATION_FAILED"
 *   status: **undefined** — this app's rules carry no `status` property.
 *           `@objectstack/runtime` maps the code to HTTP 400 at the transport
 *           edge; the error object itself has no such field, so asserting one
 *           here would pin a constant this repo never produces.
 *
 * Each refusal is asserted by `code` + message, never by "it threw": a
 * throw-only assertion is green on any error at all, including the
 * "predicate could not be evaluated" abort that a non-total predicate raises
 * (#4649) — which is a rule that is broken, not a rule that is working.
 */

type AnyRec = Record<string, any>;

const objects: AnyRec[] = (stack as any).objects ?? [];
const forecast = objects.find((o) => o.name === 'crm_forecast') as AnyRec;

const BASE = {
  period: 'quarter' as string,
  snapshot_date: '2026-08-15',
};

const derivePeriodHook = hookNamed(forecastHook, 'forecast_derive_period') as AnyRec;

/**
 * A write as PRODUCTION performs it: `forecast_derive_period` first, engine
 * second.
 *
 * This is not decoration. `period_end` is `required` + `notNull`, and the
 * required-field check runs BEFORE the `validations[]` rules — so a bare
 * `insert({ period, period_start })` is refused with "Period End is required"
 * and never reaches the boundary rule at all. Running the real handler over the
 * input first is what puts the drifting `period_end` (2026-08-15 → 2026-10-31)
 * on the record, which is the exact row the rule has to refuse.
 */
const viaHook = async (
  api: AnyRec,
  op: 'insert' | 'update',
  input: AnyRec,
  where?: AnyRec,
  previous?: AnyRec,
) => {
  const ctx = makeCtx({
    event: op === 'insert' ? 'beforeInsert' : 'beforeUpdate',
    input: { ...input },
    previous,
  });
  await derivePeriodHook.handler(ctx);
  return op === 'insert'
    ? api.object('crm_forecast').insert(ctx.input)
    : api.object('crm_forecast').update(ctx.input, { where });
};

const envelope = (err: unknown) => {
  const e = err as AnyRec;
  return {
    name: String(e?.name ?? ''),
    code: e?.code as string | undefined,
    status: e?.status as unknown,
    message: String(e?.message ?? ''),
  };
};

/** Run `fn`, require it to be REFUSED, and hand back the envelope. */
const refusal = async (fn: () => Promise<unknown>) => {
  let caught: unknown;
  try {
    await fn();
  } catch (err) {
    caught = err;
  }
  expect(caught, 'the write was ADMITTED — no refusal to inspect').toBeDefined();
  const env = envelope(caught);
  // The abort shape (#4649) also arrives as a VALIDATION_FAILED, and it means
  // the predicate could not answer — the opposite of enforcement. Separate it
  // here so no assertion below can be satisfied by a broken rule.
  expect(env.message, 'the predicate ABORTED — this is a broken rule, not a refusal').not.toMatch(
    /could not be evaluated/i,
  );
  return env;
};

// ───────────────────────────────────────── the rules, as declared metadata ──

describe('the boundary rule is declared where the platform can act on it', () => {
  const ruleNamed = (name: string) =>
    ((forecast.validations ?? []) as AnyRec[]).find((v) => v.name === name);

  it('declares both halves as error-severity script rules', () => {
    for (const name of ['period_start_first_of_period', 'quarter_starts_on_quarter_boundary']) {
      const rule = ruleNamed(name);
      expect(rule, `${name} is missing`).toBeDefined();
      expect(rule!.type).toBe('script');
      // `warning` would let the inconsistent row land — the whole point of
      // option 3 over option 1 is that it cannot.
      expect(rule!.severity).toBe('error');
    }
  });

  it('guards every field it reads with has(...) — the difference between enforced and inert', () => {
    // Restated from `object-validation-predicates.test.ts`'s stack-wide sweep
    // because it is the specific hazard this card had to clear: an unguarded
    // read aborts on a record whose merged shape omits the key, and from
    // 17.0.0-rc.2 that REJECTS an ordinary edit (#4649).
    for (const name of ['period_start_first_of_period', 'quarter_starts_on_quarter_boundary']) {
      const source = String((ruleNamed(name)!.condition as AnyRec)?.source ?? '');
      const read = [...new Set([...source.matchAll(/record\.(\w+)/g)].map((m) => m[1]))];
      expect(read.length).toBeGreaterThan(0);
      for (const field of read) expect(source).toContain(`has(record.${field})`);
    }
  });

  it('leaves the hook derivation alone — option 1 was NOT taken', () => {
    // The ruling excluded re-deriving `period_end` from `period_label`. With
    // the start pinned to a boundary, "start + one period" already IS the
    // calendar period, so the rolling helpers stay as they were.
    const hook = hookNamed(forecastHook, 'forecast_derive_period') as AnyRec;
    expect(hook.events).toContain('beforeInsert');
    expect(hook.events).toContain('beforeUpdate');
  });
});

// ──────────────────────────────────── the refusal, on the real engine ──

describe('the write is REFUSED, not warned about (in-memory driver)', () => {
  let ql: AnyRec;

  beforeAll(async () => {
    ql = (await ObjectQL.create({
      datasources: { default: new InMemoryDriver({ persistence: false }) },
      objects: { crm_forecast: forecast } as never,
    })) as never;
  });
  afterAll(async () => {
    await ql?.close();
  });

  const api = () => ql.createContext({ isSystem: true });

  // The three rows from the issue body, and their month twin.
  const REJECTED = [
    { period: 'quarter', period_start: '2026-07-15', why: 'mid-quarter, mid-month' },
    { period: 'quarter', period_start: '2026-08-15', why: 'the row that derived 2026-10-31' },
    { period: 'quarter', period_start: '2026-09-20', why: 'the row that derived 2026-11-30' },
    { period: 'quarter', period_start: '2026-08-01', why: 'a valid MONTH start, not a quarter one' },
    { period: 'month', period_start: '2026-08-17', why: 'the half-month window' },
  ] as const;

  it.each(REJECTED)('refuses $period starting $period_start ($why)', async ({ period, period_start }) => {
    const env = await refusal(() => viaHook(api(), 'insert', { ...BASE, period, period_start }));
    expect(env.name).toBe('ValidationError');
    expect(env.code).toBe('VALIDATION_FAILED');
    // Measured, not presumed: this app's ValidationError carries NO `status`.
    // Pinned so that a platform change that adds one is a visible signal here
    // rather than a silent drift in what a caller can rely on.
    expect(env.status).toBeUndefined();
    expect(env.message).toMatch(/first day of the period|quarter boundary/i);
  });

  it('names the QUARTER half specifically when the day is right and the month is not', async () => {
    // 2026-08-01 clears "first day of the period" and must still be refused —
    // otherwise a quarterly row could open in the middle of its own quarter.
    const env = await refusal(() =>
      viaHook(api(), 'insert', { ...BASE, period: 'quarter', period_start: '2026-08-01' }),
    );
    expect(env.message).toMatch(/January 1, April 1, July 1 or October 1/);
  });

  it('nothing landed — a rule that complains while the row saves is not enforcement', async () => {
    const scoped = api();
    await refusal(() =>
      viaHook(scoped, 'insert', {
        ...BASE,
        period: 'quarter',
        period_start: '2026-08-15',
        notes: 'drifter',
      }),
    );
    const rows = await scoped.object('crm_forecast').find({ where: { notes: 'drifter' } });
    expect(rows).toEqual([]);
  });

  // ── the positive cases: the gate must not fire on anything legitimate ──

  const ACCEPTED = [
    { period: 'quarter', period_start: '2026-07-01' },
    { period: 'quarter', period_start: '2026-01-01' },
    { period: 'quarter', period_start: '2026-04-01' },
    { period: 'quarter', period_start: '2026-10-01' },
    { period: 'month', period_start: '2026-08-01' },
    { period: 'month', period_start: '2026-02-01' },
  ] as const;

  it.each(ACCEPTED)('admits $period starting $period_start', async ({ period, period_start }) => {
    const row = await viaHook(api(), 'insert', { ...BASE, period, period_start });
    expect(row?.period_start).toBe(period_start);
  });

  it('admits the manager form path — the user-visible acceptance point', async () => {
    // `period_start` is required + notNull and sits in the Snapshot block of
    // the record form (`src/views/forecast.view.ts`), and `source: 'manual'` is
    // a documented origin. Manual entry on a boundary must still work, with the
    // amounts a manager types.
    const scoped = api();
    const row = await viaHook(scoped, 'insert', {
      period: 'quarter',
      period_start: '2026-07-01',
      period_end: '2026-09-30',
      period_label: 'Q3 2026',
      snapshot_date: '2026-08-11',
      source: 'manual',
      quota: 1500000,
      commit_amount: 400000,
      closed_amount: 250000,
      notes: 'typed by the RVP',
    });
    const stored = await scoped.object('crm_forecast').findOne({ where: { id: row.id } });
    expect(stored?.source).toBe('manual');
    expect(stored?.period_start).toBe('2026-07-01');
  });

  it('leaves an edit that never touches the period alone', async () => {
    // A rule that re-demands its condition on every later write is a rule
    // someone disables.
    const scoped = api();
    const row = await viaHook(scoped, 'insert', { ...BASE, period: 'quarter', period_start: '2026-07-01' });
    await scoped.object('crm_forecast').update({ id: row.id, quota: 900000 }, { where: { id: row.id } });
    const after = await scoped.object('crm_forecast').findOne({ where: { id: row.id } });
    expect(after?.quota).toBe(900000);
  });

  it('refuses to WALK a valid row off its boundary', async () => {
    // Otherwise the contract would hold for exactly one write: insert on a
    // boundary, then edit the start to mid-quarter.
    const scoped = api();
    const row = await viaHook(scoped, 'insert', { ...BASE, period: 'quarter', period_start: '2026-07-01' });
    const env = await refusal(() =>
      viaHook(scoped, 'update', { id: row.id, period_start: '2026-08-15' }, { id: row.id }, row),
    );
    expect(env.code).toBe('VALIDATION_FAILED');
    const after = await scoped.object('crm_forecast').findOne({ where: { id: row.id } });
    expect(after?.period_start).toBe('2026-07-01');
  });

  it('refuses to RE-LABEL a monthly row as quarterly when its start is mid-quarter', async () => {
    // The merged-record case: the update names only `period`, and the rule has
    // to read `period_start` off `previous` to reach its verdict.
    const scoped = api();
    const row = await viaHook(scoped, 'insert', { ...BASE, period: 'month', period_start: '2026-08-01' });
    const env = await refusal(() =>
      viaHook(scoped, 'update', { id: row.id, period: 'quarter' }, { id: row.id }, row),
    );
    expect(env.code).toBe('VALIDATION_FAILED');
    expect(env.message).toMatch(/quarter boundary/i);
    const after = await scoped.object('crm_forecast').findOne({ where: { id: row.id } });
    expect(after?.period).toBe('month');
  });
});

// ─────────────────────── the same contract on a real SQL database ──────────

describe('the write is REFUSED on a real SQLite database too', () => {
  // The in-memory driver hands back sparse records; a SQL driver hands back a
  // full row with NULLs. Those are different inputs to the same predicate, and
  // a marketplace app does not choose the datasource its host runs on. Both
  // drivers were measured to hand `period_start` back as a `YYYY-MM-DD` string,
  // which is the shape `string()` renders for the regex.
  let ql: AnyRec;

  beforeAll(async () => {
    const driver = new SqliteWasmDriver({ filename: ':memory:' });
    await driver.connect();
    const materialized = applySystemFields(forecast as never, { multiTenant: false }) as AnyRec;
    await driver.initObjects([
      {
        name: 'crm_forecast',
        fields: materialized.fields as Record<string, unknown>,
        indexes: materialized.indexes,
      } as never,
    ]);
    ql = (await ObjectQL.create({
      datasources: { default: driver },
      objects: { crm_forecast: forecast } as never,
    })) as never;
  }, 60_000);
  afterAll(async () => {
    await ql?.close();
  });

  it('refuses the mid-quarter start and admits the boundary one', async () => {
    const api = ql.createContext({ isSystem: true });
    const env = await refusal(() =>
      viaHook(api, 'insert', { ...BASE, period: 'quarter', period_start: '2026-08-15' }),
    );
    expect(env.code).toBe('VALIDATION_FAILED');
    expect(env.message).toMatch(/first day of the period/i);

    const row = await viaHook(api, 'insert', { ...BASE, period: 'quarter', period_start: '2026-07-01' });
    const stored = await api.object('crm_forecast').findOne({ where: { id: row.id } });
    expect(String(stored?.period_start)).toBe('2026-07-01');
  });

  it('reads a column-complete row back — the precondition for the update path', async () => {
    const api = ql.createContext({ isSystem: true });
    const row = await viaHook(api, 'insert', { ...BASE, period: 'month', period_start: '2026-05-01' });
    const stored = await api.object('crm_forecast').findOne({ where: { id: row.id } });
    // Opposite precondition to the in-memory suite: the key IS present here.
    expect('period_label' in (stored ?? {})).toBe(true);
    const env = await refusal(() =>
      viaHook(api, 'update', { id: row.id, period_start: '2026-05-15' }, { id: row.id }, stored),
    );
    expect(env.code).toBe('VALIDATION_FAILED');
  });
});

// ───────────────────────────── the derivation the rule leaves in place ──

describe('the hook still derives a calendar-true family from a boundary start', () => {
  const hook = derivePeriodHook;

  const derive = async (input: AnyRec) => {
    const ctx = makeCtx({ event: 'beforeInsert', input });
    await hook.handler(ctx);
    return ctx.input as AnyRec;
  };

  it.each([
    { period: 'quarter', period_start: '2026-07-01', end: '2026-09-30', label: 'Q3 2026' },
    { period: 'quarter', period_start: '2026-10-01', end: '2026-12-31', label: 'Q4 2026' },
    { period: 'quarter', period_start: '2026-01-01', end: '2026-03-31', label: 'Q1 2026' },
    { period: 'month', period_start: '2026-08-01', end: '2026-08-31', label: 'Aug 2026' },
    { period: 'month', period_start: '2026-02-01', end: '2026-02-28', label: 'Feb 2026' },
  ])('$period $period_start → $end / $label', async ({ period, period_start, end, label }) => {
    const out = await derive({ period, period_start });
    expect(out.period_end).toBe(end);
    expect(out.period_label).toBe(label);
    // The window ends inside the period it is labelled with — the property the
    // drifting rows broke.
    expect(out.period_end.slice(0, 4)).toBe(label.slice(-4));
  });

  it('still derives the whole family from `{ period }` alone — the automated writer', async () => {
    // `forecast_snapshot`'s `create_forecast` sends only `period`, and the
    // derived start is `startOfPeriod`, which is a boundary by construction —
    // so the flow's own writes clear the new rule without changing.
    const out = await derive({ period: 'quarter', snapshot_date: '2026-08-15' });
    expect(out.period_start).toBe('2026-07-01');
    expect(out.period_end).toBe('2026-09-30');
    expect(out.period_label).toBe('Q3 2026');
    expect(out.period_start).toMatch(/^\d{4}-(01|04|07|10)-01$/);
  });
});

// ───────────────────────────────────────────── the stock data clears it ──

describe('everything this app already writes clears the new rule', () => {
  it('every seeded forecast starts on a calendar boundary', () => {
    // The zero-stock-cost premise of the ruling, re-measured here rather than
    // taken on trust: a tightening that reddens the seeds is a different card.
    const records = ((forecasts as AnyRec).records ?? []) as AnyRec[];
    expect(records.length).toBeGreaterThan(0);
    for (const r of records) {
      const start = String(r.period_start);
      expect(start, `${r.seed_key} starts mid-period`).toMatch(/^\d{4}-\d{2}-01$/);
      if (r.period === 'quarter') {
        expect(start, `${r.seed_key} is a quarter off its boundary`).toMatch(
          /^\d{4}-(01|04|07|10)-01$/,
        );
      }
    }
  });
});
