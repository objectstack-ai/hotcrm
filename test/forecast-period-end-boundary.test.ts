// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { evaluateValidationRules } from '@objectstack/objectql';
import { P } from '@objectstack/spec';
import { bootStack, type VerifyStack } from '@objectstack/verify';
import artifact from '../objectstack.config';
import stack from './helpers/composed-stack';
import forecastHook from '../src/sales/objects/forecast.hook';
import { forecasts } from '../src/sales/data/forecast.seed';
import { bootOptions, hotcrmStack, hotcrmMemoryStack, signUpPerson, type Person } from './helpers/verify-stack';

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
 * is admitted by the app booted with the rule removed (see "the gate can fail").
 *
 * Every write is a sales manager's — the persona who keys a forecast in —
 * through the engine's write door (`hooks.run`) on the app booted by
 * `@objectstack/verify`, so `forecast_derive_period` runs where production runs
 * it, and what is asserted is the row the engine stored or the refusal it
 * raised.
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

const derivePeriodHook = ([] as AnyRec[]).concat(forecastHook as AnyRec)
  .find((h) => h.name === 'forecast_derive_period') as AnyRec;

const BASE = { snapshot_date: '2026-08-15' };

/** The card's own example: a boundary-correct start under a ten-month window. */
const TEN_MONTH_WINDOW = {
  period: 'quarter',
  period_start: '2026-07-01',
  period_end: '2027-05-15',
  period_label: 'Q3 2026',
} as const;

/** One booted app and the sales manager who writes its forecasts. */
interface Desk {
  verify: VerifyStack;
  manager: Person;
}

/** Sign up the sales manager on `verify`. */
const managerOn = (verify: VerifyStack, label: string): Promise<Person> =>
  signUpPerson(verify, `manager.${label}@forecast-period-end-boundary.test`, {
    name: 'Forecast Manager', positions: ['sales_manager'], permissionSets: ['sales_manager'],
  });

/** Boot `boot` and sign up the manager, once for the enclosing block. */
const deskOn = (boot: () => Promise<VerifyStack>, label: string): Desk => {
  const desk = {} as Desk;
  beforeAll(async () => {
    desk.verify = await boot();
    desk.manager = await managerOn(desk.verify, label);
  }, 120_000);
  return desk;
};

/**
 * A write as PRODUCTION performs it: the manager's, through the engine —
 * `forecast_derive_period` first, the engine's checks second. The hook fills
 * `period_end`/`period_label` only when the write leaves them unset, so passing
 * them is what reproduces the hand-entry path rather than the derived one.
 */
const viaHook = (desk: Desk, op: 'insert' | 'update', input: AnyRec): Promise<AnyRec> =>
  desk.verify.hooks.run('crm_forecast', op, { ...input }, { as: desk.manager.token });

/** The stored forecast, read fresh. */
const storedForecast = async (desk: Desk, id: string): Promise<AnyRec | undefined> =>
  (await desk.verify.rows('crm_forecast', { id }))[0];

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

/**
 * The SHIPPED app with some `crm_forecast` rules removed — every other object,
 * hook and flow by reference — for the blocks whose claim is what the app does
 * WITHOUT a rule. Booted through the platform's own `bootStack`, like the app.
 */
const artifactWithout = (...names: string[]) => {
  const a = artifact as unknown as AnyRec;
  return {
    ...a,
    packages: (a.packages as AnyRec[]).map((p) => ({
      ...p,
      manifest: {
        ...p.manifest,
        objects: (p.manifest.objects as AnyRec[] | undefined)?.map((o) =>
          o.name === 'crm_forecast'
            ? { ...o, validations: ((o.validations ?? []) as AnyRec[]).filter((r) => !names.includes(r?.name)) }
            : o),
      },
    })),
  } as typeof artifact;
};

