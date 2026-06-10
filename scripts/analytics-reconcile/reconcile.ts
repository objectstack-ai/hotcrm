// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.
//
// ADR-0021 Phase 2 — read-only analytics reconciliation (关键兜底 / hard gate).
//
// For every dual-form presentation (a report / dashboard widget that carries
// BOTH the legacy inline query AND the new `dataset` binding), run BOTH paths
// against the SAME engine and assert they return identical numbers. This is the
// safety net that catches an AI migration silently dropping a filter, flipping
// an aggregate口径 (count vs count_distinct), or pointing at the wrong field /
// relationship. It ONLY verifies — it never rewrites — and is the gate that
// must be green before the inline form is deleted (single-form convergence).
//
// Engine-agnostic on purpose: this module imports TYPES only. The caller injects
// the two executors (legacy `aggregate()` + dataset `queryDataset()`) bound to a
// real booted kernel — see app-todo.ts for the wiring.

import type { Dashboard, DashboardWidget, Dataset, Report } from '@objectstack/spec/ui';
import type { FilterCondition } from '@objectstack/spec/data';
import type { DatasetSelection } from '@objectstack/spec/contracts';

/** A groupBy item — a plain field, or a date field bucketed by a granularity. */
export type GroupByItem = string | { field: string; dateGranularity: string };

/** The legacy inline-query path, lowered to an ObjectQL `aggregate()` call. */
export interface OldAggregateSpec {
  objectName: string;
  filter?: FilterCondition;
  groupBy: GroupByItem[];
  aggregations: Array<{ field: string; method: string; alias: string }>;
}

/** The field name a groupBy item groups on (the key the engine returns rows under). */
function groupByField(g: GroupByItem): string {
  return typeof g === 'string' ? g : g.field;
}

/** The executors the caller binds to a booted kernel. */
export interface ReconcileExecutors {
  /** Legacy path — `engine.aggregate(object, { where, groupBy, aggregations })`. */
  runAggregate(spec: OldAggregateSpec): Promise<Record<string, unknown>[]>;
  /** New path — `analytics.queryDataset(dataset, selection)`. */
  runDataset(dataset: Dataset, selection: DatasetSelection): Promise<Record<string, unknown>[]>;
  /**
   * Resolve `{date-macro}` placeholders in a filter to concrete values BEFORE
   * both paths run — mirroring the renderer. Applied identically to both forms,
   * so the resolved value is arbitrary; what matters is the two paths see the
   * SAME concrete filter (no normalizer-drop artifact on unparseable strings).
   */
  resolveFilter?: (filter: FilterCondition | undefined) => FilterCondition | undefined;
}

export interface WidgetReconcileResult {
  widgetId: string;
  /**
   * - `ok`       — both forms returned identical numbers.
   * - `mismatch` — numbers diverged (or a path threw). FAILS the gate.
   * - `skipped`  — dual-form but not numerically reconcilable here (e.g. a
   *                multi-dimension widget vs a single-categoryField legacy form).
   * - `pending`  — still inline-only; not yet dataset-bound (coverage gap, not a failure).
   */
  status: 'ok' | 'mismatch' | 'skipped' | 'pending';
  issues: string[];
  /** Canonical {dimsKey → measureValues[]} maps for both paths (for diagnostics). */
  oldRows?: Record<string, (number | null)[]>;
  newRows?: Record<string, (number | null)[]>;
}

const NO_DIMS = '∅';
const DIM_SEP = '∥';
/** Relative tolerance for float measure comparison (counts are exact). */
const EPSILON = 1e-9;

/**
 * A widget is reconcilable only when it carries BOTH forms: the legacy inline
 * `object` query AND the new `dataset` binding with at least one measure name.
 */
export function isReconcilableWidget(
  w: DashboardWidget,
): w is DashboardWidget & { object: string; dataset: string; values: string[] } {
  return (
    typeof w.object === 'string' &&
    typeof w.dataset === 'string' &&
    Array.isArray(w.values) &&
    w.values.length > 0
  );
}

/**
 * Lower a widget's LEGACY inline fields to an aggregate spec — derived purely
 * from `object` / `categoryField` / `valueField` / `aggregate` / `measures` /
 * `filter`, NOT from the dataset. That independence is the whole point: if the
 * dataset was authored to mean something different, the numbers diverge here.
 */
