// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ObjectQL, applySystemFields, evaluateValidationRules } from '@objectstack/objectql';
import { InMemoryDriver } from '@objectstack/driver-memory';
import { SqliteWasmDriver } from '@objectstack/driver-sqlite-wasm';
import { P } from '@objectstack/spec';
import stack from '../objectstack.config';
import forecastHook from '../src/objects/forecast.hook';
import { forecasts } from '../src/data/revenue.seed';
import { makeCtx, hookNamed } from './helpers/hook-harness';

/**
 * A forecast's window must be the calendar period it is labelled with — at the
 * END as well as the start (#1093).
 *
 * ### What this closes
 *
 * #1008 / PR #1081 pinned `period_start` to a calendar boundary and left the
 * hook's derivation alone, reasoning that "with the start pinned to a boundary,
 * 'start + one period' IS the calendar period". True — but only for writes that
 * leave `period_end` unset, because that is the only case where the hook derives
 * it. `period_end` is editable on the record form's Snapshot section, and the
 * only rule bound to it was `period_end_after_start`. So the same inconsistent
 * row was reachable through the other field. Measured end-to-end (the #1106
 * sweep, on a real ObjectQL and the real `forecast_derive_period` handler):
 *
 *   | period  | period_start | period_end     | period_label | verdict  |
 *   | ------- | ------------ | -------------- | ------------ | -------- |
 *   | quarter | 2026-07-01   | **2027-05-15** | Q3 2026      | ADMITTED |
 *   | quarter | 2026-07-01   | *(unset)*      | Q3 2026      | derives 2026-09-30 |
 *
 * The control on the second row is what makes the first a measurement rather
 * than a zero: the ten-month window under a `Q3 2026` label is specifically
 * what the hand-typed value buys. It matters for the reasons #1008 listed —
 * `this_quarter_forecasts` and the quota-attainment widget pin `period_start`
 * by equality, and the nightly `forecast_snapshot` sweep selects the current
 * row with `period_start <= today <= period_end`, so an over-long window makes
 * one row answer to "current" for months.
 *
 * ### Which fix, and why it was not a choice
 *
 * The card offered "(1) make `period_end` readonly and always derive it, if
 * nothing writes it by hand; (2) bind it to `period_start`'s calendar period,
 * if something does." That was a measurement to take, and it was taken:
 * `src/data/revenue.seed.ts:339,378,393` hand-fill `period_end` on every seeded
 * row, so option 1 breaks the demo seed. Option 2 it is.
 *
 * ### Why this file drives a real engine
 *
 * Declaring a rule is not enforcing one. Every refusal below is asserted by its
 * envelope `code` and its message, never by "it threw" — and the abort shape
 * (#4649) is filtered out explicitly, because a predicate that *could not
 * answer* also arrives as a `VALIDATION_FAILED` and is the opposite of
 * enforcement. The gate is also shown to be capable of FAILING: the same bad row
 * is admitted by a schema clone with the rule removed (see "the gate can fail").
 */

type AnyRec = Record<string, any>;

const objects: AnyRec[] = (stack as any).objects ?? [];
const forecast = objects.find((o) => o.name === 'crm_forecast') as AnyRec;

const RULE = 'period_end_matches_calendar_period';

/** `P` compiles to `{ dialect: 'cel', source }`. */
const celSource = (v: unknown): string =>
  typeof v === 'string' ? v : String((v as AnyRec)?.source ?? '');

const ruleNamed = (name: string): AnyRec | undefined =>
  ((forecast.validations ?? []) as AnyRec[]).find((r) => r?.name === name);

const derivePeriodHook = hookNamed(forecastHook, 'forecast_derive_period') as AnyRec;

const BASE = { snapshot_date: '2026-08-15' };

/** The card's own example: a boundary-correct start under a ten-month window. */
const TEN_MONTH_WINDOW = {
  period: 'quarter',
  period_start: '2026-07-01',
  period_end: '2027-05-15',
  period_label: 'Q3 2026',
} as const;

