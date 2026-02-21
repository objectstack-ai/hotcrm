import type { DashboardHeader, GlobalFilter, WidgetMeasure } from '@objectstack/spec/ui';
import { DashboardHeaderSchema, DashboardHeaderActionSchema, GlobalFilterSchema, GlobalFilterOptionsFromSchema, WidgetMeasureSchema } from '@objectstack/spec/ui';

/**
 * Products Dashboard Enhancements
 * Header, global filters, and widget measures for the Products Dashboard
 */

export const ProductsDashboardHeader = {
  title: 'Products Dashboard',
  subtitle: 'Product catalog, pricing trends, and order analytics',
  actions: [
    { label: 'Refresh', type: 'refresh' as const, actionUrl: '/api/products/dashboard/refresh' },
    { label: 'Export PDF', type: 'export' as const, actionUrl: '/api/products/dashboard/export' },
    { label: 'Price Analysis', type: 'action' as const, actionUrl: '/api/products/dashboard/price-analysis' },
    { label: 'Inventory Check', type: 'action' as const, actionUrl: '/api/products/dashboard/inventory' }
  ]
} satisfies DashboardHeader;

export const ProductsGlobalFilters = [
  {
    field: 'category',
    label: 'Category',
    type: 'select' as const,
    optionsFrom: { type: 'field' as const, object: 'product', field: 'family', valueField: 'family', labelField: 'family' }
  },
  {
    field: 'status',
    label: 'Product Status',
    type: 'select' as const,
    optionsFrom: { type: 'field' as const, object: 'product', field: 'status', valueField: 'status', labelField: 'status' }
  },
  {
    field: 'created_date',
    label: 'Date Range',
    type: 'date' as const,
    optionsFrom: { type: 'field' as const, object: 'order', field: 'order_date', valueField: 'order_date', labelField: 'order_date' }
  },
  {
    field: 'price_range',
    label: 'Price Range',
    type: 'number' as const,
    optionsFrom: { type: 'field' as const, object: 'product', field: 'unit_price', valueField: 'unit_price', labelField: 'unit_price' }
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
