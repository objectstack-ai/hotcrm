import type { ChartConfig } from '@objectstack/spec/ui';
import { ChartConfigSchema } from '@objectstack/spec/ui';

/**
 * Integration Error Rates Chart
 * Error distribution by connector and type
 */
export const ErrorRatesChart = {
  type: 'bar' as const,
  title: 'Integration Error Rates',
  subtitle: 'Error distribution by connector and type',
  description: 'Bar chart showing error distribution across connectors by error type',
  xAxis: { field: 'connector', title: 'Connector', showGridLines: false, logarithmic: false },
  yAxis: [{ field: 'error_count', title: 'Error Count', showGridLines: true, logarithmic: false }],
  series: [
    { name: 'auth_errors', label: 'Auth Errors', color: '#EF4444', yAxis: 'left' as const },
    { name: 'timeout_errors', label: 'Timeout Errors', color: '#F97316', yAxis: 'left' as const },
    { name: 'data_errors', label: 'Data Errors', color: '#EAB308', yAxis: 'left' as const },
    { name: 'rate_limit', label: 'Rate Limit', color: '#3B82F6', yAxis: 'left' as const }
  ],
  height: 350,
  showLegend: true,
  showDataLabels: false
} satisfies ChartConfig;

ChartConfigSchema.parse(ErrorRatesChart);

export default ErrorRatesChart;
