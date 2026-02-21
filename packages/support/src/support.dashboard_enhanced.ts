import type { DashboardHeader, GlobalFilter, WidgetMeasure } from '@objectstack/spec/ui';
import { DashboardHeaderSchema, DashboardHeaderActionSchema, GlobalFilterSchema, GlobalFilterOptionsFromSchema, WidgetMeasureSchema } from '@objectstack/spec/ui';

/**
 * Support Service Dashboard Enhancements
 * Header, global filters, and widget measures for the Service Dashboard
 */

export const SupportDashboardHeader = {
  title: 'Service Dashboard',
  subtitle: 'Case management, SLA compliance, and agent performance metrics',
  actions: [
    { label: 'Refresh', type: 'refresh' as const, actionUrl: '/api/support/dashboard/refresh' },
    { label: 'Export PDF', type: 'export' as const, actionUrl: '/api/support/dashboard/export' },
    { label: 'SLA Report', type: 'action' as const, actionUrl: '/api/support/dashboard/sla-report' },
    { label: 'Queue Manager', type: 'action' as const, actionUrl: '/api/support/dashboard/queue-manager' }
  ]
} satisfies DashboardHeader;

export const SupportGlobalFilters = [
  {
    field: 'created_date',
    label: 'Date Range',
    type: 'date' as const,
    optionsFrom: { type: 'field' as const, object: 'case', field: 'created_date', valueField: 'created_date', labelField: 'created_date' }
  },
  {
    field: 'priority',
    label: 'Priority',
    type: 'select' as const,
    optionsFrom: { type: 'field' as const, object: 'case', field: 'priority', valueField: 'priority', labelField: 'priority' }
  },
  {
    field: 'channel',
    label: 'Channel',
    type: 'select' as const,
    optionsFrom: { type: 'field' as const, object: 'case', field: 'origin', valueField: 'origin', labelField: 'origin' }
  },
  {
    field: 'assigned_agent',
    label: 'Agent',
    type: 'lookup' as const,
    optionsFrom: { type: 'field' as const, object: 'case', field: 'owner', valueField: 'owner', labelField: 'owner' }
  }
] satisfies GlobalFilter[];

export const SupportWidgetMeasures = [
  { label: 'Open Cases', valueField: 'id', aggregate: 'count' as const },
  { label: 'Avg Resolution Time (hrs)', valueField: 'resolution_time', aggregate: 'avg' as const },
  { label: 'SLA Compliance %', valueField: 'sla_met', aggregate: 'avg' as const },
  { label: 'CSAT Score', valueField: 'csat_score', aggregate: 'avg' as const }
] satisfies WidgetMeasure[];

// Schema validation
DashboardHeaderSchema.parse(SupportDashboardHeader);
SupportDashboardHeader.actions.forEach(a => DashboardHeaderActionSchema.parse(a));
SupportGlobalFilters.forEach(f => {
  GlobalFilterSchema.parse(f);
  GlobalFilterOptionsFromSchema.parse(f.optionsFrom);
});
SupportWidgetMeasures.forEach(m => WidgetMeasureSchema.parse(m));

export default { header: SupportDashboardHeader, filters: SupportGlobalFilters, measures: SupportWidgetMeasures };
