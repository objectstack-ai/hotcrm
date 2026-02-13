import type { Report } from '@objectstack/spec/ui';
import { ReportSchema } from '@objectstack/spec/ui';

/**
 * Headcount Analytics Report
 * Headcount by department, location, and tenure
 */
export const HeadcountReport = {
  name: 'headcount_report',
  label: 'Headcount Analytics Report',
  description: 'Headcount analytics by department, location, and tenure distribution',
  objectName: 'employee',
  type: 'summary' as const,
  columns: [
    { field: 'department', label: 'Department' },
    { field: 'location', label: 'Location' },
    { field: 'employee_id', label: 'Headcount', aggregate: 'count' as const },
    { field: 'salary', label: 'Avg Salary', aggregate: 'avg' as const },
    { field: 'hire_date', label: 'Hire Date' }
  ],
  groupingsDown: [
    { field: 'department', sortOrder: 'asc' as const }
  ],
  filter: {
    conditions: [{ field: 'status', operator: '=', value: 'active' }]
  },
  chart: {
    type: 'bar' as const,
    title: 'Headcount by Department',
    xAxis: 'department',
    yAxis: 'employee_id'
  }
} satisfies Report;

ReportSchema.parse(HeadcountReport);

export default HeadcountReport;
