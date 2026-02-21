import type { DashboardHeader, GlobalFilter, WidgetMeasure } from '@objectstack/spec/ui';
import { DashboardHeaderSchema, DashboardHeaderActionSchema, GlobalFilterSchema, GlobalFilterOptionsFromSchema, WidgetMeasureSchema } from '@objectstack/spec/ui';

/**
 * Marketing Dashboard Enhancements
 * Header, global filters, and widget measures for the Marketing Dashboard
 */

export const MarketingDashboardHeader = {
  title: 'Marketing Dashboard',
  subtitle: 'Campaign performance, lead generation, and channel analytics',
  actions: [
    { label: 'Refresh', type: 'refresh' as const, actionUrl: '/api/marketing/dashboard/refresh' },
    { label: 'Export PDF', type: 'export' as const, actionUrl: '/api/marketing/dashboard/export' },
    { label: 'Schedule Report', type: 'action' as const, actionUrl: '/api/marketing/dashboard/schedule' },
    { label: 'Create Campaign', type: 'action' as const, actionUrl: '/api/marketing/dashboard/new-campaign' }
  ]
} satisfies DashboardHeader;

export const MarketingGlobalFilters = [
  {
    field: 'start_date',
    label: 'Campaign Period',
    type: 'date' as const,
    optionsFrom: { type: 'field' as const, object: 'campaign', field: 'start_date', valueField: 'start_date', labelField: 'start_date' }
  },
  {
    field: 'channel',
    label: 'Channel',
    type: 'select' as const,
    optionsFrom: { type: 'field' as const, object: 'campaign', field: 'type', valueField: 'type', labelField: 'type' }
  },
  {
    field: 'status',
    label: 'Campaign Status',
    type: 'select' as const,
    optionsFrom: { type: 'field' as const, object: 'campaign', field: 'status', valueField: 'status', labelField: 'status' }
  },
  {
    field: 'budget_range',
    label: 'Budget Range',
    type: 'number' as const,
    optionsFrom: { type: 'field' as const, object: 'campaign', field: 'budgeted_cost', valueField: 'budgeted_cost', labelField: 'budgeted_cost' }
  }
] satisfies GlobalFilter[];

export const MarketingWidgetMeasures = [
  { label: 'Total Leads', valueField: 'id', aggregate: 'count' as const },
  { label: 'Campaign ROI', valueField: 'roi', aggregate: 'avg' as const },
  { label: 'Total Spend', valueField: 'actual_cost', aggregate: 'sum' as const },
  { label: 'Conversion Rate', valueField: 'conversion_rate', aggregate: 'avg' as const }
] satisfies WidgetMeasure[];

// Schema validation
DashboardHeaderSchema.parse(MarketingDashboardHeader);
MarketingDashboardHeader.actions.forEach(a => DashboardHeaderActionSchema.parse(a));
MarketingGlobalFilters.forEach(f => {
  GlobalFilterSchema.parse(f);
  GlobalFilterOptionsFromSchema.parse(f.optionsFrom);
});
MarketingWidgetMeasures.forEach(m => WidgetMeasureSchema.parse(m));

export default { header: MarketingDashboardHeader, filters: MarketingGlobalFilters, measures: MarketingWidgetMeasures };
