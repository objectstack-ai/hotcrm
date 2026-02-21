import type { ChartConfig } from '@objectstack/spec/ui';
import { ChartConfigSchema } from '@objectstack/spec/ui';

/**
 * Resolution Time Histogram Chart
 * Distribution of cases grouped by resolution time buckets
 */
export const ResolutionTimeHistogramChart = {
  type: 'bar' as const,
  title: 'Resolution Time Distribution',
  subtitle: 'Cases grouped by resolution time buckets',
  description: 'Bar chart showing the distribution of cases by resolution time with SLA compliance',
  xAxis: { field: 'resolution_bucket', title: 'Resolution Time', showGridLines: false, logarithmic: false },
  yAxis: [{ field: 'case_count', title: 'Number of Cases', showGridLines: true, logarithmic: false }],
  series: [
    { name: 'within_sla', label: 'Within SLA', color: '#22C55E', yAxis: 'left' as const },
    { name: 'near_breach', label: 'Near Breach', color: '#EAB308', yAxis: 'left' as const },
    { name: 'breached', label: 'Breached', color: '#EF4444', yAxis: 'left' as const }
  ],
  height: 350,
  showLegend: true,
  showDataLabels: false
} satisfies ChartConfig;

ChartConfigSchema.parse(ResolutionTimeHistogramChart);

export default ResolutionTimeHistogramChart;
