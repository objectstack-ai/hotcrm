// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import stack from './helpers/composed-stack';

/**
 * Which KPI tiles show a period-over-period comparison (#2296).
 *
 * A tile that declares `compareTo` asks the console to run its query a second
 * time over the window just before the current one and to print the change
 * ("16% vs previous period"). That only works when the tile HAS a closed window
 * to shift, and on these dashboards the one closed window is the header's date
 * picker. Measured on `@objectstack/*` 18.2.0, in a browser on the seed:
 *
 *  - a tile that follows the picker renders the comparison at the default
 *    window, and its bare number when the reader picks All time
 *    (objectstack#25970);
 *  - a tile pinned to a one-bound `{ $gte }` window (YTD, QTD) renders
 *    "Dataset query failed: 400 … compareTo needs a dated window to shift" on
 *    every load, so none of them may declare one until its filter states an
 *    end as well (the open question on #2296).
 *
 * So the roster below is the business fact, and the second test is the reason
 * a tile can be on it.
 */

type AnyRec = Record<string, any>;
const dashboards: AnyRec[] = (stack as any).dashboards ?? [];

const declared = dashboards.flatMap((d) =>
  (d.widgets ?? [])
    .filter((w: AnyRec) => w.compareTo)
    .map((w: AnyRec) => ({ dashboard: d, widget: w, key: `${d.name}/${w.id}` })),
);

describe('KPI tiles that compare with the previous period (#2296)', () => {
  it('the roster is exactly the tiles #2296 lands', () => {
    expect(Object.fromEntries(declared.map(({ key, widget }) => [key, widget.compareTo]))).toEqual({
      'crm_overview_dashboard/total_revenue': { kind: 'previousPeriod' },
      'crm_overview_dashboard/won_deals': { kind: 'previousPeriod' },
      'crm_overview_dashboard/avg_deal_size': { kind: 'previousPeriod' },
      'sales_dashboard/total_pipeline_value': { kind: 'previousPeriod' },
      'service_dashboard/open_cases': { kind: 'previousPeriod' },
      'service_dashboard/avg_resolution_time': { kind: 'previousPeriod' },
      'service_dashboard/sla_violations': { kind: 'previousPeriod', dimension: 'created_at' },
    });
  });

  it('every comparing tile follows its dashboard date picker and pins no window of its own', () => {
    const bad: string[] = [];
    for (const { dashboard, widget, key } of declared) {
      const field = dashboard.dateRange?.field;
      if (!field) bad.push(`${key}: the dashboard has no date picker`);
      if (widget.filterBindings?.dateRange === false) bad.push(`${key}: opts out of the date picker`);
      if (widget.filter && field in widget.filter) bad.push(`${key}: its filter pins ${field} itself`);
      const dim = widget.compareTo.dimension;
      if (dim !== undefined && dim !== field) bad.push(`${key}: compares ${dim}, the picker windows ${field}`);
    }
    expect(bad).toEqual([]);
  });
});
