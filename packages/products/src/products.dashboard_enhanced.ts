import type { DashboardHeader, GlobalFilter, WidgetMeasure } from '@objectstack/spec/ui';
import { DashboardHeaderSchema, DashboardHeaderActionSchema, GlobalFilterSchema, GlobalFilterOptionsFromSchema, WidgetMeasureSchema } from '@objectstack/spec/ui';

/**
 * Products Dashboard Enhancements
 * Header, global filters, and widget measures for the Products Dashboard
 */

export const ProductsDashboardHeader = {
  showTitle: true,
  showDescription: true,
  actions: [
    { label: 'Refresh', actionType: 'url' as const, actionUrl: '/api/products/dashboard/refresh' },
    { label: 'Export PDF', actionType: 'url' as const, actionUrl: '/api/products/dashboard/export' },
    { label: 'Price Analysis', actionType: 'url' as const, actionUrl: '/api/products/dashboard/price-analysis' },
    { label: 'Inventory Check', actionType: 'url' as const, actionUrl: '/api/products/dashboard/inventory' }
  ]
} satisfies DashboardHeader;

export const ProductsGlobalFilters = [
  {
    field: 'category',
    label: 'Category',
    scope: 'dashboard' as const,
    type: 'select' as const,
    optionsFrom: { object: 'product', valueField: 'family', labelField: 'family' }
  },
  {
    field: 'status',
    label: 'Product Status',
    scope: 'dashboard' as const,
    type: 'select' as const,
    optionsFrom: { object: 'product', valueField: 'status', labelField: 'status' }
  },
  {
    field: 'created_date',
    label: 'Date Range',
    scope: 'dashboard' as const,
    type: 'date' as const,
    optionsFrom: { object: 'order', valueField: 'order_date', labelField: 'order_date' }
  },
  {
    field: 'price_range',
    label: 'Price Range',
    scope: 'dashboard' as const,
    type: 'number' as const,
    optionsFrom: { object: 'product', valueField: 'unit_price', labelField: 'unit_price' }
  }
] satisfies GlobalFilter[];

export const ProductsWidgetMeasures = [
  { label: 'Active Products', valueField: 'id', aggregate: 'count' as const },
  { label: 'Avg Unit Price', valueField: 'unit_price', aggregate: 'avg' as const },
  { label: 'Total Order Value', valueField: 'total_amount', aggregate: 'sum' as const },
  { label: 'Order Count', valueField: 'id', aggregate: 'count' as const }
] satisfies WidgetMeasure[];

// Schema validation
DashboardHeaderSchema.parse(ProductsDashboardHeader);
ProductsDashboardHeader.actions.forEach(a => DashboardHeaderActionSchema.parse(a));
ProductsGlobalFilters.forEach(f => {
  GlobalFilterSchema.parse(f);
  GlobalFilterOptionsFromSchema.parse(f.optionsFrom);
});
ProductsWidgetMeasures.forEach(m => WidgetMeasureSchema.parse(m));

export default { header: ProductsDashboardHeader, filters: ProductsGlobalFilters, measures: ProductsWidgetMeasures };
