import { ObjectSchema, Field } from '@objectstack/spec/data';

export const ProductBundleComponent = ObjectSchema.create({
  name: 'product_bundle_component',
  label: 'Product Bundle Component',
  pluralLabel: 'Product Bundle Components',
  icon: 'puzzle-piece',
  description: 'Components included in a Product Bundle',

  fields: {
    bundle: Field.lookup('product_bundle', { label: 'Bundle', deleteBehavior: 'cascade' }),
    product: Field.lookup('product', {
      label: 'Product',
      required: true
    }),
    quantity: Field.number({
      label: 'Default Quantity',
      required: true,
      defaultValue: 1
    }),
    optional: Field.boolean({ label: 'Optional' }),
    price_override: Field.currency({
      label: 'Price Override',
      description: 'If set, overrides the product unit price when inside this bundle'
    })
  },
});