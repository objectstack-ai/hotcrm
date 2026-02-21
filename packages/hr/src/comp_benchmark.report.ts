import type { Report } from '@objectstack/spec/ui';
import { ReportSchema } from '@objectstack/spec/ui';

/**
 * Compensation Benchmark Report
 * Compensation analysis by department and job level
 */
export const CompBenchmarkReport = {
  name: 'comp_benchmark',
  label: 'Compensation Benchmark Report',
  description: 'Compensation benchmark analysis by department and job level with salary ranges',
  objectName: 'employee',
  type: 'summary' as const,
  columns: [
    { field: 'job_title', label: 'Job Title' },
    { field: 'base_salary', label: 'Avg Salary', aggregate: 'avg' as const },
    { field: 'base_salary', label: 'Min Salary', aggregate: 'min' as const },
    { field: 'base_salary', label: 'Max Salary', aggregate: 'max' as const },
    { field: 'employee_id', label: 'Headcount', aggregate: 'count' as const }
  ],
  groupingsDown: [
    { field: 'department', sortOrder: 'asc' as const },
    { field: 'job_level', sortOrder: 'asc' as const }
  ],
  chart: {
    type: 'bar' as const,
    title: 'Compensation by Department and Level',
    xAxis: 'department',
    yAxis: 'base_salary',
    groupBy: 'job_level',
    showLegend: true,
    showDataLabels: false
  }
} satisfies Report;

ReportSchema.parse(CompBenchmarkReport);

export default CompBenchmarkReport;
