// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { CrmSeedData } from '../src/data/index';
import { Forecast } from '../src/objects/forecast.object';
import { ForecastSnapshotFlow } from '../src/flows/forecast-snapshot.flow';

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
  | { records: SeedRec[]; mode?: string; externalId?: string | string[] }
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

  it('a monthly snapshot exists for the current calendar month', () => {
    // The row a "this period" equals-filter must be able to hit. This was
    // asserted on the current QUARTER until #702 moved that window out of the
    // seeds entirely (see the #702 block below) — the property #530 is about is
    // "a calendar-true current-period row exists to be matched", and the
    // monthly row carries it now. The quarter's counterpart is written by
    // `forecast_snapshot`, and `test/flow-scheduled.test.ts` pins that it lands
    // on the same exact boundary.
    const now = new Date();
    const currentMonthStart = isoDate(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)));
    const hit = monthRecs.find((r) => r.period_start === currentMonthStart);
    expect(
      hit,
      `no month snapshot with period_start ${currentMonthStart}; got: ${monthRecs
        .map((r) => r.period_start)
        .join(', ')}`,
    ).toBeDefined();
  });

  it('period_label values are unique AMONG THE SEEDS — not a table invariant (#613)', () => {
    // Restated deliberately. This once read "period_label values are unique
    // (they are the upsert identity)", and both halves have since become
    // false: `period_label` is no longer the upsert identity (that is
    // `seed_key` now), and uniqueness is no longer true of the TABLE. The
    // `forecast_snapshot` sweep (#590) writes one row per active opportunity
    // owner per quarter and every one of them reads 'Q3 2026'.
    //
    // What survives is a much narrower property: these eight authored records
    // must not collide with EACH OTHER, so the demo shows eight distinct
    // periods rather than two rows fighting over one label. Asserting anything
    // wider would advertise an invariant the database does not hold.
    const labels = records.map((r) => String(r.period_label));
    const dupes = labels.filter((l, i) => labels.indexOf(l) !== i);
    expect(dupes, `two seeded forecasts render the same period: ${dupes.join(', ')}`).toEqual([]);
  });
});

/**
 * One producer per window (#702).
 *
 * `forecast_snapshot` upserts the row whose window contains today, keyed by
 * OWNER. A seeded row in that same window cannot satisfy that lookup at the
 * moment the sweep reads it — a seed writes no owner, and `demo_bootstrap`'s
 * claim is a separate, later sweep — so the flow reports the period missing and
 * opens a SECOND row beside it. Both span the quarter; one is ownerless. Every
 * owner-grouped consumer then shows a phantom duplicate for the current
 * quarter, on every re-seeded dev boot.
 *
 * Claiming `crm_forecast` (which `demo_bootstrap` now does, for the settled
 * rows) does NOT make that safe: it only decides which of the two scheduled
 * sweeps reaches the window first, and a duplicate opened by losing that race
 * never heals. The invariant has to hold whatever the order, so it is enforced
 * where order cannot reach it — in the seed data.
 *
 * The forbidden window is derived from the flow's own lookup filter rather than
 * restated here: change `SNAPSHOT_PERIOD` and this guard follows.
 */
describe('the seeds stay out of the window forecast_snapshot owns (#702)', () => {
  /** Any node in the flow, loop bodies included. */
  const findNode = (id: string): Record<string, any> | undefined => {
    const walk = (nodes: any[]): any => {
      for (const node of nodes ?? []) {
        if (node?.id === id) return node;
        const hit = walk(node?.config?.body?.nodes ?? []);
        if (hit) return hit;
      }
      return undefined;
    };
    return walk(((ForecastSnapshotFlow as any).nodes ?? []) as any[]);
  };

  const sweepLookup = (findNode('find_forecast')?.config?.filter ?? {}) as Record<string, any>;
  const sweptPeriod = String(sweepLookup.period ?? '');
  const today = isoDate(new Date());

  /** Does `r` span today, in the period the sweep writes? */
  const inSweptWindow = (r: SeedRec) =>
    r.period === sweptPeriod
    && String(r.period_start) <= today
    && today <= String(r.period_end);

  it('the sweep still claims the current window by an OWNER-SCOPED lookup', () => {
    // The premise of everything below, and every part of it is load-bearing.
    // Drop the owner key and the sweep would find the seeded row and adopt it,
    // making this guard unnecessary; widen the window operators and it would
    // match a different set of rows than the ones checked here. Either way the
    // guard must be re-derived rather than left passing for a stale reason.
    expect(findNode('find_forecast'), 'forecast_snapshot has no find_forecast node').toBeDefined();
    expect(sweptPeriod, 'the sweep writes no fixed period any more').toMatch(/^(month|quarter)$/);
    expect(String(sweepLookup.owner_id), 'the sweep lookup is no longer owner-scoped')
      .toMatch(/\{currentOwner\.\w+\}/);
    expect(sweepLookup.period_start).toEqual({ $lte: '{TODAY()}' });
    expect(sweepLookup.period_end).toEqual({ $gte: '{TODAY()}' });
  });

  it('no seeded forecast row lands inside that window', () => {
    const trespassers = records
      .filter(inSweptWindow)
      .map((r) => `${String(r.seed_key)} (${String(r.period_start)} → ${String(r.period_end)})`);
    expect(
      trespassers,
      `these seeds open a ${sweptPeriod} row in the window forecast_snapshot writes.\n`
        + 'The sweep cannot see them (its lookup is owner-scoped) so it opens a second,\n'
        + 'owner-keyed row beside each — the #702 phantom. Seed settled periods only:\n  '
        + trespassers.join('\n  '),
    ).toEqual([]);
  });

  it('still seeds a CURRENT-period row for the period the sweep does not write', () => {
    // The removal is scoped, not a blanket "no current periods". A monthly
    // window has exactly one producer — the seed — so keeping it costs nothing
    // and keeps the demo's current-period story alive. If this ever fails
    // because the sweep took over months too, the seed has to give that window
    // up as well rather than be quietly re-added.
    const otherPeriod = sweptPeriod === 'quarter' ? 'month' : 'quarter';
    const current = records.filter(
      (r) =>
        r.period === otherPeriod
        && String(r.period_start) <= today
        && today <= String(r.period_end),
    );
    expect(
      current.map((r) => String(r.seed_key)),
      `no seeded ${otherPeriod} row covers today — the demo has no current-period forecast at all`,
    ).not.toEqual([]);
  });

  it(`every seeded row in the swept period is SETTLED — it ended before today`, () => {
    // The same fact from the other side, and the one a reader checks by eye.
    // Stated separately because the window guard above passes for a seeded
    // FUTURE quarter, which the sweep will collide with the day it arrives
    // rather than today — a bug that would sit dormant for up to three months.
    const unsettled = records
      .filter((r) => r.period === sweptPeriod && !(String(r.period_end) < today))
      .map((r) => `${String(r.seed_key)} ends ${String(r.period_end)}`);
    expect(
      unsettled,
      `these ${sweptPeriod} seeds are not settled — forecast_snapshot owns every\n`
        + `${sweptPeriod} window from today onwards:\n  ${unsettled.join('\n  ')}`,
    ).toEqual([]);
  });
});

