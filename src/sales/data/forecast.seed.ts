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
import { cel, expression } from '@objectstack/spec';
import { Forecast } from '../objects/forecast.object';

// ─── Forecasts ────────────────────────────────────────────────────────
// `owner_id` is left unset: a seed cannot name a user and seed writes run
// `isSystem`, so nothing stamps it — ownership is backfilled by the platform's
// seed-ownership claim when the seed settles, which covers `crm_forecast`
// alongside every other owner-scoped object (#702, #1892). See the note on
// ownership in `objectstack.composition.ts`.
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
// Resolved at SEED time, not at build time (#2431). These values used to be
// computed in plain TS when this module loaded, which in a dev boot is the
// boot — but `objectstack build` loads it too, and the artifact a marketplace
// tenant installs carries what the BUILD computed: an artifact built in
// November seeded "Nov 2026" as the current month whenever it was installed,
// and its "settled" quarters walked into the current quarter #702 reserves
// for `forecast_snapshot` once the install was a quarter later. Each value is
// now a CEL expression the seed loader resolves when the rows are written,
// exactly like the `daysAgo()` / `daysFromNow()` dates of every other dataset.
//
// The calendar stays true (#530): every start is a real first day, computed
// from `today()` (a UTC midnight) by stepping back to the first of the month
// (`getDayOfMonth()` is 0-based) and then whole months; every end is the day
// before the next period opens; the labels are the hook's dialect
// ('Q3 2026' / 'Aug 2026'). `test/forecast-seeds.test.ts` resolves them at
// several calendar dates, quarter and year boundaries included.
const FORECAST_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** CEL: the first day of the current month, as a timestamp. */
const MONTH_START = 'addDays(today(), -today().getDayOfMonth())';
/** CEL: the first day of the current quarter, as a timestamp. */
const QUARTER_START = `addMonths(${MONTH_START}, -(today().getMonth() % 3))`;

/** A period, as three CEL timestamp sources: its first day, its last day, and its start for labelling. */
interface CelPeriod { readonly start: string; readonly end: string; readonly kind: 'month' | 'quarter' }
const monthAgo = (n: number): CelPeriod => {
  const start = `addMonths(${MONTH_START}, ${-n})`;
  return { start, end: `addDays(addMonths(${start}, 1), -1)`, kind: 'month' };
};
const quarterAgo = (n: number): CelPeriod => {
  const start = `addMonths(${QUARTER_START}, ${-3 * n})`;
  return { start, end: `addDays(addMonths(${start}, 3), -1)`, kind: 'quarter' };
};
const isoOf = (timestamp: string) => expression(`isoDate(${timestamp})`);
const labelOf = (p: CelPeriod) => expression(p.kind === 'quarter'
  ? `'Q' + string(${p.start}.getMonth() / 3 + 1) + ' ' + string(${p.start}.getFullYear())`
  : `${JSON.stringify(FORECAST_MONTHS).replace(/"/g, "'")}[${p.start}.getMonth()] + ' ' + string(${p.start}.getFullYear())`);

// No current quarter: that window is `forecast_snapshot`'s and nothing here
// may open a row in it (#702, note above).
const thisMonth = monthAgo(0);
const lastQuarter = quarterAgo(1);
// Deeper history: quota-attainment and coverage trends need more than a single
// prior period to plot (#591). These are all SETTLED periods — deliberately so:
// the forecast snapshot sweep upserts the CURRENT quarter, so historical rows
// can never collide with what it writes. That rule is now the whole rule for
// quarters (#702): every quarterly seed below is settled.

/**
 * The three open-pipeline buckets of a settled snapshot, in the shape the
 * forecast object defines them (`src/sales/objects/forecast.object.ts`).
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
  at: CelPeriod,
  quota: number,
  closed: number,
  open: OpenBuckets,
  notes: string,
) => ({
  seed_key,
  period: at.kind,
  period_label: labelOf(at),
  period_start: isoOf(at.start),
  period_end: isoOf(at.end),
  snapshot_date: isoOf(at.end),
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
// `seed_key` declaration in `src/sales/objects/forecast.object.ts`.
//
// The keys are POSITIONAL ('current month', 'two quarters back'), not calendar
// values, because the records are positional — their CEL dates resolve
// against `today()` on every seed load. A positional key keeps the demo at exactly these seven rows
// as the calendar rolls forward, re-pointing each at its new period; a
// calendar-derived key would strand last quarter's demo row and add one row per
// re-seed.
//
// There is no `demo_quarter_current`: the current quarter is the one window
// `forecast_snapshot` writes, and two producers in one window is what #702 was.
// The current MONTH stays — the sweep's period is `quarter`, so no runtime
// writer opens a monthly row.
//
// `upsert` STAYS (#2139), unlike the insert-once datasets around it: the rows
// are positional snapshots that each boot re-points at the calendar (above),
// and the period a rep or manager works is the current quarter, which no seed
// row ever holds. Its price: an edit to a seeded snapshot itself is written
// back on the next boot.
export const forecasts = defineSeed(Forecast, {
  mode: 'upsert',
  externalId: 'seed_key',
  records: [
    {
      seed_key: 'demo_month_current',
      period: 'month',
      period_label: labelOf(thisMonth),
      period_start: isoOf(thisMonth.start),
      period_end: isoOf(thisMonth.end),
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
      period_label: labelOf(lastQuarter),
      period_start: isoOf(lastQuarter.start),
      period_end: isoOf(lastQuarter.end),
      snapshot_date: isoOf(lastQuarter.end),
      quota: 1400000,
      pipeline_amount: 240000,
      best_case_amount: 150000,
      commit_amount: 95000,
      closed_amount: 1485000,
      source: 'scheduled',
      notes: 'Closed at 106% of quota.',
    },
    closedPeriod('demo_quarter_minus_2', quarterAgo(2), 1300000, 1196000,
      { pipeline: 285000, bestCase: 190000, commit: 120000 },
      'Closed at 92% of quota — two enterprise deals slipped into the next quarter.'),
    closedPeriod('demo_quarter_minus_3', quarterAgo(3), 1200000, 1308000,
      { pipeline: 195000, bestCase: 130000, commit: 85000 },
      'Closed at 109% of quota, carried by the enterprise renewal cohort.'),
    closedPeriod('demo_quarter_minus_4', quarterAgo(4), 1100000, 1045000,
      { pipeline: 165000, bestCase: 110000, commit: 70000 },
      'Closed at 95% of quota in the first quarter on the new territory model.'),
    closedPeriod('demo_month_minus_1', monthAgo(1), 480000, 505000,
      { pipeline: 96000, bestCase: 62000, commit: 40000 },
      'Closed at 105% of quota; the expansion motion covered a soft new-business month.'),
    closedPeriod('demo_month_minus_2', monthAgo(2), 460000, 414000,
      { pipeline: 92000, bestCase: 58000, commit: 35000 },
      'Closed at 90% of quota — summer slowdown across the mid-market segment.'),
  ]
});
