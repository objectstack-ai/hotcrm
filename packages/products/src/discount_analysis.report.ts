import type { Report } from '@objectstack/spec/ui';
import { ReportSchema } from '@objectstack/spec/ui';

/**
 * Discount Analysis Report
 * Discount analysis by product and discount tier
 */
export const DiscountAnalysisReport = {
  name: 'discount_analysis_report',
  label: 'Discount Analysis Report',
  description: 'Discount analysis across quote line items by product and discount tier',
  objectName: 'quote_line_item',
  type: 'summary' as const,
  columns: [
    { field: 'product_name', label: 'Product' },
    { field: 'discount_percent', label: 'Discount %' },
    { field: 'quantity', label: 'Quantity' },
    { field: 'total_price', label: 'Total Price', aggregate: 'sum' as const },
    { field: 'product_name', label: 'Product Count', aggregate: 'count' as const }
  ],
  groupingsDown: [
    { field: 'product_name', sortOrder: 'asc' as const },
    { field: 'discount_tier', sortOrder: 'asc' as const }
  ],
  chart: {
    type: 'bar' as const,
    title: 'Discount Analysis by Product',
    xAxis: 'product_name',
    yAxis: 'total_price',
    groupBy: 'discount_tier',
    showLegend: true,
    showDataLabels: false
  }
} satisfies Report;

ReportSchema.parse(DiscountAnalysisReport);

export default DiscountAnalysisReport;
