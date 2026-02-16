import type { ChartConfig } from '@objectstack/spec/ui';
import { ChartConfigSchema } from '@objectstack/spec/ui';

/**
 * Graduation Rate Chart
 * Graduation rate comparison by program (bar chart).
 */
export const GraduationRateChart = {
  type: 'bar' as const,
  title: 'Graduation Rate by Program',
  subtitle: 'Percentage of students graduating within expected timeframe',
  description: 'Compares graduation rates across academic programs to identify completion trends and areas needing support',
  xAxis: { field: 'program', title: 'Program', showGridLines: false, logarithmic: false },
  yAxis: [{ field: 'graduation_rate', title: 'Graduation Rate (%)', showGridLines: true, logarithmic: false }],
  colors: ['#6366F1', '#14B8A6', '#F97316', '#EC4899'],
  height: 400,
  showLegend: true,
  showDataLabels: true
} satisfies ChartConfig;

ChartConfigSchema.parse(GraduationRateChart);

export default GraduationRateChart;
