import type { Report } from '@objectstack/spec/ui';
import { ReportSchema } from '@objectstack/spec/ui';

/**
 * Engagement Metrics Report
 * Community engagement analysis by category with topic counts, replies, and views
 */
export const EngagementMetricsReport = {
  name: 'engagement_metrics_report',
  label: 'Engagement Metrics Report',
  description: 'Community engagement analysis by category with topic counts, replies, and view metrics',
  objectName: 'topic',
  type: 'summary' as const,
  columns: [
    { field: 'category', label: 'Category' },
    { field: 'topic_id', label: 'Topics', aggregate: 'count' as const },
    { field: 'reply_count', label: 'Total Replies', aggregate: 'sum' as const },
    { field: 'view_count', label: 'Total Views', aggregate: 'sum' as const }
  ],
  groupingsDown: [
    { field: 'category', sortOrder: 'asc' as const }
  ],
  chart: {
    type: 'stacked-bar' as const,
    title: 'Community Engagement by Category',
    xAxis: 'category',
    yAxis: 'view_count',
    groupBy: 'engagement_level',
    showLegend: true,
    showDataLabels: false
  }
} satisfies Report;

ReportSchema.parse(EngagementMetricsReport);

export default EngagementMetricsReport;