export function deriveOldAggregate(w: DashboardWidget): OldAggregateSpec {
  let groupBy: GroupByItem[] = w.categoryField
    ? [w.categoryGranularity
        ? { field: w.categoryField, dateGranularity: w.categoryGranularity }
        : w.categoryField]
    : [];
  // hotcrm pivot widgets encode their grouping in `options.rowField` /
  // `options.columnField` (not the schema's `categoryField`). Read them so a
  // pivot reconciles against its dataset `dimensions: [rowField, columnField]`.
  if (groupBy.length === 0) {
    const o = w.options as { rowField?: string; columnField?: string } | undefined;
    if (o && (o.rowField || o.columnField)) {
      groupBy = [o.rowField, o.columnField].filter((x): x is string => typeof x === 'string');
    }
  }
  const aggregations: OldAggregateSpec['aggregations'] = [];
  if (w.measures && w.measures.length > 0) {
    w.measures.forEach((m, i) => {
      aggregations.push({ method: m.aggregate ?? 'count', field: m.valueField ?? '*', alias: `m${i}` });
    });
  } else {
    aggregations.push({ method: w.aggregate ?? 'count', field: w.valueField ?? '*', alias: 'm0' });
  }
  return { objectName: w.object as string, filter: w.filter, groupBy, aggregations };
}

/** Build the dataset selection from the widget's `dimensions` / `values` / `filter`. */
export function deriveSelection(w: DashboardWidget): DatasetSelection {
  const dimensions = w.dimensions ?? [];
  const selection: DatasetSelection = {
    dimensions,
    measures: w.values as string[],
    runtimeFilter: w.filter,
  };
  // Mirror the legacy `categoryGranularity` as a timeDimension so the dataset
  // path buckets the date dimension identically (ObjectQLStrategy honours it).
  if (w.categoryGranularity && dimensions.length === 1) {
    selection.timeDimensions = [{ dimension: dimensions[0], granularity: w.categoryGranularity }];
  }
  return selection;
}

