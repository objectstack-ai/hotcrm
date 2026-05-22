import type { Page } from '@objectstack/spec/ui';
import { PageSchema } from '@objectstack/spec/ui';

/**
 * Product Detail Page Layout
 */
export const ProductPage = {
  name: 'product_detail',
  object: 'product',
  type: 'record' as const,
  kind: 'full' as const,
  label: 'Product Detail Page',
  template: 'record_detail',
  isDefault: true,
  assignedProfiles: ['sales_rep', 'product_manager', 'admin'],

  regions: [
    {
      name: 'header',
      components: [
        {
          type: 'record:highlights' as const,
          properties: {
            fields: ['name', 'product_code', 'family', 'list_price', 'is_active']
          }
        }
      ]
    },
    {
      name: 'tabs',
      components: [
        {
          type: 'page:tabs' as const,
          properties: {
            tabs: ['product_info']
          }
        }
      ]
    },
    {
      name: 'product_info',
      components: [
        {
          type: 'record:details' as const,
          label: 'Product Information',
          properties: {
            fields: [
              'name', 'product_code', 'description', 'family',
              'is_active', 'list_price', 'cost_price', 'quantity_unit',
              'product_image'
            ],
            columns: 2
          }
        }
      ]
    },
    {
      name: 'related_lists',
      components: [
        {
          type: 'record:related_list' as const,
          label: 'Product Bundles',
          properties: {
            object: 'product_bundle',
            columns: ['name', 'status', 'bundle_price', 'product_count'],
            actions: ['new', 'edit', 'delete']
          }
        },
        {
          type: 'record:related_list' as const,
          label: 'Price Rules',
          properties: {
            object: 'price_rule',
            columns: ['name', 'type', 'discount', 'start_date', 'end_date'],
            actions: ['new', 'edit', 'delete']
          }
        }
      ]
    }
  ]
} satisfies Page;

PageSchema.parse(ProductPage);

export default ProductPage;
