import type { ChartConfig } from '@objectstack/spec/ui';
import { ChartConfigSchema } from '@objectstack/spec/ui';

/**
 * Cash Flow Waterfall Chart
 * Visualizes cash inflows and outflows
 */
export const CashFlowChart = {
  type: 'waterfall' as const,
  title: 'Cash Flow Waterfall',
  subtitle: 'Cash inflows and outflows by category',
  description: 'Waterfall chart showing cash flow breakdown by revenue, expenses, and net position',
  xAxis: { field: 'category', title: 'Category', showGridLines: false, logarithmic: false },
  yAxis: [{ field: 'amount', title: 'Amount ($)', showGridLines: false, logarithmic: false }],
  colors: ['#22C55E', '#EF4444', '#3B82F6'],
  height: 400,
  showDataLabels: true,
  showLegend: true
} satisfies ChartConfig;

ChartConfigSchema.parse(CashFlowChart);

export default CashFlowChart;
