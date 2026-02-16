import type { Report } from '@objectstack/spec/ui';
import { ReportSchema } from '@objectstack/spec/ui';

/**
 * Funnel Analysis Report
 * Marketing funnel conversion analysis from awareness to conversion
 */
export const FunnelAnalysisReport = {
  name: 'funnel_analysis_report',
  label: 'Funnel Analysis Report',
  description: 'Marketing funnel analysis showing conversion rates between stages from awareness through interest, consideration, and conversion',
  objectName: 'campaign_member',
  type: 'summary' as const,
  columns: [
    { field: 'campaign_id', label: 'Campaign' },
    { field: 'stage', label: 'Funnel Stage' },
    { field: 'member_count', label: 'Members', aggregate: 'sum' as const },
    { field: 'conversion_rate', label: 'Conversion Rate', aggregate: 'avg' as const },
    { field: 'avg_days_in_stage', label: 'Avg Days in Stage', aggregate: 'avg' as const }
  ],
  groupingsDown: [
    { field: 'stage', sortOrder: 'asc' as const }
  ],
  chart: {
    type: 'funnel' as const,
    title: 'Marketing Funnel Conversion',
    xAxis: 'stage',
    yAxis: 'member_count',
    showLegend: true,
    showDataLabels: true
  }
} satisfies Report;

ReportSchema.parse(FunnelAnalysisReport);

export default FunnelAnalysisReport;
