import type { ChartConfig } from '@objectstack/spec/ui';
import { ChartConfigSchema } from '@objectstack/spec/ui';

/**
 * Attrition by Department Chart
 * Annual attrition rates by department
 */
export const AttritionByDeptChart = {
  type: 'bar' as const,
  title: 'Attrition by Department',
  subtitle: 'Annual attrition rates by department',
  description: 'Bar chart showing annual attrition rates by department split by voluntary and involuntary',
  xAxis: { field: 'department', title: 'Department', showGridLines: false, logarithmic: false },
  yAxis: [{ field: 'attrition_rate', title: 'Attrition Rate (%)', showGridLines: true, logarithmic: false }],
  series: [
    { name: 'voluntary', label: 'Voluntary', color: '#EAB308', yAxis: 'left' as const },
    { name: 'involuntary', label: 'Involuntary', color: '#EF4444', yAxis: 'left' as const }
  ],
  height: 350,
  showLegend: true,
  showDataLabels: false
} satisfies ChartConfig;

ChartConfigSchema.parse(AttritionByDeptChart);

export default AttritionByDeptChart;
