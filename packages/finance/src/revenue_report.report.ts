import type { Report } from '@objectstack/spec/ui';
import { ReportSchema } from '@objectstack/spec/ui';

/**
 * Revenue Recognition Report
 * ASC 606 compliance, deferred vs recognized revenue
 */
export const RevenueReport = {
  name: 'revenue_report',
  label: 'Revenue Recognition Report',
  description: 'Revenue recognition tracking with ASC 606 compliance, deferred and recognized revenue',
  objectName: 'revenue_schedule',
  type: 'summary' as const,
  columns: [
    { field: 'contract_id', label: 'Contract' },
    { field: 'recognized_amount', label: 'Recognized Revenue', aggregate: 'sum' as const },
    { field: 'deferred_amount', label: 'Deferred Revenue', aggregate: 'sum' as const },
    { field: 'total_amount', label: 'Total Amount', aggregate: 'sum' as const },
    { field: 'recognition_date', label: 'Recognition Date' }
  ],
  groupingsDown: [
    { field: 'recognition_date', sortOrder: 'asc' as const, dateGranularity: 'month' as const }
  ],
  chart: {
    type: 'stacked-bar' as const,
    title: 'Recognized vs Deferred Revenue',
    xAxis: 'recognition_date',
    yAxis: 'recognized_amount',
    showLegend: true,
    showDataLabels: true
  }
} satisfies Report;

ReportSchema.parse(RevenueReport);

export default RevenueReport;
