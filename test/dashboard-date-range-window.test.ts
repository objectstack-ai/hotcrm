// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ObjectQL, applySystemFields } from '@objectstack/objectql';
import { SqliteWasmDriver } from '@objectstack/driver-sqlite-wasm';
import { AnalyticsService } from '@objectstack/service-analytics';
import stack from '../objectstack.config';

/**
 * ═══ A dashboard date picker must SELECT THE RIGHT ROWS, not merely exist ═══
 *
 * # What replaced what, and why (#460 → #546 → #1157)
 *
 * The Service dashboard opened on all zeros with 38 cases in the system. The
 * cause was a storage disagreement, not a bad preset: `driver-sql` 16.1.0
 * coerced a `datetime` filter bound to an epoch-millisecond INTEGER while every
 * datetime in the database is ISO TEXT, and SQLite orders every INTEGER before
 * every TEXT — so `created_date >= <int>` was true for EVERY row (a window with
 * no floor) and `created_date <= <int>` was true for NONE (a window that
 * matches nothing). The runtime ANDs the dashboard range into every widget
 * query, so the `$lte` half zeroed the whole dashboard.
 *
 * PR #546 removed the `dateRange` and left behind a metadata guard that failed
 * any dashboard windowing a `datetime` field. That guard was the right call at
 * the time and it caught a real defect class, but it could only ever assert a
 * FIELD TYPE. It was green on a platform where the window worked and green on a
 * platform where it did not; the thing it actually cared about — "does this
 * window select the rows it claims to?" — was not expressible against metadata
 * alone, so it stood in for the measurement with a ban.
 *
 * Both upstream defects are now fixed and released — objectstack#3912 (the
 * coercion) and objectstack#3777 (a bare-date `$lte` upper bound dropping
 * same-day rows) — so the ban had to go. It is replaced here by the assertion
 * it was standing in for, which is stronger in both directions:
 *
 *   - it EXECUTES the window against a real SQLite database, the storage shape
 *     the defect lived in, rather than reasoning about the declaration;
 *   - it compares against a ground truth computed in the same run, so the
 *     `$gte`-ignored half of the original bug fails too. A "the window returns
 *     rows" assertion would have passed happily on a floor that matched
 *     everything — that half of #3912 returned MORE rows, not fewer;
 *   - it re-runs on every platform bump, which is when this class regresses.
 *
 * # Fixture rules that keep this deterministic
 *
 * Every seeded case is timestamped at LOCAL NOON of its day offset. Date-macro
 * tokens resolve to day boundaries, so a fixture row is never closer than 12
 * hours to any boundary the tests below compare against — the assertions do not
 * depend on which timezone the resolver works in. A noon row is also a valid
 * witness for objectstack#3777, whose symptom was a bare-date upper bound
 * truncating to 00:00 and dropping everything created later that day.
 *
 * The offsets are deliberately spread away from the preset edges (…, 89, 100,
 * …) so that an off-by-one day in boundary handling cannot silently change a
 * count; what is under test is whether the window compares at all, not the
 * resolver's arithmetic.
 */

type AnyRec = Record<string, any>;

const dashboards: AnyRec[] = (stack as any).dashboards ?? [];
const datasets: AnyRec[] = (stack as any).datasets ?? [];
const objects: AnyRec[] = (stack as any).objects ?? [];

const datasetByName = new Map(datasets.map((d) => [d.name, d]));
const fieldType = (objectName: string, field: string): string | undefined =>
  objects.find((o) => o.name === objectName)?.fields?.[field]?.type;

/** Objects a dashboard's widgets aggregate over, via their datasets. */
const objectsBehind = (d: AnyRec): string[] => {
  const names = new Set<string>();
  for (const w of d.widgets ?? []) {
    const ds = datasetByName.get(String(w.dataset));
    if (ds?.object) names.add(ds.object);
  }
  return [...names];
};

/**
 * Dashboards whose `dateRange` windows a `datetime` column — the exact set the
 * removed guard used to reject outright. Everything below runs against these.
 */
const datetimeWindowed = dashboards.filter((d) => {
  const field = d.dateRange?.field;
  if (!field) return false;
  return objectsBehind(d).some((obj) => fieldType(obj, field) === 'datetime');
});

/** Objects this file ships a seed fixture for. */
const FIXTURED_OBJECTS = new Set(['crm_case']);

// ════════════════════════════════════════════════════════════ the fixture ══

const DAY = 86_400_000;

/** Local noon, `offset` days ago — see "Fixture rules" above. */
const noonDaysAgo = (offset: number): Date => {
  const d = new Date(Date.now() - offset * DAY);
  d.setHours(12, 0, 0, 0);
  return d;
};

interface CaseRow {
  offset: number;
  subject: string;
  status: string;
  priority: string;
  origin: string;
  type: string;
  is_closed: boolean;
  is_sla_violated: boolean;
  resolution_time_hours: number | null;
  resolved_by_article: string | null;
}

