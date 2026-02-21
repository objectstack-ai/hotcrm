import type { DashboardHeader, GlobalFilter, WidgetMeasure } from '@objectstack/spec/ui';
import { DashboardHeaderSchema, DashboardHeaderActionSchema, GlobalFilterSchema, GlobalFilterOptionsFromSchema, WidgetMeasureSchema } from '@objectstack/spec/ui';

/**
 * HR Dashboard Enhancements
 * Header, global filters, and widget measures for the HR Dashboard
 */

export const HrDashboardHeader = {
  showTitle: true,
  showDescription: true,
  actions: [
    { label: 'Refresh', actionType: 'url' as const, actionUrl: '/api/hr/dashboard/refresh' },
    { label: 'Export PDF', actionType: 'url' as const, actionUrl: '/api/hr/dashboard/export' },
    { label: 'Schedule Report', actionType: 'url' as const, actionUrl: '/api/hr/dashboard/schedule' },
    { label: 'Org Chart', actionType: 'url' as const, actionUrl: '/api/hr/dashboard/org-chart' }
  ]
} satisfies DashboardHeader;

export const HrGlobalFilters = [
  {
    field: 'department',
    label: 'Department',
    scope: 'dashboard' as const,
    type: 'select' as const,
    optionsFrom: { object: 'department', valueField: 'name', labelField: 'name' }
  },
  {
    field: 'hire_date',
    label: 'Date Range',
    scope: 'dashboard' as const,
    type: 'date' as const,
    optionsFrom: { object: 'employee', valueField: 'hire_date', labelField: 'hire_date' }
  },
  {
    field: 'status',
    label: 'Employment Status',
    scope: 'dashboard' as const,
    type: 'select' as const,
    optionsFrom: { object: 'employee', valueField: 'status', labelField: 'status' }
  },
  {
    field: 'location',
    label: 'Location',
    scope: 'dashboard' as const,
    type: 'text' as const,
    optionsFrom: { object: 'employee', valueField: 'location', labelField: 'location' }
  }
] satisfies GlobalFilter[];

export const HrWidgetMeasures = [
  { label: 'Total Headcount', valueField: 'id', aggregate: 'count' as const },
  { label: 'Avg Tenure (Years)', valueField: 'tenure_years', aggregate: 'avg' as const },
  { label: 'Open Positions', valueField: 'id', aggregate: 'count' as const },
  { label: 'Attrition Rate', valueField: 'attrition_rate', aggregate: 'avg' as const }
] satisfies WidgetMeasure[];

// Schema validation
DashboardHeaderSchema.parse(HrDashboardHeader);
HrDashboardHeader.actions.forEach(a => DashboardHeaderActionSchema.parse(a));
HrGlobalFilters.forEach(f => {
  GlobalFilterSchema.parse(f);
  GlobalFilterOptionsFromSchema.parse(f.optionsFrom);
});
HrWidgetMeasures.forEach(m => WidgetMeasureSchema.parse(m));

export default { header: HrDashboardHeader, filters: HrGlobalFilters, measures: HrWidgetMeasures };
