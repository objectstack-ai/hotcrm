import type { ChartConfig } from '@objectstack/spec/ui';
import { ChartConfigSchema } from '@objectstack/spec/ui';

/**
 * AUM Trend Chart
 * Line chart showing Assets Under Management trend over time.
 */
export const AumTrendChart = {
  type: 'line' as const,
  title: 'Assets Under Management Trend',
  subtitle: 'Total AUM performance over time',
  description: 'Line chart tracking total assets under management with period-over-period growth analysis',
  xAxis: { field: 'month', title: 'Month', showGridLines: false, logarithmic: false },
  yAxis: [{ field: 'total_aum', title: 'AUM ($)', showGridLines: true, logarithmic: false }],
  series: [
    { name: 'total_aum', label: 'Total AUM', color: '#3B82F6', yAxis: 'left' as const },
    { name: 'net_inflows', label: 'Net Inflows', color: '#22C55E', yAxis: 'left' as const }
  ],
  height: 400,
  showLegend: true,
  showDataLabels: false
} satisfies ChartConfig;

ChartConfigSchema.parse(AumTrendChart);

export default AumTrendChart;
