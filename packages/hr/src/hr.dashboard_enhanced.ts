import type { DashboardHeader, GlobalFilter, WidgetMeasure } from '@objectstack/spec/ui';
import { DashboardHeaderSchema, DashboardHeaderActionSchema, GlobalFilterSchema, GlobalFilterOptionsFromSchema, WidgetMeasureSchema } from '@objectstack/spec/ui';

/**
 * HR Dashboard Enhancements
 * Header, global filters, and widget measures for the HR Dashboard
 */

export const HrDashboardHeader = {
  title: 'HR Dashboard',
  subtitle: 'Workforce analytics, headcount, and talent management overview',
  actions: [
    { label: 'Refresh', type: 'refresh' as const, actionUrl: '/api/hr/dashboard/refresh' },
    { label: 'Export PDF', type: 'export' as const, actionUrl: '/api/hr/dashboard/export' },
    { label: 'Schedule Report', type: 'action' as const, actionUrl: '/api/hr/dashboard/schedule' },
    { label: 'Org Chart', type: 'action' as const, actionUrl: '/api/hr/dashboard/org-chart' }
  ]
} satisfies DashboardHeader;

export const HrGlobalFilters = [
  {
    field: 'department',
    label: 'Department',
    type: 'select' as const,
    optionsFrom: { type: 'field' as const, object: 'department', field: 'name', valueField: 'name', labelField: 'name' }
  },
  {
    field: 'hire_date',
    label: 'Date Range',
    type: 'date' as const,
    optionsFrom: { type: 'field' as const, object: 'employee', field: 'hire_date', valueField: 'hire_date', labelField: 'hire_date' }
  },
  {
    field: 'status',
    label: 'Employment Status',
    type: 'select' as const,
    optionsFrom: { type: 'field' as const, object: 'employee', field: 'status', valueField: 'status', labelField: 'status' }
  },
  {
    field: 'location',
    label: 'Location',
    type: 'text' as const,
    optionsFrom: { type: 'field' as const, object: 'employee', field: 'location', valueField: 'location', labelField: 'location' }
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
