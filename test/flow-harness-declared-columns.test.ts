// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ObjectQL, applySystemFields } from '@objectstack/objectql';
import { SqliteWasmDriver } from '@objectstack/driver-sqlite-wasm';
import { InMemoryDriver } from '@objectstack/driver-memory';
import stack from '../objectstack.config';
import { declaredRow, makeDataEngine, makeFlowHarness, type Rec } from './helpers/flow-harness';
import { ForecastSnapshotFlow } from '../src/flows/forecast-snapshot.flow';
import { QuoteGenerationFlow } from '../src/flows/quote-generation.flow';
import forecastDerive from '../src/objects/forecast.hook';

type AnyRec = Record<string, any>;

const objects: AnyRec[] = (stack as AnyRec).objects ?? [];

/** The app registry in the shape a driver's `initObjects` takes. */
const shapedObjects = () =>
  objects.map((o) => {
    const shaped = applySystemFields(o as never, { multiTenant: false }) as AnyRec;
    return { name: o.name, fields: shaped.fields, indexes: shaped.indexes };
  });

/**
 * The flow harness store returns the row shape a driver returns (#1458).
 *
 * ### What was wrong
 *
 * `test/helpers/flow-harness.ts` backs every runtime flow test with an
 * in-memory store that was SCHEMALESS: `insert` did `{ id, ...data }` and the
 * array held exactly what was written, so a column nobody wrote was **absent**
 * from the row. An absent key and a null key are not the same thing to a
 * filter, and both directions of that difference cost real work:
 *
 *  - a CORRECT change to `forecast_snapshot` — pinning its bucket queries to
 *    `{currentForecast.organization_id}` (#1372) — went red across two files,
 *    describing a sweep abort no install can have; and
 *  - the expensive direction, which nothing had bitten yet: a flow whose filter
 *    is WRONG against real rows passes here, because the fixture happens not to
 *    carry the column the filter names.
 *
 * The repo had been paying for it one column at a time. `flow-scheduled` stated
 * `owner_id: null` by hand in two places so `demo_bootstrap`'s `{ owner_id:
 * null }` sweep could see a seeded row at all, and `forecast-manual-override`
 * had just added a third hand-note for `organization_id`.
 *
 * ### What this file pins
 *
 * That the fix reached the PRODUCER rather than the fixtures. The first
 * describe re-measures the claim the harness rests on — that a materialising
 * driver's row shape is derivable from the platform's own registry — against a
 * real `SqliteWasmDriver`, so the harness cannot drift from the thing it
 * models without this failing. The rest pin the store's own behaviour on the
 * three routes a row can arrive by, and the filter consequence that is the
 * whole point.
 */

/** Objects whose validations admit a minimal row, so the driver can be asked. */
const PROBES: Record<string, Rec> = {
  crm_case: { subject: 'shape probe', description: 'shape probe' },
  crm_opportunity: {
    name: 'shape probe', crm_account: 'acct_1', amount: 1, close_date: '2026-01-01',
  },
};

