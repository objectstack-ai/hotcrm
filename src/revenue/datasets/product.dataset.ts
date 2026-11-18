// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { defineDataset } from '@objectstack/spec/ui';

/** Product analytics dataset (ADR-0021) — catalog list-price rollups. */
export const ProductDataset = defineDataset({
  name: 'product_metrics',
  label: 'Product Metrics',
  description: 'Semantic layer for product catalog counts and list price',
  object: 'crm_product',
  dimensions: [
    {
      name: 'category',
      label: 'Category',
      description: 'The product category: software, hardware, service, subscription or support.',
      synonyms: ['product category', 'product family', '产品类别'],
      field: 'category',
      type: 'string',
    },
  ],
  measures: [
    {
      name: 'product_count',
      label: 'Products',
      description: 'How many products are in the catalog, active and inactive alike; it does not count units sold.',
      synonyms: ['number of products', 'catalog size', '产品数'],
      aggregate: 'count',
    },
    {
      name: 'list_price_sum',
      label: 'Total List Price',
      description: 'The sum of the List Price of the products in view, a catalog figure; it is not sales, and no discount or quantity enters it.',
      synonyms: ['sum of list prices', '标价合计'],
      aggregate: 'sum',
      field: 'list_price',
      format: '0,0',
    },
  ],
});
