import type { Report } from '@objectstack/spec/ui';
import { ReportSchema } from '@objectstack/spec/ui';

/**
 * Turnover Analysis Report
 * Employee turnover rates by department and termination reason
 */
export const TurnoverAnalysisReport = {
  name: 'turnover_analysis',
  label: 'Turnover Analysis Report',
  description: 'Employee turnover analysis by department and termination reason with trend metrics',
  objectName: 'employee',
  type: 'summary' as const,
  columns: [
    { field: 'department', label: 'Department' },
    { field: 'employee_id', label: 'Terminations', aggregate: 'count' as const },
    { field: 'tenure_months', label: 'Avg Tenure (months)', aggregate: 'avg' as const },
    { field: 'employee_id', label: 'Turnover Rate %', aggregate: 'count' as const }
  ],
  groupingsDown: [
    { field: 'department', sortOrder: 'asc' as const },
    { field: 'termination_reason', sortOrder: 'asc' as const }
  ],
  chart: {
    type: 'stacked-bar' as const,
    title: 'Employee Turnover by Department',
    xAxis: 'department',
    yAxis: 'employee_id',
    groupBy: 'termination_reason',
    showLegend: true,
    showDataLabels: false
  }
} satisfies Report;

ReportSchema.parse(TurnoverAnalysisReport);

export default TurnoverAnalysisReport;