const mk = (
  offset: number,
  status: string,
  priority: string,
  origin: string,
  type: string,
  is_closed: boolean,
  is_sla_violated: boolean,
  resolution_time_hours: number | null = null,
  resolved_by_article: string | null = null,
): CaseRow => ({
  offset,
  subject: `fixture case @-${offset}d`,
  status,
  priority,
  origin,
  type,
  is_closed,
  is_sla_violated,
  resolution_time_hours,
  resolved_by_article,
});

/**
 * 13 cases spanning 200 days. Each preset window below selects a strictly
 * smaller slice than the one before it, and every widget on the Service
 * dashboard still answers under the TIGHTEST preset (`last_7_days`) — a fixture
 * where a widget is empty for lack of data cannot tell an empty widget apart
 * from a broken window.
 */
const CASE_ROWS: CaseRow[] = [
  mk(0, 'new', 'critical', 'web', 'problem', false, false),
  mk(1, 'closed', 'high', 'email', 'question', true, false, 4, 'KB-1'),
  mk(2, 'in_progress', 'medium', 'phone', 'problem', false, true),
  mk(5, 'closed', 'low', 'web', 'request', true, true, 52, 'KB-2'),
  mk(10, 'new', 'high', 'chat', 'problem', false, false),
  mk(20, 'closed', 'critical', 'email', 'problem', true, false, 12, 'KB-1'),
  mk(29, 'escalated', 'critical', 'phone', 'problem', false, true),
  mk(45, 'closed', 'medium', 'web', 'question', true, false, 30, null),
  mk(60, 'in_progress', 'low', 'chat', 'request', false, false),
  mk(89, 'closed', 'high', 'web', 'problem', true, true, 96, 'KB-3'),
  mk(100, 'closed', 'medium', 'email', 'question', true, false, 8, 'KB-2'),
  mk(120, 'new', 'low', 'web', 'request', false, false),
  mk(200, 'closed', 'high', 'phone', 'problem', true, false, 20, null),
];

const CASE_OBJECT = {
  name: 'crm_case',
  fields: {
    id: { type: 'text' },
    subject: { type: 'text' },
    status: { type: 'text' },
    priority: { type: 'text' },
    origin: { type: 'text' },
    type: { type: 'text' },
    is_closed: { type: 'boolean' },
    is_sla_violated: { type: 'boolean' },
    resolution_time_hours: { type: 'number' },
    resolved_by_article: { type: 'text' },
    created_date: { type: 'datetime' },
  },
} as const;

/**
 * The console's own lowering of a preset (`dashboard-filters` in objectui):
 * `last_30_days` travels as `{ from: '{30_days_ago}', to: '{today}' }`. The
 * BARE preset name is not a filter comparand — see the guard in
 * `test/analytics-integrity.test.ts` and objectstack#8690.
 */
const presetWindow = (days: number) => ({ $gte: `{${days}_days_ago}`, $lte: '{today}' });

const silence = () => {};

// ══════════════════════════════════════════════ the engine under the test ══

let ql: Awaited<ReturnType<typeof ObjectQL.create>>;
let api: AnyRec;
let analytics: AnalyticsService;

beforeAll(async () => {
  // A real SQLite database, initialised through the same `initObjects` call the
  // runtime makes at boot. `driver-memory` would answer these questions too —
  // and answers them identically today — but the defect this file guards was a
  // disagreement between a coerced comparand and a column's on-disk text, which
  // only a SQL driver can have.
  const driver = new SqliteWasmDriver({ filename: ':memory:' });
  await driver.connect();
  const shaped = applySystemFields(CASE_OBJECT as never, { multiTenant: false }) as AnyRec;
  await driver.initObjects([{ name: 'crm_case', fields: shaped.fields } as never]);

  ql = await ObjectQL.create({
    datasources: { default: driver },
    objects: { crm_case: CASE_OBJECT } as never,
  });
  api = ql.createContext({ isSystem: true });

  for (const row of CASE_ROWS) {
    const { offset, ...rest } = row;
    await api.object('crm_case').insert({ ...rest, created_date: noonDaysAgo(offset).toISOString() });
  }

  analytics = new AnalyticsService({
    // The bridge `AnalyticsServicePlugin` auto-wires at boot, so the filter
    // observed here is the filter the engine really receives.
    executeAggregate: async (objectName, { groupBy, aggregations, filter, timezone, context }) =>
      (ql as AnyRec).aggregate(objectName, {
        where: filter,
        groupBy,
        aggregations: aggregations?.map((a: AnyRec) => ({
          function: a.method, field: a.field, alias: a.alias,
        })),
        timezone,
        context,
      }),
    queryCapabilities: () => ({ nativeSql: false, objectqlAggregate: true, inMemory: false }),
    logger: { info: silence, warn: silence, error: silence, debug: silence } as never,
  });
}, 60_000);

