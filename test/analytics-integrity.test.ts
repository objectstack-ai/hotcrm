// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { isDateMacroToken } from '@objectstack/spec/data';
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
