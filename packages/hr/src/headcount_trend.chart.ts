import type { ChartConfig } from '@objectstack/spec/ui';
import { ChartConfigSchema } from '@objectstack/spec/ui';

/**
 * Headcount Trend Chart
 * Monthly headcount by department over time
 */
export const HeadcountTrendChart = {
  type: 'line' as const,
  title: 'Headcount Trend',
  subtitle: 'Monthly headcount by department',
  description: 'Line chart showing monthly headcount trends across departments',
  xAxis: { field: 'month', title: 'Month', showGridLines: false, logarithmic: false },
  yAxis: [{ field: 'headcount', title: 'Headcount', showGridLines: true, logarithmic: false }],
  series: [
    { name: 'engineering', label: 'Engineering', color: '#3B82F6', yAxis: 'left' as const },
    { name: 'sales', label: 'Sales', color: '#22C55E', yAxis: 'left' as const },
    { name: 'marketing', label: 'Marketing', color: '#8B5CF6', yAxis: 'left' as const },
    { name: 'operations', label: 'Operations', color: '#F97316', yAxis: 'left' as const }
  ],
  height: 350,
  showLegend: true,
  showDataLabels: false
} satisfies ChartConfig;

ChartConfigSchema.parse(HeadcountTrendChart);

export default HeadcountTrendChart;