/**
 * A write as PRODUCTION performs it: `forecast_derive_period` first, engine
 * second. The hook fills `period_end`/`period_label` only when the write leaves
 * them unset, so passing them through it is what reproduces the hand-entry path
 * rather than the derived one.
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

/** Run `fn`, require it to be REFUSED, and hand back the envelope. */
const refusal = async (fn: () => Promise<unknown>) => {
  let caught: unknown;
  try {
    await fn();
  } catch (err) {
    caught = err;
  }
  expect(caught, 'the write was ADMITTED — no refusal to inspect').toBeDefined();
  const e = caught as AnyRec;
  const env = {
    name: String(e?.name ?? ''),
    code: e?.code as string | undefined,
    status: e?.status as unknown,
    message: String(e?.message ?? ''),
    fields: (Array.isArray(e?.fields) ? e.fields : []) as AnyRec[],
  };
  // A predicate that ABORTED also arrives as VALIDATION_FAILED, and it means the
  // rule could not answer — a broken rule, not a working one (#4649). Separated
  // here so no assertion below can be satisfied by one.
  expect(env.message, 'the predicate ABORTED — this is a broken rule, not a refusal').not.toMatch(
    /could not be evaluated/i,
  );
  return env;
};

/** Every calendar-window refusal in this file must be this exact refusal. */
const expectCalendarRefusal = (env: Awaited<ReturnType<typeof refusal>>) => {
  expect(env.name).toBe('ValidationError');
  expect(env.code).toBe('VALIDATION_FAILED');
  expect(env.message).toBe(ruleNamed(RULE)!.message);
  expect(env.message).toMatch(/last day of the period/i);
  // Measured, not presumed: this app's ValidationError carries no `status` —
  // the same pin `forecast-period-boundary.test.ts` makes for the start rules.
  expect(env.status).toBeUndefined();
};

/** A clone of the shipped schema with some rules removed. */
const without = (...names: string[]) => {
  const clone = JSON.parse(JSON.stringify(forecast)) as AnyRec;
  clone.validations = ((clone.validations ?? []) as AnyRec[]).filter(
    (r) => !names.includes(r?.name),
  );
  return clone;
};

// ───────────────────────────────────── the rule, as declared metadata ──

describe('the window rule is declared where the platform can act on it', () => {
  it('ships as an error-severity script validation', () => {
    const rule = ruleNamed(RULE);
    expect(rule, `no validation named ${RULE} on crm_forecast`).toBeTruthy();
    // A field-level constraint would judge only the value being written; a
    // script rule is evaluated against the MERGED record, which is what makes
    // it an invariant (#599 / PR #1088, re-measured in the legacy suite below).
    expect(rule?.type).toBe('script');
    // `warning` is measured inert on this surface — a warned rule would let the
    // inconsistent row land, which is the whole thing being prevented.
    expect(rule?.severity).toBe('error');
  });

  it('reads as one set with the two start rules, not a third independent gate', () => {
    // #1093's dispatch note: the new rule must cohere with #1081's pair. The
    // shared property is the register — same instrument, same severity, same
    // "e.g." shape in the message — so the three refusals sound like one rule.
    const family = [
      'period_start_first_of_period',
      'quarter_starts_on_quarter_boundary',
      RULE,
    ].map((n) => ruleNamed(n)!);
    expect(family.every((r) => r?.type === 'script')).toBe(true);
    expect(family.every((r) => r?.severity === 'error')).toBe(true);
    expect(ruleNamed(RULE)!.message).toMatch(/e\.g\./);
    // …and the field says what is enforced on it (#1085's convention), which is
    // now the calendar rule rather than the weaker one it subsumes.
    expect(forecast.fields.period_end.description).toMatch(/last day of that period/i);
    expect(forecast.fields.period_end.description).not.toMatch(/must be after Period Start/i);
  });

  it('guards every field it reads with has(...) — the difference between enforced and inert', () => {
    const source = celSource(ruleNamed(RULE)!.condition);
    const read = [...new Set([...source.matchAll(/record\.(\w+)/g)].map((m) => m[1]))];
    expect(read.sort()).toEqual(['period', 'period_end', 'period_start']);
    for (const field of read) expect(source).toContain(`has(record.${field})`);
  });

  it('null-guards every date it hands to daysBetween — a hazard the stack sweep cannot see', () => {
    // `object-validation-predicates.test.ts` looks for `!= null` on the operands
    // of ORDERING comparisons. This predicate has no ordering operator at all,
    // so that sweep passes it vacuously — while the hazard is real and measured
    // in the "a missing null guard breaks the rule" suite below.
    const source = celSource(ruleNamed(RULE)!.condition);
    for (const field of ['period', 'period_start', 'period_end']) {
      expect(source).toContain(`record.${field} != null`);
    }
  });

  it('leaves the hook derivation and the two start rules untouched', () => {
    // Scope pin: #1093 is additive. If a later change moves the enforcement
    // into the hook, two enforcement points can disagree (#514 item 7).
    expect(ruleNamed('period_start_first_of_period')).toBeDefined();
    expect(ruleNamed('quarter_starts_on_quarter_boundary')).toBeDefined();
    expect(ruleNamed('period_end_after_start')).toBeDefined();
    expect(derivePeriodHook.events).toContain('beforeInsert');
    expect(derivePeriodHook.events).toContain('beforeUpdate');
  });
});

