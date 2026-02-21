import type { ChartConfig } from '@objectstack/spec/ui';
import { ChartConfigSchema } from '@objectstack/spec/ui';

/**
 * Sync Volume Trend Chart
 * Daily sync operations over time showing successful, failed, and pending counts
 */
export const SyncVolumeChart = {
  type: 'line' as const,
  title: 'Sync Volume Trend',
  subtitle: 'Daily sync operations over time',
  description: 'Line chart showing daily sync operation volume broken down by status',
  xAxis: { field: 'date', title: 'Date', showGridLines: false, logarithmic: false },
  yAxis: [{ field: 'sync_count', title: 'Sync Operations', showGridLines: true, logarithmic: false }],
  series: [
    { name: 'successful', label: 'Successful', color: '#22C55E', yAxis: 'left' as const },
    { name: 'failed', label: 'Failed', color: '#EF4444', yAxis: 'left' as const },
    { name: 'pending', label: 'Pending', color: '#EAB308', yAxis: 'left' as const }
  ],
  height: 350,
  showLegend: true,
  showDataLabels: false
} satisfies ChartConfig;

ChartConfigSchema.parse(SyncVolumeChart);

export default SyncVolumeChart;
