import type { Report } from '@objectstack/spec/ui';
import { ReportSchema } from '@objectstack/spec/ui';

/**
 * Retention Rate Report
 * Student retention and persistence rates across terms.
 */
export const RetentionRateReport = {
  name: 'retention_rate_report',
  label: 'Retention Rate Report',
  description: 'Student retention analysis tracking enrollment continuity across academic terms',
  objectName: 'student',
  type: 'summary' as const,
  columns: [
    { field: 'name', label: 'Student' },
    { field: 'program', label: 'Program' },
    { field: 'year', label: 'Year' },
    { field: 'enrollment_status', label: 'Enrollment Status' },
    { field: 'gpa', label: 'GPA', aggregate: 'avg' as const }
  ],
  groupingsDown: [
    { field: 'enrollment_status', sortOrder: 'asc' as const },
    { field: 'program', sortOrder: 'asc' as const }
  ],
  chart: {
    type: 'bar' as const,
    title: 'Students by Enrollment Status',
    xAxis: 'enrollment_status',
    yAxis: 'name',
    showLegend: true,
    showDataLabels: true
  }
} satisfies Report;

ReportSchema.parse(RetentionRateReport);

export default RetentionRateReport;
