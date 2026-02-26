import type { View } from '@objectstack/spec/ui';
import { ViewSchema } from '@objectstack/spec/ui';

/**
 * Product List Views
 */

export const AllProductsView = {
  list: {
    type: 'grid' as const,
    name: 'all_products',
    label: 'All Products',
    columns: [
      { field: 'name', width: 250, sortable: true, link: true },
      { field: 'product_code', width: 130, sortable: true },
      { field: 'family', width: 150, sortable: true },
      { field: 'is_active', width: 100, sortable: true },
      { field: 'list_price', width: 130, sortable: true, align: 'right' as const },
      { field: 'cost_price', width: 130, sortable: true, align: 'right' as const }
    ],
    sort: [{ field: 'name', order: 'asc' as const }],
    bulkActions: ['delete', 'export'],
    inlineEdit: true,
    pagination: { pageSize: 25, pageSizeOptions: [10, 25, 50, 100] }
  }
} satisfies View;

export const ActiveProductsView = {
  list: {
    type: 'grid' as const,
    name: 'active_products',
    label: 'Active Products',
    filter: [{ field: 'is_active', operator: '=', value: true }],
    columns: [
      { field: 'name', width: 250, link: true },
      { field: 'product_code', width: 130 },
      { field: 'family', width: 150 },
      { field: 'list_price', width: 130, align: 'right' as const },
      { field: 'cost_price', width: 130, align: 'right' as const }
    ],
    sort: [{ field: 'name', order: 'asc' as const }]
  }
} satisfies View;

export const InactiveProductsView = {
  list: {
    type: 'grid' as const,
    name: 'inactive_products',
    label: 'Inactive Products',
    filter: [{ field: 'is_active', operator: '=', value: false }],
    columns: [
      { field: 'name', width: 250, link: true },
      { field: 'product_code', width: 130 },
      { field: 'family', width: 150 },
      { field: 'list_price', width: 130, align: 'right' as const },
      { field: 'cost_price', width: 130, align: 'right' as const }
    ],
    sort: [{ field: 'name', order: 'asc' as const }]
  }
} satisfies View;

export const ByFamilyView = {
  list: {
    type: 'grid' as const,
    name: 'by_family',
    label: 'By Family',
    columns: [
      { field: 'family', width: 150, sortable: true },
      { field: 'name', width: 250, link: true },
      { field: 'product_code', width: 130 },
      { field: 'is_active', width: 100 },
      { field: 'list_price', width: 130, align: 'right' as const },
      { field: 'cost_price', width: 130, align: 'right' as const }
    ],
    sort: [
      { field: 'family', order: 'asc' as const },
      { field: 'name', order: 'asc' as const }
    ]
  }
} satisfies View;

ViewSchema.parse(AllProductsView);
ViewSchema.parse(ActiveProductsView);
ViewSchema.parse(InactiveProductsView);
ViewSchema.parse(ByFamilyView);

export const ProductListViews = {
  all: AllProductsView,
  active: ActiveProductsView,
  inactive: InactiveProductsView,
  byFamily: ByFamilyView
};

export default ProductListViews;
