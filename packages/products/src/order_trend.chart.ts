import type { ChartConfig } from '@objectstack/spec/ui';
import { ChartConfigSchema } from '@objectstack/spec/ui';

/**
 * Order Volume Trend Chart
 * Monthly order volume trends by status
 */
export const OrderTrendChart = {
  type: 'line' as const,
  title: 'Order Volume Trend',
  subtitle: 'Monthly order counts by status',
  description: 'Line chart showing order volume trends over time for new, fulfilled, and cancelled orders',
  xAxis: { field: 'month', title: 'Month', showGridLines: false, logarithmic: false },
  yAxis: [{ field: 'order_count', title: 'Order Count', showGridLines: true, logarithmic: false }],
  series: [
    { name: 'new_orders', label: 'New Orders', color: '#3B82F6', yAxis: 'left' as const },
    { name: 'fulfilled', label: 'Fulfilled', color: '#22C55E', yAxis: 'left' as const },
    { name: 'cancelled', label: 'Cancelled', color: '#EF4444', yAxis: 'left' as const }
  ],
  height: 350,
  showLegend: true,
  showDataLabels: false
} satisfies ChartConfig;

ChartConfigSchema.parse(OrderTrendChart);

export default OrderTrendChart;
