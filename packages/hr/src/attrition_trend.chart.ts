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
  xAxis: { field: 'month', title: 'Month', showGridLines: false, logarithmic: false },
  yAxis: [{ field: 'attrition_rate', title: 'Attrition Rate (%)', showGridLines: false, logarithmic: false }],
  series: [
    { name: 'voluntary', label: 'Voluntary', color: '#F97316', yAxis: 'left' as const },
    { name: 'involuntary', label: 'Involuntary', color: '#EF4444', yAxis: 'left' as const }
  ],
  height: 350,
  showLegend: true,
  showDataLabels: false
} satisfies ChartConfig;

ChartConfigSchema.parse(AttritionTrendChart);

export default AttritionTrendChart;
