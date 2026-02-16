import type { ChartConfig } from '@objectstack/spec/ui';
import { ChartConfigSchema } from '@objectstack/spec/ui';

/**
 * Listing Trend Chart
 * Monthly listing activity trend showing new listings vs sold listings over time.
 */
export const ListingTrendChart = {
  type: 'line' as const,
  title: 'Listing Activity Trend',
  subtitle: 'New listings vs sold listings over time',
  description: 'Line chart showing monthly listing trends with new and sold property comparison',
  xAxis: { field: 'month', title: 'Month', showGridLines: false, logarithmic: false },
  yAxis: [{ field: 'listing_count', title: 'Number of Listings', showGridLines: false, logarithmic: false }],
  series: [
    { name: 'new_listings', label: 'New Listings', color: '#3B82F6', yAxis: 'left' as const },
    { name: 'sold_listings', label: 'Sold Listings', color: '#22C55E', yAxis: 'left' as const },
    { name: 'expired_listings', label: 'Expired Listings', color: '#EF4444', yAxis: 'left' as const }
  ],
  height: 350,
  showLegend: true,
  showDataLabels: false
} satisfies ChartConfig;

ChartConfigSchema.parse(ListingTrendChart);

export default ListingTrendChart;
