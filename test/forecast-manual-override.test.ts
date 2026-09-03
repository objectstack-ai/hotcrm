// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { declaredRow, makeFlowHarness, type Rec } from './helpers/flow-harness';
import { ForecastSnapshotFlow } from '../src/flows/forecast-snapshot.flow';
import forecastDerive from '../src/objects/forecast.hook';

/**
 * ═══ A manual forecast SUPPRESSES the nightly sweep for that period ════════
 *
 * `forecast_snapshot` used to identify "this owner's current-period row" purely
 * by window containment, and then WRITE whatever that matched. A manager's
 * hand-entered current-quarter row (`source: 'manual'`, one of the three
 * documented origins, entered through the Snapshot block of the record form)
 * satisfies that window exactly as the sweep's own row does — by construction
 * since #1008/#1093 pinned both ends of the window to the calendar quarter. So
 * at 03:00 the sweep adopted it: four amounts overwritten with its computed
 * totals, `snapshot_date` restamped, `source` flipped `manual` → `scheduled`.
 *
 * Measured before the fix, on this exact fixture (#1082):
 *
 *   pipeline   4,242,000 → 130,000     snapshot_date  2026-01-02 → today
 *   best case  3,100,000 →  30,000     source         manual → scheduled
 *   commit     2,000,000 →  30,000     quota          1,500,000 (survives)
 *   closed     1,000,000 →  70,000
 *
 * `quota` surviving is what made the loss *partial* and therefore easy to miss:
 * attainment and coverage silently re-base onto the swept numbers and the row
 * still looks plausible. Nothing recorded that the typed numbers ever existed.
 *
 * ### The contract this file pins
 *
 * The sweep asks two different questions and needs two different scopes:
 *
 *   | job                                          | scope                     |
 *   | -------------------------------------------- | ------------------------- |
 *   | gate — "has this period been handled?"       | ANY row in the window     |
 *   | write target — "which row do I own?"         | `source: 'scheduled'` only|
 *
 * ⇒ three paths, one per `it` below:
 *   1. a manual row exists  → the sweep STANDS DOWN: writes nothing, creates
 *      nothing. The manager's numbers survive AND no second row appears.
 *   2. a scheduled row exists → found, and refreshed in place. Unchanged.
 *   3. nothing exists → the sweep opens its own, `source: 'scheduled'`.
 *
 * Path 1 must produce BOTH halves. Excluding non-`scheduled` rows from one
 * shared filter delivers the first half and breaks the second: the gate stops
 * finding the manual row, decides the period is unhandled, and opens a
 * DUPLICATE in the same window — #702 again, and `this_quarter_forecasts` plus
 * the Sales dashboard's quota-attainment widget both pin `period_start` by
 * equality and would then match two rows. So every path asserts the row COUNT
 * in the window, not just the surviving amounts.
 *
 * ### Why every case runs the real flow
 *
 * Inspecting the filter object would pass on a flow whose edges never reach the
 * write, and fail on a correct one authored differently. These drive
 * `forecast_snapshot` through the real `AutomationEngine` with the real
 * `forecast_derive_period` hook installed, and read the store afterwards.
 *
 * Every case also carries a CONTROL owner with no forecast row of any kind.
 * A stand-down and a flow that died on its first node look identical when you
 * only look at the row that was supposed to survive; the control proves the
 * sweep ran and did its ordinary work in the same pass.
 */

const pad = (n: number) => String(n).padStart(2, '0');
const isoUtc = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

const nowUtc = new Date();
const qStart = new Date(Date.UTC(nowUtc.getUTCFullYear(), Math.floor(nowUtc.getUTCMonth() / 3) * 3, 1));
const qEnd = new Date(Date.UTC(qStart.getUTCFullYear(), qStart.getUTCMonth() + 3, 0));
const inPeriod = isoUtc(qStart);
const today = isoUtc(nowUtc);
const quarterLabel = `Q${Math.floor(qStart.getUTCMonth() / 3) + 1} ${qStart.getUTCFullYear()}`;

/** `rep_manual` owns the contested row; `rep_control` proves the sweep ran. */
const users = (): Rec[] => [
  { id: 'rep_manual', name: 'Managed Rep' },
  { id: 'rep_control', name: 'Control Rep' },
];

