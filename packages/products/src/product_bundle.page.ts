import type { Page } from '@objectstack/spec/ui';
import { PageSchema } from '@objectstack/spec/ui';

const ProductBundlePage = {
  name: 'product_bundle_page',
  object: 'product_bundle',
  type: 'record' as const,
  label: 'Bundle Configuration',

  regions: [
    {
      name: 'main',
      components: [
        {
          type: 'record:details' as const,
          label: 'Bundle Info',
          properties: {
            fields: ['name', 'bundle_code', 'status', 'bundle_type', 'pricing_method'],
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
          label: 'Components',
          properties: {
            object: 'product_bundle_component',
            columns: ['product', 'quantity', 'optional', 'price_override']
          }
        }
      ]
    }
  ]
} satisfies Page;

PageSchema.parse(ProductBundlePage);

export default ProductBundlePage;
