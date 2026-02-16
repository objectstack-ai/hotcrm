import type { Report } from '@objectstack/spec/ui';
import { ReportSchema } from '@objectstack/spec/ui';

/**
 * Cash Position Report
 * Current cash position with inflows and outflows
 */
export const CashPositionReport = {
  name: 'cash_position_report',
  label: 'Cash Position Report',
  description: 'Cash position summary showing inflows, outflows, and net cash position by period',
  objectName: 'payment',
  type: 'summary' as const,
  columns: [
    { field: 'payment_date', label: 'Date' },
    { field: 'type', label: 'Type' },
    { field: 'inflow', label: 'Cash Inflow', aggregate: 'sum' as const },
    { field: 'outflow', label: 'Cash Outflow', aggregate: 'sum' as const },
    { field: 'net_amount', label: 'Net Amount', aggregate: 'sum' as const },
    { field: 'running_balance', label: 'Running Balance' }
  ],
  groupingsDown: [
    { field: 'payment_date', sortOrder: 'asc' as const, dateGranularity: 'month' as const }
  ],
  chart: {
    type: 'line' as const,
    title: 'Cash Position Trend',
    xAxis: 'payment_date',
    yAxis: 'running_balance',
    showLegend: true,
    showDataLabels: false
  }
} satisfies Report;

ReportSchema.parse(CashPositionReport);

export default CashPositionReport;
