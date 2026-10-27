// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import stack from './helpers/composed-stack';

/**
 * Which KPI tiles show a period-over-period comparison (#2296).
 *
 * A tile that declares `compareTo` asks the console to run its query a second
 * time over a shifted window and to print the change ("16% vs previous
 * period"). That only works when the tile HAS a closed window to shift.
 * Measured on `@objectstack/*` 18.2.0, in a browser on the seed:
 *
 *  - a tile that follows the header's date picker renders the comparison at
 *    the default window, and its bare number when the reader picks All time
 *    (objectstack#25970) — these compare with the previous period;
 *  - a tile pinned to its own one-bound `{ $gte }` window (YTD, QTD) renders
 *    "Dataset query failed: 400 … compareTo needs a dated window to shift" on
 *    every load. So the pinned tiles state their end (`$lte: '{today}'`) and
 *    compare with the same span last year: a calendar window is only like
 *    for like against the same calendar window (the seat's ruling on #2296).
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
      'executive_dashboard/total_revenue_ytd': { kind: 'previousYear' },
      'sales_dashboard/closed_won_qtd': { kind: 'previousYear' },
      'sales_dashboard/avg_deal_size': { kind: 'previousYear' },
    });
  });

  it('every comparing tile has exactly one closed window to shift', () => {
    const bad: string[] = [];
    for (const { dashboard, widget, key } of declared) {
      const field = dashboard.dateRange?.field;
      const dim = widget.compareTo.dimension;
      if (widget.filterBindings?.dateRange === false) {
        // Pinned: its own filter states both ends of the window, on the
        // dashboard's date field, as date macros the server resolves per query.
        const own = field ? widget.filter?.[field] : undefined;
        const closed = own && Object.keys(own).sort().join() === '$gte,$lte'
          && Object.values(own).every((v) => typeof v === 'string' && /^\{\w+\}$/.test(v));
        if (!closed) bad.push(`${key}: pinned, but its filter states no closed ${field} window`);
        if (widget.compareTo.kind !== 'previousYear') bad.push(`${key}: a pinned calendar window compares with last year`);
      } else {
        // Follows the picker: the dashboard has one, the tile pins nothing on it.
        if (!field) bad.push(`${key}: the dashboard has no date picker`);
        else if (widget.filter && field in widget.filter) bad.push(`${key}: its filter pins ${field} itself`);
      }
      if (dim !== undefined && dim !== field) bad.push(`${key}: compares ${dim}, the window is on ${field}`);
    }
    expect(bad).toEqual([]);
  });
});
