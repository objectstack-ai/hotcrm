// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { CrmSeedData } from '../src/data/index';

/**
 * Forecast seed calendar-alignment guards (#530).
 *
 * A "this quarter" filter — whether the list view's old
 * `period_start equals {this_quarter_start}` or the token-resolving
 * `{current_quarter_start}` a platform upgrade enables — compares against the
 * exact first day of the calendar quarter. The original seeds used relative
 * dates (`daysAgo(45)` → e.g. 2026-06-13), so exact-match could never hit and
 * the "This Quarter" tab rendered empty for every visitor (#530). The seeds
 * were rewritten to compute real calendar periods in the hook's dialect;
 * these tests pin that invariant so it cannot silently drift back.
 *
 * All date math is UTC, mirroring both the seed module and
 * `forecast.hook.ts`. The seed module computes "now" when it is imported and
 * this file computes "now" when it runs — the same process moments apart — so
 * the current-quarter assertion is stable except in the pathological case of
 * a run straddling midnight UTC on a quarter boundary.
 */

type SeedRec = Record<string, unknown>;

const forecastSeed = CrmSeedData.find((s: any) => s.object === 'crm_forecast') as
  | { records: SeedRec[] }
  | undefined;

const records: SeedRec[] = forecastSeed?.records ?? [];
const quarterRecs = records.filter((r) => r.period === 'quarter');
const monthRecs = records.filter((r) => r.period === 'month');

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n: number) => String(n).padStart(2, '0');
const isoDate = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const parseUtc = (s: string) => new Date(`${s}T00:00:00Z`);

describe('forecast seed periods are calendar-true (#530)', () => {
  it('the forecast seed dataset exists with quarter and month snapshots', () => {
    expect(forecastSeed, 'no seed dataset for crm_forecast').toBeDefined();
    expect(quarterRecs.length).toBeGreaterThanOrEqual(1);
    expect(monthRecs.length).toBeGreaterThanOrEqual(1);
  });

  it('every period_start is a concrete ISO date, not a relative-date macro', () => {
    const bad = records
      .filter((r) => typeof r.period_start !== 'string' || !ISO_DATE.test(r.period_start as string))
      .map((r) => `${r.period_label}: ${String(r.period_start)}`);
    expect(bad, `non-literal period_start values:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('quarterly snapshots start exactly on a calendar quarter boundary', () => {
    const bad: string[] = [];
    for (const r of quarterRecs) {
      const start = parseUtc(r.period_start as string);
      if (start.getUTCDate() !== 1 || start.getUTCMonth() % 3 !== 0) {
        bad.push(`${r.period_label}: period_start ${r.period_start} is not a quarter start`);
      }
    }
    expect(bad, bad.join('\n')).toEqual([]);
  });

  it('monthly snapshots start on the first of the month', () => {
    const bad: string[] = [];
    for (const r of monthRecs) {
      const start = parseUtc(r.period_start as string);
      if (start.getUTCDate() !== 1) {
        bad.push(`${r.period_label}: period_start ${r.period_start} is not a month start`);
      }
    }
    expect(bad, bad.join('\n')).toEqual([]);
  });

  it('period_end closes the same period that period_start opens', () => {
    const bad: string[] = [];
    for (const r of records) {
      const start = parseUtc(r.period_start as string);
      const months = r.period === 'quarter' ? 3 : 1;
      const expected = isoDate(new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + months, 0)));
      if (r.period_end !== expected) {
        bad.push(`${r.period_label}: period_end ${String(r.period_end)}, expected ${expected}`);
      }
    }
    expect(bad, bad.join('\n')).toEqual([]);
  });

  it('period_label matches what forecast.hook.ts would derive from period_start', () => {
    // Hooks never run over seeds and only fill BLANK labels, so a seeded label
    // in any other dialect ('This Quarter', 'Q3-2026', …) sticks forever and
    // list groupings mix vocabularies (#490).
    const bad: string[] = [];
    for (const r of records) {
      const start = parseUtc(r.period_start as string);
      const expected =
        r.period === 'quarter'
          ? `Q${Math.floor(start.getUTCMonth() / 3) + 1} ${start.getUTCFullYear()}`
          : `${MONTHS[start.getUTCMonth()]} ${start.getUTCFullYear()}`;
      if (r.period_label !== expected) {
        bad.push(`${String(r.period_label)}: hook would derive "${expected}"`);
      }
    }
    expect(bad, bad.join('\n')).toEqual([]);
  });

  it('a quarterly snapshot exists for the current calendar quarter', () => {
    // The row a "this quarter" equals-filter must be able to hit.
    const now = new Date();
    const currentQuarterStart = isoDate(
      new Date(Date.UTC(now.getUTCFullYear(), Math.floor(now.getUTCMonth() / 3) * 3, 1)),
    );
    const hit = quarterRecs.find((r) => r.period_start === currentQuarterStart);
    expect(
      hit,
      `no quarter snapshot with period_start ${currentQuarterStart}; got: ${quarterRecs
        .map((r) => r.period_start)
        .join(', ')}`,
    ).toBeDefined();
  });

  it('period_label values are unique (they are the upsert identity)', () => {
    const labels = records.map((r) => String(r.period_label));
    const dupes = labels.filter((l, i) => labels.indexOf(l) !== i);
    expect(dupes, `duplicate period_label seeds would clobber each other: ${dupes.join(', ')}`).toEqual([]);
  });
});
