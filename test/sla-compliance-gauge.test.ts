// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ObjectQL, applySystemFields } from '@objectstack/objectql';
import { InMemoryDriver } from '@objectstack/driver-memory';
import { SqliteWasmDriver } from '@objectstack/driver-sqlite-wasm';
import { AnalyticsService } from '@objectstack/service-analytics';
import stack from '../objectstack.config';
import { CrmSeedData } from '../src/data/index';
import { CaseDataset } from '../src/datasets/case.dataset';

/**
 * The SLA gauge plots COMPLIANCE (#1213).
 *
 * The widget was titled, described, success-coloured and given a 0.95 target
 * line as compliance, but plotted `avg_sla_violated` — the complement — and
 * asked the renderer to flip it back with `options: { invert: true }`. It read
 * `0.0%` on an org whose closed cases are 100% within SLA, beside violation
 * rates of 40–70% elsewhere on the same page.
 *
 * `invert` was never a declared key: `DashboardWidgetOptionsSchema` ends in
 * `.passthrough()`, so the key parsed, validated, linted and shipped while
 * doing nothing, and no gate in either repo could say so. That is why the fix
 * is a measure that MEANS compliance rather than a renderer flag — and why
 * this file pins the absence of the flag as hard as it pins the number.
 *
 * The numbers below are not read off the metadata. They come from running the
 * SHIPPED dataset measures and the SHIPPED widget binding through the REAL
 * analytics executor, on BOTH drivers this app runs on, over controlled rows
 * and then over the actual seeded case records — because the failure being
 * guarded produced no error at all, just a plausible wrong percentage.
 */

type AnyRec = Record<string, any>;

const objects: AnyRec[] = (stack as any).objects ?? [];
const dashboards: AnyRec[] = (stack as any).dashboards ?? [];
const kase = objects.find((o) => o.name === 'crm_case') as AnyRec;
const serviceDashboard = dashboards.find((d) => d.name === 'service_dashboard') as AnyRec;
const widget = (id: string): AnyRec =>
  (serviceDashboard?.widgets ?? []).find((w: AnyRec) => w.id === id);
const gauge = (): AnyRec => widget('sla_compliance_gauge');
const measureNamed = (name: string): AnyRec =>
  (CaseDataset.measures as AnyRec[]).find((m) => m.name === name) as AnyRec;

// ─────────────────────────────────── 1. the widget says one thing, once ──

describe('the SLA gauge is bound to a compliance measure (#1213)', () => {
  it('plots the compliance measure, not the violation rate', () => {
    const w = gauge();
    expect(w, 'service_dashboard has no sla_compliance_gauge widget').toBeTruthy();
    expect(w.dataset).toBe('case_metrics');
    expect(w.values).toEqual(['sla_compliance_rate']);
    expect(w.values).not.toContain('avg_sla_violated');
  });

  /**
   * The regression pin. A future author reaching for `invert` again would be
   * reaching for a key the widget schema accepts (`.passthrough()`) and no
   * validator rejects — the exact shape that let this defect ship and survive.
   */
  it('carries no `invert` key — the flag that parsed and did nothing', () => {
    expect(Object.keys(gauge().options ?? {})).not.toContain('invert');
  });

  /**
   * PM assumption 3, checked rather than assumed: the ladder and the target
   * line were authored for compliance. They needed no inversion — it was the
   * plotted value that disagreed with them.
   */
  it('keeps the compliance-shaped ladder and target line unchanged', () => {
    const w = gauge();
    expect(w.colorVariant).toBe('success');
    expect(w.options.thresholds).toEqual([
      { value: 0.95, color: 'success' },
      { value: 0.85, color: 'warning' },
      { value: 0, color: 'danger' },
    ]);
    const target = (w.chartConfig?.annotations ?? []).find((a: AnyRec) => a.label === 'Target');
    expect(target, 'the 0.95 target line is gone').toBeTruthy();
    expect(target.value).toBe(0.95);
  });

  it('names a measure the dataset actually declares', () => {
    const declared = new Set((CaseDataset.measures as AnyRec[]).map((m) => m.name));
    const missing = (gauge().values as string[]).filter((m) => !declared.has(m));
    expect(missing, `gauge names measures case_metrics does not declare: ${missing.join(', ')}`).toEqual([]);
  });

  /**
   * The measure's own label renders directly under the number. When it read
   * `SLA Violation Rate` the widget contradicted itself on its own face, in
   * every locale — dataset measure labels have no translation surface in this
   * app, so this string is what a reader sees whatever their language.
   */
  it('prints a label that agrees with the title', () => {
    expect(String(measureNamed('sla_compliance_rate').label)).toMatch(/compliance/i);
    expect(String(measureNamed('sla_compliance_rate').label)).not.toMatch(/violation/i);
  });

  /**
   * `1 - avg_sla_violated` is NOT expressible: `DerivedMeasureOp` operands are
   * measure names only, so there is no literal to subtract from. The shipped
   * spelling is the ratio of two counts, and this pins which two — a swapped
   * numerator and denominator returns a plausible number, not an error.
   */
  it('is a ratio of within-SLA closed cases over closed cases', () => {
    expect(measureNamed('sla_compliance_rate').derived).toEqual({
      op: 'ratio', of: ['sla_met_count', 'closed_count'],
    });
    expect(measureNamed('sla_met_count').filter).toEqual({ is_closed: true, is_sla_violated: false });
  });
});

