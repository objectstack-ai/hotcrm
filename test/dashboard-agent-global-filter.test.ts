// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ObjectQL, applySystemFields } from '@objectstack/objectql';
import { SqliteWasmDriver } from '@objectstack/driver-sqlite-wasm';
import { AnalyticsService } from '@objectstack/service-analytics';
import stack from '../objectstack.config';
import { CaseDataset } from '../src/datasets/case.dataset';

/**
 * ═══ The Service dashboard's Agent filter must SELECT ROWS, not just render ═══
 *
 * # What this pins, and why nothing else could (#966 → #1398)
 *
 * #966 asked whether `service_dashboard`'s `owner_id` / "Agent" control really
 * filters or is silently inert. It could not be answered by reading: the
 * dashboard declares the control, `case_metrics` declares no owner dimension,
 * and both facts are equally consistent with a control that works and one that
 * does nothing. The question was settled in a browser, against a running app
 * with deliberately staged owners: it filters. A dashboard filter is matched
 * against the OBJECT behind each widget's dataset — `owner_id` is a field on
 * `crm_case`, and that is all the filter needs — then ANDed into the query of
 * every widget bound to it.
 *
 * Nothing in the repository pinned that, and this is the one failure class
 * that produces no error. If a dataset change, an engine change or a version
 * bump made the filter inert, every widget would keep rendering PLAUSIBLE
 * NUMBERS: "Open Cases 30" for Alpha, "Open Cases 30" for Beta, "Open Cases
 * 30" unfiltered. Nothing throws, nothing blanks, no screenshot looks wrong.
 * The only reason the question was ever asked was a human reading metadata.
 *
 * ⚠️ This app consumes PINNED published `@objectstack/*` versions, so such a
 * regression does not arrive gradually — it arrives in one bump, in a PR whose
 * diff is a single line of `package.json`. That is what this file watches.
 *
 * # The property asserted, and why it is stronger than the numbers
 *
 * Every fixture case below is owned by one of exactly two agents, so for any
 * COUNT the two per-agent shards must PARTITION the unfiltered total:
 *
 *     unfiltered(w) === filtered(w, alpha) + filtered(w, beta)
 *
 * An inert filter fails this loudly rather than quietly: both shards would
 * equal the unfiltered total, so the sum would be double it. A filter that
 * over-matches fails it in the other direction. And because the property is
 * about how the numbers RELATE, it survives every future change to the seed
 * data and to this fixture — unlike the figures #966 measured on 17.1.0
 * (`Open Cases 30 → 12 | 18`), which are a photograph of one database and are
 * deliberately NOT hard-coded here. The ground truth each assertion compares
 * against is computed from the fixture rows IN THIS RUN, beside the engine's
 * answer, so the two can only agree by being right.
 *
 * # Both widget shapes, because they resolve differently
 *
 * #966 measured that grouped charts filter too, so a tile-only assertion would
 * under-pin the control. A metric tile takes one aggregate; a grouped widget
 * takes one aggregate per dimension value, and the filter has to survive the
 * grouping. `open_cases` (metric) and `cases_by_status` (donut) are named
 * explicitly below, and every filter-bound widget on the dashboard is swept.
 *
 * ⛔ This file pins THIS APP's behaviour. It deliberately asserts nothing about
 * how the platform resolves the field internally — that is the platform's to
 * change, and an assertion about it would fail on a refactor that broke
 * nothing here.
 */

type AnyRec = Record<string, any>;

const objects: AnyRec[] = (stack as any).objects ?? [];
const dashboards: AnyRec[] = (stack as any).dashboards ?? [];

const kase = objects.find((o) => o.name === 'crm_case') as AnyRec;
const service = dashboards.find((d) => d.name === 'service_dashboard') as AnyRec;
const widgets = (): AnyRec[] => (service?.widgets ?? []) as AnyRec[];
const widget = (id: string): AnyRec => widgets().find((w) => w.id === id) as AnyRec;

