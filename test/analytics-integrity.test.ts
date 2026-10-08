// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import stack from './helpers/composed-stack';

/**
 * Analytics metadata guards (#492).
 *
 * `os validate` / `build` check that a report HAS a chart and a dataset name.
 * Whether the dataset and its dimensions and measures resolve is checked by
 * `objectstack lint --strict` (`pnpm lint`; see the retired block below), which
 * catches the defect this file was first written for: case/opportunity report
 * charts named measures (`case_number`, `amount`) that exist in no dataset, so
 * the yAxis rendered empty. What stays here, each rule a real defect:
 *
 *  - churn/opportunity reports computed ISO dates at module load, freezing
 *    "last 30 days" into dist/objectstack.json at whatever day the artifact
 *    was built;
 *  - src/cubes defined 7 cubes that nothing referenced, duplicating the
 *    datasets' metric definitions.
 */

type AnyRec = Record<string, any>;
const reports: AnyRec[] = (stack as any).reports ?? [];
const dashboards: AnyRec[] = (stack as any).dashboards ?? [];

/** A report or a joined-report block — anything carrying a dataset binding. */
const reportBlocks = (r: AnyRec): AnyRec[] =>
  r.type === 'joined' && Array.isArray(r.blocks)
    ? r.blocks.map((b: AnyRec) => ({ ...b, __parent: r.name }))
    : [r];
const allBlocks = reports.flatMap(reportBlocks);
const labelOf = (b: AnyRec) => (b.__parent ? `${b.__parent}/${b.name}` : b.name);

// ⚰️ RETIRED (#1584): "every report block names a defined dataset" (A1),
// "every chart xAxis is a dimension of the report dataset" (A3) and "every
// rows / columns / values entry resolves against the dataset" (A4).
// `objectstack lint --strict` reports them as `chart-dataset-unknown`,
// `chart-dimension-unknown` and `chart-measure-unknown` — on a charted, a
// chartless and a joined-report block alike — and `pnpm lint` fails on each.

describe('metric tiles carry no fabricated trend deltas', () => {
  /**
   * A period-over-period delta is a MEASUREMENT: it can only come from
   * comparing this period's query result against the previous period's. A
   * number sitting in static metadata was, by construction, typed by hand — no
   * query produced it, nothing recomputes it, and it keeps asserting "+12.5% vs
   * last month" forever, including on a freshly seeded database where it is
   * provably false. The executive dashboard dropped its own on exactly this
   * reasoning (#500); the CRM, Sales and Service tiles kept theirs until #587.
   *
   * The honest source of a delta is a real comparison query (widget
   * `compareTo`) once the renderer supports it for dataset metrics. Until then
   * a tile shows the number it actually measured and nothing else, so this
   * guard rejects the literal — anywhere in a widget, under any nesting, since
   * the console reads `options` as a free-form bag and a hand-written trend can
   * reappear at any depth.
   */

  /** Every `[path, value]` pair whose key is `trend`, at any depth. */
  function* trendDeclarations(node: unknown, path: string): Generator<[string, unknown]> {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      for (const [i, item] of node.entries()) yield* trendDeclarations(item, `${path}[${i}]`);
      return;
    }
    for (const [k, v] of Object.entries(node)) {
      if (k === 'trend') yield [`${path}.${k}`, v];
      yield* trendDeclarations(v, `${path}.${k}`);
    }
  }

  /** `trend: 12.5` and `trend: { value: 12.5, … }` are both hand-typed deltas. */
  const carriesLiteralNumber = (trend: unknown): boolean =>
    typeof trend === 'number' ||
    (!!trend && typeof trend === 'object' &&
      Object.values(trend as AnyRec).some((v) => typeof v === 'number'));

  it('no dashboard widget declares a literal trend value', () => {
    const bad: string[] = [];
    for (const d of dashboards) {
      for (const w of d.widgets ?? []) {
        for (const [path, trend] of trendDeclarations(w, `${d.name}/${w.id}`)) {
          if (carriesLiteralNumber(trend)) {
            bad.push(`${path} = ${JSON.stringify(trend)}`);
          }
        }
      }
    }
    expect(
      bad,
      'hardcoded period-over-period deltas — a trend must be measured by a '
        + `comparison query, not typed into metadata:\n  ${bad.join('\n  ')}`,
    ).toEqual([]);
  });
});

describe('time windows stay relative at runtime', () => {
  /**
   * A filter value like `2026-06-29` in the metadata means someone computed
   * "30 days ago" at module load: the value is frozen into the built artifact
   * and the report window silently stops rolling. Relative windows must use
   * the platform's date-macro placeholders (`{30_days_ago}`,
   * `{current_year_start}`, …) which resolve per-query.
   */
  const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}/;

  /** Yield every leaf string inside a filter tree, with its dotted path. */
  function* filterLeaves(node: unknown, path: string): Generator<[string, string]> {
    if (typeof node === 'string') { yield [path, node]; return; }
    if (Array.isArray(node)) {
      for (const [i, item] of node.entries()) yield* filterLeaves(item, `${path}[${i}]`);
      return;
    }
    if (node && typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) yield* filterLeaves(v, `${path}.${k}`);
    }
  }

  const filterSources: Array<[string, AnyRec | undefined]> = [
    ...allBlocks.map((b): [string, AnyRec | undefined] => [`report ${labelOf(b)}`, b.runtimeFilter ?? b.filter]),
    ...dashboards.flatMap((d) =>
      (d.widgets ?? []).map((w: AnyRec): [string, AnyRec | undefined] => [`widget ${d.name}/${w.id}`, w.filter])),
  ];

  it('no report or widget filter carries a build-time absolute date', () => {
    const bad: string[] = [];
    for (const [where, filter] of filterSources) {
      for (const [path, value] of filterLeaves(filter ?? {}, '')) {
        if (ISO_DATE_RE.test(value)) bad.push(`${where}${path} = "${value}"`);
      }
    }
    expect(bad, `absolute dates frozen into metadata:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  // ⚰️ RETIRED (#1584): "no filter comparand is a bare date-range PRESET name"
  // (A8). `objectstack lint --strict` reports a preset name used as a
  // comparand — bare, under `$eq` or inside `$in`, on a widget or a report —
  // as `filter-preset-comparand` (objectstack#8690), and `pnpm lint` fails on it.
});

describe('no duplicate metric layer', () => {
  it('the stack registers no standalone analytics cubes (datasets are the semantic layer)', () => {
    // ADR-0021: widgets and reports bind to datasets; the analytics service
    // compiles each dataset into its cube internally. A second, hand-written
    // cube layer duplicates every metric definition and drifts (it did:
    // `crm_opportunity.amount` vs `opportunity_metrics.total_amount`).
    const cubes: AnyRec[] = (stack as any).analyticsCubes ?? [];
    expect(
      cubes.map((c) => c.name),
      'unreferenced cube definitions duplicate the dataset layer',
    ).toEqual([]);
  });
});
