// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { P } from '@objectstack/spec';
import type * as Automation from '@objectstack/spec/automation';
type Flow = Automation.Flow;

/**
 * Forecast Snapshot — nightly per-owner pipeline snapshot into `crm_forecast`.
 *
 * The gap this closes: `crm_forecast` documented a nightly writer that did not
 * exist. `forecast.hook.ts` only DERIVES fields on a row someone else creates,
 * and nothing in `src/` ever created one — so the forecast object, its
 * `attainment_pct` / `coverage_ratio` formulas, the `forecast_metrics` dataset
 * and the dashboard's quota-attainment table all ran on the three hand-seeded
 * demo rows. On any live install the whole forecasting story was an empty
 * shell (#590).
 *
 * ## Buckets
 *
 * Amounts are aggregated from `crm_opportunity` by `forecast_category` — the
 * stored, indexed column the opportunity lifecycle hook derives from `stage`,
 * and the same column the "Commit & Best Case" list view and the
 * `pipeline_by_forecast_category` dashboard widget already group on. Reading
 * the snapshot off `probability` instead would create a SECOND definition of
 * "commit" that silently disagrees with those surfaces.
 *
 * The buckets are CUMULATIVE, the standard forecast ladder — and the shape the
 * object's own fields already assume (`pipeline` is "all open opportunities",
 * so it necessarily contains the other two), the seeded magnitudes show
 * (pipeline > best case > commit), and the opportunity `closing_this_quarter`
 * view spells out by treating `['commit', 'best_case']` as one bucket:
 *
 *   pipeline_amount  → every OPEN opportunity closing in the period
 *   best_case_amount → open, forecast_category ∈ { best_case, commit }
 *   commit_amount    → open, forecast_category = commit
 *   closed_amount    → stage = closed_won, closing in the period
 *
 * `quota` is deliberately never written: it is maintained by hand until a
 * quota model exists, and a sweep that reset it every night would erase the
 * denominator of `attainment_pct`.
 *
 * ## Shape
 *
 * Per owner: ensure the current-period row exists, re-read it, then sum four
 * scoped queries into it. Two things force that ordering.
 *
 * 1. The period window is DATA, not arithmetic. A flow template resolves
 *    `{TODAY()}` and day offsets only — it cannot say "the first day of this
 *    calendar quarter". So the flow selects the row whose window CONTAINS
 *    today (`period_start <= today <= period_end`), lets `forecast.hook.ts`
 *    derive a calendar-true window on create, and then reads the boundaries
 *    back off the row to scope the opportunity queries. One definition of "the
 *    current period", owned by the object.
 * 2. Sums come from four separate `get_record` + `loop` pairs rather than one
 *    query with in-loop branching. A filter is plain metadata, so the bucket
 *    definitions stay declarative and greppable; the accumulator templates
 *    stay pure arithmetic (`* 1` coerces a currency that arrives as a string
 *    and maps null to 0).
 *
 * Idempotency: the row is keyed by (owner, period, containing window), so a
 * re-run finds it and OVERWRITES the amounts instead of inserting a second
 * row — the same upsert discipline as `contract_renewal` /
 * `opportunity_stagnation`. Re-running is how a snapshot stays current, and it
 * is the only way an amount ever decreases.
 *
 * Scope: an "active opportunity owner" is a user owning at least one
 * opportunity that is not `closed_lost`. Users with none are skipped entirely,
 * so a fresh install does not litter a zero row per employee.
 */

/**
 * The period this sweep snapshots. `quarter` because that is what every
 * consumer reads: the `this_quarter_forecasts` view filters `period: 'quarter'`
 * and the quota-attainment table is a quarterly scoreboard. A monthly cadence
 * would be a second flow, not a flag — the upsert key is (owner, period).
 */
const SNAPSHOT_PERIOD = 'quarter';

/** Open = not yet resolved either way. Both closed stages leave the pipeline. */
const OPEN_STAGES = { $nin: ['closed_won', 'closed_lost'] };

/** Window the current-period row: `period_start <= today <= period_end`. */
const CURRENT_PERIOD_FILTER = {
  owner_id: '{currentOwner.id}',
  period: SNAPSHOT_PERIOD,
  period_start: { $lte: '{TODAY()}' },
  period_end: { $gte: '{TODAY()}' },
};

/** Opportunities of the owner in flight during the snapshot window. */
const inPeriod = (extra: Record<string, unknown>) => ({
  owner_id: '{currentOwner.id}',
  close_date: {
    $gte: '{currentForecast.period_start}',
    $lte: '{currentForecast.period_end}',
  },
  ...extra,
});

/**
 * One `get_record` + `loop` pair that sums `amount` into `total`.
 *
 * `amount * 1` rather than a bare `amount`: the accumulator runs through the
 * template evaluator, which stringifies non-numeric values — a currency that
 * comes back from the driver as `"90000"` would CONCATENATE instead of add.
 * `* 1` coerces it, and maps a null/absent amount to 0.
 */