/**
 * The control under test, read off the shipped metadata rather than spelled
 * here — if it is relabelled or rebound, these tests must follow it or fail,
 * never quietly test a filter the dashboard no longer offers.
 */
const agentFilter = (): AnyRec =>
  ((service?.globalFilters ?? []) as AnyRec[]).find((f) => f.label === 'Agent') as AnyRec;

const AGENT_FIELD = 'owner_id';

// ════════════════════════════════════════════════════════════ the fixture ══

const ALPHA = 'usr_agent_alpha';
const BETA = 'usr_agent_beta';
/** A third agent who owns nothing — see the "no cases" test. */
const GHOST = 'usr_agent_ghost';

interface FixtureCase {
  owner: string;
  status: string;
  priority: string;
  origin: string;
  type: string;
  is_closed: boolean;
  is_sla_violated: boolean;
  resolution_time_hours: number | null;
  resolved_by_article: string | null;
  /** Days before now; every row is stamped at UTC NOON of that day. */
  offset: number;
}

const c = (owner: string, over: Partial<FixtureCase>): FixtureCase => ({
  owner,
  status: 'new',
  priority: 'medium',
  origin: 'web',
  type: 'question',
  is_closed: false,
  is_sla_violated: false,
  resolution_time_hours: null,
  resolved_by_article: null,
  offset: 3,
  ...over,
});

/**
 * 24 cases over two agents, split 10 / 14 — deliberately UNEVEN, so a filter
 * that returned the wrong shard, or the same shard twice, cannot satisfy the
 * partition by symmetry.
 *
 * The distribution is shaped so that every widget on the dashboard answers for
 * BOTH agents (a widget that is empty for one of them cannot tell a working
 * filter apart from a broken one), while each grouped dimension still has at
 * least one value only ONE agent holds — `waiting_customer` and `escalated`
 * are Alpha-only and Beta-only respectively, `social_media` is Beta-only. A
 * grouped assertion where every group is populated by both agents would pass
 * on an engine that merged the two shards.
 */
const CASE_ROWS: FixtureCase[] = [
  // ── Alpha: 10 cases — 6 open, 4 closed ──
  c(ALPHA, { status: 'new', priority: 'critical', origin: 'email', type: 'problem', offset: 1 }),
  c(ALPHA, { status: 'new', priority: 'low', origin: 'web', type: 'question', offset: 2 }),
  c(ALPHA, { status: 'in_progress', priority: 'high', origin: 'phone', type: 'bug', is_sla_violated: true, offset: 4 }),
  c(ALPHA, { status: 'in_progress', priority: 'high', origin: 'web', type: 'problem', offset: 6 }),
  c(ALPHA, { status: 'waiting_customer', priority: 'medium', origin: 'chat', type: 'question', is_sla_violated: true, offset: 8 }),
  c(ALPHA, { status: 'waiting_customer', priority: 'high', origin: 'email', type: 'feature_request', offset: 11 }),
  c(ALPHA, { status: 'closed', priority: 'medium', origin: 'web', type: 'question', is_closed: true, resolution_time_hours: 4, resolved_by_article: 'KB-1', offset: 13 }),
  c(ALPHA, { status: 'closed', priority: 'high', origin: 'phone', type: 'problem', is_closed: true, is_sla_violated: true, resolution_time_hours: 52, resolved_by_article: 'KB-2', offset: 15 }),
  c(ALPHA, { status: 'closed', priority: 'low', origin: 'chat', type: 'question', is_closed: true, resolution_time_hours: 6, resolved_by_article: 'KB-1', offset: 18 }),
  c(ALPHA, { status: 'closed', priority: 'critical', origin: 'email', type: 'bug', is_closed: true, resolution_time_hours: 30, offset: 21 }),

  // ── Beta: 14 cases — 9 open, 5 closed ──
  c(BETA, { status: 'new', priority: 'critical', origin: 'web', type: 'bug', is_sla_violated: true, offset: 1 }),
  c(BETA, { status: 'new', priority: 'medium', origin: 'social_media', type: 'question', offset: 2 }),
  c(BETA, { status: 'new', priority: 'low', origin: 'chat', type: 'feature_request', offset: 3 }),
  c(BETA, { status: 'in_progress', priority: 'high', origin: 'email', type: 'problem', offset: 5 }),
  c(BETA, { status: 'in_progress', priority: 'medium', origin: 'phone', type: 'problem', is_sla_violated: true, offset: 7 }),
  c(BETA, { status: 'escalated', priority: 'critical', origin: 'phone', type: 'bug', is_sla_violated: true, offset: 9 }),
  c(BETA, { status: 'escalated', priority: 'high', origin: 'web', type: 'problem', offset: 10 }),
  c(BETA, { status: 'waiting_support', priority: 'medium', origin: 'social_media', type: 'question', offset: 12 }),
  c(BETA, { status: 'waiting_support', priority: 'low', origin: 'web', type: 'question', offset: 14 }),
  c(BETA, { status: 'closed', priority: 'critical', origin: 'email', type: 'bug', is_closed: true, is_sla_violated: true, resolution_time_hours: 96, resolved_by_article: 'KB-3', offset: 16 }),
  c(BETA, { status: 'closed', priority: 'high', origin: 'web', type: 'problem', is_closed: true, resolution_time_hours: 12, resolved_by_article: 'KB-1', offset: 17 }),
  c(BETA, { status: 'closed', priority: 'medium', origin: 'chat', type: 'question', is_closed: true, resolution_time_hours: 8, resolved_by_article: 'KB-2', offset: 19 }),
  c(BETA, { status: 'closed', priority: 'medium', origin: 'phone', type: 'question', is_closed: true, resolution_time_hours: 20, offset: 20 }),
  c(BETA, { status: 'closed', priority: 'low', origin: 'web', type: 'question', is_closed: true, resolution_time_hours: 3, resolved_by_article: 'KB-3', offset: 23 }),
];

