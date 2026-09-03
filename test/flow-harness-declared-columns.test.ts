// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ObjectQL, applySystemFields } from '@objectstack/objectql';
import { SqliteWasmDriver } from '@objectstack/driver-sqlite-wasm';
import stack from '../objectstack.config';
import { declaredRow, makeDataEngine, makeFlowHarness, type Rec } from './helpers/flow-harness';
import { ForecastSnapshotFlow } from '../src/flows/forecast-snapshot.flow';
import forecastDerive from '../src/objects/forecast.hook';

type AnyRec = Record<string, any>;

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
  const objects: AnyRec[] = (stack as AnyRec).objects ?? [];
  let ql: AnyRec;
  const driverRows: Record<string, AnyRec> = {};

  beforeAll(async () => {
    const driver = new SqliteWasmDriver({ filename: ':memory:' });
    await driver.connect();
    await driver.initObjects(
      objects.map((o) => {
        const shaped = applySystemFields(o as never, { multiTenant: false }) as AnyRec;
        return { name: o.name, fields: shaped.fields, indexes: shaped.indexes };
      }) as never,
    );
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
    expect(inserted).toBe(engine.store.crm_forecast[0]);
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
