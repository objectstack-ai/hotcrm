// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.
//
// ADR-0021 — read-only analytics reconciliation for hotcrm.
//
// Boots the hotcrm stack with a real in-memory engine + the analytics service,
// then for every dual-form dashboard widget / report runs the legacy inline
// `aggregate()` vs the new dataset `queryDataset()` and asserts identical
// numbers. Exits non-zero on any mismatch. Read-only.
//
//   pnpm reconcile:analytics
//
// (This used to document `pnpm tsx scripts/analytics-reconcile/run.ts`, but
// `tsx` was not a dependency of this repo and no script invoked it, so the
// documented command could not run.)

import { ObjectKernel, DriverPlugin, AppPlugin } from '@objectstack/runtime';
import { SqliteWasmDriver } from '@objectstack/driver-sqlite-wasm';
import { ObjectQLPlugin } from '@objectstack/objectql';
import { AnalyticsServicePlugin } from '@objectstack/service-analytics';
import { DatasetSchema } from '@objectstack/spec/ui';
import type { Dataset, Dashboard } from '@objectstack/spec/ui';
import type { IAnalyticsService, DatasetSelection } from '@objectstack/spec/contracts';
import type { FilterCondition } from '@objectstack/spec/data';

import {
  reconcileDashboard,
  reconcileReports,
  type ReconcileExecutors,
  type WidgetReconcileResult,
  type InlineQueryReport,
} from './reconcile.js';
import { resolveDateMacros } from './macros.js';

import HotCrmApp from '../../objectstack.config.js';
import * as datasetMod from '../../src/datasets/index.js';
import * as dashboardMod from '../../src/dashboards/index.js';
import * as reportMod from '../../src/reports/index.js';

interface DataEngineLike {
  aggregate(object: string, options: {
    where?: Record<string, unknown>;
    groupBy?: Array<string | { field: string; dateGranularity: string }>;
    aggregations?: Array<{ function: string; field: string; alias: string }>;
  }): Promise<Record<string, unknown>[]>;
}

function report(surface: string, results: WidgetReconcileResult[]): number {
  let mismatches = 0;
  const icons: Record<WidgetReconcileResult['status'], string> = {
    ok: '✅', mismatch: '❌', skipped: '⏭️ ', pending: '🕗',
  };
  console.log(`\n── Analytics reconciliation · ${surface} ──`);
  for (const r of results) {
    console.log(`${icons[r.status]} ${r.widgetId}  [${r.status}]`);
    if (r.status === 'mismatch') {
      mismatches++;
      for (const issue of r.issues) console.log(`     · ${issue}`);
    } else if ((r.status === 'skipped' || r.status === 'pending') && r.issues.length) {
      console.log(`     · ${r.issues[0]}`);
    }
  }
  const count = (s: WidgetReconcileResult['status']) => results.filter((r) => r.status === s).length;
  console.log(
    `\n${mismatches === 0 ? '🎉' : '🔴'} ${count('ok')} ok · ${count('skipped')} skipped · ` +
    `${count('pending')} pending · ${mismatches} mismatch`,
  );
  return mismatches;
}

async function main(): Promise<number> {
  process.env.OS_MULTI_ORG_ENABLED = 'false';

  const kernel = new ObjectKernel();
  await kernel.use(new ObjectQLPlugin());
  await kernel.use(new DriverPlugin(new SqliteWasmDriver({ filename: ':memory:' })));
  await kernel.use(new AppPlugin(HotCrmApp as ConstructorParameters<typeof AppPlugin>[0]));
  await kernel.use(new AnalyticsServicePlugin({
    queryCapabilities: () => ({ nativeSql: false, objectqlAggregate: true, inMemory: false }),
  }));
  await kernel.bootstrap();

  const engine =
    (kernel.getService('data') as DataEngineLike | undefined) ??
    (kernel.getService('objectql') as DataEngineLike | undefined);
  if (!engine?.aggregate) throw new Error('No IDataEngine with aggregate() found.');
  const analytics = kernel.getService('analytics') as IAnalyticsService | undefined;
  if (!analytics?.queryDataset) throw new Error('No analytics service with queryDataset().');

  const datasets = new Map<string, Dataset>();
  for (const ds of Object.values(datasetMod) as unknown[]) {
    const parsed = DatasetSchema.parse(ds) as Dataset;
    datasets.set(parsed.name, parsed);
  }

  const exec: ReconcileExecutors = {
    runAggregate: (spec) => engine.aggregate(spec.objectName, {
      where: spec.filter as Record<string, unknown> | undefined,
      groupBy: spec.groupBy.length > 0 ? spec.groupBy : undefined,
      aggregations: spec.aggregations.map((a) => ({ function: a.method, field: a.field, alias: a.alias })),
    }),
    runDataset: async (dataset: Dataset, selection: DatasetSelection) =>
      (await analytics.queryDataset!(dataset, selection)).rows as Record<string, unknown>[],
    resolveFilter: (f?: FilterCondition) => (f == null ? f : resolveDateMacros(f)),
  };

  let mismatches = 0;
  for (const dashboard of Object.values(dashboardMod) as Dashboard[]) {
    mismatches += report(`hotcrm · ${dashboard.name}`, await reconcileDashboard(dashboard, datasets, exec));
  }
  // `reportMod` exports the authored report metadata, which still carries the
  // legacy inline query (`objectName`, `groupingsDown`, aggregate `columns`)
  // alongside the dataset binding. `Report` from @objectstack/spec/ui models
  // only the dataset-bound half, so widen to the reconciler's inline-aware view.
  const reports = Object.values(reportMod) as unknown as InlineQueryReport[];
  if (reports.length) mismatches += report('hotcrm · reports', await reconcileReports(reports, datasets, exec));
  return mismatches;
}

main()
  .then((m) => process.exit(m === 0 ? 0 : 1))
  .catch((err) => { console.error('❌ Reconciliation failed:', err); process.exit(2); });