const DAY = 86_400_000;

/**
 * UTC noon, `offset` days ago. The same calendar the dashboard's own window is
 * resolved on, for the reason `test/dashboard-date-range-window.test.ts`
 * documents at length: a locally-stamped fixture sits up to 14 hours from a
 * UTC boundary and drops a row for contributors east of UTC, invisibly to CI.
 */
const utcNoonDaysAgo = (offset: number): string => {
  const d = new Date(Date.now() - offset * DAY);
  d.setUTCHours(12, 0, 0, 0);
  return d.toISOString();
};

// ═══════════════════════════════════════════ ground truth, computed in-run ══

/**
 * Does a fixture row satisfy a widget filter? Only the shapes the Service
 * dashboard actually authors are understood — field equality and a
 * `{N_days_ago}` floor on the range field. Anything else THROWS, so a widget
 * filter this function silently mis-models cannot pass by accident.
 */
const truthMatches = (row: FixtureCase, filter: AnyRec | undefined): boolean => {
  for (const [field, cond] of Object.entries(filter ?? {})) {
    if (field === AGENT_FIELD) {
      if (row.owner !== cond) return false;
      continue;
    }
    if (field === 'created_date') {
      const spec = cond as AnyRec;
      for (const [op, comparand] of Object.entries(spec)) {
        const m = typeof comparand === 'string' ? comparand.match(/^\{(\d+)_days_ago\}$/) : null;
        if (op === '$gte' && m) {
          if (row.offset > Number(m[1])) return false;
        } else if (op === '$lte' && comparand === '{today}') {
          // Every fixture row is in the past; a "<= today" ceiling keeps them all.
          continue;
        } else {
          throw new Error(`truthMatches: unsupported created_date bound ${op}: ${JSON.stringify(comparand)}`);
        }
      }
      continue;
    }
    if (cond !== null && typeof cond === 'object') {
      throw new Error(`truthMatches: unsupported operator filter on ${field}: ${JSON.stringify(cond)}`);
    }
    if ((row as AnyRec)[field] !== cond) return false;
  }
  return true;
};

