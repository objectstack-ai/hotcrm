// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { ObjectSchema, Field } from '@objectstack/spec/data';
import { F, P, cel } from '@objectstack/spec';

/**
 * Forecast Object
 *
 * Monthly / quarterly snapshot of pipeline by owner. Each record holds
 * the aggregated amounts at the moment of snapshot, so trend reports
 * ("how did our Q3 forecast change week over week?") can be built
 * without re-aggregating opportunity history.
 *
 * Written by:
 *   • `forecast.hook.ts` scheduled job (default: nightly)
 *   • `revenue_forecasting` AI skill on demand
 *
 * Forecast categories follow the standard Salesforce model:
 *   pipeline  → all open opps
 *   best_case → high-confidence opps (>= 60%)
 *   commit    → owner-committed opps (>= 80%)
 *   closed    → already-won amount
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
  highlightFields: ['owner', 'period', 'period_start', 'commit_amount', 'closed_amount'],

  fieldGroups: [
    { key: 'basic',   label: 'Snapshot',    icon: 'info' },
    { key: 'amounts', label: 'Amounts',     icon: 'dollar-sign' },
    { key: 'meta',    label: 'Source',      icon: 'database', defaultExpanded: false },
  ],

  fields: {
    owner: Field.lookup('sys_user', {
      defaultValue: cel`os.user.id`,
      label: 'Owner',
      // Optional so seed inserts (which run before any human user exists and
      // bypass field defaults) succeed; ownership is backfilled to the active
      // user at runtime, matching every other CRM object's owner field.
      group: 'basic',
      trackHistory: true,
    }),

    period: Field.select({
      label: 'Period',
      required: true,
      group: 'basic',
      options: [
        { label: 'Month',   value: 'month', default: true },
        { label: 'Quarter', value: 'quarter' },
      ],
    }),

    period_start: Field.date({
      label: 'Period Start',
      required: true,
      group: 'basic',
    }),

    period_end: Field.date({
      label: 'Period End',
      required: true,
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
      description: 'Sum of all open opportunities (any stage).',
      scale: 2,
      min: 0,
      group: 'amounts',
    }),

    best_case_amount: Field.currency({
      label: 'Best Case',
      description: 'Open opportunities with probability >= 60%.',
      scale: 2,
      min: 0,
      group: 'amounts',
    }),

    commit_amount: Field.currency({
      label: 'Commit',
      description: 'Open opportunities with probability >= 80% (owner-committed).',
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
  },

  indexes: [
    { fields: ['owner', 'period_start', 'period'] },
    { fields: ['snapshot_date'] },
    { fields: ['period_start'] },
  ],

  // Dead object-level enable.* flags removed in @objectstack 12 (ADR-0049);
  // only the live API surface remains. History → Field.trackHistory (ADR-0052).
  enable: {
    apiEnabled: true,
    apiMethods: ['get', 'list', 'create', 'update', 'delete', 'search', 'export'],
  },

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
      condition: P`record.period_end != null && record.period_start != null && record.period_end <= record.period_start`,
    },
    {
      name: 'snapshot_amounts_non_negative',
      type: 'script',
      severity: 'error',
      message: 'Snapshot amounts cannot be negative.',
      condition: P`(record.pipeline_amount != null && record.pipeline_amount < 0) || (record.best_case_amount != null && record.best_case_amount < 0) || (record.commit_amount != null && record.commit_amount < 0) || (record.closed_amount != null && record.closed_amount < 0)`,
    },
  ],
});
