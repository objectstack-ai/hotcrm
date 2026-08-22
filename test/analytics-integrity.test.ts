// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { isDateMacroToken } from '@objectstack/spec/data';
import { DATE_RANGE_PRESETS } from '@objectstack/spec/ui';
import stack from '../objectstack.config';

/**
 * Analytics metadata guards (#492).
 *
 * `os validate` / `build` check that a report HAS a chart and a dataset name,
 * but never that the chart's axes resolve to measures/dimensions the dataset
 * actually defines, nor that filter time-windows stay relative at runtime.
 * Each rule below was a real defect:
 *
 *  - case/opportunity report charts named measures (`case_number`, `amount`)
 *    that exist in no dataset — the yAxis rendered empty;
 *  - churn/opportunity reports computed ISO dates at module load, freezing
 *    "last 30 days" into dist/objectstack.json at whatever day the artifact
 *    was built;
 *  - src/cubes defined 7 cubes that nothing referenced, duplicating the
 *    datasets' metric definitions.
 */

type AnyRec = Record<string, any>;
const datasets: AnyRec[] = (stack as any).datasets ?? [];
const reports: AnyRec[] = (stack as any).reports ?? [];
const dashboards: AnyRec[] = (stack as any).dashboards ?? [];

const datasetByName = new Map(datasets.map((d) => [d.name, d]));
const measuresOf = (dataset: string): Set<string> =>
  new Set((datasetByName.get(dataset)?.measures ?? []).map((m: AnyRec) => m.name));
const dimensionsOf = (dataset: string): Set<string> =>
  new Set((datasetByName.get(dataset)?.dimensions ?? []).map((d: AnyRec) => d.name));

/** A report or a joined-report block — anything carrying a dataset binding. */
const reportBlocks = (r: AnyRec): AnyRec[] =>
  r.type === 'joined' && Array.isArray(r.blocks)
    ? r.blocks.map((b: AnyRec) => ({ ...b, __parent: r.name }))
    : [r];
const allBlocks = reports.flatMap(reportBlocks);
const labelOf = (b: AnyRec) => (b.__parent ? `${b.__parent}/${b.name}` : b.name);

describe('report dataset bindings resolve', () => {
  it('every report block names a defined dataset', () => {
    const bad = allBlocks
      .filter((b) => b.dataset && !datasetByName.has(b.dataset))
      .map((b) => `${labelOf(b)}: dataset "${b.dataset}" is not defined`);
    expect(bad, bad.join('\n  ')).toEqual([]);
  });

  it('every chart yAxis is a measure of the report dataset', () => {
    const bad: string[] = [];
    for (const b of allBlocks) {
      if (!b.chart?.yAxis || !b.dataset) continue;
      if (!measuresOf(b.dataset).has(b.chart.yAxis)) {
        bad.push(`${labelOf(b)}: yAxis "${b.chart.yAxis}" is not a measure of "${b.dataset}"`);
      }
    }
    expect(bad, `chart yAxis names a missing measure:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('every chart xAxis is a dimension of the report dataset', () => {
    const bad: string[] = [];
    for (const b of allBlocks) {
      if (!b.chart?.xAxis || !b.dataset) continue;
      if (!dimensionsOf(b.dataset).has(b.chart.xAxis)) {
        bad.push(`${labelOf(b)}: xAxis "${b.chart.xAxis}" is not a dimension of "${b.dataset}"`);
      }
    }
    expect(bad, `chart xAxis names a missing dimension:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('every rows / columns / values entry resolves against the dataset', () => {
    const bad: string[] = [];
    for (const b of allBlocks) {
      if (!b.dataset || !datasetByName.has(b.dataset)) continue;
      const dims = dimensionsOf(b.dataset);
      const meas = measuresOf(b.dataset);
      for (const d of [...(b.rows ?? []), ...(b.columns ?? [])]) {
        if (!dims.has(d)) bad.push(`${labelOf(b)}: dimension "${d}" not in "${b.dataset}"`);
      }
      for (const v of b.values ?? []) {
        if (!meas.has(v)) bad.push(`${labelOf(b)}: measure "${v}" not in "${b.dataset}"`);
      }
    }
    expect(bad, `report bindings name missing dataset members:\n  ${bad.join('\n  ')}`).toEqual([]);
  });
});

describe('dashboard widget bindings resolve', () => {
  it('every widget dataset / values / dimensions entry resolves', () => {
    const bad: string[] = [];
    for (const d of dashboards) {
      for (const w of d.widgets ?? []) {
        if (!w.dataset) continue;
        if (!datasetByName.has(w.dataset)) {
          bad.push(`${d.name}/${w.id}: dataset "${w.dataset}" is not defined`);
          continue;
        }
        const dims = dimensionsOf(w.dataset);
        const meas = measuresOf(w.dataset);
        for (const dim of w.dimensions ?? []) {
          if (!dims.has(dim)) bad.push(`${d.name}/${w.id}: dimension "${dim}" not in "${w.dataset}"`);
        }
        for (const v of w.values ?? []) {
          if (!meas.has(v)) bad.push(`${d.name}/${w.id}: measure "${v}" not in "${w.dataset}"`);
        }
      }
    }
    expect(bad, `widget bindings name missing dataset members:\n  ${bad.join('\n  ')}`).toEqual([]);
  });
});

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
  const MACRO_RE = /^\$?\{([a-zA-Z0-9_]+)\}$/;

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

  it('no filter comparand is a bare date-range PRESET name (objectstack#8690)', () => {
    // A preset name is the picker's vocabulary, not the query layer's. The
    // console lowers `last_30_days` into `{ from: '{30_days_ago}', to:
    // '{today}' }` before any filter is sent; a preset name written straight
    // into metadata never gets that lowering. It is not a `{macro}` either, so
    // the resolver does not reject it — it reaches the driver as a literal
    // string, compares false against every row, and the query answers HTTP 200
    // with ZERO rows and no diagnostic. The symptom is an all-zero dashboard,
    // indistinguishable at a glance from the #460 defect that cost this
    // dashboard its date picker for a release. Filed upstream as
    // objectstack#8690; guarded here because the repair is one grep away.
    const presets = new Set<string>(DATE_RANGE_PRESETS as readonly string[]);
    const bad: string[] = [];
    for (const [where, filter] of filterSources) {
      for (const [path, value] of filterLeaves(filter ?? {}, '')) {
        if (presets.has(value)) {
          bad.push(`${where}${path} = "${value}" — write the macro bounds, e.g. { $gte: '{30_days_ago}' }`);
        }
      }
    }
    expect(bad, `preset names used as filter comparands:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('every {placeholder} in a temporal filter position is a recognised date macro', () => {
    const bad: string[] = [];
    for (const [where, filter] of filterSources) {
      for (const [path, value] of filterLeaves(filter ?? {}, '')) {
        const m = value.match(MACRO_RE);
        // `{current_user_id}` and friends belong to view filters, not these
        // dataset filters — anything brace-wrapped here must be a date macro.
        if (m && !isDateMacroToken(m[1])) bad.push(`${where}${path} = "${value}"`);
      }
    }
    expect(bad, `unrecognised date-macro placeholders:\n  ${bad.join('\n  ')}`).toEqual([]);
  });
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