/**
 * The dataset's COUNT measures, evaluated over fixture rows.
 *
 * Only additive counts appear here, and that is the point: `avg_resolution`,
 * `avg_sla_violated`, `kb_deflection_rate` and `sla_compliance_rate` are means
 * and ratios, which do NOT partition — the average of two shards is not the
 * sum of their averages. Asserting a partition on them would be asserting
 * something false about arithmetic, not something true about the filter.
 */
const COUNT_MEASURES: Record<string, (rows: FixtureCase[]) => number> = {
  case_count: (rows) => rows.length,
  closed_count: (rows) => rows.filter((r) => r.is_closed).length,
  kb_resolved_count: (rows) => rows.filter((r) => r.is_closed && r.resolved_by_article !== null).length,
  sla_met_count: (rows) => rows.filter((r) => r.is_closed && !r.is_sla_violated).length,
};

/** Which fixture column a dataset dimension reads — taken from the SHIPPED dataset. */
const dimensionField = (name: string): string => {
  const dim = (CaseDataset.dimensions as AnyRec[]).find((d) => d.name === name);
  if (!dim) throw new Error(`case_metrics declares no dimension "${name}"`);
  return String(dim.field);
};

/** Grouped keys are compared as strings; an absent lookup groups under this. */
const NO_VALUE = '(none)';
const keyOf = (v: unknown): string => (v === null || v === undefined || v === '' ? NO_VALUE : String(v));

// ══════════════════════════════════════════════ the engine under the test ══

const CASE_COLUMNS = [
  'owner_id', 'subject', 'description', 'status', 'priority', 'origin', 'type',
  'is_closed', 'is_sla_violated', 'resolution', 'resolution_time_hours',
  'resolved_by_article', 'created_date',
];

let ql: AnyRec;
let analytics: AnalyticsService;

beforeAll(async () => {
  // A real SQLite database, initialised through the same `initObjects` call the
  // runtime makes at boot, over the REAL `crm_case` schema — so `owner_id` is
  // the app's own lookup column, not a stand-in declared for the test.
  const driver = new SqliteWasmDriver({ filename: ':memory:' });
  await driver.connect();
  const materialized = applySystemFields(kase as never, { multiTenant: false }) as AnyRec;
  await driver.initObjects([{
    name: kase.name,
    fields: materialized.fields as Record<string, unknown>,
    indexes: materialized.indexes,
  } as never]);

  ql = (await ObjectQL.create({
    datasources: { default: driver },
    objects: { crm_case: kase } as never,
  })) as never;

  const api = ql.createContext({ isSystem: true });
  for (const [i, row] of CASE_ROWS.entries()) {
    const record: AnyRec = {
      owner_id: row.owner,
      subject: `agent-filter fixture #${i + 1}`,
      description: 'Seeded by dashboard-agent-global-filter.test.ts',
      status: row.status,
      priority: row.priority,
      origin: row.origin,
      type: row.type,
      is_closed: row.is_closed,
      is_sla_violated: row.is_sla_violated,
      resolution_time_hours: row.resolution_time_hours,
      resolved_by_article: row.resolved_by_article,
      created_date: utcNoonDaysAgo(row.offset),
      // The app's own `resolution_required_for_closed` rule fires on these
      // inserts — a welcome sign the REAL object is under test.
      ...(row.is_closed ? { resolution: 'Resolved by the fixture.' } : {}),
    };
    const insert: AnyRec = {};
    for (const col of CASE_COLUMNS) if (record[col] !== undefined && record[col] !== null) insert[col] = record[col];
    await api.object('crm_case').insert(insert);
  }

  analytics = new AnalyticsService({
    // The same bridge `AnalyticsServicePlugin` auto-wires at boot, so the
    // filter observed here is the filter the engine really receives.
    executeAggregate: async (objectName: string, opts: AnyRec) =>
      ql.aggregate(objectName, {
        where: opts.filter,
        groupBy: opts.groupBy,
        aggregations: opts.aggregations?.map((a: AnyRec) => ({
          function: a.method, field: a.field, alias: a.alias,
        })),
        timezone: opts.timezone,
        context: opts.context,
      }),
    queryCapabilities: () => ({ nativeSql: false, objectqlAggregate: true, inMemory: false }),
    logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} } as never,
  });
}, 60_000);