afterAll(async () => {
  await ql?.close();
});

// ══════════════════ 1 · the two upstream defects, pinned by measurement ══

describe('a datetime window compares correctly on the real SQL path', () => {
  const count = (where: AnyRec) => api.object('crm_case').count({ where });
  const within = (days: number) => CASE_ROWS.filter((r) => r.offset <= days).length;

  it('has a fixture that can tell the answers apart', () => {
    // If every row fell inside every window, each assertion below would pass on
    // a filter that did nothing at all.
    expect(CASE_ROWS.length).toBe(13);
    expect(within(7)).toBeLessThan(within(30));
    expect(within(30)).toBeLessThan(within(90));
    expect(within(90)).toBeLessThan(CASE_ROWS.length);
  });

  it('counts every row when nothing is filtered', async () => {
    expect(await count({})).toBe(CASE_ROWS.length);
  });

  it('honours the $gte floor — objectstack#3912 made it match everything', async () => {
    expect(await count({ created_date: { $gte: '{90_days_ago}' } })).toBe(within(90));
    expect(await count({ created_date: { $gte: '{30_days_ago}' } })).toBe(within(30));
    expect(await count({ created_date: { $gte: '{7_days_ago}' } })).toBe(within(7));
  });

  it('honours the $lte ceiling — objectstack#3912 made it match nothing', async () => {
    // Everything in the fixture is in the past, so `<= today` keeps all of it.
    expect(await count({ created_date: { $lte: '{today}' } })).toBe(CASE_ROWS.length);
  });

  it('honours both bounds together — the shape that zeroed the dashboard', async () => {
    expect(await count({ created_date: presetWindow(90) })).toBe(within(90));
    expect(await count({ created_date: presetWindow(30) })).toBe(within(30));
    expect(await count({ created_date: presetWindow(7) })).toBe(within(7));
  });

  it('keeps same-day rows under a bare-date upper bound — objectstack#3777', async () => {
    // The bug truncated `YYYY-MM-DD` to 00:00 on a datetime column, dropping
    // every record created later that day. The fixture's newest case is at
    // local noon today, so a regression here loses exactly one row.
    const today = new Date();
    const bareDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    expect(await count({ created_date: { $lte: bareDate } })).toBe(CASE_ROWS.length);
  });
});

// ═══════════════════ 2 · the dashboards that actually declare the window ══

