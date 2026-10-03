// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { defineDataset } from '@objectstack/spec/ui';

/**
 * Case analytics dataset (ADR-0021) — the semantic source of truth for the
 * Service dashboard's case counts, resolution time and SLA compliance.
 */
export const CaseDataset = defineDataset({
  name: 'case_metrics',
  label: 'Case Metrics',
  description: 'Semantic layer for support-case counts, resolution time and SLA',
  object: 'crm_case',

  dimensions: [
    { name: 'status', label: 'Status', field: 'status', type: 'string' },
    { name: 'priority', label: 'Priority', field: 'priority', type: 'string' },
    { name: 'origin', label: 'Origin', field: 'origin', type: 'string' },
    { name: 'type', label: 'Type', field: 'type', type: 'string' },
    { name: 'created_date', label: 'Created', field: 'created_date', type: 'date', dateGranularity: 'day' },
    // Article ranking by resolutions (#601) — group closed cases by the
    // article that resolved them. `type: 'lookup'`, the same spelling the
    // `owner` dimension on `opportunity_metrics` uses for `owner_id`.
    { name: 'resolved_article', label: 'Resolving Article', field: 'resolved_by_article', type: 'lookup' },
  ],

  measures: [
    { name: 'case_count', label: 'Cases', aggregate: 'count' },
    { name: 'avg_resolution', label: 'Avg Resolution (h)', aggregate: 'avg', field: 'resolution_time_hours', format: '0.0' },
    { name: 'avg_sla_violated', label: 'SLA Violation Rate', aggregate: 'avg', field: 'is_sla_violated', format: '0.0%' },

    // ─── Knowledge deflection (#601) ────────────────────────────────────
    //
    // "% of closed cases resolved with an article". Built to the shape
    // `opportunity_metrics.win_rate` arrived at the hard way (#593/#614): the
    // two halves of the ratio are declared HERE as named measures, once, so no
    // widget improvises a denominator — a wrong denominator does not error, it
    // returns a plausible number.
    //
    // Each half carries its OWN `filter`, which the executor runs as a
    // sub-query and merges back on the selected dimensions. A widget-level
    // filter cannot express this: it would narrow BOTH halves to the same row
    // set, which is how you end up dividing a number by itself.
    //
    // `kb_resolved_count` counts the COLUMN, not the rows: `count(<field>)`
    // counts non-NULL values, so it needs no `$ne: null` predicate and no
    // parallel boolean flag to drift out of step with the lookup. MEASURED on
    // 17.0.0-rc.6 against both drivers — the numbers are pinned in
    // `test/knowledge-deflection.test.ts`. The one thing it CANNOT discount is
    // an empty string, which is non-NULL; that is why the blank is normalised
    // to NULL at write time by `case_resolution_article_normalize`, and why
    // that hook is part of this metric rather than a tidy-up beside it.
    //
    // Every widget that shows `kb_deflection_rate` also shows
    // `kb_resolved_count` and `closed_count` beside it, so a reader can check
    // the arithmetic that produced the percentage.
    { name: 'closed_count', label: 'Closed Cases', aggregate: 'count', filter: { is_closed: true } },
    {
      name: 'kb_resolved_count',
      label: 'Resolved by KB',
      aggregate: 'count',
      field: 'resolved_by_article',
      filter: { is_closed: true },
    },
    {
      name: 'kb_deflection_rate',
      label: 'KB Deflection Rate',
      derived: { op: 'ratio', of: ['kb_resolved_count', 'closed_count'] },
      format: '0%',
    },

    // ─── SLA compliance (#1213) ─────────────────────────────────────────
    //
    // The service dashboard's gauge asks "are we meeting SLA?", so the number
    // it plots has to BE compliance. It used to plot `avg_sla_violated` — the
    // complement — and ask the renderer to flip it with `options.invert`. That
    // key is not declared by `DashboardWidgetOptionsSchema`; it rides the
    // schema's `.passthrough()`, so no validator, lint rule or gate could ever
    // tell the author it does nothing — and none did. The gauge read 0.0% on
    // an org with 100% compliance.
    //
    // Spelled as a ratio of two counts rather than `1 - avg_sla_violated`
    // because `DerivedMeasureOp` operands are MEASURE NAMES only (`of:
    // string[]` — "no raw fields, no raw SQL"), so there is no literal `1` to
    // subtract from. `difference` cannot express it either. This is the card's
    // own second option and the spec's sanctioned shape — the one
    // `kb_deflection_rate` above already uses.
    //
    // `is_sla_violated: false`, not `$ne: true`: the field declares
    // `defaultValue: false`, and MEASURED on both drivers this app runs, a
    // closed case inserted without the column stores `false` rather than NULL.
    // So `sla_met_count + violated = closed_count` holds with no NULL hole.
    // Both spellings measured identical (2 of 3, both drivers); the plain one
    // is the one that reads as what it means.
    //
    // The denominator is `closed_count`, already declared above — the same
    // measure the `closed_cases_total` tile shows, so a reader can check the
    // percentage against a number on the same page. An empty numerator group
    // does NOT blank the rate: the executor fills a `count` column's empty
    // group with 0 BEFORE evaluating derived measures, so a fully-breached org
    // reads 0%, not blank. A zero DENOMINATOR (no closed cases at all) does
    // return null — "no data", which is the honest reading.
    { name: 'sla_met_count', label: 'Cases Within SLA', aggregate: 'count', filter: { is_closed: true, is_sla_violated: false } },
    {
      name: 'sla_compliance_rate',
      label: 'SLA Compliance Rate',
      derived: { op: 'ratio', of: ['sla_met_count', 'closed_count'] },
      format: '0%',
    },
  ],
});
