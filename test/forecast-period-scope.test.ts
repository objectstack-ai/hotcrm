// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ObjectQL } from '@objectstack/objectql';
import { InMemoryDriver } from '@objectstack/driver-memory';
import { AnalyticsService } from '@objectstack/service-analytics';
import stack from '../objectstack.config';
import { ForecastDataset } from '../src/datasets/forecast.dataset';
import { CrmSeedData } from '../src/data/index';

/**
 * `forecast_metrics` is per-period; aggregating it without pinning a period is
 * a double count (#614).
 *
 * `crm_forecast` holds one row per owner PER PERIOD and deliberately holds
 * several periods at once — a current quarter, a current month, and every
 * settled period the seeds ship. `quota_sum` / `closed_sum` / `pipeline_sum` /
 * `commit_sum` are plain `sum` measures, so a query that does not pin the
 * period adds a quarter's quota to a month's quota to last quarter's quota and
 * presents the total as "Quota". That is what `quota_attainment_by_rep` did:
 * on the shipped seeds a rep whose real quarterly quota is 1,500,000 was shown
 * 7,940,000, with attainment inflated from 55% to 89%.
 *
 * Two independent guards, because the two failure modes are different:
 *
 *   • the STRUCTURAL guard reads metadata and fails any surface that leaves the
 *     period ambiguous — that is the one that stops the next widget author (or
 *     the next agent) from re-introducing the bug;
 *   • the RUNTIME guard executes the shipped widget binding through the real
 *     dataset compiler, the real filter-token resolver and a real engine, so
 *     "the filter is present" is backed by "the number that comes back is the
 *     rep's quarterly quota".
 */

type AnyRec = Record<string, any>;

const datasets: AnyRec[] = (stack as any).datasets ?? [];
const reports: AnyRec[] = (stack as any).reports ?? [];
const dashboards: AnyRec[] = (stack as any).dashboards ?? [];

const DATASET = 'forecast_metrics';

/**
 * Measures whose value is only meaningful within ONE period. Derived from the
 * dataset rather than listed by hand, so a measure added later is covered on
 * the day it lands: every `sum` is per-period by construction, and a derived
 * measure inherits the property from its inputs (`attainment` is
 * `closed_sum / quota_sum` — both per-period, so the ratio is too).
 */
const perPeriodMeasures = (() => {
  const ds = datasets.find((d) => d.name === DATASET);
  const measures: AnyRec[] = ds?.measures ?? [];
  const additive = new Set(measures.filter((m) => m.aggregate === 'sum').map((m) => m.name));
  // Fixed-point pass: a derived measure over per-period inputs is per-period.
  for (let changed = true; changed; ) {
    changed = false;
    for (const m of measures) {
      if (additive.has(m.name) || !m.derived) continue;
      if ((m.derived.of ?? []).some((of: string) => additive.has(of))) {
        additive.add(m.name);
        changed = true;
      }
    }
  }
  return additive;
})();

/**
 * Does this binding name exactly one snapshot per group?
 *
 * Two accepted shapes, and neither is negotiable in half:
 *
 *   • GROUPED — `period_label` is on the axis. It is the only single dimension
 *     that is unique per period ("Q3 2026" vs "Aug 2026"), so each output row
 *     is one snapshot. `period` + `period_start` together do the same job.
 *   • PINNED  — the filter fixes `period` AND `period_start` to a single value.
 *     `period` alone still sums every quarter ever snapshotted; `period_start`
 *     alone still merges the quarter row with the month row that opens the same
 *     quarter (Q3 and July both start on the 1st). Only the pair is one row.
 *
 * A range (`$gte` / `$lte` / `$in`) on `period_start` is NOT a pin: it spans
 * periods again, which is the whole defect.
 */
