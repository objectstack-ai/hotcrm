// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { ForecastViews } from '../src/sales/views/forecast.view';
import { Forecast } from '../src/sales/objects/forecast.object';

/**
 * All Forecasts lists its periods newest first, flat, in the reader's language
 * (#2432 rows 2 and 4).
 *
 * History. The list grouped by the TEXT `period_label` (#2060 item 11), then on
 * two levels, then once with `orderBy: 'period_start'` (#2367 row 5,
 * objectstack#25786). The 6.1.2 browser pass (#2432) read what that drew on a
 * book with one owner: one heading over each row, and the console fetched
 * every group's rows with a request of its own (7 requests for 7 periods,
 * re-measured on 18.5.0). The heading was also the stored label, which the
 * snapshot hook writes in English ("Nov 2026"), so a zh-CN list read English.
 *
 * Now the list is flat, ordered by Period Start, and names the period by its
 * kind (`period`, a select every locale pack translates) and its first day.
 * Its money columns carry no footer total: the list holds months and the
 * quarters that contain them, so a total counts each month twice.
 *
 * What the console draws from this declaration was measured in a browser and
 * is recorded on the PR; this file pins the app's half, the declaration.
 */

type Column = { field: string; summary?: string };
const allForecasts = ForecastViews.list as unknown as {
  name: string;
  columns: Column[];
  sort: Array<{ field: string; order: string }>;
  grouping?: unknown;
};

describe('All Forecasts is a flat list of periods, newest first (#2432 rows 2 and 4)', () => {
  it('is the view this pin is about', () => {
    expect(allForecasts.name).toBe('all_forecasts');
  });

  it('declares no default grouping', () => {
    expect(allForecasts.grouping).toBeUndefined();
  });

  it('names the period by its translated kind and its first day, not by the stored English label', () => {
    const fields = allForecasts.columns.map((c) => c.field);
    expect(fields).not.toContain('period_label');
    expect(fields.slice(1, 3)).toEqual(['period', 'period_start']);
    const declared = Forecast.fields as Record<string, { type: string; options?: Array<{ value: string }> }>;
    expect(declared.period!.type).toBe('select');
    expect(declared.period!.options!.map((o) => o.value).sort()).toEqual(['month', 'quarter']);
    expect(declared.period_start!.type).toBe('date');
  });

  it('totals no column: months and their quarters would be counted twice', () => {
    expect(allForecasts.columns.filter((c) => c.summary).map((c) => c.field)).toEqual([]);
  });

  it('runs newest period first, a quarter before the month that opens it', () => {
    expect(allForecasts.sort).toEqual([
      { field: 'period_start', order: 'desc' },
      { field: 'period', order: 'desc' },
      { field: 'owner_id', order: 'asc' },
    ]);
    // `desc` puts the quarter first only because its stored value sorts after the month's.
    expect('quarter' > 'month').toBe(true);
  });
});
