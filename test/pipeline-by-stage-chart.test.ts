// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import stack, { type AnyRec } from './helpers/composed-stack';

/**
 * The Pipeline by Stage tile is a horizontal bar chart, not a funnel (#2073 item 2).
 *
 * The tile shows open opportunity VALUE per sales stage. Drawn as a `funnel`, each
 * stage was as wide as its value in a fixed top-to-bottom order, which reads as a
 * funnel only when the values shrink stage by stage. Open amount by stage does not:
 * on the shipped seed, from Prospecting to Negotiation, it is 139,500 / 174,000 /
 * 173,000 / 237,000 / 1,294,000 (the tile's own dataset query on a fresh boot), and
 * the funnel pinched and then flared into a diamond on all three dashboards.
 *
 * What is pinned, on the REGISTERED dashboards rather than on the factory, so a
 * dashboard that re-declares or overrides the tile is caught too:
 *
 *  - `type: 'horizontal-bar'`. The stages run top to bottom and every stage name is
 *    drawn whole; a vertical `bar` rotates its axis labels, and the console cuts a
 *    rotated label to 12 characters ("Qualificati…", "Needs Analy…").
 *  - the binding is unchanged: open pipeline amount by stage.
 *  - no `options.sortBy`. Without one the console draws a select dimension in the
 *    field's declared option order (measured on 18.0.0-next.3 in the browser, while
 *    the dataset itself answers alphabetically); `sortBy: 'stage'` would sort by
 *    display label, which is not sales order in any shipped language. The last case
 *    pins that option order as the sales order the bars are read in.
 */

const dashboards: AnyRec[] = (stack as any).dashboards ?? [];
const objects: AnyRec[] = (stack as any).objects ?? [];

const tiles = dashboards.flatMap((d) =>
  ((d.widgets ?? []) as AnyRec[])
    .filter((w) => w.id === 'pipeline_by_stage')
    .map((w) => ({ dashboard: String(d.name), widget: w })),
);

describe('the Pipeline by Stage tile', () => {
  it('sits once on each of the three dashboards that share it', () => {
    expect(tiles.map((t) => t.dashboard).sort()).toEqual([
      'crm_overview_dashboard',
      'executive_dashboard',
      'sales_dashboard',
    ]);
  });

  it.each(tiles.map((t) => [t.dashboard, t.widget] as const))(
    '%s draws it as a horizontal bar chart of open amount by stage',
    (_dashboard, widget) => {
      expect(widget.type).toBe('horizontal-bar');
      expect(widget.dataset).toBe('opportunity_metrics');
      expect(widget.dimensions).toEqual(['stage']);
      expect(widget.values).toEqual(['total_amount']);
      expect(widget.filter).toEqual({ stage: { $nin: ['closed_won', 'closed_lost'] } });
    },
  );

  it.each(tiles.map((t) => [t.dashboard, t.widget] as const))(
    '%s leaves the bar order to the stage field',
    (_dashboard, widget) => {
      expect(widget.options?.sortBy).toBeUndefined();
    },
  );

  it('the stage field lists the open stages in sales order', () => {
    const opportunity = objects.find((o) => o.name === 'crm_opportunity');
    const options = (opportunity?.fields?.stage?.options ?? []) as AnyRec[];
    const open = options
      .map((o) => String(o.value))
      .filter((v) => v !== 'closed_won' && v !== 'closed_lost');
    expect(open).toEqual(['prospecting', 'qualification', 'needs_analysis', 'proposal', 'negotiation']);
  });
});

/**
 * The same remedy on a report: the chart of **Opportunity Funnel by Owner →
 * Stage** (#2073 item 10).
 *
 * Its chart sums amount by stage over every stage but Closed Lost, so Closed Won
 * is drawn too. Measured on 18.0.0-next.5, opened from its Reports entry on a
 * fresh boot: 139,500 / 174,000 / 173,000 / 237,000 / 1,294,000 / 1,290,000 from
 * Prospecting to Closed Won. As a funnel it pinched and flared (trapezoids 139 /
 * 139 / 189 / 1034 / 1034 / 1031 px wide), and the Negotiation label was not
 * drawn. As horizontal bars, all six stages are drawn top to bottom in the stage
 * field's option order, each with its whole name, in en-US and zh-CN alike.
 *
 * The report keeps its label and description: "funnel" there is the sales word
 * for the stage-by-stage pipeline, not the chart's shape.
 */
describe('the Opportunity Funnel by Owner → Stage report', () => {
  const reports: AnyRec[] = (stack as any).reports ?? [];
  const report = reports.find((r) => r.name === 'opportunity_funnel_owner_stage');

  it('charts amount by stage as a horizontal bar chart', () => {
    expect(report, 'no opportunity_funnel_owner_stage report registered').toBeTruthy();
    expect(report!.chart).toMatchObject({ type: 'horizontal-bar', xAxis: 'stage', yAxis: 'total_amount' });
    expect(report!.dataset).toBe('opportunity_metrics');
    expect(report!.runtimeFilter).toEqual({ stage: { $ne: 'closed_lost' } });
  });

  it('declares no order, the state the stage-order bars were measured in', () => {
    expect(report!.order).toBeUndefined();
  });
});