afterAll(async () => {
  await ql?.close();
});

/**
 * The dashboard filter set as the runtime ANDs it into ONE widget's query: the
 * widget's own filter, plus the Agent selection, plus the date window — each
 * skipped when the widget opted out of it by name via `filterBindings`.
 */
const widgetFilter = (w: AnyRec, opts: { agent?: string; window?: AnyRec } = {}): AnyRec | undefined => {
  const f: AnyRec = { ...(w.filter ?? {}) };
  if (opts.agent !== undefined && w.filterBindings?.[AGENT_FIELD] !== false) {
    f[AGENT_FIELD] = opts.agent;
  }
  if (opts.window && w.filterBindings?.dateRange !== false) {
    f[service.dateRange.field] = opts.window;
  }
  return Object.keys(f).length > 0 ? f : undefined;
};

/** One widget, run through the real dataset executor exactly as declared. */
const run = async (w: AnyRec, opts: { agent?: string; window?: AnyRec } = {}): Promise<AnyRec[]> => {
  const filter = widgetFilter(w, opts);
  const result = await analytics.queryDataset(
    CaseDataset as never,
    {
      ...(w.dimensions ? { dimensions: w.dimensions } : {}),
      measures: w.values,
      ...(filter ? { runtimeFilter: filter as never } : {}),
    } as never,
    { isSystem: true } as never,
  );
  return (result.rows ?? []) as AnyRec[];
};

/** Sum of one measure over the returned rows — the whole widget, ungrouped. */
const total = (rows: AnyRec[], measure: string): number =>
  rows.reduce((s, r) => s + (Number(r[measure]) || 0), 0);

/** The engine's answer per dimension value, for one measure. */
const byGroup = (rows: AnyRec[], dimension: string, measure: string): Map<string, number> => {
  const out = new Map<string, number>();
  for (const r of rows) {
    const k = keyOf(r[dimension]);
    out.set(k, (out.get(k) ?? 0) + (Number(r[measure]) || 0));
  }
  return out;
};

/** Ground truth for one widget and one measure, computed over the fixture. */
const truthTotal = (w: AnyRec, measure: string, opts: { agent?: string } = {}): number => {
  const filter = widgetFilter(w, opts);
  return COUNT_MEASURES[measure](CASE_ROWS.filter((r) => truthMatches(r, filter)));
};

/** Ground truth per dimension value, computed over the fixture. */
const truthByGroup = (w: AnyRec, dimension: string, measure: string, opts: { agent?: string } = {}): Map<string, number> => {
  const field = dimensionField(dimension);
  const selected = CASE_ROWS.filter((r) => truthMatches(r, widgetFilter(w, opts)));
  const buckets = new Map<string, FixtureCase[]>();
  for (const row of selected) {
    const k = keyOf((row as AnyRec)[field]);
    if (!buckets.has(k)) buckets.set(k, []);
    (buckets.get(k) as FixtureCase[]).push(row);
  }
  const out = new Map<string, number>();
  for (const [k, rows] of buckets) out.set(k, COUNT_MEASURES[measure](rows));
  return out;
};

// ════════════════════════════════ 1 · the control the tests below assume ══