function periodScope(binding: AnyRec): { ok: boolean; why: string } {
  const axis = new Set<string>([
    ...(binding.dimensions ?? []),
    ...(binding.rows ?? []),
    ...(binding.columns ?? []),
  ]);
  if (axis.has('period_label')) return { ok: true, why: 'grouped by period_label' };
  if (axis.has('period') && axis.has('period_start')) {
    return { ok: true, why: 'grouped by period + period_start' };
  }

  const filter: AnyRec = binding.filter ?? binding.runtimeFilter ?? {};
  const isScalarPin = (v: unknown) => v != null && (typeof v === 'string' || typeof v === 'number');
  if (isScalarPin(filter.period) && isScalarPin(filter.period_start)) {
    return { ok: true, why: 'filtered to one period + period_start' };
  }
  return {
    ok: false,
    why:
      'neither grouped by a period dimension nor filtered to a single '
      + `(period, period_start) — got dimensions [${[...axis].join(', ') || '—'}] `
      + `and filter ${JSON.stringify(filter)}`,
  };
}

/** Every dataset-bound surface in the app, flattened to one shape. */
const bindings: Array<{ where: string; binding: AnyRec }> = [
  ...reports.flatMap((r) =>
    r.type === 'joined' && Array.isArray(r.blocks)
      ? r.blocks.map((b: AnyRec) => ({ where: `report ${r.name}/${b.name}`, binding: b }))
      : [{ where: `report ${r.name}`, binding: r }],
  ),
  ...dashboards.flatMap((d) =>
    (d.widgets ?? []).map((w: AnyRec) => ({ where: `widget ${d.name}/${w.id}`, binding: w })),
  ),
];

describe('every forecast_metrics consumer pins a single period (#614)', () => {
  const forecastBindings = bindings.filter(
    ({ binding }) =>
      binding.dataset === DATASET
      && [...(binding.values ?? [])].some((v: string) => perPeriodMeasures.has(v)),
  );

  it('the dataset still declares the per-period measures this guard protects', () => {
    // A guard that silently matches nothing is worse than no guard. If the
    // measures are renamed, this fails instead of quietly passing forever.
    expect([...perPeriodMeasures].sort()).toEqual(
      ['attainment', 'closed_sum', 'commit_sum', 'pipeline_sum', 'quota_sum'],
    );
  });

  it('the sales quota table is one of the surfaces under guard', () => {
    expect(forecastBindings.map((b) => b.where)).toContain(
      'widget sales_dashboard/quota_attainment_by_rep',
    );
  });

  it('no surface sums forecast measures across periods', () => {
    const bad = forecastBindings
      .map(({ where, binding }) => ({ where, ...periodScope(binding) }))
      .filter((r) => !r.ok)
      .map((r) => `${r.where}: ${r.why}`);
    expect(
      bad,
      'these surfaces add one period\'s snapshot to another\'s — group by '
        + `period_label, or filter to one (period, period_start):\n  ${bad.join('\n  ')}`,
    ).toEqual([]);
  });
});

// ─── Runtime: the numbers the widget actually produces ──────────────────

/** The shipped widget, read from metadata so the test cannot drift from it. */
const quotaWidget: AnyRec = (dashboards.find((d) => d.name === 'sales_dashboard')?.widgets ?? [])
  .find((w: AnyRec) => w.id === 'quota_attainment_by_rep');

const forecastSeed = CrmSeedData.find((s: any) => s.object === 'crm_forecast') as
  | { records: AnyRec[] }
  | undefined;

const pad = (n: number) => String(n).padStart(2, '0');
const isoDate = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const now = new Date();
const currentQuarterStart = isoDate(
  new Date(Date.UTC(now.getUTCFullYear(), Math.floor(now.getUTCMonth() / 3) * 3, 1)),
);

/**
 * Only the columns the dataset reads. `crm_forecast`'s real schema carries
 * formulas and CEL-valued seed columns (`snapshot_date: cel\`today()\``) that
 * belong to the object suite, not to this one; the analytics contract under
 * test is "which rows does the filter select and what do they sum to".
 */
