import type { ChartConfig } from '@objectstack/spec/ui';
import { ChartConfigSchema } from '@objectstack/spec/ui';

/**
 * Risk Distribution Chart
 * Pie chart showing client account distribution by risk profile.
 */
export const RiskDistributionChart = {
  type: 'pie' as const,
  title: 'Client Risk Profile Distribution',
  subtitle: 'Account distribution by risk tolerance',
  description: 'Pie chart visualizing the distribution of client accounts across risk profile categories',
  xAxis: { field: 'risk_profile', title: 'Risk Profile', showGridLines: false, logarithmic: false },
  yAxis: [{ field: 'account_count', title: 'Number of Accounts', showGridLines: false, logarithmic: false }],
  colors: ['#22C55E', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'],
  height: 350,
  showLegend: true,
  showDataLabels: true
} satisfies ChartConfig;

ChartConfigSchema.parse(RiskDistributionChart);

export default RiskDistributionChart;
