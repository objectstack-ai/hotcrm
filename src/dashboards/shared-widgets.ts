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

/** Open-pipeline funnel by sales stage — identical semantics everywhere. */
export const pipelineByStageFunnelWidget = (layout: WidgetLayout): Widget => ({
  id: 'pipeline_by_stage',
  title: 'Pipeline by Stage',
  description: 'Open opportunity value at each sales stage',
  type: 'funnel',
  filter: { stage: { $nin: ['closed_won', 'closed_lost'] } },
  colorVariant: 'teal',
  dataset: 'opportunity_metrics', dimensions: ['stage'], values: ['total_amount'],
  layout,
  chartConfig: {
    type: 'funnel',
    showLegend: false,
    showDataLabels: true,
    colors: ['#0EA5E9', '#06B6D4', '#14B8A6', '#10B981', '#22C55E'],
  },
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
  options: { icon: 'bar-chart' },
  ...overrides,
});