describe('the harness row shape is DERIVED from the registry, and matches a real driver', () => {
    let ql: AnyRec;
  const driverRows: Record<string, AnyRec> = {};

  beforeAll(async () => {
    const driver = new SqliteWasmDriver({ filename: ':memory:' });
    await driver.connect();
    await driver.initObjects(shapedObjects() as never);
    ql = (await ObjectQL.create({
      datasources: { default: driver as never },
      objects: Object.fromEntries(objects.map((o) => [o.name, o])) as never,
    } as never)) as AnyRec;

    const api = ql.createContext({ isSystem: true });
    for (const [object, data] of Object.entries(PROBES)) {
      const inserted = await api.object(object).insert(data);
      driverRows[object] = await api.object(object).findOne({ where: { id: inserted.id } });
    }
  }, 60_000);

  afterAll(async () => { await ql?.close?.(); });

  it.each(Object.keys(PROBES))(
    'a %s row from the store carries exactly the columns the driver returns',
    async (object) => {
      const engine = makeDataEngine();
      const stored = await engine.insert(object, PROBES[object]);

      expect(
        Object.keys(stored).sort(),
        `the store's ${object} shape has drifted from the driver's. The store derives\n`
          + 'its columns from applySystemFields over the app registry; if the platform\n'
          + 'changed what a driver materialises, the derivation in\n'
          + 'test/helpers/flow-harness.ts is what has to move.',
      ).toEqual(Object.keys(driverRows[object]).sort());
    },
  );

  it('a real driver hands back a DETACHED row — the contract #1490 aligned to', async () => {
    // The harness models a materialising driver. Row IDENTITY is part of that
    // shape, and it is measured here rather than assumed so the two cannot drift
    // apart silently: if a future platform version started handing back live
    // rows, this is what would notice.
    const api = ql.createContext({ isSystem: true });
    const inserted = await api.object('crm_case').insert({
      subject: 'detach probe', description: 'detach probe',
    });
    const earlier = await api.object('crm_case').findOne({ where: { id: inserted.id } });
    const alsoEarlier = await api.object('crm_case').findOne({ where: { id: inserted.id } });

    await api.object('crm_case').update({ subject: 'REWRITTEN' }, { where: { id: inserted.id } });

    expect(earlier.subject, 'a real driver retro-mutated an earlier read').toBe('detach probe');
    expect(inserted.subject, 'a real driver retro-mutated its insert result').toBe('detach probe');
    expect(alsoEarlier, 'two reads of one row came back as one object').not.toBe(earlier);
    expect(
      (await api.object('crm_case').findOne({ where: { id: inserted.id } })).subject,
      'a fresh read did not see the write',
    ).toBe('REWRITTEN');
  });

  it('SENTINEL — the driver really returns columns nobody wrote', () => {
    // Without this the comparison above could pass by both sides being sparse,
    // which is precisely the bug. `crm_case` declares far more than the two
    // columns PROBES writes, and the driver must hand every one of them back.
    const written = new Set([...Object.keys(PROBES.crm_case), 'id']);
    const unwritten = Object.keys(driverRows.crm_case).filter((k) => !written.has(k));
    expect(unwritten.length, 'the driver returned only the written columns').toBeGreaterThan(10);
    expect(
      unwritten.filter((k) => driverRows.crm_case[k] === null).length,
      'the unwritten columns came back as something other than null',
    ).toBeGreaterThan(10);
  });

  it('range operators exclude a NULL row BOTH ways — on both shipped drivers, and here (#1480)', async () => {
    // The measurement the fix rests on, kept as a pin so it cannot drift.
    //
    // The harness used to route all four ordering operators through a
    // `String(a) < String(b)` fallback. `String(null)` is `"null"`, which sorts
    // ABOVE `"0"` and above any `2xxx` date string — so one null row was
    // ADMITTED by `$gt` / `$gte` and REJECTED by `$lt` / `$lte`. A symmetric
    // bug gets noticed; that asymmetry stayed invisible until someone wrote the
    // filter that happened to point the wrong way.
    //
    // ⭐ BOTH shipped drivers are asked, not one. Encoding a semantic on the
    // word of a single driver is how a harness ends up modelling something the
    // platform does not agree with itself about — and the agreement measured
    // here is exactly what licenses the harness to pick this answer.
    const rows = [
      { subject: 'c_val', description: 'x', resolution_time_hours: 5 },
      { subject: 'c_null', description: 'x' },
    ];

    /** `op -> the subjects that operator selects`, for one query surface. */
    const answers = async (find: (where: AnyRec) => Promise<AnyRec[]>) => {
      const out: Record<string, string[]> = {};
      for (const [op, operand] of [
        ['$gt', 0], ['$gte', 0], ['$lt', 100], ['$lte', 100],
      ] as const) {
        out[op] = (await find({ resolution_time_hours: { [op]: operand } }))
          .map((r) => r.subject).sort();
      }
      return out;
    };

    const viaDriver = async (driver: AnyRec) => {
      await driver.connect?.();
      await driver.initObjects?.(shapedObjects() as never);
      const engine = (await ObjectQL.create({
        datasources: { default: driver as never },
        objects: Object.fromEntries(objects.map((o) => [o.name, o])) as never,
      } as never)) as AnyRec;
      const api = engine.createContext({ isSystem: true });
      for (const row of rows) await api.object('crm_case').insert(row);
      const result = await answers((where) => api.object('crm_case').find({ where }));
      await engine.close?.();
      return result;
    };

    const sqlite = await viaDriver(new SqliteWasmDriver({ filename: ':memory:' }) as never);
    const memory = await viaDriver(new InMemoryDriver({} as never) as never);

    expect(
      memory,
      'the two shipped drivers disagree about NULL under a range operator. The\n'
        + 'harness models ONE semantic; if the platform no longer has one, that is a\n'
        + 'platform question and this file must not paper over it.',
    ).toEqual(sqlite);

    expect(
      sqlite,
      'a driver ordered NULL — the premise this harness encodes has moved',
    ).toEqual({ $gt: ['c_val'], $gte: ['c_val'], $lt: ['c_val'], $lte: ['c_val'] });

    const store = makeDataEngine();
    for (const row of rows) await store.insert('crm_case', row);
    expect(
      await answers((where) => store.find('crm_case', { where })),
      'the harness selects a different set than a real driver does. Before #1480\n'
        + 'it answered { $gt: [c_null, c_val], $gte: [c_null, c_val], $lt: [c_val],\n'
        + '$lte: [c_val] } — the null row admitted by half the operators and\n'
        + 'rejected by the other half.',
    ).toEqual(sqlite);
  }, 60_000);
});

