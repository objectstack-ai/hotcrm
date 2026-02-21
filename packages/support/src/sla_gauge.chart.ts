import type { ChartConfig } from '@objectstack/spec/ui';
import { ChartConfigSchema } from '@objectstack/spec/ui';

/**
 * SLA Compliance Gauge Chart
 * Percentage of cases meeting SLA targets
 */
export const SlaGaugeChart = {
  type: 'donut' as const,
  title: 'SLA Compliance Rate',
  subtitle: 'Percentage of cases meeting SLA targets',
  description: 'Donut chart showing SLA compliance breakdown by status',
  xAxis: { field: 'sla_status', title: 'SLA Status', showGridLines: false, logarithmic: false },
  yAxis: [{ field: 'percentage', title: 'Compliance %', showGridLines: true, logarithmic: false }],
  series: [
    { name: 'met', label: 'SLA Met', color: '#22C55E', yAxis: 'left' as const },
    { name: 'breached', label: 'SLA Breached', color: '#EF4444', yAxis: 'left' as const },
    { name: 'at_risk', label: 'At Risk', color: '#EAB308', yAxis: 'left' as const }
  ],
  height: 350,
  showLegend: true,
  showDataLabels: false
} satisfies ChartConfig;

ChartConfigSchema.parse(SlaGaugeChart);

export default SlaGaugeChart;