/**
 * Seed identity guards (#613).
 *
 * The seed upserts against the whole `crm_forecast` table — the loader builds
 * its existing-record map from every row in the org, not just previously
 * seeded ones. So the seed's `externalId` has to be a value that a genuine,
 * owner-scoped runtime snapshot can never carry. `period_label` was not: it
 * names a set of rows, and a re-seed overwrote whichever member came back
 * first, demo numbers landing on a real rep's snapshot.
 *
 * These pin the replacement, because every part of it fails SILENTLY:
 * a missing `seed_key` keys to "" and downgrades upsert to
 * insert-on-every-replay; a writable `seed_key` lets a real row drift into the
 * seed's line of fire; a reverted `externalId` restores the original bug.
 */
describe('the forecast seed keys on a seeder-only identity (#613)', () => {
  const seedKeyField = (Forecast as any).fields?.seed_key;

  it('the seed upserts on seed_key, not on a shared rendering like period_label', () => {
    expect(forecastSeed?.externalId, 'forecast seed externalId').toBe('seed_key');
    expect(forecastSeed?.mode, 'forecast seed mode').toBe('upsert');
  });

  it('every seeded forecast carries a seed_key', () => {
    // An empty part collapses the loader's key to "", which never matches an
    // existing row — so the record is INSERTED again on every replay boot and
    // the demo table grows without bound. Silent: no error, just duplicates.
    const missing = records
      .filter((r) => typeof r.seed_key !== 'string' || (r.seed_key as string).trim() === '')
      .map((r) => String(r.period_label));
    expect(missing, `forecast seeds with no seed_key:\n  ${missing.join('\n  ')}`).toEqual([]);
  });

  it('seed_key values are unique among the seeds', () => {
    const keys = records.map((r) => String(r.seed_key));
    const dupes = keys.filter((k, i) => keys.indexOf(k) !== i);
    expect(dupes, `two forecast seeds share one seed_key and would clobber each other: ${dupes.join(', ')}`).toEqual([]);
  });

  it('crm_forecast declares seed_key as a readonly, hidden text column', () => {
    // `readonly` is what makes this structural rather than conventional: seed
    // writes run `{ isSystem: true }` and bypass readonly stripping, while
    // user and API writes do not. Drop it and a real forecast row becomes able
    // to acquire a seed_key — which is the #613 bug again, one field over.
    expect(seedKeyField, 'crm_forecast has no seed_key field').toBeDefined();
    expect(seedKeyField?.type).toBe('text');
    expect(seedKeyField?.readonly, 'seed_key must be readonly so only the seeder can write it').toBe(true);
    expect(seedKeyField?.hidden, 'seed_key is a fixture column and must stay out of forms').toBe(true);
  });

  it('no runtime forecast writer populates seed_key', () => {
    // The other half of the guarantee: even a system-context writer must leave
    // the column empty, or its rows re-enter the seed's existing-record map.
    const bad: string[] = [];
    let writers = 0;
    const walk = (node: any) => {
      const fields = node?.config?.fields;
      if (fields) {
        writers++;
        if (Object.prototype.hasOwnProperty.call(fields, 'seed_key')) {
          bad.push(`${ForecastSnapshotFlow.name}.${node.id} writes seed_key`);
        }
      }
      for (const child of node?.config?.body?.nodes ?? []) walk(child);
    };
    for (const node of (ForecastSnapshotFlow as any).nodes ?? []) walk(node);
    // Guard the guard: the sweep creates a row and updates it, so a walker
    // that found no field-writing node has stopped matching the flow's shape
    // and would pass by asserting nothing.
    expect(writers, 'walker found no record-writing node in the snapshot flow').toBeGreaterThanOrEqual(2);
    expect(bad, bad.join('\n')).toEqual([]);
  });
});
