import type { DashboardHeader, GlobalFilter, WidgetMeasure } from '@objectstack/spec/ui';
import { DashboardHeaderSchema, DashboardHeaderActionSchema, GlobalFilterSchema, GlobalFilterOptionsFromSchema, WidgetMeasureSchema } from '@objectstack/spec/ui';

/**
 * Finance Revenue Dashboard Enhancements
 * Header, global filters, and widget measures for the Revenue Dashboard
 */

export const FinanceDashboardHeader = {
  showTitle: true,
  showDescription: true,
  actions: [
    { label: 'Refresh', actionType: 'url' as const, actionUrl: '/api/finance/dashboard/refresh' },
    { label: 'Export PDF', actionType: 'url' as const, actionUrl: '/api/finance/dashboard/export' },
    { label: 'Schedule Report', actionType: 'url' as const, actionUrl: '/api/finance/dashboard/schedule' },
    { label: 'Configure Alerts', actionType: 'url' as const, actionUrl: '/api/finance/dashboard/alerts' }
  ]
} satisfies DashboardHeader;

export const FinanceGlobalFilters = [
  {
    field: 'invoice_date',
    label: 'Date Range',
    scope: 'dashboard' as const,
    type: 'date' as const,
    optionsFrom: { object: 'invoice', valueField: 'invoice_date', labelField: 'invoice_date' }
  },
  {
    field: 'fiscal_period',
    label: 'Fiscal Period',
    scope: 'dashboard' as const,
    type: 'select' as const,
    optionsFrom: { object: 'revenue_schedule', valueField: 'period', labelField: 'period' }
  },
  {
    field: 'status',
    label: 'Invoice Status',
    scope: 'dashboard' as const,
    type: 'select' as const,
    optionsFrom: { object: 'invoice', valueField: 'status', labelField: 'status' }
  },
  {
    field: 'payment_method',
    label: 'Payment Method',
    scope: 'dashboard' as const,
    type: 'select' as const,
    optionsFrom: { object: 'payment', valueField: 'payment_method', labelField: 'payment_method' }
  }
] satisfies GlobalFilter[];

export const FinanceWidgetMeasures = [
  { label: 'Total Revenue', valueField: 'received_amount', aggregate: 'sum' as const },
  { label: 'Outstanding Balance', valueField: 'total_amount', aggregate: 'sum' as const },
  { label: 'Avg Invoice Value', valueField: 'total_amount', aggregate: 'avg' as const },
  { label: 'Contract Count', valueField: 'id', aggregate: 'count' as const }
] satisfies WidgetMeasure[];

// Schema validation
DashboardHeaderSchema.parse(FinanceDashboardHeader);
FinanceDashboardHeader.actions.forEach(a => DashboardHeaderActionSchema.parse(a));
FinanceGlobalFilters.forEach(f => {
  GlobalFilterSchema.parse(f);
  GlobalFilterOptionsFromSchema.parse(f.optionsFrom);
});
FinanceWidgetMeasures.forEach(m => WidgetMeasureSchema.parse(m));

export default { header: FinanceDashboardHeader, filters: FinanceGlobalFilters, measures: FinanceWidgetMeasures };
