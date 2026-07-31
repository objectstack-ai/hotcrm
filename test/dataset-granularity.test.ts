// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import stack from '../objectstack.config';

/**
 * Date-bucket guard for the analytics semantic layer (#523).
 *
 * Matrix reports over a date axis need the dataset dimension to declare a
 * `dateGranularity` — that is the only supported place to say "bucket this by
 * month". The v9 single-form migration dropped the old
 * `groupingsAcross[].dateGranularity` declarations and nothing carried them to
 * the new location, so every date axis has been grouping by the raw timestamp
 * (one column per distinct value) ever since.
 *
 * Re-declaring them is blocked on the platform, not on us. On @objectstack
 * 16.x a bucketed dimension makes the surface render EMPTY — strictly worse
 * than the un-bucketed columns — for two independent reasons, both verified
 * against the pinned packages and both fixed in 17.0.0-rc.0:
 *
 *   1. A granular dimension is refused by NativeSQLStrategy, so the query
 *      falls to ObjectQLStrategy → the auto-bridged `executeAggregate`, which
 *      calls `engine.aggregate()` with no ExecutionContext; the sharing
 *      middleware composes `{ id: '__deny_all__' }` for every private object
 *      (upstream #3602/#3597).
 *   2. A `Field.datetime()` column is INTEGER epoch millis in SQLite and 16.x
 *      buckets it with a bare `strftime()`, which returns NULL for every row.
 *
 * So this guard has two faces, and the platform major flips between them:
 *
 *   · on 16.x — assert NOBODY re-declares a bucket (the #500 regression), and
 *     keep the intended buckets recorded below so they are not lost again;
 *   · on 17+  — assert every intended bucket IS declared, and that each matrix
 *     report's date axis carries the bucket that report is named after. The
 *     upgrade cannot go green without finishing the migration.
 *
 * The tables below are the migration's source of truth. Keep them in sync with
 * the surfaces, not with the current platform version.
 */

type AnyRec = Record<string, any>;
type Granularity = 'day' | 'week' | 'month' | 'quarter' | 'year';

/**
 * `dataset.dimension` → the bucket it must declare on @objectstack 17+.
 *
 * A dimension is SHARED: `opportunity_metrics.close_date` feeds the Sales /
 * CRM / Executive revenue trends (month) and `pipeline_coverage_by_quarter`
 * (quarter). Two intents over one field means two dimensions — hence
 * `close_quarter`, which does not exist yet and must be added over the same
 * `close_date` field when the buckets go in.
 */
const INTENDED_BUCKET: Record<string, Granularity> = {
  'lead_metrics.last_contacted_date': 'month',
  'case_metrics.created_date': 'day',
  'account_metrics.created_at': 'month',
  'opportunity_metrics.close_date': 'month',
  'opportunity_metrics.close_quarter': 'quarter',
};

/** Matrix report → the bucket its date axis must carry on @objectstack 17+. */
const REPORT_DATE_AXIS: Record<string, Granularity> = {
  lead_inflow_by_month_source: 'month',
  cases_opened_by_day_priority: 'day',
  pipeline_coverage_by_quarter: 'quarter',
};

/**
 * The packages that own the two gaps: service-analytics (the aggregate bridge)
 * and driver-sqlite-wasm (which carries driver-sql's bucket SQL). `spec` pins
 * the dataset schema itself. The guard flips only once the LOWEST of them is
 * on 17+, so a partial bump cannot half-open the door.
 */
const GAP_OWNERS = [
  '@objectstack/service-analytics',
  '@objectstack/driver-sqlite-wasm',
  '@objectstack/spec',
];

const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as AnyRec;

const majorOf = (name: string): number => {
  const range = pkg.dependencies?.[name] ?? pkg.devDependencies?.[name];
  if (!range) throw new Error(`granularity guard out of date: "${name}" is not a dependency`);
  const m = String(range).match(/(\d+)\./);
  if (!m) throw new Error(`granularity guard cannot read a major out of "${name}": "${range}"`);
  return Number(m[1]);
};

const platformMajor = Math.min(...GAP_OWNERS.map(majorOf));
/** True once the platform honours a bucketed dimension (see the header). */
const bucketsAreHonoured = platformMajor >= 17;

const datasets: AnyRec[] = (stack as any).datasets ?? [];
const reports: AnyRec[] = (stack as any).reports ?? [];
const datasetByName = new Map(datasets.map((d) => [d.name, d]));

const dimensionOf = (ref: string): AnyRec | undefined => {
  const [dataset, dimension] = ref.split('.');
  return (datasetByName.get(dataset)?.dimensions ?? []).find((d: AnyRec) => d.name === dimension);
};

/** Every declared dimension, keyed as `dataset.dimension`. */
const allDimensions: Array<[string, AnyRec]> = datasets.flatMap((ds) =>
  (ds.dimensions ?? []).map((d: AnyRec) => [`${ds.name}.${d.name}`, d] as [string, AnyRec]),
);

/** The date dimensions a report groups across / down, as `dataset.dimension`. */
const dateAxesOf = (report: AnyRec): string[] => {
  const ds = datasetByName.get(report.dataset);
  if (!ds) return [];
  return [...(report.columns ?? []), ...(report.rows ?? [])]
    .map((name: string) => [name, (ds.dimensions ?? []).find((d: AnyRec) => d.name === name)] as const)
    .filter(([, dim]) => dim?.type === 'date')
    .map(([name]) => `${ds.name}.${name}`);
};

