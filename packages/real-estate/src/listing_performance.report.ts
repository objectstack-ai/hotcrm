import type { Report } from '@objectstack/spec/ui';
import { ReportSchema } from '@objectstack/spec/ui';

/**
 * Listing Performance Report
 * Analyzes listing performance by status, agent, and days on market.
 */
export const ListingPerformanceReport = {
  name: 'listing_performance_report',
  label: 'Listing Performance Report',
  description: 'Listing performance analysis with status breakdown, average DOM, and agent comparison',
  objectName: 'listing',
  type: 'summary' as const,
  columns: [
    { field: 'property_id', label: 'Property' },
    { field: 'listing_agent', label: 'Listing Agent' },
    { field: 'list_price', label: 'List Price', aggregate: 'sum' as const },
    { field: 'sold_price', label: 'Sold Price', aggregate: 'sum' as const },
    { field: 'days_on_market', label: 'Days on Market', aggregate: 'avg' as const },
    { field: 'list_date', label: 'List Date' }
  ],
  groupingsDown: [
    { field: 'status', sortOrder: 'asc' as const }
  ],
  chart: {
    type: 'bar' as const,
    title: 'Listings by Status',
    xAxis: 'status',
    yAxis: 'list_price',
    showLegend: true,
    showDataLabels: false
  }
} satisfies Report;

ReportSchema.parse(ListingPerformanceReport);

export default ListingPerformanceReport;
