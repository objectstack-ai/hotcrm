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

  // ADR-0090 D1/D7: OWD is an authored decision. Forecasts are personal to the owner.
  sharingModel: 'private',
  // ADR-0079: render-only `titleFormat` retired in favor of `nameField`.
  // The former template led with `{owner}`, a lookup — DROPPED here because a
  // formula cannot dot-walk a lookup (ADR-0072). The `display_title` formula
  // composes the local fields only: period_label + (period_start).
  nameField: 'display_title',
  // Explicit search targets (ADR-0061). REQUIRED because nameField is a
  // FORMULA (display_title/full_name): without this, $search auto-defaults to
  // the formula field, which isn't a real column, so the lookup picker + global
  // search silently return zero. These are real, indexed columns.
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

    period_start: Field.date({
      label: 'Period Start',
      required: true,
      storage: { notNull: true },
      group: 'basic',
    }),

    period_end: Field.date({
      label: 'Period End',
      required: true,
      storage: { notNull: true },
      group: 'basic',
    }),

    period_label: Field.text({
      label: 'Period Label',
      description: 'Human-friendly label, e.g. "Q3 2026" or "Aug 2026".',
      group: 'basic',
    }),

    // ADR-0079 record title. Original titleFormat was
    // '{owner} — {period_label} ({period_start})'; the leading `{owner}` lookup
    // is DROPPED (a formula cannot dot-walk a lookup, ADR-0072). Composes the
    // local fields only; `period_start` (a date) is text()-coerced for concat.
    display_title: Field.formula({
      label: 'Display Title',
      expression: F`record.period_label + " (" + text(record.period_start) + ")"`,
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
      // Was "probability >= 60%", which named a threshold no writer applied
      // and which disagreed with the stage → forecast_category map that
      // actually classifies deals (proposal is 60% but lands in `commit`).
      // The stored category is the single boundary (#590).
      description: 'Open opportunities in the best_case or commit forecast category.',
      scale: 2,
      min: 0,
      group: 'amounts',
    }),

    commit_amount: Field.currency({
      label: 'Commit',
      description: 'Open opportunities in the commit forecast category (owner-committed).',
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
      description: 'Closed + Commit — what the owner reasonably expects to ship.',
      expression: F`coalesce(record.closed_amount, 0) + coalesce(record.commit_amount, 0)`,
      scale: 2,
    }),

    attainment_pct: Field.formula({
      label: 'Attainment %',
      description: '(Closed / Quota) * 100. Negative quota guarded.',
      expression: F`coalesce(record.quota, 0) > 0 ? (coalesce(record.closed_amount, 0) * 100.0) / record.quota : 0.0`,
      scale: 2,
    }),

    coverage_ratio: Field.formula({
      label: 'Coverage Ratio',
      description: 'Pipeline ÷ (Quota − Closed). Health-check for whether enough pipeline exists.',
      expression: F`(coalesce(record.quota, 0) - coalesce(record.closed_amount, 0)) > 0 ? coalesce(record.pipeline_amount, 0) / (record.quota - coalesce(record.closed_amount, 0)) : 0.0`,
      scale: 2,
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
    // `forecast_snapshot` sweep (#590) writes one row per active owner per
    // quarter — they all read 'Q3 2026'. The demo seed used to upsert on that
    // label, so a re-seed could match, and overwrite, a real rep's snapshot
    // (#613).
    //
    // The three routes considered, and why this one:
    //
    //   • Composite `externalId: ['owner_id', 'period', 'period_start']` — the
    //     true identity, and the platform does support composite keys (the
    //     seed file already uses one for opportunity line items). It fails
    //     HERE for a different reason: a seed cannot name a user (see the note
    //     at the foot of `src/data/index.ts`), so `owner_id` is null on every
    //     seeded row, and the loader's `externalIdKey` returns "" as soon as
    //     any part is empty. An empty key never matches, so upsert degrades to
    //     insert-on-every-replay and duplicates the table — strictly worse.
    //     Dropping `owner_id` does not rescue it: a runtime row for the current
    //     quarter carries exactly the same (period, period_start).
    //
    //   • `mode: 'insert'` — does NOT mean "insert once". The loader inserts
    //     unconditionally on every replay boot (framework#3434). `'ignore'` is
    //     the real insert-once mode, but it decides "already there?" from the
    //     same `externalId`, so on the broken key it would SKIP the demo row
    //     because a real rep's row already claimed 'Q3 2026' — a different
    //     bug, same root cause. Fixing the identity is a prerequisite either
    //     way, and once fixed `upsert` is both safe and strictly more useful.
    //
    //   • A synthetic, seeder-only key — this one.
    //
    // `readonly` is the load-bearing part, not decoration: seed writes run
    // `{ isSystem: true }` and bypass readonly stripping, while readonly
    // stripping does guard user/API writes — so a genuine forecast row can
    // never acquire a `seed_key` and can never be matched by a re-seed. That
    // is what makes the fix structural rather than a naming convention.
    // `hidden` keeps a fixtures-only column out of forms and pickers, so no
    // one is ever prompted to fill it in.
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

  // Dead object-level enable.* flags removed in @objectstack 12 (ADR-0049);
  // only the live API surface remains. History → Field.trackHistory (ADR-0052).
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
      // operator as the `end_after_start` twins on campaign/contract, which
      // this rule used to diverge from in both operator and wording
      // ("on or after") — #514 item 12.
      condition: P`has(record.period_end) && record.period_end != null && has(record.period_start) && record.period_start != null && record.period_end <= record.period_start`,
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