describe('NULL is not orderable, so a range predicate excludes it (#1480)', () => {
  /**
   * The harness-side half of the contract measured above. These cases run
   * against the store alone, so they state the rule in the shape a fixture
   * meets it: what a sweep's window does to a row that has no value.
   *
   * ⚠️ Fixing this surfaced NO reds across the 19 suites importing the harness
   * (350 tests, all green before and after). That is not evidence the rule was
   * already covered — it is evidence of the opposite, and the reason this block
   * exists. Instrumented across those 19 suites the new guard fires 9 times,
   * and every one of the 9 is `$lt` / `$lte`: the direction the string
   * comparison happened to get RIGHT. The over-admitting half — `$gt` / `$gte`
   * silently keeping a row a driver drops — was exercised by nothing at all.
   */

  it('the ASYMMETRY is gone — all four operators drop the null row', async () => {
    const engine = makeDataEngine({
      crm_opportunity: [
        { id: 'o_val', amount: 5 },
        { id: 'o_null' }, // declared, materialised to `amount: null` (#1490)
      ],
    });
    const ids = async (where: Rec) => (await engine.find('crm_opportunity', { where })).map((r) => r.id);

    expect(await ids({ amount: { $gt: 0 } }), '`String(null)` sorts above `"0"`').toEqual(['o_val']);
    expect(await ids({ amount: { $gte: 0 } }), '`String(null)` sorts above `"0"`').toEqual(['o_val']);
    expect(await ids({ amount: { $lt: 100 } })).toEqual(['o_val']);
    expect(await ids({ amount: { $lte: 100 } })).toEqual(['o_val']);
  });

  it('a date WINDOW excludes an undated row from both bounds — the sweep case', async () => {
    // The reason this is worth a card rather than a footnote. A scheduled sweep
    // bounded by `{ $gte: period_start, $lte: period_end }` is a window, and a
    // row with no close date is not in it. `"null"` sorts above any `2xxx` date
    // string, so it used to be in exactly half of it.
    const engine = makeDataEngine({
      crm_opportunity: [
        { id: 'o_dated', close_date: '2026-06-15' },
        { id: 'o_undated' },
      ],
    });
    const inWindow = await engine.find('crm_opportunity', {
      where: { close_date: { $gte: '2026-01-01', $lte: '2026-12-31' } },
    });
    expect(inWindow.map((r) => r.id), 'an undated row landed inside a date window').toEqual(['o_dated']);
    // And each bound alone, so the pair above cannot pass by the two halves
    // cancelling out — which is precisely how the defect hid.
    expect(
      (await engine.find('crm_opportunity', { where: { close_date: { $gte: '2026-01-01' } } })).map((r) => r.id),
      'the OVER-ADMITTING direction — nothing in the 19 suites covered it',
    ).toEqual(['o_dated']);
    expect(
      (await engine.find('crm_opportunity', { where: { close_date: { $lte: '2026-12-31' } } })).map((r) => r.id),
    ).toEqual(['o_dated']);
  });

  it('a genuinely ABSENT key behaves exactly like a materialised null', async () => {
    // #1490 materialises DECLARED columns, so on a declared object the two
    // spellings converge before a filter can see them. They do not converge on
    // an object nothing declares — `test/flow-decision-authority.test.ts` drives
    // a node against exactly such a name — and both drivers answer identically
    // either way (`SqliteWasmDriver` materialises the omitted key, the memory
    // driver leaves it sparse; the four operators select the same rows). So the
    // rule is about ORDERABILITY, not about which of the two spellings a row
    // happens to carry.
    const engine = makeDataEngine({
      crm_audit: [{ id: 'a_val', score: 5 }, { id: 'a_absent' }],
    });
    expect(Object.keys(engine.store.crm_audit[1]), 'the undeclared row was materialised after all')
      .toEqual(['id']);
    for (const [op, operand] of [['$gt', 0], ['$gte', 0], ['$lt', 100], ['$lte', 100]] as const) {
      expect(
        (await engine.find('crm_audit', { where: { score: { [op]: operand } } })).map((r) => r.id),
        `an absent key satisfied ${op}`,
      ).toEqual(['a_val']);
    }
  });

  it('an unorderable OPERAND never reaches the comparison either', async () => {
    // The same coercion, the other side of it: `compare(5, null)` was
    // `"5" < "null"`, so `{ $lt: null }` SELECTED the valued row — a row both
    // drivers exclude. ⚠️ The two drivers do diverge on whether the NULL row
    // itself answers `$gte: null` / `$lte: null` (sqlite says no, mingo says
    // yes); that divergence is reported as a platform question and is not
    // decided here, because a null VALUE is already excluded by the rule above.
    const engine = makeDataEngine({ crm_opportunity: [{ id: 'o_val', amount: 5 }] });
    for (const op of ['$gt', '$gte', '$lt', '$lte'] as const) {
      expect(
        await engine.find('crm_opportunity', { where: { amount: { [op]: null } } }),
        `a valued row was ordered against a null operand by ${op}`,
      ).toHaveLength(0);
    }
  });

  it('SENTINEL — equality-shaped operators are untouched, and rows still match', async () => {
    // Without this the block above could pass by the store returning nothing at
    // all, which is the other way to be wrong. `$eq` / `$ne` / `$in` / `$nin`
    // are equality-shaped: the store models `IS NULL` rather than SQL's unknown,
    // and both drivers agree with it on every one of these.
    const engine = makeDataEngine({
      crm_opportunity: [{ id: 'o_val', amount: 5 }, { id: 'o_null' }],
    });
    const ids = async (where: Rec) => (await engine.find('crm_opportunity', { where })).map((r) => r.id).sort();

    expect(await ids({ amount: 5 }), 'a plain equality stopped matching').toEqual(['o_val']);
    expect(await ids({ amount: null }), '`IS NULL` stopped matching the null row').toEqual(['o_null']);
    expect(await ids({ amount: { $ne: null } })).toEqual(['o_val']);
    expect(await ids({ amount: { $nin: [5] } })).toEqual(['o_null']);
    expect(await ids({ amount: { $gt: -1 } }), 'a valued row stopped satisfying $gt').toEqual(['o_val']);
  });
});