describe('the Service dashboard offers an Agent filter over the case owner', () => {
  it('declares it, so nothing below can pass vacuously', () => {
    const f = agentFilter();
    expect(f, 'service_dashboard declares no global filter labelled "Agent"').toBeTruthy();
    expect(f.field).toBe(AGENT_FIELD);
    expect(f.scope).toBe('dashboard');
  });

  it('names a field the case object really has', () => {
    // The filter reaches the widget query as a predicate on `crm_case`. A
    // filter naming a field the object lacks would ask for a column that does
    // not exist, which is the failure `filterBindings` opt-outs exist for.
    expect(Object.keys(kase.fields ?? {})).toContain(AGENT_FIELD);
  });

  /**
   * The asymmetry #966 measured, stated as a fact about THIS app: the control
   * filters on a field the cube never declares. It is recorded here because it
   * is what makes the whole question non-obvious — a reader who checks the
   * dataset for an owner dimension, finds none, and concludes the control is
   * decoration is reasoning correctly from the wrong premise.
   */
  it('filters on a field `case_metrics` declares no dimension for', () => {
    const dimensionFields = (CaseDataset.dimensions as AnyRec[]).map((d) => String(d.field));
    expect(dimensionFields).not.toContain(AGENT_FIELD);
  });

  it('binds both widgets under test to the filter', () => {
    for (const id of ['open_cases', 'cases_by_status']) {
      const w = widget(id);
      expect(w, `service_dashboard has no ${id} widget`).toBeTruthy();
      expect(w.filterBindings?.[AGENT_FIELD], `${id} opted out of the Agent filter`).not.toBe(false);
    }
  });
});

// ═══════════════════════════════════ 2 · the fixture can tell them apart ══

describe('the fixture can distinguish a working filter from an inert one', () => {
  it('gives every case to one of exactly two agents', () => {
    // The partition property below is only meaningful if the two shards can
    // add up to the whole: an unowned or third-owner row would make the sum
    // fall short for a reason that has nothing to do with the filter.
    expect(new Set(CASE_ROWS.map((r) => r.owner))).toEqual(new Set([ALPHA, BETA]));
  });

  it('splits them unevenly, so a swapped shard cannot pass by symmetry', () => {
    const alpha = CASE_ROWS.filter((r) => r.owner === ALPHA).length;
    const beta = CASE_ROWS.filter((r) => r.owner === BETA).length;
    expect(alpha).toBeGreaterThan(0);
    expect(beta).toBeGreaterThan(0);
    expect(alpha).not.toBe(beta);
    expect(alpha + beta).toBe(CASE_ROWS.length);
  });

  it('leaves each agent holding a status the other does not', () => {
    // Without this, every group would be populated by both agents and a
    // grouped assertion would still pass on an engine that merged the shards.
    const open = CASE_ROWS.filter((r) => !r.is_closed);
    const statusesOf = (owner: string) => new Set(open.filter((r) => r.owner === owner).map((r) => r.status));
    const alpha = statusesOf(ALPHA);
    const beta = statusesOf(BETA);
    expect([...alpha].some((s) => !beta.has(s)), 'no Alpha-only open status').toBe(true);
    expect([...beta].some((s) => !alpha.has(s)), 'no Beta-only open status').toBe(true);
  });
});

// ═════════════════════════════════════════════ 3 · a metric tile filters ══

describe('a metric tile is partitioned by the Agent filter', () => {
  it('splits Open Cases across the two agents and loses nothing', async () => {
    const w = widget('open_cases');
    const all = total(await run(w), 'case_count');
    const alpha = total(await run(w, { agent: ALPHA }), 'case_count');
    const beta = total(await run(w, { agent: BETA }), 'case_count');

    // The engine agrees with a truth computed here, not with a number typed
    // here — the figures #966 measured on 17.1.0 are a photograph of another
    // database and would break this suite at the next seed change.
    expect(all).toBe(truthTotal(w, 'case_count'));
    expect(alpha).toBe(truthTotal(w, 'case_count', { agent: ALPHA }));
    expect(beta).toBe(truthTotal(w, 'case_count', { agent: BETA }));

    // The property. An inert filter makes both shards equal `all`, so the sum
    // comes to twice the total; an over-matching filter falls short.
    expect(alpha + beta, 'the two agent shards do not partition the unfiltered total').toBe(all);

    // …and the filter really narrows, rather than partitioning trivially.
    expect(alpha).toBeGreaterThan(0);
    expect(beta).toBeGreaterThan(0);
    expect(alpha).toBeLessThan(all);
    expect(beta).toBeLessThan(all);
  }, 30_000);

  it('returns nothing at all for an agent who owns no cases', async () => {
    // The sharpest single reading: a DROPPED filter returns the full total
    // here, not zero. Only a filter that reached the query can answer 0.
    const w = widget('open_cases');
    const ghost = total(await run(w, { agent: GHOST }), 'case_count');
    expect(ghost, 'an agent with no cases sees somebody else\'s numbers').toBe(0);
  }, 30_000);
});

