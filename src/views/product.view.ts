// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { defineView } from '@objectstack/spec/ui';

/**
 * Product Views
 *
 *   • grid    — catalog listing
 *   • gallery — visual product catalog (`image` as cover)
 *
 * The `low_stock` view was removed with the inventory fields it was built on:
 * its columns, its filter and its sort key were all `quantity_on_hand` /
 * `reorder_point`, so it could not outlive them. It was never the stock report
 * it looked like either — the filter compared against a hardcoded 10 rather
 * than each product's own reorder point.
 */
export const ProductViews = defineView({
  list: {
    type: 'grid',
    name: 'all_products',
    label: 'All Products',
    data: { provider: 'object', object: 'crm_product' },
    columns: [
      { field: 'product_code', width: 140, link: true, pinned: 'left' },
      { field: 'name', width: 240, sortable: true },
      { field: 'category', width: 140 },
      { field: 'family', width: 140 },
      { field: 'sku', width: 140 },
      { field: 'list_price', width: 130, align: 'right', summary: 'avg' },
      { field: 'cost', width: 130, align: 'right' },
      { field: 'is_active', width: 100, align: 'center' },
    ],
    sort: [{ field: 'name', order: 'asc' }],
    grouping: { fields: [{ field: 'category', order: 'asc' }] },
    pagination: { pageSize: 50 },
    selection: { type: 'multiple' },
    appearance: {
      allowedVisualizations: ['grid', 'gallery'],
    },
    tabs: [
      { name: 'all', view: 'all_products', isDefault: true, pinned: true },
      { name: 'catalog', icon: 'gallery-thumbnails', view: 'product_catalog' },
    ],
  },

  listViews: {
    /** Visual catalog */
    product_catalog: {
      name: 'product_catalog',
      type: 'gallery',
      label: 'Product Catalog',
      data: { provider: 'object', object: 'crm_product' },
      columns: ['name', 'category', 'list_price'],
      gallery: {
        coverField: 'image',
        coverFit: 'cover',
        cardSize: 'medium',
        titleField: 'name',
        visibleFields: ['product_code', 'category', 'family', 'list_price', 'sku'],
      },
    },
  },

  form: {
    type: 'simple',
    sections: [
      {
        name: 'product_info',
        label: 'Product Info',
        columns: 2,
        fields: [
          'product_code',
          { field: 'name', required: true, colSpan: 2 },
          'category',
          'family',
          'sku',
          'product_manager',
          'is_active',
        ],
      },
      {
        name: 'pricing_info',
        label: 'Pricing',
        columns: 2,
        fields: ['list_price', 'cost'],
      },
      {
        name: 'media',
        label: 'Media',
        columns: 1,
        fields: ['image', 'datasheet', 'description'],
      },
    ],
  },
});