describe('every route a row arrives by lands it in its declared shape', () => {
  it('materialises a SEEDED row', () => {
    const engine = makeDataEngine({ crm_forecast: [{ id: 'f1', owner_id: 'rep_1' }] });
    const row = engine.store.crm_forecast[0];
    expect(row.organization_id, 'the tenant column nobody wrote').toBeNull();
    expect(row.quota, 'a business column nobody wrote').toBeNull();
    expect(row.owner_id, 'a stated column was overwritten').toBe('rep_1');
  });

  it('materialises an INSERTED row, and returns it from insert()', async () => {
    const engine = makeDataEngine();
    const inserted = await engine.insert('crm_forecast', { owner_id: 'rep_1' });
    expect(inserted.organization_id).toBeNull();
    // CONTENT, not identity. This read `toBe` until #1490: `insert` handed back
    // the stored object itself, and `update` mutates that object in place, so an
    // earlier binding was retro-mutated by a later write in the same run. The
    // claim being made here is "what insert returns is what the store holds" —
    // that is a claim about VALUE, and it is unchanged. The detachment it used
    // to also assert, in the opposite direction, is pinned deliberately below.
    expect(inserted).toEqual(engine.store.crm_forecast[0]);
    expect(inserted, 'insert() handed back the live stored row').not.toBe(
      engine.store.crm_forecast[0],
    );
  });

  it('materialises a row PUSHED into the store after the harness was built', async () => {
    // The warm-boot seed replay in test/flow-scheduled.test.ts does exactly
    // this, and it is why the fill lives on the table accessor rather than
    // only at construction.
    const engine = makeDataEngine();
    engine.store.crm_forecast = [{ id: 'f_replayed', seed_key: 'demo' }];
    const found = await engine.findOne('crm_forecast', { where: { id: 'f_replayed' } });
    expect(found!.owner_id, 'the replayed row never reached its declared shape').toBeNull();
  });

  it('leaves an object nothing declares alone', async () => {
    // test/flow-decision-authority.test.ts drives a node against a synthetic
    // object name. There is no declared shape to be faithful to, and inventing
    // one would be a fiction of this file's own making.
    const engine = makeDataEngine();
    const row = await engine.insert('crm_audit', { note: 'NUDGED' });
    expect(Object.keys(row).sort()).toEqual(['id', 'note']);
  });
});

