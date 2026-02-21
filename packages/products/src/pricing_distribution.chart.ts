import type { ChartConfig } from '@objectstack/spec/ui';
import { ChartConfigSchema } from '@objectstack/spec/ui';

/**
 * Product Pricing Distribution Chart
 * Distribution of product pricing across tiers
 */
export const PricingDistributionChart = {
  type: 'bar' as const,
  title: 'Product Pricing Distribution',
  subtitle: 'Product count by price range and tier',
  description: 'Bar chart showing distribution of product pricing across standard, premium, and enterprise tiers',
  xAxis: { field: 'price_range', title: 'Price Range', showGridLines: false, logarithmic: false },
  yAxis: [{ field: 'product_count', title: 'Product Count', showGridLines: true, logarithmic: false }],
  series: [
    { name: 'standard', label: 'Standard', color: '#22C55E', yAxis: 'left' as const },
    { name: 'premium', label: 'Premium', color: '#3B82F6', yAxis: 'left' as const },
    { name: 'enterprise', label: 'Enterprise', color: '#8B5CF6', yAxis: 'left' as const }
  ],
  height: 350,
  showLegend: true,
  showDataLabels: false
} satisfies ChartConfig;

ChartConfigSchema.parse(PricingDistributionChart);

export default PricingDistributionChart;