// ────────────────────────────── the refusal, on the real engine (memory) ──

describe('the hand-typed window is REFUSED, not warned about (in-memory driver)', () => {
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

  it("refuses the card's own row — Q3 2026 spanning ten months", async () => {
    const env = await refusal(() => viaHook(api(), 'insert', { ...BASE, ...TEN_MONTH_WINDOW }));
    expectCalendarRefusal(env);
  });

  const REJECTED = [
    { period: 'quarter', period_start: '2026-07-01', period_end: '2027-05-15', why: "the card's ten-month window" },
    { period: 'quarter', period_start: '2026-07-01', period_end: '2026-10-01', why: 'one day past the boundary' },
    { period: 'quarter', period_start: '2026-07-01', period_end: '2026-09-29', why: 'one day short of it' },
    { period: 'quarter', period_start: '2026-07-01', period_end: '2026-07-31', why: 'a MONTH window on a quarterly row' },
    { period: 'month', period_start: '2026-02-01', period_end: '2026-03-31', why: 'February stretched over March' },
    { period: 'month', period_start: '2026-08-01', period_end: '2026-08-30', why: 'a 30-day August' },
  ] as const;

  it.each(REJECTED)(
    'refuses $period $period_start .. $period_end ($why)',
    async ({ period, period_start, period_end }) => {
      const env = await refusal(() =>
        viaHook(api(), 'insert', { ...BASE, period, period_start, period_end }),
      );
      expectCalendarRefusal(env);
    },
  );

  it('nothing landed — a rule that complains while the row saves is not enforcement', async () => {
    const scoped = api();
    await refusal(() =>
      viaHook(scoped, 'insert', { ...BASE, ...TEN_MONTH_WINDOW, notes: 'stretcher' }),
    );
    const rows = await scoped.object('crm_forecast').find({ where: { notes: 'stretcher' } });
    expect(rows).toEqual([]);
  });

  // ── the positive cases: the gate must not fire on anything legitimate ──

  const ACCEPTED = [
    { period: 'quarter', period_start: '2026-01-01', period_end: '2026-03-31' },
    { period: 'quarter', period_start: '2026-04-01', period_end: '2026-06-30' },
    { period: 'quarter', period_start: '2026-07-01', period_end: '2026-09-30' },
    { period: 'quarter', period_start: '2026-10-01', period_end: '2026-12-31' },
    { period: 'month', period_start: '2026-08-01', period_end: '2026-08-31' },
    { period: 'month', period_start: '2026-04-01', period_end: '2026-04-30' },
    { period: 'month', period_start: '2026-02-01', period_end: '2026-02-28' },
    { period: 'month', period_start: '2028-02-01', period_end: '2028-02-29' },
  ] as const;

  it.each(ACCEPTED)(
    'admits $period $period_start .. $period_end',
    async ({ period, period_start, period_end }) => {
      // Short months and the leap February are here because the arithmetic is
      // `addMonths` + `addDays(-1)`, not a fixed day count — a "start + 92 days"
      // approximation would be red on half of these.
      const row = await viaHook(api(), 'insert', { ...BASE, period, period_start, period_end });
      expect(row?.period_end).toBe(period_end);
    },
  );

  it('admits the derived path — the automated writer is untouched', async () => {
    // `forecast_snapshot`'s `create_forecast` sends `period` and nothing else,
    // and the hook derives the whole family. This is the control from the #1106
    // probe: the same start with `period_end` unset lands on 2026-09-30.
    const scoped = api();
    const row = await viaHook(scoped, 'insert', { ...BASE, period: 'quarter' });
    expect(row?.period_start).toBe('2026-07-01');
    expect(row?.period_end).toBe('2026-09-30');
    expect(row?.period_label).toBe('Q3 2026');
  });

  it('admits the manager form path with a correctly typed window', async () => {
    const scoped = api();
    const row = await viaHook(scoped, 'insert', {
      period: 'quarter',
      period_start: '2026-07-01',
      period_end: '2026-09-30',
      period_label: 'Q3 2026',
      snapshot_date: '2026-08-11',
      source: 'manual',
      quota: 1500000,
      closed_amount: 250000,
      notes: 'typed by the RVP',
    });
    const stored = await scoped.object('crm_forecast').findOne({ where: { id: row.id } });
    expect(stored?.source).toBe('manual');
    expect(stored?.period_end).toBe('2026-09-30');
  });

  it('leaves an edit that never touches the period alone', async () => {
    // A rule that re-demands its condition on every later write is a rule
    // someone disables.
    const scoped = api();
    const row = await viaHook(scoped, 'insert', {
      ...BASE, period: 'quarter', period_start: '2026-07-01', period_end: '2026-09-30',
    });
    await scoped.object('crm_forecast').update({ id: row.id, quota: 900000 }, { where: { id: row.id } });
    const after = await scoped.object('crm_forecast').findOne({ where: { id: row.id } });
    expect(after?.quota).toBe(900000);
  });

  it('refuses to WALK a valid row off its boundary', async () => {
    // Otherwise the contract holds for exactly one write: insert correctly,
    // then stretch the end afterwards — which is the manager's actual path.
    const scoped = api();
    const row = await viaHook(scoped, 'insert', {
      ...BASE, period: 'quarter', period_start: '2026-07-01', period_end: '2026-09-30',
    });
    const env = await refusal(() =>
      viaHook(scoped, 'update', { id: row.id, period_end: '2027-05-15' }, { id: row.id }, row),
    );
    expectCalendarRefusal(env);
    const after = await scoped.object('crm_forecast').findOne({ where: { id: row.id } });
    expect(after?.period_end).toBe('2026-09-30');
  });

  /**
   * Re-labelling a monthly row as quarterly — and the direction this pair goes
   * is the opposite of what the card's template presumed, so it is pinned
   * rather than smoothed over.
   *
   * The sibling case in `forecast-period-boundary.test.ts` ("refuses to RE-LABEL
   * a monthly row as quarterly when its start is mid-quarter") is REFUSED,
   * because the hook keeps a `period_start` that already exists and the start
   * rules then reject it. `period_end` behaves differently on the same edit: the
   * hook fills it whenever the write leaves it UNSET, and an update that names
   * only `period` does leave it unset — so the stale July window is replaced by
   * the derived 2026-09-30 before the rule ever sees the record, and the write
   * is legitimately admitted with a consistent window.
   *
   * That is the derivation doing its job, not a hole: the row that lands is
   * calendar-true. The rule's job is the case the derivation cannot reach — an
   * update that carries the stale `period_end` explicitly, which is exactly what
   * the record form submits, because the form posts the field it is showing.
   */
  it('admits a re-label that leaves period_end unset — the hook re-derives it', async () => {
    const scoped = api();
    const row = await viaHook(scoped, 'insert', {
      ...BASE, period: 'month', period_start: '2026-07-01', period_end: '2026-07-31',
    });
    await viaHook(scoped, 'update', { id: row.id, period: 'quarter' }, { id: row.id }, row);
    const after = await scoped.object('crm_forecast').findOne({ where: { id: row.id } });
    expect(after?.period).toBe('quarter');
    // Re-derived to the quarter's own end, not left on the July window.
    expect(after?.period_end).toBe('2026-09-30');
  });

  it('refuses the same re-label when the stale month window is carried explicitly', async () => {
    // The merged-record case, and the form's actual payload: the rule has to
    // read `period_start` off `previous` while `period`/`period_end` come from
    // the update.
    const scoped = api();
    const row = await viaHook(scoped, 'insert', {
      ...BASE, period: 'month', period_start: '2026-07-01', period_end: '2026-07-31',
    });
    const env = await refusal(() =>
      viaHook(
        scoped,
        'update',
        { id: row.id, period: 'quarter', period_end: '2026-07-31' },
        { id: row.id },
        row,
      ),
    );
    expectCalendarRefusal(env);
    const after = await scoped.object('crm_forecast').findOne({ where: { id: row.id } });
    expect(after?.period).toBe('month');
  });

  it('admits it once the window is widened to match', async () => {
    // The way out is always open — the cost of an invariant is acceptable only
    // because a correct edit is never blocked.
    const scoped = api();
    const row = await viaHook(scoped, 'insert', {
      ...BASE, period: 'month', period_start: '2026-07-01', period_end: '2026-07-31',
    });
    await viaHook(
      scoped,
      'update',
      { id: row.id, period: 'quarter', period_end: '2026-09-30' },
      { id: row.id },
      row,
    );
    const after = await scoped.object('crm_forecast').findOne({ where: { id: row.id } });
    expect(after?.period).toBe('quarter');
    expect(after?.period_end).toBe('2026-09-30');
  });

  it('leaves an undeclared period to the picklist, which refuses it BY NAME', async () => {
    // The predicate is spelled out per period value rather than as a ternary, so
    // it never judges a value the schema itself rejects. Measured: the refusal
    // that comes back names the option list, not this rule.
    const env = await refusal(() =>
      viaHook(api(), 'insert', {
        ...BASE, period: 'year', period_start: '2026-01-01', period_end: '2026-12-31',
      }),
    );
    expect(env.message).toMatch(/Period must be one of: month, quarter/);
    expect(env.message).not.toMatch(/last day of the period/i);
  });
});

