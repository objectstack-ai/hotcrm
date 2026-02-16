import type { ChartConfig } from '@objectstack/spec/ui';
import { ChartConfigSchema } from '@objectstack/spec/ui';

/**
 * Referral Status Chart
 * Distribution of referrals by current status.
 */
export const ReferralStatusChart = {
  type: 'pie' as const,
  title: 'Referral Status Distribution',
  subtitle: 'Current referral breakdown by status',
  description: 'Shows the distribution of referrals across pipeline stages to identify bottlenecks and completion rates',
  xAxis: { field: 'status', title: 'Referral Status', showGridLines: false, logarithmic: false },
  yAxis: [{ field: 'referral_count', title: 'Number of Referrals', showGridLines: false, logarithmic: false }],
  colors: ['#22C55E', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'],
  height: 400,
  showLegend: true,
  showDataLabels: true
} satisfies ChartConfig;

ChartConfigSchema.parse(ReferralStatusChart);

export default ReferralStatusChart;
