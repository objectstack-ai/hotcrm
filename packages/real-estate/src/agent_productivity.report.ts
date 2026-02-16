import type { Report } from '@objectstack/spec/ui';
import { ReportSchema } from '@objectstack/spec/ui';

/**
 * Agent Productivity Report
 * Measures agent performance by listings, showings, and closings.
 */
export const AgentProductivityReport = {
  name: 'agent_productivity_report',
  label: 'Agent Productivity Report',
  description: 'Agent productivity analysis with listings managed, showings conducted, and deals closed',
  objectName: 'commission',
  type: 'summary' as const,
  columns: [
    { field: 'agent_id', label: 'Agent' },
    { field: 'commission_amount', label: 'Commission Earned', aggregate: 'sum' as const },
    { field: 'commission_rate', label: 'Avg Commission Rate', aggregate: 'avg' as const },
    { field: 'transaction_id', label: 'Transactions', aggregate: 'count' as const },
    { field: 'payment_date', label: 'Last Payment Date' }
  ],
  groupingsDown: [
    { field: 'agent_id', sortOrder: 'asc' as const }
  ],
  chart: {
    type: 'bar' as const,
    title: 'Commission by Agent',
    xAxis: 'agent_id',
    yAxis: 'commission_amount',
    showLegend: true,
    showDataLabels: true
  }
} satisfies Report;

ReportSchema.parse(AgentProductivityReport);

export default AgentProductivityReport;