// ══════════════════════════════════════════ 4 · a grouped widget filters ══

describe('a grouped widget is partitioned by the Agent filter', () => {
  /**
   * `cases_by_status` is a donut: one aggregate per status value. The filter
   * has to survive the grouping, which is a different code path from the
   * single-aggregate tile above — #966 measured both, so both are pinned.
   */
  it('splits Cases by Status group by group', async () => {
    const w = widget('cases_by_status');
    const dim = (w.dimensions as string[])[0];

    const all = byGroup(await run(w), dim, 'case_count');
    const alpha = byGroup(await run(w, { agent: ALPHA }), dim, 'case_count');
    const beta = byGroup(await run(w, { agent: BETA }), dim, 'case_count');

    expect(all.size, 'the unfiltered donut has no groups at all').toBeGreaterThan(1);

    const truthAll = truthByGroup(w, dim, 'case_count');
    const truthAlpha = truthByGroup(w, dim, 'case_count', { agent: ALPHA });
    const truthBeta = truthByGroup(w, dim, 'case_count', { agent: BETA });

    const disagreements: string[] = [];
    for (const key of new Set([...all.keys(), ...alpha.keys(), ...beta.keys(), ...truthAll.keys()])) {
      const a = alpha.get(key) ?? 0;
      const b = beta.get(key) ?? 0;
      const t = all.get(key) ?? 0;
      if (t !== (truthAll.get(key) ?? 0)) disagreements.push(`${key}: unfiltered ${t}, truth ${truthAll.get(key) ?? 0}`);
      if (a !== (truthAlpha.get(key) ?? 0)) disagreements.push(`${key}: alpha ${a}, truth ${truthAlpha.get(key) ?? 0}`);
      if (b !== (truthBeta.get(key) ?? 0)) disagreements.push(`${key}: beta ${b}, truth ${truthBeta.get(key) ?? 0}`);
      if (a + b !== t) disagreements.push(`${key}: alpha ${a} + beta ${b} does not partition ${t}`);
    }
    expect(disagreements, `cases_by_status disagrees with ground truth:\n  ${disagreements.join('\n  ')}`).toEqual([]);

    // The grouped shards are strictly smaller than the whole, and each agent
    // holds a group the other does not — an engine that ignored the filter
    // would hand both agents the identical group set.
    expect(total(await run(w, { agent: ALPHA }), 'case_count')).toBeLessThan(total(await run(w), 'case_count'));
    expect([...alpha.keys()].some((k) => !beta.has(k))).toBe(true);
    expect([...beta.keys()].some((k) => !alpha.has(k))).toBe(true);
  }, 30_000);
});

// ════════════════════════════ 5 · every filter-bound widget, every count ══

