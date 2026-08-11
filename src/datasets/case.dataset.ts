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
  ],
});