// ──────────────────────────── 2. the measure, through the real executor ──

/** The columns the dataset reads, plus the ones `crm_case` REQUIRES. */
const CASE_COLUMNS = ['subject', 'description', 'status', 'priority', 'resolution', 'is_closed', 'is_sla_violated'];

const caseRow = (over: AnyRec): AnyRec => ({
  description: 'Seeded by sla-compliance-gauge.test.ts',
  status: 'new',
  priority: 'medium',
  // `resolution_required_for_closed` is the app's own rule and it fires on
  // these inserts — a welcome sign the REAL object is under test.
  ...(over.is_closed ? { resolution: 'Resolved.' } : {}),
  ...over,
});

const makeAnalytics = (ql: AnyRec) =>
  new AnalyticsService({
    // The same bridge `AnalyticsServicePlugin` wires at boot.
    executeAggregate: async (objectName: string, opts: AnyRec) =>
      (ql as AnyRec).aggregate(objectName, {
        where: opts.filter,
        groupBy: opts.groupBy,
        aggregations: opts.aggregations?.map((a: AnyRec) => ({
          function: a.method, field: a.field, alias: a.alias,
        })),
        timezone: opts.timezone,
        context: opts.context,
      }),
    queryCapabilities: () => ({ nativeSql: false, objectqlAggregate: true, inMemory: false }),
  });

/**
 * Both drivers, because they disagree about what "absent" means: the memory
 * driver omits unwritten columns, SQLite stores NULL. A boolean the app never
 * wrote is exactly the axis a filtered count gets wrong, and a single-driver
 * green would not be evidence either way.
 */
