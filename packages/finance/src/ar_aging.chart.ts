import type { ChartConfig } from '@objectstack/spec/ui';
import { ChartConfigSchema } from '@objectstack/spec/ui';

/**
 * AR Aging Chart
 * Bar chart showing outstanding receivables by aging bucket
 */
export const ArAgingChart = {
  type: 'bar' as const,
  title: 'AR Aging by Bucket',
  subtitle: 'Outstanding receivables by aging period',
  description: 'Bar chart showing accounts receivable balances grouped by aging buckets (current, 30, 60, 90+ days)',
  xAxis: { field: 'aging_bucket', title: 'Aging Bucket', showGridLines: false, logarithmic: false },
  yAxis: [{ field: 'balance_due', title: 'Balance Due ($)', showGridLines: false, logarithmic: false }],
  series: [
    { name: 'current', label: 'Current', color: '#22C55E', yAxis: 'left' as const },
    { name: 'past_due_30', label: '31-60 Days', color: '#F97316', yAxis: 'left' as const },
    { name: 'past_due_60', label: '61-90 Days', color: '#EAB308', yAxis: 'left' as const },
    { name: 'past_due_90', label: '90+ Days', color: '#EF4444', yAxis: 'left' as const }
  ],
  colors: ['#22C55E', '#F97316', '#EAB308', '#EF4444'],
  height: 350,
  showDataLabels: true,
  showLegend: true
} satisfies ChartConfig;

ChartConfigSchema.parse(ArAgingChart);

export default ArAgingChart;