describe('the date-bucket migration table stays wired to real metadata', () => {
  it('every intended bucket names a dataset that exists', () => {
    const bad = Object.keys(INTENDED_BUCKET)
      .filter((ref) => !datasetByName.has(ref.split('.')[0]))
      .map((ref) => `${ref}: dataset "${ref.split('.')[0]}" is not defined`);
    expect(bad, bad.join('\n  ')).toEqual([]);
  });

  it('every intended bucket that exists today is a date dimension', () => {
    const bad = Object.keys(INTENDED_BUCKET)
      .map((ref) => [ref, dimensionOf(ref)] as const)
      .filter(([, dim]) => dim && dim.type !== 'date')
      .map(([ref, dim]) => `${ref}: type is "${dim!.type}", expected "date"`);
    expect(bad, bad.join('\n  ')).toEqual([]);
  });

  it('every listed report exists and has exactly one date axis', () => {
    const bad: string[] = [];
    for (const name of Object.keys(REPORT_DATE_AXIS)) {
      const report = reports.find((r) => r.name === name);
      if (!report) {
        bad.push(`${name}: no such report — did it get renamed?`);
        continue;
      }
      const axes = dateAxesOf(report);
      if (axes.length !== 1) bad.push(`${name}: expected 1 date axis, found ${axes.length} [${axes.join(', ')}]`);
    }
    expect(bad, bad.join('\n  ')).toEqual([]);
  });

  it('no dimension declares a bucket outside the table', () => {
    const bad = allDimensions
      .filter(([ref, dim]) => dim.dateGranularity && !(ref in INTENDED_BUCKET))
      .map(([ref, dim]) => `${ref}: declares dateGranularity "${dim.dateGranularity}" but is not in INTENDED_BUCKET`);
    expect(bad, `undeclared bucket intent:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('only date dimensions declare a bucket', () => {
    const bad = allDimensions
      .filter(([, dim]) => dim.dateGranularity && dim.type !== 'date')
      .map(([ref, dim]) => `${ref}: type "${dim.type}" cannot carry dateGranularity "${dim.dateGranularity}"`);
    expect(bad, bad.join('\n  ')).toEqual([]);
  });
});

describe.runIf(!bucketsAreHonoured)('on @objectstack 16.x — buckets must stay undeclared', () => {
  it('no date dimension declares a dateGranularity', () => {
    const declared = allDimensions
      .filter(([, dim]) => dim.type === 'date' && dim.dateGranularity)
      .map(([ref, dim]) => `${ref} → "${dim.dateGranularity}"`);
    expect(
      declared,
      'A dataset dimension declares a dateGranularity while the app is pinned to ' +
        `@objectstack ${platformMajor}.x:\n  ${declared.join('\n  ')}\n\n` +
        'On 16.x that does not bucket the axis — it empties the surface: the granular ' +
        'query leaves NativeSQLStrategy for the aggregate bridge, which drops the ' +
        "caller's ExecutionContext, so sharing composes id = '__deny_all__' for every " +
        'private object (upstream #3602/#3597). A Field.datetime() column additionally ' +
        'buckets to NULL, because SQLite stores it as epoch millis and 16.x formats it ' +
        'with a bare strftime(). Both are fixed in 17.0.0-rc.0. Record the intent in ' +
        'INTENDED_BUCKET instead and declare it with the upgrade (#523).',
    ).toEqual([]);
  });
});

describe.runIf(bucketsAreHonoured)('on @objectstack 17+ — buckets must be declared', () => {
  it('every intended bucket is declared on its dimension', () => {
    const bad: string[] = [];
    for (const [ref, granularity] of Object.entries(INTENDED_BUCKET)) {
      const dim = dimensionOf(ref);
      if (!dim) {
        bad.push(`${ref}: dimension is missing — add it (see INTENDED_BUCKET for why it exists)`);
        continue;
      }
      if (dim.dateGranularity !== granularity) {
        bad.push(`${ref}: dateGranularity is ${JSON.stringify(dim.dateGranularity)}, expected "${granularity}"`);
      }
    }
    expect(
      bad,
      `the platform now honours bucketed dimensions — finish the #523 migration:\n  ${bad.join('\n  ')}`,
    ).toEqual([]);
  });

  it("every matrix report's date axis carries that report's bucket", () => {
    const bad: string[] = [];
    for (const [name, granularity] of Object.entries(REPORT_DATE_AXIS)) {
      const report = reports.find((r) => r.name === name);
      const [axis] = dateAxesOf(report ?? {});
      if (!axis) continue; // reported by the wiring suite above
      const dim = dimensionOf(axis);
      if (dim?.dateGranularity !== granularity) {
        bad.push(
          `${name}: axis "${axis}" buckets by ${JSON.stringify(dim?.dateGranularity)}, expected "${granularity}"` +
            ' — a dimension is shared, so a second intent needs its own dimension over the same field',
        );
      }
    }
    expect(bad, bad.join('\n  ')).toEqual([]);
  });
});
