import { ObjectSchema, Field } from '@objectstack/spec/data';

export const ProductBundleComponent = ObjectSchema.create({
  name: 'product_bundle_component',
  label: 'Product Bundle Component',
  pluralLabel: 'Product Bundle Components',
  icon: 'puzzle-piece',
  description: 'Components included in a Product Bundle',

  fields: {
    bundle: /* TODO: Unknown type 'master_detail' */ null,
    product: Field.lookup('product', {
      label: 'Product',
      required: true
    }),
    quantity: Field.number({
      label: 'Default Quantity',
      required: true,
      defaultValue: 1
    }),
    optional: /* TODO: Unknown type 'boolean' */ null,
    price_override: Field.currency({
      label: 'Price Override',
      description: 'If set, overrides the product unit price when inside this bundle'
    })
  },
});