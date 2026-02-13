import type { ChartConfig } from '@objectstack/spec/ui';
import { ChartConfigSchema } from '@objectstack/spec/ui';

/**
 * Case Resolution Time Distribution Chart
 * Distribution of case resolution times
 */
export const CaseResolutionChart = {
  type: 'bar' as const,
  title: 'Case Resolution Time Distribution',
  subtitle: 'Time to resolve by priority level',
  description: 'Bar chart showing distribution of case resolution times grouped by priority',
  xAxis: { field: 'resolution_bucket', title: 'Resolution Time' },
  yAxis: [{ field: 'case_count', title: 'Number of Cases' }],
  series: [
    { name: 'critical', label: 'Critical', color: '#EF4444' },
    { name: 'high', label: 'High', color: '#F97316' },
    { name: 'medium', label: 'Medium', color: '#EAB308' },
    { name: 'low', label: 'Low', color: '#22C55E' }
  ],
  height: 350,
  showLegend: true
} satisfies ChartConfig;

ChartConfigSchema.parse(CaseResolutionChart);

export default CaseResolutionChart;
