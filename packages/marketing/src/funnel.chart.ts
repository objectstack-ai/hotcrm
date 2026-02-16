import type { ChartConfig } from '@objectstack/spec/ui';
import { ChartConfigSchema } from '@objectstack/spec/ui';

/**
 * Marketing Funnel Chart
 * Visualizes lead progression through marketing funnel stages
 */
export const FunnelChart = {
  type: 'funnel' as const,
  title: 'Marketing Funnel',
  subtitle: 'Awareness to Conversion progression',
  description: 'Funnel chart visualizing marketing funnel stages from awareness through interest, consideration, and conversion',
  xAxis: { field: 'stage', title: 'Funnel Stage', showGridLines: false, logarithmic: false },
  yAxis: [{ field: 'member_count', title: 'Number of Leads', showGridLines: false, logarithmic: false }],
  colors: ['#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#22C55E'],
  height: 400,
  showLegend: true,
  showDataLabels: true
} satisfies ChartConfig;

ChartConfigSchema.parse(FunnelChart);

export default FunnelChart;
