import type { Report } from '@objectstack/spec/ui';
import { ReportSchema } from '@objectstack/spec/ui';

/**
 * Quote Conversion Report
 * Quote conversion analysis by stage and owner
 */
export const QuoteConversionReport = {
  name: 'quote_conversion_report',
  label: 'Quote Conversion Report',
  description: 'Quote conversion analysis by stage, owner, and total deal value',
  objectName: 'quote',
  type: 'summary' as const,
  columns: [
    { field: 'quote_number', label: 'Quote #' },
    { field: 'account_name', label: 'Account' },
    { field: 'stage', label: 'Stage' },
    { field: 'total_amount', label: 'Total Amount', aggregate: 'sum' as const },
    { field: 'quote_number', label: 'Quote Count', aggregate: 'count' as const }
  ],
  groupingsDown: [
    { field: 'stage', sortOrder: 'asc' as const },
    { field: 'owner_name', sortOrder: 'asc' as const }
  ],
  chart: {
    type: 'stacked-bar' as const,
    title: 'Quote Conversion by Stage',
    xAxis: 'stage',
    yAxis: 'total_amount',
    groupBy: 'owner_name',
    showLegend: true,
    showDataLabels: false
  }
} satisfies Report;

ReportSchema.parse(QuoteConversionReport);

export default QuoteConversionReport;
