// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { ForecastViews } from '../src/sales/views/forecast.view';
import { Forecast } from '../src/sales/objects/forecast.object';

/**
 * All Forecasts lists its periods newest first, each under a heading a manager
 * can read (#2060 item 11, C-09).
 *
 * The list grouped by the TEXT `period_label`, descending, so the periods ran
 * as text: "Sep 2026 → Q4 2026 → Q4 2025 → Q3 2026 … → Oct 2026 → Aug 2026"
 * (measured in the console on 18.0.0-next.5). A grouping field orders its
 * groups by its own value and the spec offers no key to order one field's
 * groups by another, so the view groups on two levels: `period_start`
 * (a date, so `desc` is time order) and, under it, `period_label`, the heading
 * that names the period. The second level is not decoration: a quarter and
 * the month that opens it share a `period_start`, and without it their rows
 * would sit under one heading.
 *
 * What the console draws from this declaration was measured in a browser and
 * is recorded on the PR, not re-implemented here: the header rows and their
 * order are the platform's (`compileListViewGroupQuery` and the grid's own
 * sort over them). This file pins the app's half, the declaration.
 */

const allForecasts = ForecastViews.list as unknown as {
  name: string;
  sort: Array<{ field: string; order: string }>;
  grouping: { fields: Array<{ field: string; order?: string }> };
};

describe('All Forecasts groups its periods in time order (#2060 item 11)', () => {
  it('is the view this pin is about', () => {
    expect(allForecasts.name).toBe('all_forecasts');
  });

  it('groups by Period Start, newest first, and names each period under it by its label', () => {
    expect(allForecasts.grouping.fields.map((g) => [g.field, g.order])).toEqual([
      ['period_start', 'desc'],
      ['period_label', 'desc'],
    ]);
  });

  it('the outer level is a date, so its descending order is time order, and the inner level is the text label', () => {
    const fields = Forecast.fields as Record<string, { type: string }>;
    expect(fields.period_start!.type).toBe('date');
    expect(fields.period_label!.type).toBe('text');
  });

  it('the rows run in the same order as the groups', () => {
    expect(allForecasts.sort[0]).toEqual({ field: 'period_start', order: 'desc' });
  });
});
