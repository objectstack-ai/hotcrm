import type { ChartConfig } from '@objectstack/spec/ui';
import { ChartConfigSchema } from '@objectstack/spec/ui';

/**
 * Revenue Trend Chart
 * Monthly revenue trend line chart
 */
export const RevenueTrendChart = {
  type: 'line' as const,
  title: 'Monthly Revenue Trend',
  subtitle: 'Revenue performance over time',
  description: 'Line chart showing monthly revenue trends with period-over-period comparison',
  xAxis: { field: 'month', title: 'Month', showGridLines: false, logarithmic: false },
  yAxis: [{ field: 'revenue', title: 'Revenue ($)', showGridLines: false, logarithmic: false }],
  series: [
    { name: 'closed_won', label: 'Closed Won Revenue', color: '#22C55E', yAxis: 'left' as const },
    { name: 'pipeline', label: 'Pipeline Value', color: '#3B82F6', yAxis: 'left' as const }
  ],
  height: 350,
  showLegend: true,
  showDataLabels: false
} satisfies ChartConfig;

ChartConfigSchema.parse(RevenueTrendChart);

export default RevenueTrendChart;
