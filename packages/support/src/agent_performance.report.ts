import type { Report } from '@objectstack/spec/ui';
import { ReportSchema } from '@objectstack/spec/ui';

/**
 * Agent Performance Report
 * Tracks support agent performance metrics including resolution count, CSAT, and resolution time
 */
export const AgentPerformanceReport = {
  name: 'agent_performance_report',
  label: 'Agent Performance Report',
  description: 'Support agent performance comparison by cases resolved, CSAT scores, and resolution times',
  objectName: 'case',
  type: 'summary' as const,
  columns: [
    { field: 'owner_name', label: 'Agent' },
    { field: 'case_number', label: 'Cases Resolved', aggregate: 'count' as const },
    { field: 'csat_score', label: 'Avg CSAT', aggregate: 'avg' as const },
    { field: 'resolution_hours', label: 'Avg Resolution (hrs)', aggregate: 'avg' as const }
  ],
  groupingsDown: [
    { field: 'owner_name', sortOrder: 'asc' as const }
  ],
  chart: {
    type: 'bar' as const,
    title: 'Agent Performance Comparison',
    xAxis: 'owner_name',
    yAxis: 'case_number',
    showLegend: true,
    showDataLabels: false
  }
} satisfies Report;

ReportSchema.parse(AgentPerformanceReport);

export default AgentPerformanceReport;
