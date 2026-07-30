// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Dashboard } from '@objectstack/spec/ui';

type Widget = Dashboard['widgets'][number];
type WidgetLayout = Widget['layout'];

/**
 * Widgets shared verbatim across dashboards.
 *
 * The pipeline funnel appeared word-for-word in the CRM, Sales and Executive
 * dashboards, and the avg-deal-size KPI in CRM and Sales — three copies of
 * "what counts as open pipeline" that could (and did) drift independently.
 * Each factory owns the semantic definition once; callers position it with
 * `layout` and may narrow presentation-only details via `overrides`.
 */

/**
 * Open-pipeline funnel by sales stage — identical semantics everywhere.
 *
 * No `chartConfig`: a dataset-bound widget is painted with the console's own
 * theme tokens, so the palette this factory used to declare never applied.
 * Verified in the browser against 16.1.0 — every fill in the rendered funnel is
 * `hsl(var(--chart-1))` … `hsl(var(--chart-5))`, and none of the five hex colors
 * (`#0EA5E9` … `#22C55E`) reaches the DOM. Keeping the block would leave
 * decoration that reads as if it were in effect (#500).
 *
 * `colorVariant` is deliberately KEPT: unlike the palette, it has not been shown
 * to be inert (it appears throughout the console bundle), so it is not lumped in
 * with a verified-dead property. See #500 for that separate question.
 */
export const pipelineByStageFunnelWidget = (layout: WidgetLayout): Widget => ({
  id: 'pipeline_by_stage',
  title: 'Pipeline by Stage',
  description: 'Open opportunity value at each sales stage',
  type: 'funnel',
  filter: { stage: { $nin: ['closed_won', 'closed_lost'] } },
  colorVariant: 'teal',
  dataset: 'opportunity_metrics', dimensions: ['stage'], values: ['total_amount'],
  layout,
  suppressWarnings: ['chart-config-missing'], // intentional default rendering
});

/**
 * Avg-deal-size KPI over closed-won deals. The measure and drill-through are
 * fixed; the time scoping legitimately differs per dashboard (CRM follows the
 * dashboard date picker, Sales pins itself to QTD), so callers pass it in.
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
  actionUrl: '/reports/avg-deal-size',
  actionType: 'url',
  actionIcon: 'ArrowUpRight',
  dataset: 'opportunity_metrics', values: ['avg_amount'],
  layout,
  options: { icon: 'bar-chart' },
  ...overrides,
});