const sumBucket = (key: string, label: string, filter: Record<string, unknown>, total: string) => ({
  find: {
    id: `find_${key}`,
    type: 'get_record' as const,
    label: `Find ${label}`,
    config: {
      objectName: 'crm_opportunity',
      filter,
      limit: 500,
      outputVariable: `${key}Opps`,
    },
  },
  sum: {
    id: `sum_${key}`,
    type: 'loop' as const,
    label: `Sum ${label}`,
    config: {
      collection: `{${key}Opps}`,
      iteratorVariable: `current_${key}`,
      body: {
        nodes: [
          {
            id: `add_${key}`,
            type: 'assignment' as const,
            label: `Add to ${label}`,
            config: { assignments: { [total]: `{${total} + current_${key}.amount * 1}` } },
          },
        ],
        edges: [],
      },
    },
  },
});

const BUCKETS = [
  sumBucket('pipeline', 'Open Pipeline', inPeriod({ stage: OPEN_STAGES }), 'pipelineTotal'),
  sumBucket(
    'best_case',
    'Best Case',
    inPeriod({ stage: OPEN_STAGES, forecast_category: { $in: ['best_case', 'commit'] } }),
    'bestCaseTotal',
  ),
  sumBucket(
    'commit',
    'Commit',
    inPeriod({ stage: OPEN_STAGES, forecast_category: 'commit' }),
    'commitTotal',
  ),
  sumBucket('won', 'Closed Won', inPeriod({ stage: 'closed_won' }), 'closedTotal'),
];

/**
 * The per-owner body runs as one straight line once the two gates pass:
 * reload → reset → (find/sum) × 4 → write.
 */
const OWNER_CHAIN = [
  'reload_forecast',
  'reset_totals',
  ...BUCKETS.flatMap((b) => [b.find.id, b.sum.id]),
  'write_snapshot',
];

