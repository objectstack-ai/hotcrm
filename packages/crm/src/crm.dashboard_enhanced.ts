import type { DashboardHeader, GlobalFilter, WidgetMeasure } from '@objectstack/spec/ui';
import { DashboardHeaderSchema, DashboardHeaderActionSchema, GlobalFilterSchema, GlobalFilterOptionsFromSchema, WidgetMeasureSchema } from '@objectstack/spec/ui';

/**
 * CRM Sales Dashboard Enhancements
 * Header, global filters, and widget measures for the Sales Dashboard
 */

export const CrmDashboardHeader = {
  showTitle: true,
  showDescription: true,
  actions: [
    { label: 'Refresh', actionType: 'url' as const, actionUrl: '/api/crm/dashboard/refresh' },
    { label: 'Export PDF', actionType: 'url' as const, actionUrl: '/api/crm/dashboard/export' },
    { label: 'Schedule Report', actionType: 'url' as const, actionUrl: '/api/crm/dashboard/schedule' },
    { label: 'Customize', actionType: 'url' as const, actionUrl: '/api/crm/dashboard/customize' }
  ]
} satisfies DashboardHeader;

export const CrmGlobalFilters = [
  {
    field: 'close_date',
    label: 'Date Range',
    scope: 'dashboard' as const,
    type: 'date' as const,
    optionsFrom: { object: 'opportunity', valueField: 'close_date', labelField: 'close_date' }
  },
  {
    field: 'owner',
    label: 'Owner',
    scope: 'dashboard' as const,
    type: 'lookup' as const,
    optionsFrom: { object: 'opportunity', valueField: 'owner', labelField: 'owner' }
  },
  {
    field: 'region',
    label: 'Region',
    scope: 'dashboard' as const,
    type: 'select' as const,
    optionsFrom: { object: 'account', valueField: 'region', labelField: 'region' }
  },
  {
    field: 'stage',
    label: 'Stage',
    scope: 'dashboard' as const,
    type: 'select' as const,
    optionsFrom: { object: 'opportunity', valueField: 'stage', labelField: 'stage' }
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
