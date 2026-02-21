import type { DashboardHeader, GlobalFilter, WidgetMeasure } from '@objectstack/spec/ui';
import { DashboardHeaderSchema, DashboardHeaderActionSchema, GlobalFilterSchema, GlobalFilterOptionsFromSchema, WidgetMeasureSchema } from '@objectstack/spec/ui';

/**
 * Finance Revenue Dashboard Enhancements
 * Header, global filters, and widget measures for the Revenue Dashboard
 */

export const FinanceDashboardHeader = {
  title: 'Revenue Dashboard',
  subtitle: 'Contract value, invoice tracking, and cash flow analytics',
  actions: [
    { label: 'Refresh', type: 'refresh' as const, actionUrl: '/api/finance/dashboard/refresh' },
    { label: 'Export PDF', type: 'export' as const, actionUrl: '/api/finance/dashboard/export' },
    { label: 'Schedule Report', type: 'action' as const, actionUrl: '/api/finance/dashboard/schedule' },
    { label: 'Configure Alerts', type: 'action' as const, actionUrl: '/api/finance/dashboard/alerts' }
  ]
} satisfies DashboardHeader;

export const FinanceGlobalFilters = [
  {
    field: 'invoice_date',
    label: 'Date Range',
    type: 'date' as const,
    optionsFrom: { type: 'field' as const, object: 'invoice', field: 'invoice_date', valueField: 'invoice_date', labelField: 'invoice_date' }
  },
  {
    field: 'fiscal_period',
    label: 'Fiscal Period',
    type: 'select' as const,
    optionsFrom: { type: 'field' as const, object: 'revenue_schedule', field: 'period', valueField: 'period', labelField: 'period' }
  },
  {
    field: 'status',
    label: 'Invoice Status',
    type: 'select' as const,
    optionsFrom: { type: 'field' as const, object: 'invoice', field: 'status', valueField: 'status', labelField: 'status' }
  },
  {
    field: 'payment_method',
    label: 'Payment Method',
    type: 'select' as const,
    optionsFrom: { type: 'field' as const, object: 'payment', field: 'payment_method', valueField: 'payment_method', labelField: 'payment_method' }
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
