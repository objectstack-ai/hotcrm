import type { ChartConfig } from '@objectstack/spec/ui';
import { ChartConfigSchema } from '@objectstack/spec/ui';

/**
 * Employee Attrition Trend Chart
 * Monthly attrition rate trend
 */
export const AttritionTrendChart = {
  type: 'line' as const,
  title: 'Employee Attrition Trend',
  subtitle: 'Monthly attrition rate over time',
  description: 'Line chart tracking employee attrition rate with trend analysis and department breakdown',
  xAxis: { field: 'month', title: 'Month' },
  yAxis: [{ field: 'attrition_rate', title: 'Attrition Rate (%)' }],
  series: [
    { name: 'voluntary', label: 'Voluntary', color: '#F97316' },
    { name: 'involuntary', label: 'Involuntary', color: '#EF4444' }
  ],
  height: 350,
  showLegend: true
} satisfies ChartConfig;

ChartConfigSchema.parse(AttritionTrendChart);

export default AttritionTrendChart;
