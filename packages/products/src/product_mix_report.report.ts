import type { Report } from '@objectstack/spec/ui';
import { ReportSchema } from '@objectstack/spec/ui';

/**
 * Product Mix Analysis Report
 * Revenue by product, discount analysis
 */
export const ProductMixReport = {
  name: 'product_mix_report',
  label: 'Product Mix Analysis Report',
  description: 'Product mix analysis with revenue by product line and discount impact',
  objectName: 'quote_line_item',
  type: 'summary' as const,
  columns: [
    { field: 'product_id', label: 'Product' },
    { field: 'quantity', label: 'Quantity Sold', aggregate: 'sum' as const },
    { field: 'total_price', label: 'Total Revenue', aggregate: 'sum' as const },
    { field: 'unit_price', label: 'Avg Unit Price', aggregate: 'avg' as const },
    { field: 'discount', label: 'Avg Discount', aggregate: 'avg' as const }
  ],
  groupingsDown: [
    { field: 'product_id', sortOrder: 'desc' as const }
  ],
  chart: {
    type: 'pie' as const,
    title: 'Revenue by Product',
    xAxis: 'product_id',
    yAxis: 'total_price'
  }
} satisfies Report;

ReportSchema.parse(ProductMixReport);

export default ProductMixReport;
