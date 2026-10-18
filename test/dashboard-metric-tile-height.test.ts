// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import stack from './helpers/composed-stack';

/**
 * ═══ A metric tile is authored one row tall (#2135) ═══
 *
 * # What this pins
 *
 * The console draws a dashboard widget as a box that spans the grid rows its
 * `layout.h` names, and `MetricCard` fills that box. A bare number needs about
 * one row, so a metric tile authored `h: 2` drew a box with an empty lower half
 * — 29 tiles on five dashboards did, at 1024 px. The maintainer's ruling on
 * objectstack-ai/objectui#12704 (B, then B′): the platform draws what the
 * metadata declares — ADR-0078 forbids an `h` that is read and not honoured —
 * so the authored sizes are corrected, not the renderer. Every metric tile is
 * therefore `h: 1`.
 *
 * Nothing else would notice the next tile authored `h: 2`: it is valid
 * metadata, it renders, and the only symptom is a half-empty box.
 *
 * # The one deliberate exception (AGENTS.md rule 11: comment + roster)
 *
 * The two metric tiles at the end of the Sales Activity "what the activity is
 * about" row are `h: 4`. They sit at `y: 6` in one row with two `h: 4` charts,
 * and the maintainer's ruling keeps them that way. The comment beside the
 * tiles in `activity.dashboard.ts` and the roster below are the two places
 * that say so.
 *
 * # How it reads
 *
 * Off the COMPOSED stack, not the source text: the avg-deal-size tile is built
 * by `avgDealSizeMetricWidget(layout)` with the height passed as an argument at
 * each call site, and only the composed widget carries the resolved `layout`.
 * The two self-checks at the bottom keep the sweep honest — a sweep that could
 * not see a helper-built tile, or whose roster had gone stale, would pass on
 * anything.
 */
describe('metric tiles are one row tall', () => {
  type AnyRec = Record<string, any>;
  const dashboards: AnyRec[] = (stack as any).dashboards ?? [];

  /** `dashboard name` → the metric widget ids authored taller than one row on purpose. */
  const DELIBERATELY_TALL: Record<string, string[]> = {
    sales_activity_dashboard: ['deal_activity', 'open_deals_for_activity'],
  };
  const TALL_ROWS = 4;

  const metricTiles = dashboards.flatMap((d) =>
    ((d.widgets ?? []) as AnyRec[])
      .filter((w) => w.type === 'metric')
      .map((w) => ({
        dashboard: d.name as string,
        id: w.id as string,
        h: w.layout?.h as number | undefined,
        tall: (DELIBERATELY_TALL[d.name] ?? []).includes(w.id),
      })),
  );

  it('every metric tile outside the roster declares h: 1', () => {
    const offenders = metricTiles
      .filter((t) => !t.tall && t.h !== undefined && t.h !== 1)
      .map((t) => `${t.dashboard}.${t.id} h:${t.h}`);
    expect(offenders).toEqual([]);
  });

  it('the roster names metric tiles that still exist, at the height it records', () => {
    const listed = Object.entries(DELIBERATELY_TALL).flatMap(([dashboard, ids]) =>
      ids.map((id) => ({ dashboard, id })),
    );
    for (const { dashboard, id } of listed) {
      const tile = metricTiles.find((t) => t.dashboard === dashboard && t.id === id);
      expect(tile, `${dashboard}.${id} is no longer a metric tile — drop it from the roster`).toBeDefined();
      expect(tile?.h, `${dashboard}.${id}`).toBe(TALL_ROWS);
    }
  });

  it('the sweep reaches a tile built by the shared helper, on both dashboards that use it', () => {
    const avg = metricTiles.filter((t) => t.id === 'avg_deal_size');
    expect(avg.map((t) => t.dashboard).sort()).toEqual(['crm_overview_dashboard', 'sales_dashboard']);
    expect(avg.map((t) => t.h)).toEqual([1, 1]);
  });
});
