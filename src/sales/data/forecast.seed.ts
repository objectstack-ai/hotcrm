// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Forecast seeds — the quarterly and monthly snapshot rows.
 *
 * `crm_forecast` is a sales object (plan item 4: the customer core and the
 * activity objects fold into the app package), so its seed rows are sales' —
 * they were authored in `src/data/revenue.seed.ts` because a forecast is a
 * revenue NUMBER, but the assignment rule follows the object, not the subject.
 * Seed doctrine lives in `./_shared.ts`.
 */
import { defineSeed } from '@objectstack/spec/data';
import { cel } from '@objectstack/spec';
import { Forecast } from '../objects/forecast.object';

// ─── Forecasts ────────────────────────────────────────────────────────
// `owner_id` is left unset: a seed cannot name a user and seed writes run
// `isSystem`, so nothing stamps it — ownership is backfilled by
// `demo_bootstrap`, which claims `crm_forecast` alongside the other
// owner-scoped objects (#702). See the note at the foot of `src/data/index.ts`.
//
// ─── ONE PRODUCER PER WINDOW (#702) ───────────────────────────────────
//
// `forecast_snapshot` (#590) upserts the row whose window contains today, and
// its lookup is OWNER-SCOPED:
//
//     { owner_id: '{currentOwner.id}', period: 'quarter',
//       period_start: { $lte: '{TODAY()}' }, period_end: { $gte: '{TODAY()}' } }
//
// A seeded row in that same window can never satisfy that filter at the moment
// the sweep reads it — the seed writes no owner, and the claim is a separate,
// later sweep — so the flow concludes the period is missing and opens a SECOND
// row beside it. Both span the same quarter; one has an owner and one does not.
// Every owner-grouped consumer then renders a phantom, ownerless duplicate for
// the current quarter, on every re-seeded dev boot (`quota_attainment_by_rep`
// most visibly, since it pins exactly that window).
//
// Claiming the row does not fix that, it only re-labels the phantom: whichever
// of the two scheduled sweeps reaches the window first decides whether the
// second one adopts the row or duplicates it, and a duplicate never heals.
//
// So the seeds stop at the window's edge. They ship SETTLED quarters only, plus
// the current MONTH — a window no runtime writer touches, since the sweep's
// period is fixed to `quarter`. The current quarter belongs to
// `forecast_snapshot` alone. `test/forecast-seeds.test.ts` derives the
// forbidden window from the flow's own lookup filter and fails on any seeded
// row that lands inside it.
//
// The cost, stated rather than hidden: on a freshly seeded org the Sales
// dashboard's *Quota Attainment by Rep* table is empty until the 03:00 sweep
// opens the quarter's rows, and their `quota` stays blank until someone sets
// one by hand (`quota` has no automated writer — see `forecast.object.ts`).
// That is the same honest-empty state the widget already chooses at a quarter
// boundary; the alternative was a row attributed to nobody, carrying a quota no
// rep is on the hook for.
//
// Periods are REAL calendar periods, labelled exactly the way
// forecast.hook.ts derives them ('Q3 2026' / 'Aug 2026') — hooks don't run
// over seeds, and the hook only fills a BLANK period_label, so seeded rows
// must speak the same dialect as runtime snapshots or list views end up
// mixing 'This Quarter' with 'Q3 2026' (#490). Calendar-true `period_start`
// values carry the same obligation on the QUERY side: `period_start` is one
// half of the (owner, period, period_start) key the snapshot sweep upserts on,
// the object indexes, and every period-scoped surface pins by equality — a
// value that is not the period's real first day names a row no such filter can
// ever select, and no rollup can line up against its neighbours.
//
// What these rows must NOT do is answer a CURRENT-quarter filter: per #702 that
// window belongs to `forecast_snapshot` alone, so the seeds below ship settled
// quarters plus the current month, and `this_quarter_forecasts` /
// `quota_attainment_by_rep` correctly return none of them.
//
// (The sentence that stood here said the opposite — that these values make the
// `this_quarter_forecasts` view's `{this_quarter_start}` filter "match the
// seeded row". Corrected in #744, and it was wrong three ways:
// `{this_quarter_start}` is not in the token vocabulary — the spelling is
// `{current_quarter_start}`, and since 17.0.0-rc.0 the misspelling throws
// `Unresolvable filter placeholder` instead of silently matching nothing; the
// filter itself was removed from the view in #515 and only came back in #730;
// and matching is the outcome #702 rules out.)
//
// Computed in plain TS (UTC, mirroring the hook's helpers): this module is
// evaluated when the app bundle loads, the same moment the cel`...` seeds
// are resolved.
const FORECAST_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const forecastIsoDate = (d: Date) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
const forecastQuarterLabel = (d: Date) => `Q${Math.floor(d.getUTCMonth() / 3) + 1} ${d.getUTCFullYear()}`;
const forecastMonthLabel = (d: Date) => `${FORECAST_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
const forecastNow = new Date();
const forecastYear = forecastNow.getUTCFullYear();
const forecastMonth = forecastNow.getUTCMonth();
const forecastQuarterMonth = Math.floor(forecastMonth / 3) * 3;
// No `thisQuarterStart` / `thisQuarterEnd`: that window is `forecast_snapshot`'s
// and nothing here may open a row in it (#702, note above).
const thisMonthStart = new Date(Date.UTC(forecastYear, forecastMonth, 1));
const thisMonthEnd = new Date(Date.UTC(forecastYear, forecastMonth + 1, 0));
const lastQuarterStart = new Date(Date.UTC(forecastYear, forecastQuarterMonth - 3, 1));
const lastQuarterEnd = new Date(Date.UTC(forecastYear, forecastQuarterMonth, 0));
// Deeper history: quota-attainment and coverage trends need more than a single
// prior period to plot (#591). These are all SETTLED periods — deliberately so:
// the forecast snapshot sweep upserts the CURRENT quarter, so historical rows
// can never collide with what it writes. That rule is now the whole rule for
// quarters (#702): every quarterly seed below is settled.
const quarterStartAgo = (n: number) => new Date(Date.UTC(forecastYear, forecastQuarterMonth - 3 * n, 1));
const quarterEndAgo = (n: number) => new Date(Date.UTC(forecastYear, forecastQuarterMonth - 3 * (n - 1), 0));
const monthStartAgo = (n: number) => new Date(Date.UTC(forecastYear, forecastMonth - n, 1));
const monthEndAgo = (n: number) => new Date(Date.UTC(forecastYear, forecastMonth - n + 1, 0));

/**
 * The three open-pipeline buckets of a settled snapshot, in the shape the
 * forecast object defines them (`src/objects/forecast.object.ts`).
 *
 * The buckets are CUMULATIVE subsets of one another, so every row satisfies
 * `pipeline >= bestCase >= commit`. Named rather than positional: three bare
 * numbers in a row of eight arguments is the shape a later edit transposes
 * without anything noticing.
 */
type OpenBuckets = { pipeline: number; bestCase: number; commit: number };

/**
 * A settled (past) period snapshot, captured on the day the period closed.
 *
 * `open` is what was still OPEN in the period at that moment — the deals that
 * had not resolved by the last day and went on to slip into the next period.
 *
 * These rows carried `0` for all three buckets until #1244. The theory was
 * "a closed period has no pipeline left", and it is the one reading a
 * period-END snapshot cannot have: a period ends with deals still open, which
 * is exactly what the "slipped into the next quarter" note below describes.
 * The cost was not cosmetic — `pipeline_amount`, `best_case_amount`,
 * `commit_amount` and the `coverage_ratio` formula that divides by the first
 * of them are four of the thirteen columns the forecast list renders, so the
 * module opened on six rows of zeros and could not answer the question the
 * object exists for.
 *
 * NOT a licence to seed the CURRENT quarter: that window has exactly one
 * producer, `forecast_snapshot` (#702), and the note above is the whole rule.
 * Pinned by `test/forecast-seeds.test.ts`.
 */
const closedPeriod = (
  seed_key: string,
  period: 'month' | 'quarter',
  start: Date,
  end: Date,
  quota: number,
  closed: number,
  open: OpenBuckets,
  notes: string,
) => ({
  seed_key,
  period,
  period_label: period === 'quarter' ? forecastQuarterLabel(start) : forecastMonthLabel(start),
  period_start: forecastIsoDate(start),
  period_end: forecastIsoDate(end),
  snapshot_date: forecastIsoDate(end),
  quota,
  pipeline_amount: open.pipeline,
  best_case_amount: open.bestCase,
  commit_amount: open.commit,
  closed_amount: closed,
  source: 'scheduled' as const,
  notes,
});

// Upsert identity is the synthetic `seed_key`, NOT `period_label` (#613).
// `period_label` names a SET of rows once the forecast_snapshot sweep (#590)
// writes one per active owner per quarter — all reading 'Q3 2026' — and the
// loader matches against the whole table, so a re-seed could overwrite a real
// rep's snapshot with the demo numbers. Why a synthetic key and not the true
// (owner, period, period_start) identity or an insert-once mode: see the
// `seed_key` declaration in `src/objects/forecast.object.ts`.
//
// The keys are POSITIONAL ('current month', 'two quarters back'), not calendar
// values, because the records are positional — recomputed against `new Date()`
// on every import. A positional key keeps the demo at exactly these seven rows
// as the calendar rolls forward, re-pointing each at its new period; a
// calendar-derived key would strand last quarter's demo row and add one row per
// re-seed.
//
// There is no `demo_quarter_current`: the current quarter is the one window
// `forecast_snapshot` writes, and two producers in one window is what #702 was.
// The current MONTH stays — the sweep's period is `quarter`, so no runtime
// writer opens a monthly row.
export const forecasts = defineSeed(Forecast, {
  mode: 'upsert',
  externalId: 'seed_key',
  records: [
    {
      seed_key: 'demo_month_current',
      period: 'month',
      period_label: forecastMonthLabel(thisMonthStart),
      period_start: forecastIsoDate(thisMonthStart),
      period_end: forecastIsoDate(thisMonthEnd),
      snapshot_date: cel`today()`,
      quota: 500000,
      pipeline_amount: 760000,
      best_case_amount: 540000,
      commit_amount: 360000,
      closed_amount: 295000,
      source: 'scheduled',
      notes: 'Healthy coverage; two commit deals expected to close this week.',
    },
    {
      seed_key: 'demo_quarter_minus_1',
      period: 'quarter',
      period_label: forecastQuarterLabel(lastQuarterStart),
      period_start: forecastIsoDate(lastQuarterStart),
      period_end: forecastIsoDate(lastQuarterEnd),
      snapshot_date: forecastIsoDate(lastQuarterEnd),
      quota: 1400000,
      pipeline_amount: 240000,
      best_case_amount: 150000,
      commit_amount: 95000,
      closed_amount: 1485000,
      source: 'scheduled',
      notes: 'Closed at 106% of quota.',
    },
    closedPeriod('demo_quarter_minus_2', 'quarter', quarterStartAgo(2), quarterEndAgo(2), 1300000, 1196000,
      { pipeline: 285000, bestCase: 190000, commit: 120000 },
      'Closed at 92% of quota — two enterprise deals slipped into the next quarter.'),
    closedPeriod('demo_quarter_minus_3', 'quarter', quarterStartAgo(3), quarterEndAgo(3), 1200000, 1308000,
      { pipeline: 195000, bestCase: 130000, commit: 85000 },
      'Closed at 109% of quota, carried by the enterprise renewal cohort.'),
    closedPeriod('demo_quarter_minus_4', 'quarter', quarterStartAgo(4), quarterEndAgo(4), 1100000, 1045000,
      { pipeline: 165000, bestCase: 110000, commit: 70000 },
      'Closed at 95% of quota in the first quarter on the new territory model.'),
    closedPeriod('demo_month_minus_1', 'month', monthStartAgo(1), monthEndAgo(1), 480000, 505000,
      { pipeline: 96000, bestCase: 62000, commit: 40000 },
      'Closed at 105% of quota; the expansion motion covered a soft new-business month.'),
    closedPeriod('demo_month_minus_2', 'month', monthStartAgo(2), monthEndAgo(2), 460000, 414000,
      { pipeline: 92000, bestCase: 58000, commit: 35000 },
      'Closed at 90% of quota — summer slowdown across the mid-market segment.'),
  ]
});
