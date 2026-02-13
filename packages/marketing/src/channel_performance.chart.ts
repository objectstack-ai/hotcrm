import type { ChartConfig } from '@objectstack/spec/ui';
import { ChartConfigSchema } from '@objectstack/spec/ui';

/**
 * Marketing Channel Performance Chart
 * Performance comparison across marketing channels
 */
export const ChannelPerformanceChart = {
  type: 'bar' as const,
  title: 'Channel Performance',
  subtitle: 'Lead generation and conversion by channel',
  description: 'Bar chart comparing marketing channel effectiveness by leads generated and conversion rate',
  xAxis: { field: 'channel', title: 'Marketing Channel' },
  yAxis: [{ field: 'leads_generated', title: 'Leads Generated' }],
  series: [
    { name: 'leads', label: 'Leads Generated', color: '#3B82F6' },
    { name: 'conversions', label: 'Conversions', color: '#22C55E' }
  ],
  colors: ['#3B82F6', '#22C55E', '#8B5CF6', '#F97316'],
  height: 350,
  showLegend: true
} satisfies ChartConfig;

ChartConfigSchema.parse(ChannelPerformanceChart);

export default ChannelPerformanceChart;