for (const driverName of ['memory', 'sqlite'] as const) {
  describe(`the compliance measure over ${driverName}`, () => {
    let ql: AnyRec;
    let analytics: AnalyticsService;

    beforeAll(async () => {
      if (driverName === 'sqlite') {
        const driver = new SqliteWasmDriver({ filename: ':memory:' });
        await driver.connect();
        const materialized = applySystemFields(kase as never, { multiTenant: false }) as AnyRec;
        await driver.initObjects([{
          name: kase.name,
          fields: materialized.fields as Record<string, unknown>,
          indexes: materialized.indexes,
        } as never]);
        ql = (await ObjectQL.create({
          datasources: { default: driver },
          objects: { crm_case: kase } as never,
        })) as never;
      } else {
        ql = (await ObjectQL.create({
          datasources: { default: new InMemoryDriver({ persistence: false }) },
          objects: { crm_case: kase } as never,
        })) as never;
      }
      analytics = makeAnalytics(ql);
    }, 60_000);

    afterAll(async () => {
      await ql?.close();
    });

    const api = () => ql.createContext({ isSystem: true });

    const addCase = async (rec: AnyRec) => {
      const row: AnyRec = {};
      for (const c of CASE_COLUMNS) if (rec[c] !== undefined) row[c] = rec[c];
      return api().object('crm_case').insert(row);
    };

    /** Run a binding through the real dataset executor. */
    const run = async (w: AnyRec): Promise<AnyRec[]> => {
      const res = await analytics.queryDataset(
        CaseDataset as never,
        {
          ...(w.dimensions ? { dimensions: w.dimensions } : {}),
          measures: w.values,
          ...(w.filter ? { runtimeFilter: w.filter as never } : {}),
        } as never,
        { isSystem: true } as never,
      );
      return (res.rows ?? []) as AnyRec[];
    };

    const compliance = async (): Promise<AnyRec> => (await run({
      values: ['closed_count', 'sla_met_count', 'sla_compliance_rate'],
    }))[0] ?? {};

    /**
     * The breached share of CLOSED cases, from the two counts rather than from
     * `avg_sla_violated`. MEASURED: an `avg` over a boolean column returns a
     * number on SQLite (0.25 here) but `null` on the in-memory driver, so the
     * dataset's own violation-rate measure is not a driver-stable yardstick to
     * check compliance against. The counts are exact on both.
     */
    const breachedShare = (row: AnyRec): number =>
      ((row.closed_count as number) - (row.sla_met_count as number)) / (row.closed_count as number);

    it('reads the complement of the violation rate, not the violation rate', async () => {
      // 4 closed: 3 within SLA, 1 breached. Plus an OPEN breached case, to
      // prove `is_closed` scopes both halves.
      await addCase(caseRow({ subject: 'c1', is_closed: true, status: 'closed', is_sla_violated: false }));
      await addCase(caseRow({ subject: 'c2', is_closed: true, status: 'closed', is_sla_violated: false }));
      await addCase(caseRow({ subject: 'c3', is_closed: true, status: 'closed', is_sla_violated: false }));
      await addCase(caseRow({ subject: 'c4', is_closed: true, status: 'closed', is_sla_violated: true }));
      await addCase(caseRow({ subject: 'c5', is_closed: false, is_sla_violated: true }));

      const row = await compliance();
      expect(row.closed_count).toBe(4);
      expect(row.sla_met_count).toBe(3);
      expect(row.sla_compliance_rate as number).toBeCloseTo(0.75, 5);

      // The two quantities are complements, and the gauge shows the compliance
      // one. This is the assertion the old binding could not have passed: it
      // plotted the 0.25 under a title that says 达成率.
      expect(breachedShare(row)).toBeCloseTo(0.25, 5);
      expect((row.sla_compliance_rate as number) + breachedShare(row)).toBeCloseTo(1, 5);
    });

    it('rises when a case closes within SLA', async () => {
      const before = (await compliance()).sla_compliance_rate as number;
      await addCase(caseRow({ subject: 'c6', is_closed: true, status: 'closed', is_sla_violated: false }));
      const after = await compliance();
      expect(after.sla_compliance_rate as number).toBeGreaterThan(before);
      expect(after.sla_compliance_rate as number).toBeCloseTo(0.8, 5);
    });

    it('falls when a case closes having breached SLA', async () => {
      const before = (await compliance()).sla_compliance_rate as number;
      await addCase(caseRow({ subject: 'c7', is_closed: true, status: 'closed', is_sla_violated: true }));
      expect((await compliance()).sla_compliance_rate as number).toBeLessThan(before);
    });

    it('does not move for an open case, breached or not', async () => {
      const before = await compliance();
      await addCase(caseRow({ subject: 'c8', is_closed: false, is_sla_violated: true }));
      await addCase(caseRow({ subject: 'c9', is_closed: false, is_sla_violated: false }));
      const after = await compliance();
      expect(after.closed_count).toBe(before.closed_count);
      expect(after.sla_met_count).toBe(before.sla_met_count);
    });

    /**
     * The NULL hole this spelling could have had, closed by measurement rather
     * than by argument: `is_sla_violated` declares `defaultValue: false`, so a
     * closed case inserted without the column still lands in the numerator on
     * both drivers. If it did not, `sla_met_count + breached` would stop
     * summing to `closed_count` and compliance would silently under-report.
     */
    it('counts a closed case whose SLA flag was never written', async () => {
      const before = await compliance();
      await addCase(caseRow({ subject: 'c10', is_closed: true, status: 'closed' }));
      const after = await compliance();
      expect(after.closed_count).toBe((before.closed_count as number) + 1);
      expect(after.sla_met_count).toBe((before.sla_met_count as number) + 1);
    });

    /**
     * Numerator and denominator stay in step — the #614 failure mode is a half
     * that scopes differently from the other half, and it returns a plausible
     * number rather than an error.
     */
    /**
     * The ratio is met ÷ closed, in that order, and the executor really
     * evaluates it rather than passing the numerator through. A swapped ratio
     * raises nothing — it returns a number above 1, which a `0%` format prints
     * as a plausible-looking 133%.
     */
    it('computes met over closed, in that order', async () => {
      const row = await compliance();
      expect(row.sla_compliance_rate as number).toBeCloseTo(
        (row.sla_met_count as number) / (row.closed_count as number), 10,
      );
      expect(row.sla_compliance_rate as number).toBeLessThanOrEqual(1);
      expect(row.sla_compliance_rate as number).not.toBe(row.sla_met_count as number);
    });
  });
}