// ────────────────────────────────────────────── the gate can FAIL ──────────

describe('the gate can fail — the same row is admitted without the rule', () => {
  /**
   * The standing repo rule since #1091: a check that cannot fail is not a check.
   * Everything above asserts a refusal; this asserts that the refusal is coming
   * from THIS rule and not from something else on the object that would have
   * refused the row anyway (`period_end_after_start`, the required checks, the
   * picklist). Remove only this rule, and the ten-month window lands.
   */
  it('admits the ten-month window when the rule is removed, and stores it as given', async () => {
    const ql: AnyRec = (await ObjectQL.create({
      datasources: { default: new InMemoryDriver({ persistence: false }) },
      objects: { crm_forecast: without(RULE) } as never,
    })) as never;
    const api = ql.createContext({ isSystem: true });

    const row = await viaHook(api, 'insert', { ...BASE, ...TEN_MONTH_WINDOW });
    const stored = await api.object('crm_forecast').findOne({ where: { id: row.id } });
    // The pre-#1093 behaviour, reproduced exactly: label says one quarter, the
    // window runs ten months, and nothing objects.
    expect(stored?.period_label).toBe('Q3 2026');
    expect(stored?.period_end).toBe('2027-05-15');
    await ql.close();
  });

  it('the two start rules do NOT cover it — they admit the row on their own', async () => {
    // Why #1081's pair was not enough, asserted rather than argued: the start is
    // a valid quarter boundary, so both of them pass on this row.
    const ql: AnyRec = (await ObjectQL.create({
      datasources: { default: new InMemoryDriver({ persistence: false }) },
      objects: {
        crm_forecast: without(RULE, 'period_end_after_start', 'snapshot_amounts_non_negative'),
      } as never,
    })) as never;
    const api = ql.createContext({ isSystem: true });
    const row = await viaHook(api, 'insert', { ...BASE, ...TEN_MONTH_WINDOW });
    expect(row?.period_end).toBe('2027-05-15');
    await ql.close();
  });
});

