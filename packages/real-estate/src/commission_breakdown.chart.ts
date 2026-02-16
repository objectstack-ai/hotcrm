import type { ChartConfig } from '@objectstack/spec/ui';
import { ChartConfigSchema } from '@objectstack/spec/ui';

/**
 * Commission Breakdown Chart
 * Pie chart showing commission distribution by split type and agent.
 */
export const CommissionBreakdownChart = {
  type: 'pie' as const,
  title: 'Commission Breakdown',
  subtitle: 'Commission distribution by split type',
  description: 'Pie chart showing commission breakdown across full, co-listing, and referral splits',
  xAxis: { field: 'split_type', title: 'Split Type', showGridLines: false, logarithmic: false },
  yAxis: [{ field: 'commission_amount', title: 'Commission Amount ($)', showGridLines: false, logarithmic: false }],
  colors: ['#3B82F6', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6'],
  height: 400,
  showLegend: true,
  showDataLabels: true
} satisfies ChartConfig;

ChartConfigSchema.parse(CommissionBreakdownChart);

export default CommissionBreakdownChart;
