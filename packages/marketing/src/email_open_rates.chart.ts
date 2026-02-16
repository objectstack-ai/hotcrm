import type { ChartConfig } from '@objectstack/spec/ui';
import { ChartConfigSchema } from '@objectstack/spec/ui';

/**
 * Email Open Rates Chart
 * Line chart tracking email open rates over time
 */
export const EmailOpenRatesChart = {
  type: 'line' as const,
  title: 'Email Open Rates',
  subtitle: 'Open rate trends over time',
  description: 'Line chart tracking email open rates across campaigns over time with industry benchmark comparison',
  xAxis: { field: 'send_date', title: 'Send Date', showGridLines: false, logarithmic: false },
  yAxis: [{ field: 'open_rate', title: 'Open Rate (%)', showGridLines: false, logarithmic: false }],
  series: [
    { name: 'open_rate', label: 'Open Rate', color: '#3B82F6', yAxis: 'left' as const },
    { name: 'benchmark', label: 'Industry Benchmark', color: '#9CA3AF', yAxis: 'left' as const }
  ],
  colors: ['#3B82F6', '#9CA3AF'],
  height: 350,
  showLegend: true,
  showDataLabels: false
} satisfies ChartConfig;

ChartConfigSchema.parse(EmailOpenRatesChart);

export default EmailOpenRatesChart;
