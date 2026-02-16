import type { Report } from '@objectstack/spec/ui';
import { ReportSchema } from '@objectstack/spec/ui';

/**
 * GPA Distribution Report
 * Student GPA distribution across programs and academic years.
 */
export const GPADistributionReport = {
  name: 'gpa_distribution_report',
  label: 'GPA Distribution Report',
  description: 'Analysis of student GPA distribution by program, major, and academic year',
  objectName: 'student',
  type: 'summary' as const,
  columns: [
    { field: 'name', label: 'Student' },
    { field: 'program', label: 'Program' },
    { field: 'major', label: 'Major' },
    { field: 'year', label: 'Year' },
    { field: 'gpa', label: 'GPA', aggregate: 'avg' as const },
    { field: 'enrollment_status', label: 'Status' }
  ],
  groupingsDown: [
    { field: 'program', sortOrder: 'asc' as const },
    { field: 'year', sortOrder: 'asc' as const }
  ],
  chart: {
    type: 'bar' as const,
    title: 'Average GPA by Program',
    xAxis: 'program',
    yAxis: 'gpa',
    showLegend: true,
    showDataLabels: true
  }
} satisfies Report;

ReportSchema.parse(GPADistributionReport);

export default GPADistributionReport;
