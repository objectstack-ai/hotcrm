import type { Report } from '@objectstack/spec/ui';
import { ReportSchema } from '@objectstack/spec/ui';

/**
 * Enrollment by Program Report
 * Enrollment counts grouped by program and term.
 */
export const EnrollmentByProgramReport = {
  name: 'enrollment_by_program_report',
  label: 'Enrollment by Program Report',
  description: 'Enrollment distribution analysis by program and academic term',
  objectName: 'enrollment',
  type: 'summary' as const,
  columns: [
    { field: 'student_id', label: 'Student' },
    { field: 'course_id', label: 'Course' },
    { field: 'term', label: 'Term' },
    { field: 'status', label: 'Status' },
    { field: 'credits', label: 'Credits', aggregate: 'sum' as const }
  ],
  groupingsDown: [
    { field: 'term', sortOrder: 'desc' as const },
    { field: 'status', sortOrder: 'asc' as const }
  ],
  chart: {
    type: 'bar' as const,
    title: 'Enrollment by Term',
    xAxis: 'term',
    yAxis: 'credits',
    showLegend: true,
    showDataLabels: true
  }
} satisfies Report;

ReportSchema.parse(EnrollmentByProgramReport);

export default EnrollmentByProgramReport;