function toNum(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Stable key for a row's dimension tuple, ordered by `dimKeys`. */
function dimsKeyOf(row: Record<string, unknown>, dimKeys: string[]): string {
  if (dimKeys.length === 0) return NO_DIMS;
  return dimKeys.map((k) => String(row[k] ?? '∄')).join(DIM_SEP);
}

/** Canonicalize rows into {dimsKey → [measure values in `measureKeys` order]}. */
function normalize(
  rows: Record<string, unknown>[],
  dimKeys: string[],
  measureKeys: string[],
): Record<string, (number | null)[]> {
  const out: Record<string, (number | null)[]> = {};
  for (const row of rows) {
    out[dimsKeyOf(row, dimKeys)] = measureKeys.map((m) => toNum(row[m]));
  }
  return out;
}

function numbersEqual(a: number | null, b: number | null): boolean {
  if (a === null || b === null) return a === b;
  if (a === b) return true;
  const scale = Math.max(Math.abs(a), Math.abs(b), 1);
  return Math.abs(a - b) <= EPSILON * scale;
}

/** Diff two canonical maps; returns human-readable issue strings (empty = match). */
function diff(
  oldMap: Record<string, (number | null)[]>,
  newMap: Record<string, (number | null)[]>,
): string[] {
  const issues: string[] = [];
  const keys = new Set([...Object.keys(oldMap), ...Object.keys(newMap)]);
  for (const key of keys) {
    const o = oldMap[key];
    const n = newMap[key];
    const label = key === NO_DIMS ? '(scalar)' : key;
    if (!o) { issues.push(`group "${label}": present in dataset path but missing from legacy path (new=${JSON.stringify(n)})`); continue; }
    if (!n) { issues.push(`group "${label}": present in legacy path but missing from dataset path (old=${JSON.stringify(o)})`); continue; }
    if (o.length !== n.length) { issues.push(`group "${label}": measure count differs (old=${o.length} new=${n.length})`); continue; }
    for (let i = 0; i < o.length; i++) {
      if (!numbersEqual(o[i], n[i])) issues.push(`group "${label}" measure[${i}]: legacy=${o[i]} dataset=${n[i]}`);
    }
  }
  return issues;
}

/** Reconcile a single dual-form widget against its dataset. */
export async function reconcileWidget(
  w: DashboardWidget,
  dataset: Dataset | undefined,
  exec: ReconcileExecutors,
): Promise<WidgetReconcileResult> {
  if (!isReconcilableWidget(w)) {
    return { widgetId: w.id, status: 'skipped', issues: ['not dual-form (missing object or dataset/values)'] };
  }
  if (!dataset) {
    return { widgetId: w.id, status: 'mismatch', issues: [`dataset "${w.dataset}" not found in registry`] };
  }
  const dims = w.dimensions ?? [];
  if (dims.length > 1 && w.categoryField) {
    return { widgetId: w.id, status: 'skipped', issues: ['multi-dimension widget cannot reconcile against single categoryField legacy form'] };
  }
  // Cross-object (relationship-traversal) dimension: a selected dimension whose
  // dataset field is dotted (e.g. `crm_account.industry`). The legacy inline
  // `categoryField` had no server-side join (engine.aggregate can't traverse a
  // lookup) — it was expanded client-side — so there is NO legacy server path to
  // reconcile against. The dataset binding is the first server-side join (the
  // ADR's headline win); skip it rather than flag a non-existent baseline.
  const crossObject =
    (typeof w.categoryField === 'string' && w.categoryField.includes('.')) ||
    dims.some((name) => (dataset.dimensions.find((d) => d.name === name)?.field ?? '').includes('.'));
  if (crossObject) {
    return { widgetId: w.id, status: 'skipped', issues: ['cross-object relationship dimension — no legacy server-side join to reconcile (dataset enables it)'] };
  }

  // Resolve date macros once, then feed the identical filter to both paths.
  const wResolved = exec.resolveFilter
    ? ({ ...w, filter: exec.resolveFilter(w.filter) } as DashboardWidget)
    : w;
  const oldSpec = deriveOldAggregate(wResolved);
  const selection = deriveSelection(wResolved);

  let oldRaw: Record<string, unknown>[];
  let newRaw: Record<string, unknown>[];
  try {
    oldRaw = await exec.runAggregate(oldSpec);
  } catch (e) {
    return { widgetId: w.id, status: 'mismatch', issues: [`legacy aggregate threw: ${(e as Error).message}`] };
  }
  try {
    newRaw = await exec.runDataset(dataset, selection);
  } catch (e) {
    return { widgetId: w.id, status: 'mismatch', issues: [`dataset query threw: ${(e as Error).message}`] };
  }

  // Legacy rows key dimensions by the raw field name (categoryField); dataset
  // rows key them by the dimension NAME. They share the same value domain, so
  // canonicalize each by its own key set, then compare positionally.
  const oldMap = normalize(oldRaw, oldSpec.groupBy.map(groupByField), oldSpec.aggregations.map((a) => a.alias));
  const newMap = normalize(newRaw, dims, w.values as string[]);

  const issues = diff(oldMap, newMap);
  return {
    widgetId: w.id,
    status: issues.length === 0 ? 'ok' : 'mismatch',
    issues,
    oldRows: oldMap,
    newRows: newMap,
  };
}

// ───────────────────────── Reports ─────────────────────────
//
// Reports have NO server-side executor in this repo (the pivot is computed
// client-side). We reconcile the NUMBERS only: lower the legacy report's
// groupings + aggregate columns to the same `aggregate()` call, and compare to
// the dataset's `rows`/`values`. A matrix (`groupingsAcross`) flattens to a 2D
// groupBy — the cell values are identical to the rendered pivot. A detail/summary
// report with no aggregate columns reconciles its group COUNT (count(*)), which
// is what the legacy report's group headers show.

/** A report is reconcilable when it carries BOTH the inline query and the dataset binding. */
export function isReconcilableReport(
  r: Report,
): r is Report & { objectName: string; dataset: string; values: string[] } {
  return (
    typeof r.objectName === 'string' &&
    typeof r.dataset === 'string' &&
    Array.isArray(r.values) &&
    r.values.length > 0
  );
}

/** Lower a report's LEGACY inline fields (groupings + aggregate columns) to an aggregate spec. */
export function deriveReportAggregate(r: Report): OldAggregateSpec {
  const groupBy = [
    ...(r.groupingsDown ?? []).map((g) => g.field),
    ...(r.groupingsAcross ?? []).map((g) => g.field),
  ];
  const aggCols = (r.columns ?? []).filter((c) => c.aggregate);
  const aggregations: OldAggregateSpec['aggregations'] = aggCols.length > 0
    ? aggCols.map((c, i) => ({ method: c.aggregate as string, field: c.field, alias: `m${i}` }))
    : [{ method: 'count', field: '*', alias: 'm0' }]; // detail/summary → group count
  return { objectName: r.objectName as string, filter: r.filter, groupBy, aggregations };
}

/** Reconcile a single dual-form report against its dataset. */
export async function reconcileReport(
  r: Report,
  dataset: Dataset | undefined,
  exec: ReconcileExecutors,
): Promise<WidgetReconcileResult> {
  if (!isReconcilableReport(r)) {
    return { widgetId: r.name, status: 'skipped', issues: ['not dual-form (missing objectName or dataset/values)'] };
  }
  if (!dataset) {
    return { widgetId: r.name, status: 'mismatch', issues: [`dataset "${r.dataset}" not found in registry`] };
  }
  const rows = r.rows ?? [];

  // Resolve macros on the legacy filter and the dataset runtimeFilter identically.
  const legacyFilter = exec.resolveFilter ? exec.resolveFilter(r.filter) : r.filter;
  const runtimeFilter = exec.resolveFilter ? exec.resolveFilter(r.runtimeFilter ?? r.filter) : (r.runtimeFilter ?? r.filter);

  const oldSpec = { ...deriveReportAggregate(r), filter: legacyFilter };
  const selection: DatasetSelection = { dimensions: rows, measures: r.values as string[], runtimeFilter };

  let oldRaw: Record<string, unknown>[];
  let newRaw: Record<string, unknown>[];
  try {
    oldRaw = await exec.runAggregate(oldSpec);
  } catch (e) {
    return { widgetId: r.name, status: 'mismatch', issues: [`legacy aggregate threw: ${(e as Error).message}`] };
  }
  try {
    newRaw = await exec.runDataset(dataset, selection);
  } catch (e) {
    return { widgetId: r.name, status: 'mismatch', issues: [`dataset query threw: ${(e as Error).message}`] };
  }

  const oldMap = normalize(oldRaw, oldSpec.groupBy.map(groupByField), oldSpec.aggregations.map((a) => a.alias));
  const newMap = normalize(newRaw, rows, r.values as string[]);
  const issues = diff(oldMap, newMap);
  return { widgetId: r.name, status: issues.length === 0 ? 'ok' : 'mismatch', issues, oldRows: oldMap, newRows: newMap };
}

/** Reconcile every dual-form report. */
export async function reconcileReports(
  reports: Report[],
  datasets: Map<string, Dataset>,
  exec: ReconcileExecutors,
): Promise<WidgetReconcileResult[]> {
  const results: WidgetReconcileResult[] = [];
  for (const r of reports) {
    // Joined reports have no single data binding — reconcile each block.
    if (r.type === 'joined' && Array.isArray(r.blocks)) {
      for (const block of r.blocks) {
        const id = `${r.name}/${block.name}`;
        if (typeof block.dataset !== 'string') {
          results.push({ widgetId: id, status: 'pending', issues: ['joined block inline-only (record-list / embed)'] });
          continue;
        }
        // A block is shaped like a mini-report (objectName/columns/groupings/
        // filter + dataset/rows/values/runtimeFilter) — reconcile it as one.
        const asReport = { ...block, name: id } as unknown as Report;
        results.push(await reconcileReport(asReport, datasets.get(block.dataset), exec));
      }
      continue;
    }
    if (typeof r.dataset !== 'string') {
      results.push({ widgetId: r.name, status: 'pending', issues: ['inline-only — not yet dataset-bound'] });
      continue;
    }
    results.push(await reconcileReport(r, datasets.get(r.dataset), exec));
  }
  return results;
}

/** Reconcile every dual-form widget on a dashboard. */
export async function reconcileDashboard(
  dashboard: Dashboard,
  datasets: Map<string, Dataset>,
  exec: ReconcileExecutors,
): Promise<WidgetReconcileResult[]> {
  const results: WidgetReconcileResult[] = [];
  for (const w of dashboard.widgets) {
    if (typeof w.dataset !== 'string') {
      // Inline-only widget — surfaced as `pending` so migration coverage stays honest.
      results.push({ widgetId: w.id, status: 'pending', issues: ['inline-only — not yet dataset-bound'] });
      continue;
    }
    results.push(await reconcileWidget(w, datasets.get(w.dataset), exec));
  }
  return results;
}
