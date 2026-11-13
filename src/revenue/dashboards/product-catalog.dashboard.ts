// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { Dashboard } from '@objectstack/spec/ui';

/**
 * Product Catalog Dashboard (#2436).
 *
 * The List Price by Category chart, moved here from the app's CRM Overview.
 * It binds `product_metrics`, which lives with `crm_product` in this module
 * (AGENTS.md layout rule 3), and from objectstack 18.4.0 a dataset is read only
 * from inside the reader package's dependency closure (objectstack#32929,
 * ADR-0150 D3): the app package cannot read this module's dataset, because the
 * app may not depend on a module. The dashboard that shows it therefore lives
 * in the module too, and leaves with it when revenue is disabled, as the tile
 * did through its `requiresObject` (#2383).
 *
 * No date picker and no owner filter: `crm_product` has no close date, and
 * `owner_id` on a shared catalogue records only who created the entry.
 */
export const ProductCatalogDashboard: Dashboard = {
  name: 'product_catalog_dashboard',
  label: 'Product Catalog',
  description: 'Catalog list prices per product category',

  columns: 12,
  gap: 4,
  refreshIntervalSeconds: 300,

  header: {
    showTitle: true,
    showDescription: true,
  },

  widgets: [
    {
      // The id it had on CRM Overview, so its translations and pins carry over.
      id: 'top_products',
      // It sums CATALOG list prices, so it says so (#2370 row 3). Summing what
      // was sold is not on offer: a line's `total_price` is a `formula`, and a
      // dataset refuses `sum` over a formula field (DATASET_INVALID, measured
      // on 18.2.0); no stored per-line amount exists.
      title: 'List Price by Category',
      description: 'Catalog list prices summed per product category, not sales',
      type: 'bar',
      colorVariant: 'blue',
      dataset: 'product_metrics', dimensions: ['category'], values: ['list_price_sum'],
      layout: { x: 0, y: 0, w: 12, h: 4 },
      chartConfig: {
        showLegend: false,
        showDataLabels: true,
        colors: ['#4F46E5'],
      },
    },
  ],
};
