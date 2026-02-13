import type { ChartConfig } from '@objectstack/spec/ui';
import { ChartConfigSchema } from '@objectstack/spec/ui';

/**
 * Sales Funnel Chart
 * Lead → Qualified → Proposal → Closed pipeline visualization
 */
export const PipelineFunnelChart = {
  type: 'funnel' as const,
  title: 'Sales Pipeline Funnel',
  subtitle: 'Lead to Close conversion stages',
  description: 'Visualizes the sales pipeline from lead generation through qualification, proposal, and close stages',
  xAxis: { field: 'stage', title: 'Pipeline Stage' },
  yAxis: [{ field: 'deal_count', title: 'Number of Deals' }],
  colors: ['#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#22C55E', '#EF4444'],
  height: 400,
  showDataLabels: true
} satisfies ChartConfig;

ChartConfigSchema.parse(PipelineFunnelChart);

export default PipelineFunnelChart;
