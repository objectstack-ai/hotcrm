import type { Report } from '@objectstack/spec/ui';
import { ReportSchema } from '@objectstack/spec/ui';

/**
 * Revenue Forecast Report
 * Forecast by period, rep, and territory
 */
export const ForecastReport = {
  name: 'forecast_report',
  label: 'Revenue Forecast Report',
  description: 'Revenue forecast analysis by period, sales rep, and territory',
  objectName: 'forecast_item',
  type: 'matrix' as const,
  columns: [
    { field: 'owner_id', label: 'Sales Rep' },
    { field: 'forecast_amount', label: 'Forecast Amount', aggregate: 'sum' as const },
    { field: 'best_case_amount', label: 'Best Case', aggregate: 'sum' as const },
    { field: 'worst_case_amount', label: 'Worst Case', aggregate: 'sum' as const },
    { field: 'closed_amount', label: 'Closed Amount', aggregate: 'sum' as const }
  ],
  groupingsDown: [
    { field: 'owner_id', sortOrder: 'asc' as const }
  ],
  groupingsAcross: [
    { field: 'period', sortOrder: 'asc' as const, dateGranularity: 'quarter' as const }
  ],
  chart: {
    type: 'stacked-bar' as const,
    title: 'Forecast vs Closed by Quarter',
    xAxis: 'period',
    yAxis: 'forecast_amount',
    showLegend: true,
    showDataLabels: false
  }
} satisfies Report;

ReportSchema.parse(ForecastReport);

export default ForecastReport;
