// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { ObjectSchema, Field } from '@objectstack/spec/data';
import { F, P } from '@objectstack/spec';

/**
 * Forecast Object
 *
 * Monthly / quarterly snapshot of pipeline by owner. Each record holds
 * the aggregated amounts at the moment of snapshot, so trend reports
 * ("how did our Q3 forecast change week over week?") can be built
 * without re-aggregating opportunity history.
 *
 * Written by:
 *   • `src/flows/forecast-snapshot.flow.ts` — the `forecast_snapshot`
 *     scheduled flow, nightly at 03:00, one current-quarter row per active
 *     opportunity owner (#590). It never touches `quota`.
 *   • `revenue_forecasting` AI skill on demand
 *   • `forecast.hook.ts` derives the period family + `snapshot_date` on every
 *     write; it creates nothing on its own.
 *
 * Forecast categories follow the standard Salesforce ladder, and the buckets
 * are CUMULATIVE — each is a subset of the one above it:
 *   pipeline  → all open opps closing in the period
 *   best_case → open opps whose forecast_category is best_case OR commit
 *   commit    → open opps whose forecast_category is commit
 *   closed    → already-won amount in the period
 *
 * The bucket boundary is the stored `forecast_category` column (derived from
 * `stage` by the opportunity lifecycle hook), NOT a probability threshold —
 * one definition, shared with the "Commit & Best Case" opportunity view and
 * the `pipeline_by_forecast_category` dashboard widget.
 */