describe('every datetime-windowed dashboard answers under its own picker', () => {
  it('is exercising at least one dashboard', () => {
    // The Service dashboard's `dateRange` is the reason this file exists. If it
    // is ever removed again, this fails rather than passing vacuously.
    expect(
      datetimeWindowed.map((d) => d.name),
      'no dashboard windows a datetime field — nothing below is being tested',
    ).toContain('service_dashboard');
  });

  it('windows only objects this file ships a fixture for', () => {
    // The relaxed replacement for "no dashboard may window a datetime field":
    // a new datetime window is still gated — on evidence now, not on a ban.
    // Adding one means adding its seed rows here.
    const unfixtured: string[] = [];
    for (const d of datetimeWindowed) {
      for (const obj of objectsBehind(d)) {
        if (fieldType(obj, d.dateRange.field) === 'datetime' && !FIXTURED_OBJECTS.has(obj)) {
          unfixtured.push(`${d.name}: windows ${obj}.${d.dateRange.field}, which has no fixture here`);
        }
      }
    }
    expect(
      unfixtured,
      `datetime-windowed dashboards this file cannot execute:\n  ${unfixtured.join('\n  ')}`,
    ).toEqual([]);
  });

  /** One widget, run exactly as the dashboard declares it. */
  const runWidget = async (widget: AnyRec, filter: AnyRec | undefined): Promise<AnyRec[]> => {
    const dataset = datasetByName.get(String(widget.dataset));
    expect(dataset, `widget ${widget.id} names an undeclared dataset "${widget.dataset}"`).toBeTruthy();
    const result = await analytics.queryDataset(
      dataset as never,
      {
        ...(widget.dimensions ? { dimensions: widget.dimensions } : {}),
        measures: widget.values,
        ...(filter ? { runtimeFilter: filter as never } : {}),
      },
      { isSystem: true } as never,
    );
    return result.rows as AnyRec[];
  };

  /**
   * The dashboard range as the runtime applies it: ANDed into every widget
   * query unless the widget opted out via `filterBindings.dateRange === false`.
   */
  const widgetFilter = (d: AnyRec, w: AnyRec, window: AnyRec | null): AnyRec | undefined => {
    if (!window || w.filterBindings?.dateRange === false) return w.filter;
    return { ...(w.filter ?? {}), [d.dateRange.field]: window };
  };

  /** Sum of one measure across the returned rows. */
  const sumOf = (rows: AnyRec[], measure: string): number =>
    rows.reduce((s, r) => s + (Number(r[measure]) || 0), 0);

  /** Sum of the widget's own measures across the returned rows. */
  const totalOf = (rows: AnyRec[], widget: AnyRec): number =>
    (widget.values as string[]).reduce((sum, measure) => sum + sumOf(rows, measure), 0);

  const PRESETS = [7, 30, 90] as const;

  for (const days of PRESETS) {
    it(`leaves no widget blank at last_${days}_days`, async () => {
      const blank: string[] = [];
      for (const d of datetimeWindowed) {
        for (const w of d.widgets as AnyRec[]) {
          const rows = await runWidget(w, widgetFilter(d, w, presetWindow(days)));
          if (rows.length === 0 || totalOf(rows, w) <= 0) {
            blank.push(`${d.name}/${w.id}: ${rows.length} row(s), total ${totalOf(rows, w)}`);
          }
        }
      }
      expect(
        blank,
        `widgets that go blank once the date window is applied — the #460 symptom:\n  ${blank.join('\n  ')}`,
      ).toEqual([]);
    }, 30_000);
  }

  it('counts exactly the rows the window selects, not merely some rows', async () => {
    // The half a "returns rows" assertion cannot see: #3912's `$gte` matched
    // EVERY row, so a broken floor reads as a healthy widget with a bigger
    // number. Every count widget is compared against a truth computed here.
    const wrong: string[] = [];
    for (const d of datetimeWindowed) {
      for (const days of PRESETS) {
        for (const w of d.widgets as AnyRec[]) {
          if (!(w.values as string[]).includes('case_count')) continue;
          const window = w.filterBindings?.dateRange === false ? null : days;
          const rows = await runWidget(w, widgetFilter(d, w, window ? presetWindow(days) : null));
          const expected = CASE_ROWS.filter((r) => truthMatches(r, w.filter, window)).length;
          // `case_count` only: a widget like `open_cases_by_priority` also
          // carries `avg_sla_violated`, and summing a rate into a row count
          // compares two different quantities.
          const actual = sumOf(rows, 'case_count');
          if (actual !== expected) {
            wrong.push(`${d.name}/${w.id} @ last_${days}_days: engine ${actual}, truth ${expected}`);
          }
        }
      }
    }
    expect(wrong, `windowed widget counts disagree with ground truth:\n  ${wrong.join('\n  ')}`).toEqual([]);
  }, 30_000);

  it('narrows as the preset narrows — a window that changes nothing is inert', async () => {
    // `cases_by_origin` carries no filter of its own, so it reads the window
    // and nothing else. If the three presets and the unwindowed query all agree,
    // the picker is decoration.
    const service = datetimeWindowed.find((d) => d.name === 'service_dashboard')!;
    const widget = (service.widgets as AnyRec[]).find((w) => w.id === 'cases_by_origin')!;
    const totals: number[] = [];
    for (const days of PRESETS) {
      totals.push(sumOf(await runWidget(widget, widgetFilter(service, widget, presetWindow(days))), 'case_count'));
    }
    const unwindowed = sumOf(await runWidget(widget, widget.filter), 'case_count');
    expect([...totals, unwindowed], 'the window does not narrow the result set').toEqual([
      CASE_ROWS.filter((r) => r.offset <= 7).length,
      CASE_ROWS.filter((r) => r.offset <= 30).length,
      CASE_ROWS.filter((r) => r.offset <= 90).length,
      CASE_ROWS.length,
    ]);
  }, 30_000);
});

/**
 * Ground truth for a widget's own filter plus the injected window, computed
 * over the fixture rows rather than asked of the engine.
 *
 * Only the shapes the dashboards actually author are understood: field equality
 * and a `{N_days_ago}` floor on the range field. Anything else throws, so a
 * widget filter this function silently mis-models cannot pass by accident.
 */
function truthMatches(row: CaseRow, filter: AnyRec | undefined, windowDays: number | null): boolean {
  if (windowDays !== null && row.offset > windowDays) return false;
  for (const [field, cond] of Object.entries(filter ?? {})) {
    if (field === 'created_date') {
      const gte = (cond as AnyRec)?.$gte;
      const m = typeof gte === 'string' ? gte.match(/^\{(\d+)_days_ago\}$/) : null;
      if (!m) throw new Error(`truthMatches: unsupported created_date filter ${JSON.stringify(cond)}`);
      if (row.offset > Number(m[1])) return false;
      continue;
    }
    if (cond !== null && typeof cond === 'object') {
      throw new Error(`truthMatches: unsupported operator filter on ${field}: ${JSON.stringify(cond)}`);
    }
    if ((row as AnyRec)[field] !== cond) return false;
  }
  return true;
}