// ────────────────────── a missing null guard breaks the rule (measured) ─────

describe('the != null guards are load-bearing, not decoration', () => {
  /**
   * A third hazard, beyond the two AGENTS.md names (`No such key` on an absent
   * key, `dyn<null> < int` on an ordering comparison): `daysBetween(null, …)`
   * reaches `BigInt(NaN)` and THROWS inside the stdlib function. The engine
   * reports that as `predicate failed to evaluate` — a rule that cannot answer,
   * which from 17.0.0-rc.2 REJECTS an ordinary save (#4649).
   *
   * It is invisible to both existing sweeps: `object-validation-predicates.test.ts`
   * greps the operands of ordering comparisons (this predicate has none), and its
   * engine-driven totality run sets EVERY field to null at once — which
   * short-circuits at `record.period != null` and never reaches `daysBetween`.
   * Only the mixed shape (dates set, `period_end` null) trips it, so the pin
   * lives here.
   */
  const evaluate = (condition: unknown, previous: AnyRec) => {
    const warns: string[] = [];
    const logger = { warn: (...a: unknown[]) => void warns.push(a.map(String).join(' ')) };
    const obj = {
      ...JSON.parse(JSON.stringify(forecast)),
      validations: [{ name: RULE, type: 'script', severity: 'error', message: 'refused', condition }],
    };
    let refused = false;
    try {
      evaluateValidationRules(obj as never, {}, 'update', { previous, logger } as never);
    } catch {
      refused = true;
    }
    return { refused, aborted: warns.filter((w) => /failed to evaluate/.test(w)) };
  };

  const MIXED_NULL = { period: 'quarter', period_start: '2026-07-01', period_end: null };

  it('the shipped predicate answers on a NULL period_end instead of aborting', () => {
    const out = evaluate(ruleNamed(RULE)!.condition, MIXED_NULL);
    expect(out.aborted).toEqual([]);
    expect(out.refused).toBe(false);
  });

  it('and aborts once the null guards are stripped — the reverse verification', () => {
    const stripped = P`has(record.period) && has(record.period_start) && has(record.period_end) && ((record.period == "month" && daysBetween(record.period_end, addDays(addMonths(record.period_start, 1), -1)) != 0) || (record.period == "quarter" && daysBetween(record.period_end, addDays(addMonths(record.period_start, 3), -1)) != 0))`;
    const out = evaluate(stripped, MIXED_NULL);
    expect(out.aborted.length).toBe(1);
    expect(out.aborted[0]).toMatch(/failed to evaluate/);
    expect(out.aborted[0]).toMatch(/NaN cannot be converted to a BigInt/i);
  });

  it('still answers on a record with no keys at all, and on an all-null one', () => {
    for (const previous of [{}, { period: null, period_start: null, period_end: null }]) {
      const out = evaluate(ruleNamed(RULE)!.condition, previous);
      expect(out.aborted).toEqual([]);
      expect(out.refused).toBe(false);
    }
  });
});

