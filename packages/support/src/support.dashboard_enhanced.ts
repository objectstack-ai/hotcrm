import type { DashboardHeader, GlobalFilter, WidgetMeasure } from '@objectstack/spec/ui';
import { DashboardHeaderSchema, DashboardHeaderActionSchema, GlobalFilterSchema, GlobalFilterOptionsFromSchema, WidgetMeasureSchema } from '@objectstack/spec/ui';

/**
 * Support Service Dashboard Enhancements
 * Header, global filters, and widget measures for the Service Dashboard
 */

export const SupportDashboardHeader = {
  showTitle: true,
  showDescription: true,
  actions: [
    { label: 'Refresh', actionType: 'url' as const, actionUrl: '/api/support/dashboard/refresh' },
    { label: 'Export PDF', actionType: 'url' as const, actionUrl: '/api/support/dashboard/export' },
    { label: 'SLA Report', actionType: 'url' as const, actionUrl: '/api/support/dashboard/sla-report' },
    { label: 'Queue Manager', actionType: 'url' as const, actionUrl: '/api/support/dashboard/queue-manager' }
  ]
} satisfies DashboardHeader;

export const SupportGlobalFilters = [
  {
    field: 'created_date',
    label: 'Date Range',
    scope: 'dashboard' as const,
    type: 'date' as const,
    optionsFrom: { object: 'case', valueField: 'created_date', labelField: 'created_date' }
  },
  {
    field: 'priority',
    label: 'Priority',
    scope: 'dashboard' as const,
    type: 'select' as const,
    optionsFrom: { object: 'case', valueField: 'priority', labelField: 'priority' }
  },
  {
    field: 'channel',
    label: 'Channel',
    scope: 'dashboard' as const,
    type: 'select' as const,
    optionsFrom: { object: 'case', valueField: 'origin', labelField: 'origin' }
  },
  {
    field: 'assigned_agent',
    label: 'Agent',
    scope: 'dashboard' as const,
    type: 'lookup' as const,
    optionsFrom: { object: 'case', valueField: 'owner', labelField: 'owner' }
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
