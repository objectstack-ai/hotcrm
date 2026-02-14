import type { Report } from '@objectstack/spec/ui';
import { ReportSchema } from '@objectstack/spec/ui';

/**
 * Case Volume Report
 * Case volume by priority, category, and SLA compliance
 */
export const CaseVolumeReport = {
  name: 'case_volume_report',
  label: 'Case Volume Report',
  description: 'Case volume analysis by priority, category, and SLA compliance metrics',
  objectName: 'case',
  type: 'summary' as const,
  columns: [
    { field: 'case_number', label: 'Case #' },
    { field: 'subject', label: 'Subject' },
    { field: 'priority', label: 'Priority' },
    { field: 'status', label: 'Status' },
    { field: 'category', label: 'Category' },
    { field: 'case_number', label: 'Case Count', aggregate: 'count' as const }
  ],
  groupingsDown: [
    { field: 'priority', sortOrder: 'asc' as const },
    { field: 'category', sortOrder: 'asc' as const }
  ],
  chart: {
    type: 'stacked-bar' as const,
    title: 'Case Volume by Priority and Category',
    xAxis: 'category',
    yAxis: 'case_number',
    groupBy: 'priority',
    showLegend: true,
    showDataLabels: false
  }
} satisfies Report;

ReportSchema.parse(CaseVolumeReport);

export default CaseVolumeReport;