// ─────────────────────── the same contract on a real SQL database ───────────

describe('the write is REFUSED on a real SQLite database too', () => {
  // The in-memory driver hands back sparse rows; a SQL driver hands back
  // column-complete ones with NULLs. Those are different inputs to the same
  // predicate, and a marketplace app does not choose its host's datasource.
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

  it('refuses the stretched window and admits the calendar-true one', async () => {
    const api = ql.createContext({ isSystem: true });
    const env = await refusal(() => viaHook(api, 'insert', { ...BASE, ...TEN_MONTH_WINDOW }));
    expectCalendarRefusal(env);

    const row = await viaHook(api, 'insert', {
      ...BASE, period: 'quarter', period_start: '2026-07-01', period_end: '2026-09-30',
    });
    const stored = await api.object('crm_forecast').findOne({ where: { id: row.id } });
    expect(String(stored?.period_end)).toBe('2026-09-30');
  });

  it('refuses the stretch on the update path, off a column-complete row', async () => {
    const api = ql.createContext({ isSystem: true });
    const row = await viaHook(api, 'insert', {
      ...BASE, period: 'month', period_start: '2026-05-01', period_end: '2026-05-31',
    });
    const stored = await api.object('crm_forecast').findOne({ where: { id: row.id } });
    // Opposite precondition to the in-memory suite: the key IS present here.
    expect('period_label' in (stored ?? {})).toBe(true);
    const env = await refusal(() =>
      viaHook(api, 'update', { id: row.id, period_end: '2026-12-31' }, { id: row.id }, stored),
    );
    expectCalendarRefusal(env);
    const after = await api.object('crm_forecast').findOne({ where: { id: row.id } });
    expect(String(after?.period_end)).toBe('2026-05-31');
  });
});

// ───────────── invariant, not transition gate — the legacy row (#599) ───────