describe('every filter-bound widget on the dashboard partitions the same way', () => {
  /** Widgets this file can check: the ones carrying at least one COUNT measure. */
  const countWidgets = (): AnyRec[] =>
    widgets().filter((w) => (w.values as string[]).some((v) => v in COUNT_MEASURES));

  it('is sweeping more than the two widgets named above', () => {
    expect(countWidgets().length).toBeGreaterThan(2);
  });

  it('partitions every count measure, grouped and ungrouped', async () => {
    const wrong: string[] = [];
    for (const w of countWidgets()) {
      if (w.filterBindings?.[AGENT_FIELD] === false) continue;
      const rows = {
        all: await run(w),
        alpha: await run(w, { agent: ALPHA }),
        beta: await run(w, { agent: BETA }),
      };
      for (const measure of (w.values as string[]).filter((v) => v in COUNT_MEASURES)) {
        const all = total(rows.all, measure);
        const alpha = total(rows.alpha, measure);
        const beta = total(rows.beta, measure);
        if (all !== truthTotal(w, measure)) wrong.push(`${w.id}.${measure}: unfiltered ${all}, truth ${truthTotal(w, measure)}`);
        if (alpha !== truthTotal(w, measure, { agent: ALPHA })) wrong.push(`${w.id}.${measure}: alpha ${alpha}, truth ${truthTotal(w, measure, { agent: ALPHA })}`);
        if (beta !== truthTotal(w, measure, { agent: BETA })) wrong.push(`${w.id}.${measure}: beta ${beta}, truth ${truthTotal(w, measure, { agent: BETA })}`);
        if (alpha + beta !== all) wrong.push(`${w.id}.${measure}: alpha ${alpha} + beta ${beta} does not partition ${all}`);
        if (all <= 0) wrong.push(`${w.id}.${measure}: unfiltered total is ${all} — the fixture cannot judge this widget`);

        // Per-group too, wherever the grouping key is not a date: a time
        // dimension's key spelling is the executor's to choose, so those
        // widgets are compared on their totals rather than on a key format
        // this file would be pinning by accident.
        const dims = (w.dimensions ?? []) as string[];
        if (dims.length === 1 && dimensionField(dims[0]) !== 'created_date') {
          const dim = dims[0];
          const gAll = byGroup(rows.all, dim, measure);
          const gAlpha = byGroup(rows.alpha, dim, measure);
          const gBeta = byGroup(rows.beta, dim, measure);
          for (const key of new Set([...gAll.keys(), ...gAlpha.keys(), ...gBeta.keys()])) {
            const a = gAlpha.get(key) ?? 0;
            const b = gBeta.get(key) ?? 0;
            const t = gAll.get(key) ?? 0;
            if (a + b !== t) wrong.push(`${w.id}.${measure}[${key}]: alpha ${a} + beta ${b} does not partition ${t}`);
            if (a !== (truthByGroup(w, dim, measure, { agent: ALPHA }).get(key) ?? 0)) {
              wrong.push(`${w.id}.${measure}[${key}]: alpha ${a} disagrees with ground truth`);
            }
          }
        }
      }
    }
    expect(wrong, `widgets whose Agent shards do not partition the total:\n  ${wrong.join('\n  ')}`).toEqual([]);
  }, 60_000);
});

// ═══════════════════════════════════ 6 · composed with the date picker ══

describe('the Agent filter composes with the dashboard date window', () => {
  /**
   * The console lowers a preset to a token pair, and the runtime ANDs BOTH
   * dashboard filters into the same widget query. A regression that made one
   * of them swallow the other would leave every number plausible.
   */
  const preset90 = { $gte: '{90_days_ago}', $lte: '{today}' };

  it('still partitions when the picker is on its default range', async () => {
    expect(service.dateRange?.defaultRange).toBe('last_90_days');
    const wrong: string[] = [];
    for (const id of ['open_cases', 'cases_by_status']) {
      const w = widget(id);
      const opts = { window: preset90 };
      const all = total(await run(w, opts), 'case_count');
      const alpha = total(await run(w, { ...opts, agent: ALPHA }), 'case_count');
      const beta = total(await run(w, { ...opts, agent: BETA }), 'case_count');
      if (all !== truthTotal(w, 'case_count')) wrong.push(`${id}: windowed total ${all}, truth ${truthTotal(w, 'case_count')}`);
      if (alpha + beta !== all) wrong.push(`${id}: alpha ${alpha} + beta ${beta} does not partition ${all} under the window`);
      if (alpha <= 0 || beta <= 0) wrong.push(`${id}: a shard is empty under the window (${alpha} / ${beta})`);
    }
    expect(wrong, `the two dashboard filters do not compose:\n  ${wrong.join('\n  ')}`).toEqual([]);
  }, 30_000);
});
