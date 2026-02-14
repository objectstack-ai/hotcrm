import type { Report } from '@objectstack/spec/ui';
import { ReportSchema } from '@objectstack/spec/ui';

/**
 * Sales Pipeline Report
 * Stage breakdown, win rate, average deal size
 */
export const PipelineReport = {
  name: 'pipeline_report',
  label: 'Sales Pipeline Report',
  description: 'Sales pipeline analysis with stage breakdown, win rate, and average deal size',
  objectName: 'opportunity',
  type: 'summary' as const,
  columns: [
    { field: 'name', label: 'Deal Name' },
    { field: 'account_id', label: 'Account' },
    { field: 'amount', label: 'Amount', aggregate: 'sum' as const },
    { field: 'probability', label: 'Probability', aggregate: 'avg' as const },
    { field: 'close_date', label: 'Close Date' },
    { field: 'owner_id', label: 'Owner' }
  ],
  groupingsDown: [
    { field: 'stage', sortOrder: 'asc' as const }
  ],
  chart: {
    type: 'funnel' as const,
    title: 'Pipeline by Stage',
    xAxis: 'stage',
    yAxis: 'amount',
    showLegend: true,
    showDataLabels: false
  }
} satisfies Report;

ReportSchema.parse(PipelineReport);

export default PipelineReport;
