import type { Report } from '@objectstack/spec/ui';
import { ReportSchema } from '@objectstack/spec/ui';

/**
 * API Usage Report
 * API usage metrics by connector including call volume, response times, and errors
 */
export const ApiUsageReport = {
  name: 'api_usage',
  label: 'API Usage Report',
  description: 'API usage analysis by connector including total calls, average response times, and error counts',
  objectName: 'sync_config',
  type: 'summary' as const,
  columns: [
    { field: 'connector_name', label: 'Connector' },
    { field: 'api_calls', label: 'Total API Calls', aggregate: 'sum' as const },
    { field: 'avg_response_ms', label: 'Avg Response (ms)', aggregate: 'avg' as const },
    { field: 'error_count', label: 'Errors', aggregate: 'sum' as const }
  ],
  groupingsDown: [
    { field: 'connector_name', sortOrder: 'asc' as const }
  ],
  chart: {
    type: 'bar' as const,
    title: 'API Usage by Connector',
    xAxis: 'connector_name',
    yAxis: 'api_calls',
    showLegend: true,
    showDataLabels: false
  }
} satisfies Report;

ReportSchema.parse(ApiUsageReport);

export default ApiUsageReport;
