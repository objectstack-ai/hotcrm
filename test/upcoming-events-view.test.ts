// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ObjectQL } from '@objectstack/objectql';
import { SqliteWasmDriver } from '@objectstack/driver-sqlite-wasm';
import stack, { type AnyRec } from './helpers/composed-stack';

/**
 * "Upcoming" means planned AND not started yet (#2393).
 *
 * Sales Home's Upcoming Events card reads `crm_event.upcoming_events`, and that
 * view filtered on `status = planned` alone. Nothing turns a booking into
 * `held` when its time passes, so every meeting nobody logged stayed on the
 * card for ever: a week after install every seeded row on it was in the past.
 * The view now also carries `start_datetime >= {now}`, and the Sales Activity
 * dashboard's Meetings Booked tile ("meetings on the calendar that have not
 * happened yet") carries the same bound.
 *
 * The bound is only worth anything if `{now}` is RESOLVED on the read path. An
 * unresolved placeholder would compare as text, and `'2026-…' >= '{now}'` is
 * false for every row, so the list would go empty and look like a quiet week.
 * Hence the cases below EXECUTE the shipped filters against a real engine on
 * the pinned platform, rather than reading the filter's spelling.
 */

const ORG = 'org_1';

const views: AnyRec[] = (stack as AnyRec).views ?? [];
const dashboards: AnyRec[] = (stack as AnyRec).dashboards ?? [];

const eventViews = views.find((v) => v.list?.data?.object === 'crm_event');
const upcoming: AnyRec = eventViews?.listViews?.upcoming_events;
const meetingsBooked: AnyRec = dashboards
  .find((d) => d.name === 'sales_activity_dashboard')
  ?.widgets?.find((w: AnyRec) => w.id === 'meetings_booked');

/**
 * Canonical `VIEW_FILTER_OPERATORS` spellings lowered to engine comparison
 * keys, the same table `test/forecast-current-quarter-view.test.ts` uses. An
 * operator this file does not know THROWS: a dropped condition widens the
 * result, which is the defect under test.
 */
const COMPARISON_OPERATORS: Record<string, string> = {
  greater_than_or_equal: '$gte',
  less_than_or_equal: '$lte',
  greater_than: '$gt',
  less_than: '$lt',
};

const whereFromViewFilter = (filter: AnyRec[]): AnyRec => {
  const where: AnyRec = {};
  for (const rule of filter ?? []) {
    if (where[rule.field] !== undefined) {
      throw new Error(`field "${rule.field}" carries two conditions; this translator would drop one`);
    }
    if (rule.operator === 'equals') {
      where[rule.field] = rule.value;
      continue;
    }
    const key = COMPARISON_OPERATORS[rule.operator];
    if (!key) throw new Error(`view filter operator "${rule.operator}" is not implemented here`);
    where[rule.field] = { [key]: rule.value };
  }
  return where;
};

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const at = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();

/** Every seeded event, and whether "upcoming" should list it. */
const FIXTURES: Array<{ subject: string; type: string; status: string; start: string; upcoming: boolean }> = [
  // The #2393 defect: booked, never logged, now in the past.
  { subject: 'planned-last-week', type: 'meeting', status: 'planned', start: at(-7 * DAY), upcoming: false },
  // Started an hour ago: no longer upcoming, even though it is "today".
  { subject: 'planned-started-an-hour-ago', type: 'meeting', status: 'planned', start: at(-HOUR), upcoming: false },
  // What the card is for.
  // Seeded latest-first, so the expected soonest-first order is the sort's
  // doing and not insertion order.
  { subject: 'planned-in-three-days', type: 'call', status: 'planned', start: at(3 * DAY), upcoming: true },
  { subject: 'planned-in-an-hour', type: 'meeting', status: 'planned', start: at(HOUR), upcoming: true },
  // Excluded by the status half, which stays.
  { subject: 'held-yesterday', type: 'meeting', status: 'held', start: at(-DAY), upcoming: false },
  { subject: 'cancelled-tomorrow', type: 'meeting', status: 'cancelled', start: at(DAY), upcoming: false },
];
const UPCOMING = FIXTURES.filter((f) => f.upcoming)
  .sort((x, y) => x.start.localeCompare(y.start))
  .map((f) => f.subject);

