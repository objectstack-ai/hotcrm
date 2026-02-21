import type { ChartConfig } from '@objectstack/spec/ui';
import { ChartConfigSchema } from '@objectstack/spec/ui';

/**
 * Data Volume Growth Chart
 * Tracks record count growth across key objects over time.
 */
export const DataVolumeGrowthChart = {
  type: 'line' as const,
  title: 'Data Volume Growth',
  subtitle: 'Record count growth over time',
  description: 'Line chart showing record count growth across key CRM objects by month',
  xAxis: { field: 'month', title: 'Month', showGridLines: false, logarithmic: false },
  yAxis: [{ field: 'record_count', title: 'Records', showGridLines: true, logarithmic: false }],
  series: [
    { name: 'accounts', label: 'Accounts', color: '#3B82F6', yAxis: 'left' as const },
    { name: 'contacts', label: 'Contacts', color: '#22C55E', yAxis: 'left' as const },
    { name: 'opportunities', label: 'Opportunities', color: '#8B5CF6', yAxis: 'left' as const },
    { name: 'cases', label: 'Cases', color: '#F97316', yAxis: 'left' as const }
  ],
  height: 350,
  showLegend: true,
  showDataLabels: false
} satisfies ChartConfig;

ChartConfigSchema.parse(DataVolumeGrowthChart);

export default DataVolumeGrowthChart;
