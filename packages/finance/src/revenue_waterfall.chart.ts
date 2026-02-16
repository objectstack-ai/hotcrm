import type { ChartConfig } from '@objectstack/spec/ui';
import { ChartConfigSchema } from '@objectstack/spec/ui';

/**
 * Revenue Waterfall Chart
 * Visualizes revenue progression from opening to closing balance
 */
export const RevenueWaterfallChart = {
  type: 'bar' as const,
  title: 'Revenue Waterfall',
  subtitle: 'Revenue build-up from new, expansion, and churn',
  description: 'Bar chart showing waterfall-style revenue progression including new business, expansion, contraction, and churn',
  xAxis: { field: 'category', title: 'Revenue Category', showGridLines: false, logarithmic: false },
  yAxis: [{ field: 'amount', title: 'Amount ($)', showGridLines: false, logarithmic: false }],
  series: [
    { name: 'positive', label: 'Positive', color: '#22C55E', yAxis: 'left' as const },
    { name: 'negative', label: 'Negative', color: '#EF4444', yAxis: 'left' as const }
  ],
  colors: ['#22C55E', '#EF4444', '#3B82F6'],
  height: 400,
  showDataLabels: true,
  showLegend: true
} satisfies ChartConfig;

ChartConfigSchema.parse(RevenueWaterfallChart);

export default RevenueWaterfallChart;
