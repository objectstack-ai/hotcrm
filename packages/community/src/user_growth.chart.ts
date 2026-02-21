import type { ChartConfig } from '@objectstack/spec/ui';
import { ChartConfigSchema } from '@objectstack/spec/ui';

/**
 * Community User Growth Chart
 * Monthly active users and new registrations
 */
export const UserGrowthChart = {
  type: 'line' as const,
  title: 'Community User Growth',
  subtitle: 'Monthly active users and new registrations',
  description: 'Line chart showing monthly active users, new registrations, and churned users',
  xAxis: { field: 'month', title: 'Month', showGridLines: false, logarithmic: false },
  yAxis: [{ field: 'users', title: 'Users', showGridLines: true, logarithmic: false }],
  series: [
    { name: 'active_users', label: 'Active Users', color: '#3B82F6', yAxis: 'left' as const },
    { name: 'new_registrations', label: 'New Registrations', color: '#22C55E', yAxis: 'left' as const },
    { name: 'churned', label: 'Churned', color: '#EF4444', yAxis: 'left' as const }
  ],
  height: 350,
  showLegend: true,
  showDataLabels: false
} satisfies ChartConfig;

ChartConfigSchema.parse(UserGrowthChart);

export default UserGrowthChart;