describe('upcoming_events and Meetings Booked carry a start-time bound (#2393)', () => {
  it('upcoming_events filters on planned AND start_datetime >= {now}', () => {
    expect(upcoming, 'crm_event.upcoming_events is registered').toBeDefined();
    const pairs = (upcoming.filter ?? []).map((r: AnyRec) => [r.field, r.operator, r.value]);
    expect(pairs).toEqual([
      ['status', 'equals', 'planned'],
      ['start_datetime', 'greater_than_or_equal', '{now}'],
    ]);
    // Soonest first, which is what the label promises.
    expect(upcoming.sort).toEqual([{ field: 'start_datetime', order: 'asc' }]);
  });

  it('the Meetings Booked tile carries the same bound', () => {
    expect(meetingsBooked, 'sales_activity_dashboard.meetings_booked is registered').toBeDefined();
    expect(meetingsBooked.filter).toEqual({
      status: 'planned',
      type: 'meeting',
      start_datetime: { $gte: '{now}' },
    });
  });
});

describe('the shipped filters, executed on the real engine', () => {
  let ql: Awaited<ReturnType<typeof ObjectQL.create>>;
  let api: AnyRec;

  beforeAll(async () => {
    ql = await ObjectQL.create({
      datasources: { default: new SqliteWasmDriver({ filename: ':memory:' }) },
      objects: {
        crm_event: {
          name: 'crm_event',
          fields: {
            id: { type: 'text' },
            subject: { type: 'text' },
            type: { type: 'text' },
            status: { type: 'text' },
            // `datetime`, as on `crm_event`: the reason the bound is `{now}`
            // (an instant) and not `{today}` (a day).
            start_datetime: { type: 'datetime' },
          },
        },
      } as never,
    });
    await ql.syncSchemas();
    api = ql.createContext({ isSystem: true, tenantId: ORG, userId: 'usr_1' } as never);
    for (const f of FIXTURES) {
      await api.object('crm_event').insert({
        subject: f.subject, type: f.type, status: f.status, start_datetime: f.start,
      });
    }
  });

  afterAll(async () => {
    await ql?.close();
  });

  it('the fixture holds past planned events (premise)', async () => {
    const all: AnyRec[] = await api.object('crm_event').find({ where: {} });
    expect(all.length).toBe(FIXTURES.length);
  });

  it('upcoming_events lists future planned events only, soonest first', async () => {
    const rows: AnyRec[] = await api.object('crm_event').find({
      where: whereFromViewFilter(upcoming.filter),
      orderBy: upcoming.sort,
    });
    // Not zero: `{now}` resolved. A literal '{now}' sorts above every ISO
    // timestamp, so an unresolved token would return nothing at all.
    expect(rows.length, '{now} resolved and matched rows').toBeGreaterThan(0);
    expect(rows.map((r) => r.subject)).toEqual(UPCOMING);
  });

  it('without the date half, the same view lists the past bookings — the #2393 defect', async () => {
    const statusOnly = (upcoming.filter ?? []).filter((r: AnyRec) => r.field !== 'start_datetime');
    const rows: AnyRec[] = await api.object('crm_event').find({ where: whereFromViewFilter(statusOnly) });
    expect(rows.map((r) => r.subject).sort()).toEqual([
      'planned-in-an-hour', 'planned-in-three-days', 'planned-last-week', 'planned-started-an-hour-ago',
    ]);
  });

  it('{now} is the current instant, not a string compared as text', async () => {
    // Two controls on one table. The resolved filter returns exactly what the
    // literal current instant returns; and the token is not passed through, as
    // the same comparison against the raw string '{now}' matches nothing.
    const viaToken: AnyRec[] = await api.object('crm_event').find({
      where: { start_datetime: { $gte: '{now}' } },
    });
    const viaInstant: AnyRec[] = await api.object('crm_event').find({
      where: { start_datetime: { $gte: new Date().toISOString() } },
    });
    expect(viaToken.map((r) => r.subject).sort()).toEqual(viaInstant.map((r) => r.subject).sort());
    expect(viaToken.length).toBe(FIXTURES.filter((f) => Date.parse(f.start) > Date.now()).length);
    // What the driver would answer to the unresolved placeholder: '{' sorts
    // above every digit, so no ISO timestamp is >= it.
    expect(FIXTURES.filter((f) => f.start >= '{now}')).toEqual([]);
  });

  it('the Meetings Booked tile filter counts future planned meetings only', async () => {
    // The analytics service resolves widget filters through the same
    // `resolveFilterTokens()` before querying, so the engine reading of the
    // tile's `where` is the tile's count.
    const rows: AnyRec[] = await api.object('crm_event').find({ where: meetingsBooked.filter });
    expect(rows.map((r) => r.subject)).toEqual(['planned-in-an-hour']);
  });
});