// ───────────────────────── 3. the seeded org, end to end through the widget ──

/**
 * The number in the card. The seeded demo org has 8 closed cases and none of
 * them breached SLA — the generator only ever flags OPEN cases
 * (`slaViolated = !settled && …`) — so the gauge must read 100%. It read 0.0%.
 *
 * The rows come from the SHIPPED seed rather than hand-typed stand-ins, and
 * the binding comes from the SHIPPED widget, so re-pointing the widget or
 * re-seeding the org moves this test instead of leaving it agreeing with
 * itself.
 */
describe('the gauge reads 100% on the seeded demo org', () => {
  type Dataset = { object: string; records: AnyRec[] };
  const seededCases = (CrmSeedData as unknown as Dataset[])
    .filter((d) => d.object === 'crm_case')
    .flatMap((d) => d.records);
  const closedSeeds = seededCases.filter((c) => c.is_closed === true);

  it('seeds 8 closed cases, none of them SLA-breached', () => {
    expect(closedSeeds.length).toBe(8);
    expect(closedSeeds.filter((c) => c.is_sla_violated === true)).toEqual([]);
  });

  it('renders 100% through the shipped widget binding', async () => {
    const ql = (await ObjectQL.create({
      datasources: { default: new InMemoryDriver({ persistence: false }) },
      objects: { crm_case: kase } as never,
    })) as AnyRec;
    try {
      const api = () => (ql as AnyRec).createContext({ isSystem: true });
      for (const rec of seededCases) {
        const row: AnyRec = {};
        for (const c of CASE_COLUMNS) if (rec[c] !== undefined) row[c] = rec[c];
        // Seeded dates are CEL expressions; none of the gauge's columns are
        // dates, so the rows above carry everything this measure reads.
        await api().object('crm_case').insert(row);
      }
      const w = gauge();
      const res = await makeAnalytics(ql).queryDataset(
        CaseDataset as never,
        { measures: [...(w.values as string[]), 'closed_count'], runtimeFilter: w.filter as never } as never,
        { isSystem: true } as never,
      );
      const row = (res.rows ?? [])[0] as AnyRec;
      expect(row.closed_count).toBe(8);
      expect(row.sla_compliance_rate as number).toBeCloseTo(1, 5);
    } finally {
      await (ql as AnyRec)?.close();
    }
  });

  /**
   * What the reader sees, at that value. 1.0 clears the 0.95 target and lands
   * in the success band — while the number the widget used to plot (a 0.0
   * violation rate) would have landed in `danger` under the very same ladder.
   * That mismatch, not the ladder, was the defect.
   */
  it('lands in the success band at 100%, where the old value landed in danger', () => {
    const bandFor = (v: number): string =>
      (gauge().options.thresholds as AnyRec[])
        .filter((t) => v >= (t.value as number))
        .sort((a, b) => (b.value as number) - (a.value as number))[0].color as string;
    expect(bandFor(1)).toBe('success');
    expect(bandFor(0)).toBe('danger');
  });
});