export const Forecast = ObjectSchema.create({
  name: 'crm_forecast',
  label: 'Forecast',
  pluralLabel: 'Forecasts',
  icon: 'trending-up',
  description: 'Periodic pipeline snapshot by owner used for revenue forecasting.',

  // OWD is an authored decision (ADR-0090 D1/D7). Forecasts are personal to the
  // owner.
  sharingModel: 'private',
  // ADR-0079 record title. ⚠️ A formula cannot dot-walk a lookup (ADR-0072), so
  // `display_title` composes local fields only: period_label + (period_start).
  nameField: 'display_title',
  // ⚠️ Explicit search targets (ADR-0061), REQUIRED because `nameField` is a
  // FORMULA: without this, `$search` auto-defaults to the formula field, which
  // is not a real column, so the lookup picker and global search silently
  // return zero. These are real, indexed columns.
  searchableFields: ['period_label'],
  highlightFields: ['owner_id', 'period', 'period_start', 'commit_amount', 'closed_amount'],

  fieldGroups: [
    { key: 'basic',   label: 'Snapshot',    icon: 'info' },
    { key: 'amounts', label: 'Amounts',     icon: 'dollar-sign' },
    { key: 'meta',    label: 'Source',      icon: 'database', defaultExpanded: false },
  ],

  fields: {
    // Platform ownership anchor — canonical note in `account.object.ts` (#548).
    owner_id: Field.lookup('sys_user', {
      label: 'Owner',
      group: 'basic',
      system: true,
      readonly: false,
      trackHistory: true,
    }),


    period: Field.select({
      label: 'Period',
      required: true,
      storage: { notNull: true },
      group: 'basic',
      options: [
        { label: 'Month',   value: 'month', default: true },
        { label: 'Quarter', value: 'quarter' },
      ],
    }),

    // Wording mirrors the two refusal messages this field is bound by
    // (`period_start_first_of_period` / `quarter_starts_on_quarter_boundary`,
    // both below) so the form and the rejection agree on the same rule
    // instead of describing two different ones (#1085).
    period_start: Field.date({
      label: 'Period Start',
      description:
        'Must be the first day of the period — e.g. 2026-08-01 for Aug 2026. A quarterly forecast must additionally start on a quarter boundary: January 1, April 1, July 1 or October 1.',
      required: true,
      storage: { notNull: true },
      group: 'basic',
    }),

    // Still not read-only: `forecast.hook.ts` fills it only when the write
    // leaves it unset, and `src/data/revenue.seed.ts` hand-fills it on every
    // seeded row — so hand-entry is a capability this app uses. A hand-filled
    // value is pinned to the same calendar period `period_start` is
    // (`period_end_matches_calendar_period` below), and the description states
    // that rule rather than the weaker `period_end_after_start` it subsumes:
    // the form says what is actually enforced.
    period_end: Field.date({
      label: 'Period End',
      description:
        'Normally derived automatically from Period and Period Start. If set by hand, it must be the last day of that period — e.g. 2026-09-30 for a quarter starting 2026-07-01, or 2026-08-31 for Aug 2026.',
      required: true,
      storage: { notNull: true },
      group: 'basic',
    }),

    period_label: Field.text({
      label: 'Period Label',
      description: 'Human-friendly label, e.g. "Q3 2026" or "Aug 2026".',
      group: 'basic',
    }),

    // ADR-0079 record title. ⚠️ A formula cannot dot-walk a lookup (ADR-0072),
    // so this composes local fields only; `period_start` (a date) is
    // string()-coerced for concat.
    //
    // ⚠️ The coercion is `string()`, NOT `text()`. `text` is not a registered
    // CEL function — it is absent from `CEL_STDLIB_FUNCTIONS` — so a formula
    // using it faults at runtime and leaves the record's `nameField` null. The
    // author-time `expression-invalid` rule now REPORTS it ("found no matching
    // overload for 'text(dyn)'") instead of letting a broken formula through to
    // null silently. `string` is the catalog's coercion, alongside
    // `int`/`bool`/`double`/`timestamp`.
    display_title: Field.formula({
      label: 'Display Title',
      expression: F`record.period_label + " (" + string(record.period_start) + ")"`,
      group: 'basic',
    }),

    snapshot_date: Field.date({
      label: 'Snapshot Date',
      description: 'The day this snapshot was captured.',
      required: true,
      storage: { notNull: true },
      group: 'meta',
    }),

    quota: Field.currency({
      label: 'Quota',
      scale: 2,
      min: 0,
      group: 'amounts',
      trackHistory: true,
    }),

    pipeline_amount: Field.currency({
      label: 'Pipeline',
      description: 'Sum of all open opportunities closing in this period (any stage).',
      scale: 2,
      min: 0,
      group: 'amounts',
    }),

    best_case_amount: Field.currency({
      label: 'Best Case',
      description: 'Open opportunities in the Best Case or Commit forecast category.',
      scale: 2,
      min: 0,
      group: 'amounts',
    }),

    commit_amount: Field.currency({
      label: 'Commit',
      description: 'Open opportunities in the Commit forecast category (owner-committed).',
      scale: 2,
      min: 0,
      group: 'amounts',
    }),

    closed_amount: Field.currency({
      label: 'Closed Won',
      description: 'Already-closed-won amount in this period.',
      scale: 2,
      min: 0,
      group: 'amounts',
    }),

    expected_amount: Field.formula({
      label: 'Expected',
      description: 'Closed Won + Commit — what the owner reasonably expects to land.',
      expression: F`coalesce(record.closed_amount, 0) + coalesce(record.commit_amount, 0)`,
      scale: 2,
      group: 'amounts',
    }),

    attainment_pct: Field.formula({
      label: 'Attainment %',
      description: 'Closed Won ÷ Quota × 100. Reads 0% until a positive quota is set.',
      expression: F`coalesce(record.quota, 0) > 0 ? (coalesce(record.closed_amount, 0) * 100.0) / record.quota : 0.0`,
      scale: 2,
      group: 'amounts',
    }),

    coverage_ratio: Field.formula({
      label: 'Coverage Ratio',
      description: 'Pipeline ÷ (Quota − Closed Won) — whether enough pipeline remains to cover the gap. Reads 0 once the quota is already met.',
      expression: F`(coalesce(record.quota, 0) - coalesce(record.closed_amount, 0)) > 0 ? coalesce(record.pipeline_amount, 0) / (record.quota - coalesce(record.closed_amount, 0)) : 0.0`,
      scale: 2,
      group: 'amounts',
    }),

    source: Field.select({
      label: 'Source',
      group: 'meta',
      options: [
        { label: 'Scheduled snapshot', value: 'scheduled', default: true },
        { label: 'AI skill',           value: 'ai' },
        { label: 'Manual entry',       value: 'manual' },
      ],
    }),

    notes: Field.text({
      label: 'Notes',
      maxLength: 1000,
      group: 'meta',
    }),

    // Fixture identity — the seed loader's `externalId`, and nothing else.
    //
    // `crm_forecast` is a PER-OWNER snapshot: its real identity is
    // (owner_id, period, period_start), and every other column is a rendering of
    // part of that. `period_label` in particular names a SET of rows once the
    // `forecast_snapshot` sweep writes one row per active owner per quarter —
    // they all read 'Q3 2026' — so upserting on that label lets a re-seed match,
    // and overwrite, a real rep's snapshot.
    //
    // ⚠️ The true composite `externalId: ['owner_id', 'period', 'period_start']`
    // is not available here: a seed cannot name a user (see the note at the foot
    // of `src/data/index.ts`), so `owner_id` is null on every seeded row, and
    // the loader's `externalIdKey` returns "" as soon as any part is empty. An
    // empty key never matches, so upsert degrades to insert-on-every-replay.
    // Dropping `owner_id` does not rescue it: a runtime row for the current
    // quarter carries exactly the same (period, period_start).
    //
    // ⚠️ `mode: 'insert'` does NOT mean "insert once" — the loader inserts
    // unconditionally on every replay boot (framework#3434). `'ignore'` is the
    // real insert-once mode, but it decides "already there?" from the same
    // `externalId`, so on a broken key it would SKIP the demo row because a real
    // rep's row already claimed 'Q3 2026'. Fixing the identity is a prerequisite
    // either way. Hence this synthetic, seeder-only key.
    //
    // ⚠️ `readonly` is the load-bearing part, not decoration: seed writes run
    // `{ isSystem: true }` and bypass readonly stripping, while readonly
    // stripping does guard user/API writes — so a genuine forecast row can never
    // acquire a `seed_key` and can never be matched by a re-seed. That is what
    // makes the fix structural rather than a naming convention. `hidden` keeps a
    // fixtures-only column out of forms and pickers.
    seed_key: Field.text({
      label: 'Seed Key',
      description: 'Demo-fixture identity. Written only by the seed loader; empty on every real snapshot.',
      maxLength: 64,
      readonly: true,
      hidden: true,
      group: 'meta',
    }),
  },

  indexes: [
    { fields: ['owner_id', 'period_start', 'period'] },
    { fields: ['snapshot_date'] },
    { fields: ['period_start'] },
  ],

  // API surface. History → Field.trackHistory (ADR-0052).
  enable: {
    apiEnabled: true,
    apiMethods: ['get', 'list', 'create', 'update', 'delete'],
  },

  // Predicates below are TOTAL: every `record.x` read is `has()`-guarded, so the
  // rule returns a verdict even when the merged record has no such key. See
  // AGENTS.md "Validation predicates must be TOTAL" and
  // test/object-validation-predicates.test.ts, which fails the build otherwise.
  validations: [
    {
      name: 'period_end_after_start',
      type: 'script',
      severity: 'error',
      message: 'Period End must be after Period Start.',
      // `<=`, not `<`: the rule name says "after" and a forecast period is a
      // month or a quarter, never a single instant, so `period_end ==
      // period_start` is a zero-length period rather than a valid one. Same
      // operator and wording as the `end_after_start` twins on
      // campaign/contract.
      condition: P`has(record.period_end) && record.period_end != null && has(record.period_start) && record.period_start != null && record.period_end <= record.period_start`,
    },
    // A hand-filled `period_start` must be the first day of the calendar period
    // it labels. Maintainer ruling 2026-08-11: 「接受你的全部建议」 — refuse
    // rather than accept or snap.
    //
    // The hook derives `period_end` as "start + one period" — a ROLLING window.
    // That is calendar-true for a start on a boundary and drifts for anything
    // else: `period: 'quarter'` + `period_start: 2026-08-15` derives
    // `period_end: 2026-10-31` under `period_label: 'Q3 2026'`, a window
    // labelled Q3 that reaches a month into Q4. The row is internally
    // inconsistent in a way no consumer can detect: every "this quarter"
    // equals-filter reads `period_start`, and the nightly sweep selects the
    // current row by `period_start <= today <= period_end`.
    //
    // These rules are the ONE enforcement point — deliberately not a throw in
    // `forecast.hook.ts` as well. ⚠️ A declared rule is the shape the platform
    // can act on: it refuses the write with a `ValidationError` /
    // `VALIDATION_FAILED` envelope (HTTP 400) on the record form, on the API and
    // on a seed's system write alike, where a hook throw is a bare `Error`. The
    // derivation is left alone: with the start pinned to a boundary, "start +
    // one period" IS the calendar period.
    //
    // ⚠️ WHY A REGEX AND NOT DATE ARITHMETIC: the CEL stdlib this app compiles
    // against (`CEL_STDLIB_FUNCTIONS`) has no month/day accessor — the date
    // functions are `today`/`daysBetween`/`addDays`/`addMonths`/`date` — so "the
    // 1st of its month" is not expressible as arithmetic. Both drivers this app
    // can run on hand `period_start` back as a `YYYY-MM-DD` string, and an ISO
    // *datetime* string still matches these prefix-anchored patterns. A caller
    // that writes a JS `Date` object is the one shape `string()` has no overload
    // for; the engine then rejects that write naming the rule rather than
    // admitting it, and no writer in this app does that.
    {
      name: 'period_start_first_of_period',
      type: 'script',
      severity: 'error',
      message: 'Period Start must be the first day of the period — e.g. 2026-08-01 for Aug 2026.',
      condition: P`has(record.period_start) && record.period_start != null && !matches(string(record.period_start), "^[0-9]{4}-[0-9]{2}-01")`,
    },
    {
      name: 'quarter_starts_on_quarter_boundary',
      type: 'script',
      severity: 'error',
      // The month rule above already rejects any non-1st day, so this one only
      // ever adds the quarter-month half: 2026-08-01 is a valid month start and
      // not a valid quarter start.
      message: 'A quarterly forecast must start on a quarter boundary — January 1, April 1, July 1 or October 1.',
      condition: P`has(record.period) && record.period == "quarter" && has(record.period_start) && record.period_start != null && !matches(string(record.period_start), "^[0-9]{4}-(01|04|07|10)-01")`,
    },
    // …and the OTHER end of the same window. The two rules above pin the START;
    // `period_end` stays reachable, because the hook derives it only when the
    // write leaves it unset and the field sits editable on the record form.
    // Without this rule, `period: 'quarter'` + `period_start: 2026-07-01` (a
    // boundary the rules above admit) + a hand-typed `period_end: 2027-05-15` is
    // ADMITTED under `period_label: 'Q3 2026'` — a ten-month window labelled as
    // one quarter, reached through the other field.
    //
    // WHY A RULE AND NOT A READ-ONLY FIELD: deriving `period_end` always and
    // locking the form breaks the demo seed —
    // `src/data/revenue.seed.ts:339,378,393` hand-fill it on every seeded row.
    // Hand-entry stays; it is now bounded.
    //
    // ⚠️ WHY `type: 'script'` AND NOT A FIELD CONSTRAINT: a field bound judges
    // only the value being written, so a row already stored wrong keeps
    // accepting edits forever; a script validation is evaluated against the
    // MERGED record on every write and is therefore a true invariant.
    // `test/forecast-period-end-boundary.test.ts` pins both halves — a legacy
    // row is refused on its next unrelated edit, and the repair is admitted.
    //
    // WHY DATE ARITHMETIC HERE WHEN THE TWO RULES ABOVE USE A REGEX: not taste.
    // Those rules inspect ONE date's components ("is this the 1st of its
    // month?"), and the CEL stdlib has no month/day accessor. This rule compares
    // TWO dates, which `addMonths`/`addDays`/`daysBetween` express directly.
    //
    // The predicate says "one period long", and that is the same claim as "ends
    // on the calendar boundary" ONLY because the two rules above pin the start
    // to one. That coupling is deliberate: the three are one set enforcing one
    // invariant (a row's window is exactly the calendar period it is labelled
    // with), not three independent gates.
    //
    // ⚠️ `daysBetween(a, b) != 0` rather than `a == b`: both drivers this app
    // runs on hand dates back as `YYYY-MM-DD` strings while `addDays` returns a
    // timestamp, and a string never `==` a timestamp — the rule would be
    // permanently green. `daysBetween` puts both sides through the same
    // `toDate`, so the string, an ISO datetime spelling and a JS `Date` all
    // compare alike.
    //
    // ⚠️ The `!= null` guards are load-bearing for a THIRD hazard beyond the two
    // AGENTS.md names: `daysBetween(null, …)` reaches `BigInt(NaN)` and THROWS,
    // which the engine reports as `predicate failed to evaluate` — a rule that
    // cannot answer, i.e. a rejected ordinary save. This predicate has no
    // ordering operator, so `object-validation-predicates.test.ts`'s
    // unguarded-comparison sweep does not cover it; the pin lives in
    // `test/forecast-period-end-boundary.test.ts` instead.
    {
      name: 'period_end_matches_calendar_period',
      type: 'script',
      severity: 'error',
      message:
        'Period End must be the last day of the period — e.g. 2026-09-30 for a quarter starting 2026-07-01, or 2026-08-31 for Aug 2026.',
      // Spelled out per period value instead of a ternary on the month count:
      // an undeclared `period` is refused BY NAME by the picklist ("Period must
      // be one of: month, quarter", measured), so this rule judges only the two
      // values it understands and leaves the rest to the schema.
      condition: P`has(record.period) && record.period != null && has(record.period_start) && record.period_start != null && has(record.period_end) && record.period_end != null && ((record.period == "month" && daysBetween(record.period_end, addDays(addMonths(record.period_start, 1), -1)) != 0) || (record.period == "quarter" && daysBetween(record.period_end, addDays(addMonths(record.period_start, 3), -1)) != 0))`,
    },
    {
      name: 'snapshot_amounts_non_negative',
      type: 'script',
      severity: 'error',
      message: 'Snapshot amounts cannot be negative.',
      condition: P`(has(record.pipeline_amount) && record.pipeline_amount != null && record.pipeline_amount < 0) || (has(record.best_case_amount) && record.best_case_amount != null && record.best_case_amount < 0) || (has(record.commit_amount) && record.commit_amount != null && record.commit_amount < 0) || (has(record.closed_amount) && record.closed_amount != null && record.closed_amount < 0)`,
    },
  ],
});
