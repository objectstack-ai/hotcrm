import type { ChartConfig } from '@objectstack/spec/ui';
import { ChartConfigSchema } from '@objectstack/spec/ui';

/**
 * Appointment Trend Chart
 * Monthly appointment volume trend visualization.
 */
export const AppointmentTrendChart = {
  type: 'line' as const,
  title: 'Appointment Volume Trend',
  subtitle: 'Monthly appointment volume over time',
  description: 'Tracks appointment scheduling trends across months to identify seasonal patterns and capacity needs',
  xAxis: { field: 'appointment_date', title: 'Month', showGridLines: true, logarithmic: false },
  yAxis: [{ field: 'appointment_count', title: 'Number of Appointments', showGridLines: true, logarithmic: false }],
  colors: ['#3B82F6', '#22C55E', '#F59E0B', '#EF4444'],
  height: 400,
  showLegend: true,
  showDataLabels: false
} satisfies ChartConfig;

ChartConfigSchema.parse(AppointmentTrendChart);

export default AppointmentTrendChart;