describe('the difference the shape makes to a filter — the reason for the change', () => {
  it('a seeded row is found by a filter on a column NOBODY WROTE', async () => {
    // The measured regression: `forecast_snapshot` pins its bucket fetches to
    // the snapshot row's organization. Against the schemaless store that filter
    // matched nothing, the sweep aborted at the first bucket fetch, and no
    // throw surfaced to the caller.
    const engine = makeDataEngine({ crm_opportunity: [{ id: 'o1', owner_id: 'rep_1' }] });
    const hits = await engine.find('crm_opportunity', { where: { organization_id: null } });
    expect(hits.map((r) => r.id), 'an absent key is not a null one').toEqual(['o1']);
  });

  it('but a filter looking for a VALUE in that column still matches nothing', async () => {
    // The other half — materialising must not turn every filter into a match.
    // The column is there and it is null, so a predicate naming a real value
    // selects the row out, exactly as it would against a driver.
    const engine = makeDataEngine({ crm_opportunity: [{ id: 'o1' }] });
    expect(await engine.find('crm_opportunity', { where: { organization_id: 'org_1' } })).toHaveLength(0);
    expect(await engine.find('crm_opportunity', { where: { owner_id: 'rep_1' } })).toHaveLength(0);
  });

  it('a real sweep resolves its organization pin off a column no fixture stated', async () => {
    // End to end through the real engine, and the exact mechanism #1458 was
    // filed out of: `forecast_snapshot` pins its bucket fetches to the snapshot
    // row's own organization (`{currentForecast.organization_id}`, #1372). The
    // sweep writes that row itself, from a fixture that states no organization.
    // Against the schemaless store the pin had nothing to resolve against, the
    // sweep aborted at the FIRST bucket fetch — zero bucket queries reaching
    // the data service — and no throw surfaced to the caller.
    const today = new Date().toISOString().slice(0, 10);
    const h = makeFlowHarness(
      { forecast_snapshot: ForecastSnapshotFlow },
      {
        sys_user: [{ id: 'rep_1', name: 'Rep One' }],
        crm_opportunity: [{
          id: 'o1', owner_id: 'rep_1', stage: 'negotiation', forecast_category: 'commit',
          amount: 30_000, close_date: today,
        }],
        crm_forecast: [],
      },
      // The window comes from `forecast_derive_period`, exactly as it does at
      // runtime; without it the row carries no period and no bucket can run.
      { hooks: [forecastDerive] },
    );
    await h.run('forecast_snapshot', {}, { event: 'schedule' });

    const buckets = h.queries.filter((q) => q.object === 'crm_opportunity' && 'close_date' in q.where);
    expect(buckets, 'the sweep never reached a bucket fetch').toHaveLength(4);
    expect(
      buckets.map((q) => q.where.organization_id),
      'a bucket query went out without the organization predicate #1372 pins',
    ).toEqual([null, null, null, null]);
    // And the work actually happened, so the four queries above are not four
    // reads of an empty set.
    expect(Number(h.store.crm_forecast[0].commit_amount)).toBe(30_000);
  });
});