const ANALYTICS_COLUMNS = [
  'period', 'period_label', 'period_start', 'quota',
  'closed_amount', 'pipeline_amount', 'commit_amount',
] as const;

const makeEngine = () =>
  ObjectQL.create({
    datasources: { default: new InMemoryDriver({ persistence: false }) },
    objects: {
      crm_forecast: {
        name: 'crm_forecast',
        fields: {
          id: { type: 'text' },
          owner_id: { type: 'text' },
          period: { type: 'text' },
          period_label: { type: 'text' },
          period_start: { type: 'date' },
          quota: { type: 'number' },
          closed_amount: { type: 'number' },
          pipeline_amount: { type: 'number' },
          commit_amount: { type: 'number' },
        },
      },
    } as never,
  });

/**
 * The current-quarter quota, as it reaches a live table.
 *
 * Not from the seeds, and that is the point (#702): the seeds ship SETTLED
 * quarters only, because `forecast_snapshot` owns the current-quarter window
 * and two producers in one window is what left a phantom ownerless duplicate
 * there. So the current-quarter row in the fixture below is the one the SWEEP
 * opens — and the sweep never writes `quota` (see the flow header), which
 * leaves it exactly where `crm_forecast` says it lives: maintained by hand
 * until a quota model exists.
 *
 * A number, then, rather than a seeded value — and one that has to be here
 * regardless, because the widget's whole subject is quota vs. closed.
 */
const CURRENT_QUARTER_QUOTA = 1_500_000;