/**
 * Live pipeline for both owners. The totals the sweep would compute for
 * `rep_manual` — 130k / 30k / 30k / 70k — are deliberately nothing like the
 * numbers the manager typed, so "unchanged" cannot pass by coincidence.
 */
const opps = (): Rec[] => [
  { id: 'o1', owner_id: 'rep_manual', stage: 'qualification', forecast_category: 'pipeline', amount: 100_000, close_date: inPeriod },
  { id: 'o2', owner_id: 'rep_manual', stage: 'negotiation', forecast_category: 'commit', amount: 30_000, close_date: inPeriod },
  { id: 'o3', owner_id: 'rep_manual', stage: 'closed_won', forecast_category: 'closed', amount: 70_000, close_date: inPeriod },
  { id: 'o4', owner_id: 'rep_control', stage: 'proposal', forecast_category: 'commit', amount: 55_000, close_date: inPeriod },
];

/** What the sweep computes for `rep_manual` from the pipeline above. */
const SWEPT = { pipeline: 130_000, bestCase: 30_000, commit: 30_000, closed: 70_000 };

/** The manager's typed numbers — nothing here is a sum of anything above. */
const TYPED = { pipeline: 4_242_000, bestCase: 3_100_000, commit: 2_000_000, closed: 1_000_000 };

/**
 * A `crm_forecast` row in the shape a driver returns it — every declared column
 * present, `null` where nothing set one, `organization_id` included.
 *
 * The columns are DERIVED (`declaredRow`, #1458), not hand-stated. This fixture
 * used to declare `organization_id: null` by hand with a paragraph explaining
 * why, because the harness store was schemaless and `forecast_snapshot`'s
 * bucket pin (`{currentForecast.organization_id}`, #1372) has nothing to
 * resolve against an absent key. The harness is faithful now, so the row that
 * goes IN and the row a whole-row `toEqual` compares against are both built
 * from the registry.
 */
const forecastRow = (over: Rec): Rec => declaredRow('crm_forecast', {
  owner_id: 'rep_manual',
  period: 'quarter',
  period_start: inPeriod,
  period_end: isoUtc(qEnd),
  period_label: quarterLabel,
  // An old stamp, so a restamp to today is unmissable.
  snapshot_date: '2026-01-02',
  quota: 1_500_000,
  ...over,
});

/** A current-quarter row a manager typed into the Snapshot block by hand. */
const manualRow = (over: Rec = {}): Rec => forecastRow({
  id: 'f_manual',
  source: 'manual',
  pipeline_amount: TYPED.pipeline,
  best_case_amount: TYPED.bestCase,
  commit_amount: TYPED.commit,
  closed_amount: TYPED.closed,
  ...over,
});

const harness = (forecasts: Rec[] = []) =>
  makeFlowHarness(
    { forecast_snapshot: ForecastSnapshotFlow },
    { sys_user: users(), crm_opportunity: opps(), crm_forecast: forecasts },
    { hooks: [forecastDerive] },
  );

const sweep = async (h: ReturnType<typeof harness>) => {
  await h.run('forecast_snapshot', {}, { event: 'schedule' });
  return h;
};

const run = async (forecasts: Rec[] = []) => sweep(harness(forecasts));

/**
 * The window as the CONSUMERS see it: `period_start` matched by equality, the
 * way `this_quarter_forecasts` and `quota_attainment_by_rep` both do it. Asking
 * the data engine rather than filtering the array in the test keeps the
 * question identical to the one those surfaces ask.
 */
const currentQuarterRows = async (h: ReturnType<typeof harness>, owner: string) =>
  h.data.find('crm_forecast', { where: { owner_id: owner, period_start: inPeriod } });

/** The sweep did its ordinary work this pass — so a stand-down is a decision. */
const expectControlSwept = async (h: ReturnType<typeof harness>) => {
  const rows = await currentQuarterRows(h, 'rep_control');
  expect(rows, 'the sweep never reached the control owner — it did not really run').toHaveLength(1);
  expect(rows[0].source).toBe('scheduled');
  expect(Number(rows[0].commit_amount)).toBe(55_000);
};

