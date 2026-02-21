import type { ChartConfig } from '@objectstack/spec/ui';
import { ChartConfigSchema } from '@objectstack/spec/ui';

/**
 * Query Latency Trend Chart
 * Tracks P50, P95, and P99 query latency over time.
 */
export const QueryLatencyChart = {
  type: 'line' as const,
  title: 'Query Latency Trend',
  subtitle: 'Average query execution time over time',
  description: 'Line chart showing P50, P95, and P99 query latency percentiles over time',
  xAxis: { field: 'date', title: 'Date', showGridLines: false, logarithmic: false },
  yAxis: [{ field: 'latency_ms', title: 'Latency (ms)', showGridLines: true, logarithmic: false }],
  series: [
    { name: 'p50', label: 'P50', color: '#22C55E', yAxis: 'left' as const },
    { name: 'p95', label: 'P95', color: '#EAB308', yAxis: 'left' as const },
    { name: 'p99', label: 'P99', color: '#EF4444', yAxis: 'left' as const }
  ],
  height: 350,
  showLegend: true,
  showDataLabels: false
} satisfies ChartConfig;

ChartConfigSchema.parse(QueryLatencyChart);

export default QueryLatencyChart;
