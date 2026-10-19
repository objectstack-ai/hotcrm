// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Dashboard } from '@objectstack/spec/ui';

type Widget = Dashboard['widgets'][number];
type WidgetLayout = Widget['layout'];

/**
 * Widgets shared verbatim across dashboards.
 *
 * The pipeline-by-stage chart appeared word-for-word in the CRM, Sales and
 * Executive dashboards, and the avg-deal-size KPI in CRM and Sales — three
 * copies of "what counts as open pipeline" that could (and did) drift
 * independently. Each factory owns the semantic definition once; callers
 * position it with `layout` and may narrow presentation-only details via
 * `overrides`.
 */

/**
 * Open-pipeline value by sales stage, one bar per stage — identical semantics
 * everywhere.
 *
 * A bar chart, not a funnel (#2073 item 2). A funnel draws each stage as wide as
 * its value in a fixed top-to-bottom order, so it reads as a funnel only when
 * the values shrink stage by stage. Open amount by stage does not: on the
 * shipped seed it is 139,500 / 174,000 / 173,000 / 237,000 / 1,294,000 from
 * Prospecting to Negotiation, and the funnel pinched and then flared into a
 * diamond. A count-based funnel is no fix either: each open deal sits in
 * exactly one stage, so per-stage counts rise and fall too, and the cumulative
 * "reached this stage or later" count that would shrink by construction is not
 * something a dataset group-by can answer (a dimensionless multi-measure funnel
 * is refused by the spec). Bars show the amounts for what they are.
 *
 * `horizontal-bar`, not `bar`: the stages then run top to bottom, as the funnel
 * did, and the category axis sizes itself to the longest stage name. A vertical
 * `bar` rotates its axis labels and the console caps a rotated label at 12
 * characters, so it drew "Qualificati…" and "Needs Analy…" (measured on
 * 18.0.0-next.3, a 6-column tile at 1440 px).
 *
 * No `options.sortBy`, on purpose: without one the console draws a select
 * dimension's bars in the field's declared option order, which is
 * `crm_opportunity.stage`'s sales order (measured on 18.0.0-next.3: Prospecting,
 * Qualification, Needs Analysis, Proposal, Negotiation, top to bottom, although
 * the dataset answers alphabetically). A `sortBy: 'stage'` would sort by label.
 *
 * No `chartConfig`: a dataset-bound widget is painted with the console's own
 * theme tokens, so the palette this factory used to declare never applied.
 * Verified in the browser against 16.1.0 — every fill in the then-funnel was
 * `hsl(var(--chart-1))` … `hsl(var(--chart-5))`, and none of the five hex colors
 * (`#0EA5E9` … `#22C55E`) reached the DOM. Keeping the block would leave
 * decoration that reads as if it were in effect (#500).
 *
 * No `colorVariant` either, on the same evidence: the executive dashboard's KPI
 * tiles declare four different variants (`success`, `blue`, `purple`, `orange`)
 * and render with byte-identical background, border and value colours.
 */
export const pipelineByStageWidget = (layout: WidgetLayout): Widget => ({
  id: 'pipeline_by_stage',
  title: 'Pipeline by Stage',
  description: 'Open opportunity value at each sales stage',
  type: 'horizontal-bar',
  filter: { stage: { $nin: ['closed_won', 'closed_lost'] } },
  dataset: 'opportunity_metrics', dimensions: ['stage'], values: ['total_amount'],
  layout,
  suppressWarnings: ['chart-config-missing'], // intentional default rendering
});

/**
 * Avg-deal-size KPI over closed-won deals. The measure is fixed; the time
 * scoping legitimately differs per dashboard (CRM follows the dashboard date
 * picker, Sales pins itself to QTD), so callers pass it in.
 *
 * No drill-through: `/reports/avg-deal-size` matched no registered report, and
 * no report covers average deal size, so the button was dead on every dashboard
 * that used this factory (#527). Re-add one here when such a report ships —
 * sharing the widget means sharing the fix.
 */
export const avgDealSizeMetricWidget = (
  layout: WidgetLayout,
  overrides: Partial<Widget> = {},
): Widget => ({
  id: 'avg_deal_size',
  title: 'Avg Deal Size',
  description: 'Average value of closed-won deals',
  type: 'metric',
  filter: { stage: 'closed_won' },
  colorVariant: 'orange',
  dataset: 'opportunity_metrics', values: ['avg_amount'],
  layout,
  ...overrides,
});
