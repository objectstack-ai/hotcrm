import type { Report } from '@objectstack/spec/ui';
import { ReportSchema } from '@objectstack/spec/ui';

/**
 * Query Performance Report
 * Tracks report query execution times and identifies performance bottlenecks.
 */
export const QueryPerformanceReport = {
  name: 'query_performance_report',
  label: 'Query Performance Report',
  description: 'Execution time analysis by report type to identify performance bottlenecks',
  objectName: 'report',
  type: 'summary' as const,
  columns: [
    { field: 'report_name', label: 'Report' },
    { field: 'execution_time_ms', label: 'Avg Execution (ms)', aggregate: 'avg' as const },
    { field: 'execution_time_ms', label: 'Max Execution (ms)', aggregate: 'max' as const },
    { field: 'report_name', label: 'Executions', aggregate: 'count' as const }
  ],
  groupingsDown: [
    { field: 'report_type', sortOrder: 'asc' as const }
  ],
  chart: {
    type: 'bar' as const,
    title: 'Query Performance by Report Type',
    xAxis: 'report_type',
    yAxis: 'execution_time_ms',
    showLegend: true,
    showDataLabels: false
  }
} satisfies Report;

ReportSchema.parse(QueryPerformanceReport);

export default QueryPerformanceReport;