export const ForecastSnapshotFlow: Flow = {
  name: 'forecast_snapshot',
  label: 'Forecast Snapshot',
  description:
    'Nightly sweep: upsert a current-quarter crm_forecast row per active opportunity owner with pipeline, best-case, commit and closed-won totals.',
  type: 'schedule',
  status: 'active',
  // Scheduled runs have no trigger user, so under the default runAs:'user' the
  // data nodes execute UNSCOPED anyway. Declare runAs:'system' to make that
  // RLS-bypassing elevation explicit and intended (ADR-0049, #1888) — and it
  // is load-bearing here: `crm_forecast` is `sharingModel: 'private'`, so a
  // user-scoped sweep could only ever see its own rows.
  runAs: 'system',

  variables: [],

  nodes: [
    { id: 'start', type: 'start', label: 'Start (daily 03:00)', config: { schedule: '0 3 * * *' } },
    {
      // Every user is a candidate; the `has_deals` gate below decides who is
      // actually an opportunity owner. Filtering `sys_user` here instead would
      // hard-code an activity flag this app does not own.
      // No `filter` key: an EMPTY filter node (`{}`) reduces to TRUE and
      // matches every row, so it is indistinguishable from an absent key —
      // ObjectStack 17.0.0-rc.6 promotes the pair to an author-time error
      // (`filter-empty-node`) precisely because only the absent key SAYS
      // "every user is a candidate" to the next reader. The `has_deals` gate
      // below is what actually narrows the set.
      id: 'query_owners', type: 'get_record', label: 'Find Users',
      config: { objectName: 'sys_user', limit: 500, outputVariable: 'ownerList' },
    },
    {
      id: 'loop_owners', type: 'loop', label: 'For Each Owner',
      config: {
        collection: '{ownerList}',
        iteratorVariable: 'currentOwner',
        body: {
          nodes: [
            {
              // Cheap findOne gate: a user with no live opportunity is not a
              // forecast owner, and must not get a row (a fresh install would
              // otherwise gain one empty snapshot per employee).
              id: 'find_any_deal', type: 'get_record', label: 'Owns Any Live Deal?',
              config: {
                objectName: 'crm_opportunity',
                filter: { owner_id: '{currentOwner.id}', stage: { $nin: ['closed_lost'] } },
                outputVariable: 'ownerAnyDeal',
              },
            },
            {
              // Gateway only — the predicate lives on the out-edge (#650).
              id: 'has_deals', type: 'decision', label: 'Active Owner?',
            },
            {
              // Idempotency gate AND period lookup in one read: the row whose
              // window contains today IS this owner's current-period snapshot.
              id: 'find_forecast', type: 'get_record', label: 'Current-Period Snapshot?',
              config: {
                objectName: 'crm_forecast',
                filter: CURRENT_PERIOD_FILTER,
                outputVariable: 'existingForecast',
              },
            },
            {
              // Gateway only — the predicate lives on the out-edges (#650).
              id: 'check_missing', type: 'decision', label: 'First Snapshot This Period?',
            },
            {
              // Only `period` is supplied: `forecast.hook.ts` derives
              // period_start/period_end/period_label so the boundaries are
              // calendar-true (#530) without the flow doing date arithmetic it
              // cannot do. `quota` is omitted on purpose — see the header.
              // A leaf node: the two mutually-exclusive edges out of
              // `check_missing` both converge on `reload_forecast`, so the
              // chain below runs exactly once on either path.
              id: 'create_forecast', type: 'create_record', label: 'Open Snapshot Row',
              config: {
                objectName: 'crm_forecast',
                fields: {
                  owner_id: '{currentOwner.id}',
                  period: SNAPSHOT_PERIOD,
                  snapshot_date: '{TODAY()}',
                  source: 'scheduled',
                  pipeline_amount: 0,
                  best_case_amount: 0,
                  commit_amount: 0,
                  closed_amount: 0,
                },
              },
            },
            {
              // Re-read rather than reuse the create output, so both paths
              // (row already existed / row just created) hand the rest of the
              // body ONE variable carrying the hook-derived period window.
              id: 'reload_forecast', type: 'get_record', label: 'Load Snapshot Row',
              config: {
                objectName: 'crm_forecast',
                filter: CURRENT_PERIOD_FILTER,
                outputVariable: 'currentForecast',
              },
            },
            {
              // Accumulators live in the flow-wide variable map (a loop body
              // shares the enclosing scope), so they MUST be zeroed per owner
              // or every rep inherits the previous rep's totals.
              id: 'reset_totals', type: 'assignment', label: 'Reset Totals',
              config: {
                assignments: {
                  pipelineTotal: 0,
                  bestCaseTotal: 0,
                  commitTotal: 0,
                  closedTotal: 0,
                },
              },
            },
            ...BUCKETS.flatMap((b) => [b.find, b.sum]),
            {
              // Filter by id: `update_record` calls `data.update` without
              // `options.multi`, so a filter matching more than one row fails
              // (same constraint as demo_bootstrap / case_sla_monitor).
              id: 'write_snapshot', type: 'update_record', label: 'Write Snapshot',
              config: {
                objectName: 'crm_forecast',
                filter: { id: '{currentForecast.id}' },
                fields: {
                  pipeline_amount: '{pipelineTotal}',
                  best_case_amount: '{bestCaseTotal}',
                  commit_amount: '{commitTotal}',
                  closed_amount: '{closedTotal}',
                  snapshot_date: '{TODAY()}',
                  source: 'scheduled',
                },
              },
            },
          ],
          edges: [
            // Loop-nested conditions are explicit CEL envelopes (`P`): the
            // conversion pass that wraps bare strings only walks a flow's
            // TOP-LEVEL edges, so a bare string in here would fall through to
            // the legacy template path and compare as text — a gate that never
            // opens, silently (#567 / upstream #4347).
            //
            // These edges are the ONLY site for their predicates (#650): a
            // `decision` node's singular `config.condition` is never read, so a
            // node-level copy would be inert metadata free to drift.
            { id: 'b1', source: 'find_any_deal', target: 'has_deals', type: 'default' },
            // No matching edge simply ends this iteration, so a user with no
            // live deal is skipped without a snapshot row.
            { id: 'b2', source: 'has_deals', target: 'find_forecast', type: 'conditional', condition: P`ownerAnyDeal != null`, label: 'Active owner' },
            { id: 'b3', source: 'find_forecast', target: 'check_missing', type: 'default' },
            // Mutually exclusive, and both reach `reload_forecast` — never a
            // default edge alongside a conditional one, which would traverse
            // BOTH and double-count the whole chain.
            { id: 'b4', source: 'check_missing', target: 'create_forecast', type: 'conditional', condition: P`existingForecast == null`, label: 'Open new row' },
            { id: 'b5', source: 'check_missing', target: 'reload_forecast', type: 'conditional', condition: P`existingForecast != null`, label: 'Refresh existing row' },
            { id: 'b6', source: 'create_forecast', target: 'reload_forecast', type: 'default' },
            ...OWNER_CHAIN.slice(0, -1).map((source, i) => ({
              id: `c${i}`,
              source,
              target: OWNER_CHAIN[i + 1],
              type: 'default' as const,
            })),
          ],
        },
      },
    },
    { id: 'end', type: 'end', label: 'End' },
  ],

  edges: [
    { id: 'e1', source: 'start', target: 'query_owners', type: 'default' },
    { id: 'e2', source: 'query_owners', target: 'loop_owners', type: 'default' },
    { id: 'e3', source: 'loop_owners', target: 'end', type: 'default' },
  ],
};