describe('the window rule is an INVARIANT — it reaches a row already stored wrong', () => {
  /**
   * The instrument question, asked rather than assumed. A field-level constraint
   * validates the value being WRITTEN, so a row stored wrong before the rule
   * existed keeps accepting edits forever; a script validation is evaluated
   * against the MERGED record on every write, so it does not. This is why the
   * card specified `type: 'script'`, and it is measured here on the same shape
   * `quote-discount-ceiling.test.ts` uses: insert through an engine whose schema
   * has no rule, then re-open the SAME store with the shipped schema.
   */
  const legacyRow = async () => {
    const driver = new InMemoryDriver({ persistence: false });
    const before: AnyRec = (await ObjectQL.create({
      datasources: { default: driver },
      objects: { crm_forecast: without(RULE) } as never,
    })) as never;
    const row = await viaHook(before.createContext({ isSystem: true }), 'insert', {
      ...BASE, ...TEN_MONTH_WINDOW, notes: 'stored before the rule existed',
    });

    const after: AnyRec = (await ObjectQL.create({
      datasources: { default: driver },
      objects: { crm_forecast: forecast } as never,
    })) as never;
    return { ql: after, api: after.createContext({ isSystem: true }), row };
  };

  it('refuses an UNRELATED edit to a row whose window is already wrong', async () => {
    // The case a transition gate cannot see, and the whole reason the instrument
    // is a validation rule rather than a field constraint.
    const { ql, api, row } = await legacyRow();
    const env = await refusal(() =>
      api.object('crm_forecast').update({ id: row.id, quota: 2000000 }, { where: { id: row.id } }),
    );
    expectCalendarRefusal(env);
    const after = await api.object('crm_forecast').findOne({ where: { id: row.id } });
    expect(after?.quota ?? null).toBeNull();
    await ql.close();
  });

  it('admits the REPAIR — pulling the window back to the boundary is an ordinary edit', async () => {
    // The cost of an invariant is that an offending row is frozen, and that is
    // acceptable only because the way out is always open. If this goes red, the
    // rule has become a trap.
    const { ql, api, row } = await legacyRow();
    await api
      .object('crm_forecast')
      .update({ id: row.id, period_end: '2026-09-30' }, { where: { id: row.id } });
    const repaired = await api.object('crm_forecast').findOne({ where: { id: row.id } });
    expect(repaired?.period_end).toBe('2026-09-30');
    // …and the row is editable again afterwards.
    await api.object('crm_forecast').update({ id: row.id, quota: 2000000 }, { where: { id: row.id } });
    const after = await api.object('crm_forecast').findOne({ where: { id: row.id } });
    expect(after?.quota).toBe(2000000);
    await ql.close();
  });
});

// ───────────────────────────────────────────── the stock data clears it ──

describe('everything this app already writes clears the new rule', () => {
  /**
   * The zero-stock-cost premise, re-measured rather than taken on trust. Seeds
   * run in `upsert` mode on every boot — which IS a write — so a seeded row the
   * rule refuses would turn a tightening into a `pnpm demo:reset` boot failure.
   * The seed rows are recomputed against `new Date()` on every import, so this
   * has to be an assertion, not an inspection of literals.
   */
  const records = ((forecasts as AnyRec).records ?? []) as AnyRec[];

  const calendarEnd = (period: string, startStr: string) => {
    const s = new Date(`${startStr}T00:00:00Z`);
    const end = new Date(
      Date.UTC(s.getUTCFullYear(), s.getUTCMonth() + (period === 'quarter' ? 3 : 1), 0),
    );
    return end.toISOString().slice(0, 10);
  };

  it('seeds forecast rows at all, so the check below is not vacuous', () => {
    expect(records.length).toBeGreaterThan(0);
    expect(records.some((r) => typeof r.period_end === 'string')).toBe(true);
  });

  it('every seeded forecast ends on the last day of its own calendar period', () => {
    const offenders = records
      .filter((r) => calendarEnd(String(r.period), String(r.period_start)) !== String(r.period_end))
      .map((r) => `${r.seed_key}: ${r.period} ${r.period_start}..${r.period_end}`);
    expect(offenders).toEqual([]);
  });

  it('and the engine agrees — every seeded row is ADMITTED through the shipped rule', () => {
    // The property above is arithmetic this file computed; this one is the
    // engine's own verdict on the real rows, which is the thing that actually
    // decides whether the demo boots.
    const warns: string[] = [];
    const logger = { warn: (...a: unknown[]) => void warns.push(a.map(String).join(' ')) };
    for (const r of records) {
      expect(
        () =>
          evaluateValidationRules(forecast as never, {}, 'update', { previous: r, logger } as never),
        `seed row ${r.seed_key} is refused by the new rule`,
      ).not.toThrow();
    }
    expect(warns.filter((w) => /failed to evaluate/.test(w))).toEqual([]);
  });
});
