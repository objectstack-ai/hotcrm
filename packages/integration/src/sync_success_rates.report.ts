import type { Report } from '@objectstack/spec/ui';
import { ReportSchema } from '@objectstack/spec/ui';

/**
 * Sync Success Rates Report
 * Sync success and failure rates by connector and sync direction
 */
export const SyncSuccessRatesReport = {
  name: 'sync_success_rates',
  label: 'Sync Success Rates Report',
  description: 'Analysis of sync success and failure rates by connector and sync direction',
  objectName: 'sync_config',
  type: 'summary' as const,
  columns: [
    { field: 'connector_name', label: 'Connector' },
    { field: 'sync_config', label: 'Total Syncs', aggregate: 'count' as const },
    { field: 'success_count', label: 'Successful', aggregate: 'sum' as const },
    { field: 'failure_count', label: 'Failed', aggregate: 'sum' as const }
  ],
  groupingsDown: [
    { field: 'connector_name', sortOrder: 'asc' as const },
    { field: 'sync_direction', sortOrder: 'asc' as const }
  ],
  chart: {
    type: 'stacked-bar' as const,
    title: 'Sync Success Rates by Connector',
    xAxis: 'connector_name',
    yAxis: 'sync_config',
    groupBy: 'sync_status',
    showLegend: true,
    showDataLabels: false
  }
} satisfies Report;

ReportSchema.parse(SyncSuccessRatesReport);

export default SyncSuccessRatesReport;