describe('rows handed out by the data engine are DETACHED from the store (#1490)', () => {
  /**
   * The harness has two surfaces with OPPOSITE contracts, and this block pins
   * both — they are independent, and the header comment that conflated them is
   * what made #1490 look like a 19-file change.
   *
   *  - the METHODS are the DRIVER surface, and they hand back DETACHED rows.
   *  - `store` is the INSPECTION surface, and it is LIVE.
   *
   * Measured before the fix: of the 19 files importing the harness, exactly one
   * assertion anywhere depended on read-side identity — the `toBe` above, in
   * this file. The other 18 read results back through `store`, which is
   * untouched by the split.
   */

  it('does not retro-mutate a row a caller read BEFORE a write — the defect itself', async () => {
    const engine = makeDataEngine({ crm_opportunity: [{ id: 'o1', stage: 'qualification' }] });
    const earlier = await engine.findOne('crm_opportunity', { where: { id: 'o1' } });

    await engine.update('crm_opportunity', { stage: 'proposal' }, { where: { id: 'o1' } });

    expect(
      earlier!.stage,
      'the earlier read was retro-mutated by a later write — a guard evaluated\n'
        + 'after that write would read POST-write state, which no driver would show it.',
    ).toBe('qualification');
    expect(engine.store.crm_opportunity[0].stage, 'the write did not land').toBe('proposal');
  });

  it('detaches on all three read routes, and hands two reads two objects', async () => {
    const engine = makeDataEngine({ crm_opportunity: [{ id: 'o1', stage: 'qualification' }] });
    const stored = engine.store.crm_opportunity[0];

    expect(await engine.findOne('crm_opportunity', { where: { id: 'o1' } })).not.toBe(stored);
    expect((await engine.find('crm_opportunity', { where: { id: 'o1' } }))[0]).not.toBe(stored);
    expect(await engine.insert('crm_opportunity', { id: 'o2' })).not.toBe(
      engine.store.crm_opportunity[1],
    );

    const a = await engine.findOne('crm_opportunity', { where: { id: 'o1' } });
    const b = await engine.findOne('crm_opportunity', { where: { id: 'o1' } });
    expect(a, 'two reads of one row came back as one object').not.toBe(b);
    expect(a, 'the two reads disagree on content').toEqual(b);
  });

  it('a caller mutating a row it read does not reach the store', async () => {
    const engine = makeDataEngine({ crm_opportunity: [{ id: 'o1', stage: 'qualification' }] });
    const read = await engine.findOne('crm_opportunity', { where: { id: 'o1' } });
    read!.stage = 'MUTATED BY CALLER';
    expect(engine.store.crm_opportunity[0].stage).toBe('qualification');
  });

  it('but `store` stays LIVE — the contract 18 of the 19 suites actually use', async () => {
    // The other half of the split, pinned so a later "make it all copies" change
    // has to break this on purpose. A fixture seeds a row, the flow writes it,
    // and the fixture reads the result back through the object it seeded.
    const seeded: Rec = { id: 'o1', stage: 'qualification' };
    const engine = makeDataEngine({ crm_opportunity: [seeded] });

    await engine.update('crm_opportunity', { stage: 'proposal' }, { where: { id: 'o1' } });

    expect(seeded.stage, 'the seeded object no longer tracks the store').toBe('proposal');
    expect(engine.store.crm_opportunity[0], 'the store forked from the seed').toBe(seeded);
  });

  it('ACCEPTANCE — a partition stays a partition, so `quote_generation` notifies ONCE', async () => {
    // The end-to-end symptom, and the measurement that says the mechanism above
    // is the whole story. `quote_generation`'s `check_stage` has two conditional
    // edges written as exact complements: `e4a` advances when the stage is one
    // of prospecting/qualification/needs_analysis, `e4b` keeps the stage when it
    // is none of them. The advance branch writes `stage: 'proposal'` — and while
    // reads were live, it wrote into the very object `vars.oppRecord` points at,
    // so `e4b` then read `proposal` and was satisfied too. Both edges were taken
    // and `notify_owner` — reachable from `e4b` and from `e5` — ran TWICE.
    //
    // Measured: harness 2, deleted private engine 2, real ObjectQL 1. Now 1.
    //
    // ⛔ The flow's graph is NOT the defect and was not touched: it is correct on
    // a real driver. Whether `notify_owner` should sit on two edges of a
    // partition at all is a separate legibility question.
    const h = makeFlowHarness({ quote_generation: QuoteGenerationFlow }, {
      crm_opportunity: [{
        id: 'opp_1', name: 'Globex Deal', amount: 200_000,
        crm_account: 'acc_1', primary_contact: 'con_1', stage: 'qualification',
      }],
    });
    const runId = await h.run('quote_generation', { recordId: 'opp_1' });
    await h.resume(runId!, { quoteName: 'Q-1', expirationDays: 30, discount: 10 });

    expect(
      h.notifications,
      'both edges of an exclusive partition were taken — the apparatus invented\n'
        + 'a defect against a flow that is correct on a real driver.',
    ).toHaveLength(1);
    // And the advance branch really ran, so the single notification is not the
    // keep-stage path passing by accident.
    expect(h.store.crm_opportunity[0].stage, 'the advance branch did not run').toBe('proposal');
  });
});

describe('declaredRow — the expectation side of a whole-row comparison', () => {
  it('fills the declared columns without mutating its input', () => {
    const template: Rec = { id: 'f1', owner_id: 'rep_1' };
    const shaped = declaredRow('crm_forecast', template);

    expect(shaped.organization_id).toBeNull();
    expect(shaped.owner_id).toBe('rep_1');
    expect(Object.keys(template).sort(), 'declaredRow mutated its argument').toEqual(['id', 'owner_id']);
    expect(shaped).not.toBe(template);
  });

  it('agrees with what the store does to the same row', async () => {
    const engine = makeDataEngine();
    const stored = await engine.insert('crm_forecast', { id: 'f1', owner_id: 'rep_1' });
    expect(stored).toEqual(declaredRow('crm_forecast', { id: 'f1', owner_id: 'rep_1' }));
  });
});
