import type { Report } from '@objectstack/spec/ui';
import { ReportSchema } from '@objectstack/spec/ui';

/**
 * Data Freshness Report
 * Monitors data staleness across objects to ensure analytics accuracy.
 */
export const DataFreshnessReport = {
  name: 'data_freshness_report',
  label: 'Data Freshness Report',
  description: 'Data staleness analysis by object to ensure analytics data is current',
  objectName: 'report',
  type: 'summary' as const,
  columns: [
    { field: 'object_name', label: 'Object' },
    { field: 'last_updated', label: 'Last Updated' },
    { field: 'record_count', label: 'Records', aggregate: 'sum' as const },
    { field: 'staleness_hours', label: 'Staleness (hrs)', aggregate: 'avg' as const }
  ],
  groupingsDown: [
    { field: 'object_name', sortOrder: 'asc' as const }
  ],
  chart: {
    type: 'bar' as const,
    title: 'Data Freshness by Object',
    xAxis: 'object_name',
    yAxis: 'staleness_hours',
    showLegend: true,
    showDataLabels: false
  }
} satisfies Report;

ReportSchema.parse(DataFreshnessReport);

export default DataFreshnessReport;
