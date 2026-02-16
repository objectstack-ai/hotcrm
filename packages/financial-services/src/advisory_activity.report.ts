import type { Report } from '@objectstack/spec/ui';
import { ReportSchema } from '@objectstack/spec/ui';

/**
 * Advisory Activity Report
 * Advisory meeting activity analysis by advisor, meeting type, and client engagement.
 */
export const AdvisoryActivityReport = {
  name: 'advisory_activity_report',
  label: 'Advisory Activity Report',
  description: 'Advisory meeting activity tracking with advisor productivity and client engagement metrics',
  objectName: 'advisory',
  type: 'matrix' as const,
  columns: [
    { field: 'advisor_id', label: 'Advisor' },
    { field: 'meeting_type', label: 'Meeting Type' },
    { field: 'wealth_account', label: 'Client Account' },
    { field: 'meeting_date', label: 'Meeting Date' },
    { field: 'status', label: 'Status' },
    { field: 'duration', label: 'Duration (min)', aggregate: 'sum' as const }
  ],
  groupingsDown: [
    { field: 'advisor_id', sortOrder: 'asc' as const }
  ],
  groupingsAcross: [
    { field: 'meeting_date', sortOrder: 'asc' as const, dateGranularity: 'month' as const }
  ],
  chart: {
    type: 'stacked-bar' as const,
    title: 'Advisory Meetings by Advisor per Month',
    xAxis: 'meeting_date',
    yAxis: 'duration',
    showLegend: true,
    showDataLabels: false
  }
} satisfies Report;

ReportSchema.parse(AdvisoryActivityReport);

export default AdvisoryActivityReport;