describe('path 1 — a manual current-quarter row stands the sweep down (#1082)', () => {
  it('leaves the manager\'s four amounts, snapshot_date and source untouched', async () => {
    const h = await run([manualRow()]);

    const row = h.store.crm_forecast.find((f) => f.id === 'f_manual')!;
    expect(Number(row.pipeline_amount), 'pipeline overwritten by the sweep').toBe(TYPED.pipeline);
    expect(Number(row.best_case_amount), 'best case overwritten by the sweep').toBe(TYPED.bestCase);
    expect(Number(row.commit_amount), 'commit overwritten by the sweep').toBe(TYPED.commit);
    expect(Number(row.closed_amount), 'closed won overwritten by the sweep').toBe(TYPED.closed);
    // The two tells that made the loss traceable in the first place.
    expect(row.source, 'source was flipped manual → scheduled').toBe('manual');
    expect(row.snapshot_date, 'snapshot_date was restamped').toBe('2026-01-02');
    // And nothing about the row was rewritten at all — not even a field the
    // sweep writes with an identical value.
    expect(row).toEqual(manualRow());

    await expectControlSwept(h);
  });

  it('opens no second row in the window — the #702 shape option 1 would have caused', async () => {
    const h = await run([manualRow()]);

    const rows = await currentQuarterRows(h, 'rep_manual');
    expect(
      rows.map((r) => `${r.id}:${r.source}`),
      'the sweep opened a duplicate beside the manual row; `this_quarter_forecasts` '
        + 'and quota_attainment_by_rep pin period_start by equality and now match two rows',
    ).toEqual(['f_manual:manual']);
  });

  it('stands down again on every later run, not just the first', async () => {
    // A stand-down that only holds once would restore the defect on night two.
    const h = harness([manualRow()]);
    await sweep(h);
    await sweep(h);
    await sweep(h);

    expect(await currentQuarterRows(h, 'rep_manual')).toEqual([manualRow()]);
  });

  it('defers to an `ai` row for the same reason — the scope is "rows the sweep wrote"', async () => {
    // `source: 'ai'` is the third documented origin. The write scope is
    // `scheduled`, not "not manual", so an agent-written row is equally not the
    // sweep's to overwrite. Pinned so the deference is a decision on record
    // rather than a side effect of how the filter happened to be spelled.
    //
    // The seeded row and the expectation are built by SEPARATE calls on
    // purpose: `makeFlowHarness` seeds the store by reference, so handing the
    // same object to both sides compares the row the flow just mutated against
    // itself and passes on the unfixed flow too. Measured — that spelling was
    // green against `origin/main`.
    const aiRow = () => manualRow({ id: 'f_ai', source: 'ai' });
    const h = await run([aiRow()]);

    expect(await currentQuarterRows(h, 'rep_manual')).toEqual([aiRow()]);
    await expectControlSwept(h);
  });
});