describe('quota_attainment_by_rep over the real seeds plus one sweep (#614)', () => {
  let ql: Awaited<ReturnType<typeof makeEngine>>;
  let analytics: AnalyticsService;
  /** Every filter the analytics service handed the engine, in order. */
  let filtersSeen: unknown[];

  /** The two reps the seeds are replayed for. */
  const REPS = ['rep_alice', 'rep_bob'] as const;

  beforeAll(async () => {
    ql = await makeEngine();
    const api = ql.createContext({ isSystem: true });

    // The seed file ships ONE unowned set of snapshots (`owner_id` is backfilled to
    // the active user at runtime). Replaying it per rep is what the live table
    // holds: the same period ladder, once per owner.
    for (const rep of REPS) {
      for (const rec of forecastSeed?.records ?? []) {
        const row: AnyRec = { owner_id: rep };
        for (const col of ANALYTICS_COLUMNS) row[col] = rec[col] ?? 0;
        await api.object('crm_forecast').insert(row);
      }
    }

    // "…plus one sweep run": `forecast_snapshot` OPENS the current-quarter row
    // — the seeds no longer ship one (#702) — and writes the four amounts into
    // it, never `quota`. Modelled here as the write itself rather than by
    // re-running the flow: `test/flow-scheduled.test.ts` owns the flow's
    // behaviour, this file owns what the dashboard reads afterwards. The quota
    // arrives the only way it can, by hand.
    for (const rep of REPS) {
      await api.object('crm_forecast').insert({
        owner_id: rep,
        period: 'quarter',
        period_label: 'current quarter',
        period_start: currentQuarterStart,
        quota: CURRENT_QUARTER_QUOTA,
        closed_amount: 900000, pipeline_amount: 2500000, commit_amount: 1200000,
      });
    }

    filtersSeen = [];
    analytics = new AnalyticsService({
      // The same bridge `AnalyticsServicePlugin` auto-wires to the "data"
      // service at boot, so the filter this test observes is the filter the
      // engine really receives in the app.
      executeAggregate: async (objectName, { groupBy, aggregations, filter, timezone, context }) => {
        filtersSeen.push(filter);
        return (ql as any).aggregate(objectName, {
          where: filter,
          groupBy,
          aggregations: aggregations?.map((a: AnyRec) => ({
            function: a.method, field: a.field, alias: a.alias,
          })),
          timezone,
          context,
        });
      },
      queryCapabilities: () => ({ nativeSql: false, objectqlAggregate: true, inMemory: false }),
    });
  });

  afterAll(async () => {
    await ql?.close();
  });

  const runWidget = async (runtimeFilter?: AnyRec) =>
    (await analytics.queryDataset(
      ForecastDataset as never,
      {
        dimensions: quotaWidget.dimensions,
        measures: quotaWidget.values,
        ...(runtimeFilter ? { runtimeFilter: runtimeFilter as never } : {}),
      },
      { isSystem: true } as never,
    )).rows as AnyRec[];

  it('the table really does hold several periods for one owner', () => {
    // The premise of the whole issue. If the fixture ever collapsed to a single
    // period, the assertions below would pass for the wrong reason.
    expect((forecastSeed?.records ?? []).length).toBeGreaterThan(1);
  });

  it('the seeds contribute no current-quarter row — the sweep owns that window (#702)', () => {
    // The other premise, and the one that changed. A seeded row here could not
    // be matched by the sweep's owner-scoped lookup, so the sweep would open a
    // second row beside it and this table would show a phantom, ownerless
    // duplicate for the current quarter after every re-seeded boot.
    const trespassers = (forecastSeed?.records ?? [])
      .filter((r) => r.period === 'quarter' && r.period_start === currentQuarterStart)
      .map((r) => String(r.seed_key));
    expect(trespassers, `seeded current-quarter rows: ${trespassers.join(', ')}`).toEqual([]);
  });

  it('unpinned, the measures add every snapshot together — the #614 defect', async () => {
    const rows = await runWidget();
    const alice = rows.find((r) => r.owner === 'rep_alice')!;
    const quotaAcrossPeriods =
      (forecastSeed?.records ?? []).reduce((sum, r) => sum + Number(r.quota ?? 0), 0)
      + CURRENT_QUARTER_QUOTA;

    expect(rows).toHaveLength(REPS.length);
    expect(alice.quota_sum).toBe(quotaAcrossPeriods);
    // Concretely, and this is the number the dashboard used to print: every
    // period's quota stacked into one "Quota" cell.
    expect(alice.quota_sum).toBeGreaterThan(CURRENT_QUARTER_QUOTA);
  });

  it('the shipped widget filter yields the rep\'s quarterly quota, not the sum of snapshots', async () => {
    const rows = await runWidget(quotaWidget.filter);

    expect(rows).toHaveLength(REPS.length);
    for (const rep of REPS) {
      const row = rows.find((r) => r.owner === rep)!;
      expect(row.quota_sum, `${rep} quota`).toBe(CURRENT_QUARTER_QUOTA);
      // The sweep's row, and only it — one snapshot per owner in this window.
      expect(row.closed_sum, `${rep} closed`).toBe(900000);
      expect(row.attainment, `${rep} attainment`).toBeCloseTo(900000 / CURRENT_QUARTER_QUOTA, 10);
    }
  });

  it('the {current_quarter_start} macro is resolved before the filter reaches the engine', async () => {
    filtersSeen = [];
    await runWidget(quotaWidget.filter);

    const leaves: string[] = [];
    const walk = (n: unknown) => {
      if (typeof n === 'string') leaves.push(n);
      else if (Array.isArray(n)) n.forEach(walk);
      else if (n && typeof n === 'object') Object.values(n).forEach(walk);
    };
    filtersSeen.forEach(walk);

    expect(filtersSeen.length).toBeGreaterThan(0);
    // An unresolved token would reach the driver as the literal string
    // "{current_quarter_start}", compare as text and match nothing — an empty
    // table indistinguishable from "no data yet". That WAS the list path's
    // behaviour on 16.1.0, which is why this assertion was written for the
    // analytics path alone; since 17.0.0-rc.0 the ObjectQL read path resolves
    // the same macro too (#3582), and `test/forecast-current-quarter-view.test.ts`
    // pins that half. Both paths are asserted, neither assumed.
    expect(leaves.filter((v) => /^\{.+\}$/.test(v))).toEqual([]);
    expect(leaves).toContain(currentQuarterStart);
  });
});
