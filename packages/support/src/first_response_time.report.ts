import type { Report } from '@objectstack/spec/ui';
import { ReportSchema } from '@objectstack/spec/ui';

/**
 * First Response Time Report
 * Tracks first response times by priority and agent
 */
export const FirstResponseTimeReport = {
  name: 'first_response_time_report',
  label: 'First Response Time Report',
  description: 'Analysis of first response times by priority level and support agent',
  objectName: 'case',
  type: 'summary' as const,
  columns: [
    { field: 'case_number', label: 'Case #' },
    { field: 'subject', label: 'Subject' },
    { field: 'priority', label: 'Priority' },
    { field: 'first_response_minutes', label: 'First Response (min)', aggregate: 'avg' as const },
    { field: 'case_number', label: 'Case Count', aggregate: 'count' as const }
  ],
  groupingsDown: [
    { field: 'priority', sortOrder: 'asc' as const },
    { field: 'owner_name', sortOrder: 'asc' as const }
  ],
  chart: {
    type: 'bar' as const,
    title: 'Average First Response Time by Priority',
    xAxis: 'priority',
    yAxis: 'first_response_minutes',
    showLegend: true,
    showDataLabels: false
  }
} satisfies Report;

ReportSchema.parse(FirstResponseTimeReport);

export default FirstResponseTimeReport;