describe('path 2 — a scheduled row is still found and refreshed in place (#1082)', () => {
  const scheduledRow = (over: Rec = {}) => forecastRow({
    id: 'f_sched',
    source: 'scheduled',
    pipeline_amount: 9_999_999,
    best_case_amount: 9_999_999,
    commit_amount: 9_999_999,
    closed_amount: 9_999_999,
    ...over,
  });

  it('recomputes the amounts onto the same row', async () => {
    const h = await run([scheduledRow()]);

    const rows = await currentQuarterRows(h, 'rep_manual');
    expect(rows, 'the sweep duplicated its own row').toHaveLength(1);
    expect(rows[0].id, 'the existing row was replaced rather than refreshed').toBe('f_sched');
    expect(Number(rows[0].pipeline_amount)).toBe(SWEPT.pipeline);
    expect(Number(rows[0].best_case_amount)).toBe(SWEPT.bestCase);
    expect(Number(rows[0].commit_amount)).toBe(SWEPT.commit);
    expect(Number(rows[0].closed_amount)).toBe(SWEPT.closed);
    expect(rows[0].snapshot_date).toBe(today);
    expect(rows[0].source).toBe('scheduled');
    // Still never writes quota — the hand-maintained attainment denominator.
    expect(Number(rows[0].quota)).toBe(1_500_000);
  });

  it('targets its OWN row deterministically when a manual row sits beside it', async () => {
    // A manager can add a manual row to a window the sweep already opened. Both
    // orderings are exercised because the shared-window `findOne` the sweep used
    // to reload with would return whichever row the driver ordered first — the
    // scoped read makes the target the same either way.
    for (const [label, seeded] of [
      ['scheduled first', [scheduledRow(), manualRow()]],
      ['manual first', [manualRow(), scheduledRow()]],
    ] as const) {
      const h = await run(seeded.map((r) => ({ ...r })));

      const rows = await currentQuarterRows(h, 'rep_manual');
      expect(rows, `${label}: the sweep opened a third row`).toHaveLength(2);

      const manual = rows.find((r) => r.id === 'f_manual')!;
      expect(manual, `${label}: the manual row was written`).toEqual(manualRow());

      const scheduled = rows.find((r) => r.id === 'f_sched')!;
      expect(Number(scheduled.pipeline_amount), `${label}: the sweep's own row went stale`)
        .toBe(SWEPT.pipeline);
      expect(scheduled.snapshot_date, `${label}: the sweep's own row went stale`).toBe(today);
    }
  });
});

describe('path 3 — an empty window is still the sweep\'s to open (#1082)', () => {
  it('creates a scheduled row when the owner has none', async () => {
    const h = await run();

    const rows = await currentQuarterRows(h, 'rep_manual');
    expect(rows).toHaveLength(1);
    expect(rows[0].source).toBe('scheduled');
    expect(rows[0].period_start).toBe(inPeriod);
    expect(rows[0].period_end).toBe(isoUtc(qEnd));
    expect(Number(rows[0].pipeline_amount)).toBe(SWEPT.pipeline);
    expect(rows[0].snapshot_date).toBe(today);
  });

  it('THE WAY OUT: deleting the manual row restores automated snapshotting', async () => {
    // An override the owner cannot lift is not an override, it is a dead end.
    // Deleting the row is an ordinary edit, and the next sweep takes the window
    // back — this is the whole reason no schema change was needed.
    const h = harness([manualRow()]);
    await sweep(h);
    expect(await currentQuarterRows(h, 'rep_manual')).toEqual([manualRow()]);

    await h.data.delete('crm_forecast', { where: { id: 'f_manual' } });
    await sweep(h);

    const rows = await currentQuarterRows(h, 'rep_manual');
    expect(rows, 'the sweep never resumed after the override was lifted').toHaveLength(1);
    expect(rows[0].source).toBe('scheduled');
    expect(Number(rows[0].pipeline_amount)).toBe(SWEPT.pipeline);
    expect(rows[0].snapshot_date).toBe(today);
  });
});

describe('the two scopes are authored as two filters, and stay that way (#1082)', () => {
  /** The loop body, flattened out of the `loop` container. */
  const body = (ForecastSnapshotFlow.nodes as any[])
    .find((n) => n.id === 'loop_owners').config.body;
  const node = (id: string) => (body.nodes as any[]).find((n) => n.id === id);

  it('the idempotency gate reads the window source-blind', () => {
    // If `source` ever appears here, the gate stops seeing the manual row and
    // path 1's second assertion (no duplicate) is what breaks — quietly, and
    // only in the window a human happens to be using.
    expect(node('find_forecast').config.filter).not.toHaveProperty('source');
  });

  it('the write target is scoped to the rows the sweep wrote', () => {
    expect(node('reload_forecast').config.filter.source).toBe('scheduled');
  });

  it('the stand-down gate is a decision whose predicate lives on its out-edge (#650)', () => {
    const gate = node('check_owned');
    expect(gate.type).toBe('decision');
    expect(gate.config?.condition, 'an inert singular condition — see #650').toBeUndefined();

    const out = (body.edges as any[]).filter((e) => e.source === 'check_owned');
    expect(out).toHaveLength(1);
    expect(out[0].target).toBe('reset_totals');
    expect(out[0].condition, 'the gate branches on nothing').toBeTruthy();
  });
});
