import type { Report } from '@objectstack/spec/ui';
import { ReportSchema } from '@objectstack/spec/ui';

/**
 * Market Analysis Report
 * Provides market insights with pricing trends, inventory, and neighborhood data.
 */
export const MarketAnalysisReport = {
  name: 'market_analysis_report',
  label: 'Market Analysis Report',
  description: 'Market analysis with pricing trends, inventory levels, and neighborhood comparisons',
  objectName: 'listing',
  type: 'matrix' as const,
  columns: [
    { field: 'property_id', label: 'Property' },
    { field: 'list_price', label: 'List Price', aggregate: 'avg' as const },
    { field: 'sold_price', label: 'Sold Price', aggregate: 'avg' as const },
    { field: 'days_on_market', label: 'Avg DOM', aggregate: 'avg' as const },
    { field: 'listing_agent', label: 'Listings', aggregate: 'count' as const }
  ],
  groupingsDown: [
    { field: 'listing_type', sortOrder: 'asc' as const }
  ],
  groupingsAcross: [
    { field: 'list_date', sortOrder: 'asc' as const, dateGranularity: 'quarter' as const }
  ],
  chart: {
    type: 'line' as const,
    title: 'Average List Price by Quarter',
    xAxis: 'list_date',
    yAxis: 'list_price',
    showLegend: true,
    showDataLabels: false
  }
} satisfies Report;

ReportSchema.parse(MarketAnalysisReport);

export default MarketAnalysisReport;