/** The app booted with `names` removed from `crm_forecast`, and its manager. */
const deskWithout = async (label: string, names: string[], over: Parameters<typeof bootOptions>[0] = {}): Promise<Desk> => {
  const verify = await bootStack(artifactWithout(...names), bootOptions(over));
  const carried = ((verify.metadata.object('crm_forecast') as AnyRec).validations as AnyRec[]).map((r) => r.name);
  for (const name of names) expect(carried, `the variant boot still carries ${name}`).not.toContain(name);
  return { verify, manager: await managerOn(verify, label) };
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
  const desk = deskOn(hotcrmMemoryStack, 'memory');

  it("refuses the card's own row — Q3 2026 spanning ten months", async () => {
    const env = await refusal(() => viaHook(desk, 'insert', { ...BASE, ...TEN_MONTH_WINDOW }));
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
        viaHook(desk, 'insert', { ...BASE, period, period_start, period_end }),
      );
      expectCalendarRefusal(env);
    },
  );

  it('nothing landed — a rule that complains while the row saves is not enforcement', async () => {
    await refusal(() =>
      viaHook(desk, 'insert', { ...BASE, ...TEN_MONTH_WINDOW, notes: 'stretcher' }),
    );
    const rows = await desk.verify.rows('crm_forecast', { notes: 'stretcher' });
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
      const row = await viaHook(desk, 'insert', { ...BASE, period, period_start, period_end });
      expect(row?.period_end).toBe(period_end);
    },
  );

  it('admits the derived path — the automated writer is untouched', async () => {
    // `forecast_snapshot`'s `create_forecast` sends `period` and nothing else,
    // and the hook derives the whole family. This is the control from the #1106
    // probe: the same start with `period_end` unset lands on 2026-09-30.
    const row = await viaHook(desk, 'insert', { ...BASE, period: 'quarter' });
    expect(row?.period_start).toBe('2026-07-01');
    expect(row?.period_end).toBe('2026-09-30');
    expect(row?.period_label).toBe('Q3 2026');
  });

  it('admits the manager form path with a correctly typed window', async () => {
    const row = await viaHook(desk, 'insert', {
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
    const stored = await storedForecast(desk, row.id);
    expect(stored?.source).toBe('manual');
    expect(stored?.period_end).toBe('2026-09-30');
  });

  it('leaves an edit that never touches the period alone', async () => {
    // A rule that re-demands its condition on every later write is a rule
    // someone disables.
    const row = await viaHook(desk, 'insert', {
      ...BASE, period: 'quarter', period_start: '2026-07-01', period_end: '2026-09-30',
    });
    await viaHook(desk, 'update', { id: row.id, quota: 900000 });
    const after = await storedForecast(desk, row.id);
    expect(after?.quota).toBe(900000);
  });

  it('refuses to WALK a valid row off its boundary', async () => {
    // Otherwise the contract holds for exactly one write: insert correctly,
    // then stretch the end afterwards — which is the manager's actual path.
    const row = await viaHook(desk, 'insert', {
      ...BASE, period: 'quarter', period_start: '2026-07-01', period_end: '2026-09-30',
    });
    const env = await refusal(() =>
      viaHook(desk, 'update', { id: row.id, period_end: '2027-05-15' }),
    );
    expectCalendarRefusal(env);
    const after = await storedForecast(desk, row.id);
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
    const row = await viaHook(desk, 'insert', {
      ...BASE, period: 'month', period_start: '2026-07-01', period_end: '2026-07-31',
    });
    await viaHook(desk, 'update', { id: row.id, period: 'quarter' });
    const after = await storedForecast(desk, row.id);
    expect(after?.period).toBe('quarter');
    // Re-derived to the quarter's own end, not left on the July window.
    expect(after?.period_end).toBe('2026-09-30');
  });

  it('refuses the same re-label when the stale month window is carried explicitly', async () => {
    // The merged-record case, and the form's actual payload: the rule has to
    // read `period_start` off `previous` while `period`/`period_end` come from
    // the update.
    const row = await viaHook(desk, 'insert', {
      ...BASE, period: 'month', period_start: '2026-07-01', period_end: '2026-07-31',
    });
    const env = await refusal(() =>
      viaHook(desk, 'update', { id: row.id, period: 'quarter', period_end: '2026-07-31' }),
    );
    expectCalendarRefusal(env);
    const after = await storedForecast(desk, row.id);
    expect(after?.period).toBe('month');
  });

  it('admits it once the window is widened to match', async () => {
    // The way out is always open — the cost of an invariant is acceptable only
    // because a correct edit is never blocked.
    const row = await viaHook(desk, 'insert', {
      ...BASE, period: 'month', period_start: '2026-07-01', period_end: '2026-07-31',
    });
    await viaHook(desk, 'update', { id: row.id, period: 'quarter', period_end: '2026-09-30' });
    const after = await storedForecast(desk, row.id);
    expect(after?.period).toBe('quarter');
    expect(after?.period_end).toBe('2026-09-30');
  });

  it('leaves an undeclared period to the picklist, which refuses it BY NAME', async () => {
    // The predicate is spelled out per period value rather than as a ternary, so
    // it never judges a value the schema itself rejects. Measured: the refusal
    // that comes back names the option list, not this rule.
    const env = await refusal(() =>
      viaHook(desk, 'insert', {
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
   * picklist). Boot the app with only this rule removed, and the ten-month
   * window lands.
   */
  it('admits the ten-month window when the rule is removed, and stores it as given', async () => {
    const desk = await deskWithout('no-rule', [RULE]);
    const row = await viaHook(desk, 'insert', { ...BASE, ...TEN_MONTH_WINDOW });
    const stored = await storedForecast(desk, row.id);
    // The pre-#1093 behaviour, reproduced exactly: label says one quarter, the
    // window runs ten months, and nothing objects.
    expect(stored?.period_label).toBe('Q3 2026');
    expect(stored?.period_end).toBe('2027-05-15');
    await desk.verify.stop();
  }, 120_000);

  it('the two start rules do NOT cover it — they admit the row on their own', async () => {
    // Why #1081's pair was not enough, asserted rather than argued: the start is
    // a valid quarter boundary, so both of them pass on this row.
    const desk = await deskWithout('start-rules-only', [RULE, 'period_end_after_start', 'snapshot_amounts_non_negative']);
    const row = await viaHook(desk, 'insert', { ...BASE, ...TEN_MONTH_WINDOW });
    expect((await storedForecast(desk, row.id))?.period_end).toBe('2027-05-15');
    await desk.verify.stop();
  }, 120_000);
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
  const desk = deskOn(hotcrmStack, 'sqlite');

  it('refuses the stretched window and admits the calendar-true one', async () => {
    const env = await refusal(() => viaHook(desk, 'insert', { ...BASE, ...TEN_MONTH_WINDOW }));
    expectCalendarRefusal(env);

    const row = await viaHook(desk, 'insert', {
      ...BASE, period: 'quarter', period_start: '2026-07-01', period_end: '2026-09-30',
    });
    const stored = await storedForecast(desk, row.id);
    expect(String(stored?.period_end)).toBe('2026-09-30');
  });

  it('refuses the stretch on the update path, off a column-complete row', async () => {
    const row = await viaHook(desk, 'insert', {
      ...BASE, period: 'month', period_start: '2026-05-01', period_end: '2026-05-31',
    });
    const stored = await storedForecast(desk, row.id);
    // Opposite precondition to the in-memory suite: the key IS present here.
    expect('period_label' in (stored ?? {})).toBe(true);
    const env = await refusal(() => viaHook(desk, 'update', { id: row.id, period_end: '2026-12-31' }));
    expectCalendarRefusal(env);
    const after = await storedForecast(desk, row.id);
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
   * card specified `type: 'script'`, and it is measured here as the upgrade an
   * install actually goes through: the app WITHOUT the rule boots over a
   * database file and stores the rows, stops, and the SHIPPED app cold-boots
   * over the same file (`databaseFile`, the handle's restart seam).
   */
  let dir: string;
  let desk: Desk;
  /** Two rows stored wrong before the rule existed — one per path below. */
  let frozen: string;
  let rederived: string;
  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'forecast-legacy-'));
    const databaseFile = join(dir, 'crm.db');
    const before = await deskWithout('before-upgrade', [RULE], { databaseFile });
    const legacy = async (notes: string) =>
      String((await viaHook(before, 'insert', { ...BASE, ...TEN_MONTH_WINDOW, notes })).id);
    frozen = await legacy('stored before the rule existed');
    rederived = await legacy('stored before the rule existed, edited without its window');
    await before.verify.stop();

    const verify = await bootStack(artifact, bootOptions({ databaseFile }));
    desk = { verify, manager: await managerOn(verify, 'after-upgrade') };
    for (const id of [frozen, rederived]) {
      expect((await storedForecast(desk, id))?.period_end, 'the legacy row did not survive the restart').toBe('2027-05-15');
    }
  }, 240_000);
  afterAll(async () => {
    await desk?.verify.stop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it('refuses an UNRELATED edit that carries the stored window — the record form’s payload', async () => {
    // The case a transition gate cannot see, and the whole reason the instrument
    // is a validation rule rather than a field constraint. The form posts the
    // fields it is showing, so the stale `period_end` rides along with the edit.
    const env = await refusal(() =>
      viaHook(desk, 'update', { id: frozen, quota: 2000000, period_end: '2027-05-15' }),
    );
    expectCalendarRefusal(env);
    const after = await storedForecast(desk, frozen);
    expect(after?.quota ?? null).toBeNull();
  });

  it('an edit that leaves the window unset is re-derived onto the calendar period', async () => {
    // `forecast_derive_period` runs on every update and fills `period_end` /
    // `period_label` whenever the write leaves them unset — so an edit that
    // names neither repairs the stored window on its way through, and the rule
    // then sees a calendar-true record.
    await viaHook(desk, 'update', { id: rederived, quota: 2000000 });
    const after = await storedForecast(desk, rederived);
    expect(after?.quota).toBe(2000000);
    expect(after?.period_end).toBe('2026-09-30');
    expect(after?.period_label).toBe('Q3 2026');
  });

  it('admits the REPAIR — pulling the window back to the boundary is an ordinary edit', async () => {
    // The cost of an invariant is that an offending row is frozen, and that is
    // acceptable only because the way out is always open. If this goes red, the
    // rule has become a trap.
    await viaHook(desk, 'update', { id: frozen, period_end: '2026-09-30' });
    const repaired = await storedForecast(desk, frozen);
    expect(repaired?.period_end).toBe('2026-09-30');
    // …and the row is editable again afterwards, with the form's full payload.
    await viaHook(desk, 'update', { id: frozen, quota: 2000000, period_end: '2026-09-30' });
    const after = await storedForecast(desk, frozen);
    expect(after?.quota).toBe(2000000);
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
