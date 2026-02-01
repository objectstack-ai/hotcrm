import type { ServiceObject } from '@objectstack/spec/data';

const ProductBundleComponent: ServiceObject = {
  name: 'product_bundle_component',
  label: 'Product Bundle Component',
  label_plural: 'Product Bundle Components',
  icon: 'puzzle-piece',
  description: 'Components included in a Product Bundle',
  fields: {
    bundle: {
      type: 'master_detail', // Using master_detail to enforce ownership
      label: 'Bundle',
      reference_to: 'product_bundle',
      required: true
    },
    product: {
      type: 'lookup',
      label: 'Product',
      reference_to: 'product',
      required: true
    },
    quantity: {
      type: 'number',
      label: 'Default Quantity',
      default_value: 1,
      required: true
    },
    optional: {
      type: 'boolean',
      label: 'Optional',
      default_value: false,
      description: 'If true, the user can choose to remove this component from the bundle'
    },
    price_override: {
      type: 'currency',
      label: 'Price Override',
      scale: 2,
      description: 'If set, overrides the product unit price when inside this bundle'
    }
  }
};

export default ProductBundleComponent;
