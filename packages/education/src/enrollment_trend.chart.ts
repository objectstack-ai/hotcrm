import type { ChartConfig } from '@objectstack/spec/ui';
import { ChartConfigSchema } from '@objectstack/spec/ui';

/**
 * Enrollment Trend Chart
 * Monthly enrollment volume trend visualization.
 */
export const EnrollmentTrendChart = {
  type: 'line' as const,
  title: 'Enrollment Trend',
  subtitle: 'Enrollment volume by term over time',
  description: 'Tracks enrollment trends across academic terms to identify growth patterns and capacity planning needs',
  xAxis: { field: 'term', title: 'Academic Term', showGridLines: true, logarithmic: false },
  yAxis: [{ field: 'enrollment_count', title: 'Number of Enrollments', showGridLines: true, logarithmic: false }],
  colors: ['#3B82F6', '#22C55E', '#F59E0B', '#EF4444'],
  height: 400,
  showLegend: true,
  showDataLabels: false
} satisfies ChartConfig;

ChartConfigSchema.parse(EnrollmentTrendChart);

export default EnrollmentTrendChart;
