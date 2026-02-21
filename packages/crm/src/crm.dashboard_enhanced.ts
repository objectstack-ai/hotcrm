import type { DashboardHeader, GlobalFilter, WidgetMeasure } from '@objectstack/spec/ui';
import { DashboardHeaderSchema, DashboardHeaderActionSchema, GlobalFilterSchema, GlobalFilterOptionsFromSchema, WidgetMeasureSchema } from '@objectstack/spec/ui';

/**
 * CRM Sales Dashboard Enhancements
 * Header, global filters, and widget measures for the Sales Dashboard
 */

export const CrmDashboardHeader = {
  title: 'Sales Dashboard',
  subtitle: 'Real-time pipeline visibility and sales performance metrics',
  actions: [
    { label: 'Refresh', type: 'refresh' as const, actionUrl: '/api/crm/dashboard/refresh' },
    { label: 'Export PDF', type: 'export' as const, actionUrl: '/api/crm/dashboard/export' },
    { label: 'Schedule Report', type: 'action' as const, actionUrl: '/api/crm/dashboard/schedule' },
    { label: 'Customize', type: 'action' as const, actionUrl: '/api/crm/dashboard/customize' }
  ]
} satisfies DashboardHeader;

export const CrmGlobalFilters = [
  {
    field: 'close_date',
    label: 'Date Range',
    type: 'date' as const,
    optionsFrom: { type: 'field' as const, object: 'opportunity', field: 'close_date', valueField: 'close_date', labelField: 'close_date' }
  },
  {
    field: 'owner',
    label: 'Owner',
    type: 'lookup' as const,
    optionsFrom: { type: 'field' as const, object: 'opportunity', field: 'owner', valueField: 'owner', labelField: 'owner' }
  },
  {
    field: 'region',
    label: 'Region',
    type: 'select' as const,
    optionsFrom: { type: 'field' as const, object: 'account', field: 'region', valueField: 'region', labelField: 'region' }
  },
  {
    field: 'stage',
    label: 'Stage',
    type: 'select' as const,
    optionsFrom: { type: 'field' as const, object: 'opportunity', field: 'stage', valueField: 'stage', labelField: 'stage' }
  }
] satisfies GlobalFilter[];

export const CrmWidgetMeasures = [
  { label: 'Total Pipeline', valueField: 'amount', aggregate: 'sum' as const },
  { label: 'Avg Deal Size', valueField: 'amount', aggregate: 'avg' as const },
  { label: 'Win Rate', valueField: 'probability', aggregate: 'avg' as const },
  { label: 'Deal Count', valueField: 'id', aggregate: 'count' as const }
] satisfies WidgetMeasure[];

// Schema validation
DashboardHeaderSchema.parse(CrmDashboardHeader);
CrmDashboardHeader.actions.forEach(a => DashboardHeaderActionSchema.parse(a));
CrmGlobalFilters.forEach(f => {
  GlobalFilterSchema.parse(f);
  GlobalFilterOptionsFromSchema.parse(f.optionsFrom);
});
CrmWidgetMeasures.forEach(m => WidgetMeasureSchema.parse(m));

export default { header: CrmDashboardHeader, filters: CrmGlobalFilters, measures: CrmWidgetMeasures };
