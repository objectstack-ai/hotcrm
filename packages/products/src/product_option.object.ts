import { ObjectSchema, Field } from '@objectstack/spec/data';

export const ProductOption = ObjectSchema.create({
  name: 'product_option',
  label: 'Product Option',
  pluralLabel: 'Product Options',
  icon: 'sliders-h',
  description: 'Advanced bundle configuration options for product customization',

  fields: {
    product_bundle_id: Field.masterDetail('product_bundle', { label: 'Product Bundle', required: true }),
    product_id: Field.lookup('product', { label: 'Product', required: true, description: 'Optional product for this option' }),
    name: Field.text({ label: 'Option Name', required: true, maxLength: 255 }),
    option_type: Field.select({
      label: 'Option Type', required: true,
      options: [
        { label: 'Required', value: 'required' },
        { label: 'Optional', value: 'optional' },
        { label: 'Upgrade', value: 'upgrade' },
        { label: 'Add-On', value: 'add_on' },
        { label: 'Alternative', value: 'alternative' }
      ]
    }),
    category: Field.text({ label: 'Option Category', maxLength: 100, description: 'Grouping category for display' }),
    min_quantity: Field.number({ label: 'Min Quantity', precision: 0, defaultValue: 0 }),
    max_quantity: Field.number({ label: 'Max Quantity', precision: 0 }),
    default_quantity: Field.number({ label: 'Default Quantity', precision: 0, defaultValue: 1 }),
    price_adjustment_type: Field.select({
      label: 'Price Adjustment Type',
      options: [
        { label: 'None', value: 'none' },
        { label: 'Fixed Markup', value: 'fixed_markup' },
        { label: 'Fixed Discount', value: 'fixed_discount' },
        { label: 'Percent Markup', value: 'percent_markup' },
        { label: 'Percent Discount', value: 'percent_discount' },
        { label: 'Override', value: 'override' }
      ],
      defaultValue: 'none'
    }),
    price_adjustment_value: Field.number({ label: 'Price Adjustment Value', precision: 2 }),
    display_order: Field.number({ label: 'Display Order', precision: 0, defaultValue: 100 }),
    is_selected_by_default: Field.boolean({ label: 'Selected by Default', defaultValue: false }),
    mutual_exclusion_group: Field.text({ label: 'Exclusion Group', maxLength: 100, description: 'Options in the same group are mutually exclusive' }),
    dependency_option_id: Field.lookup('product_option', { label: 'Depends On', description: 'This option is only available when dependency is selected' }),
    is_active: Field.boolean({ label: 'Active', defaultValue: true }),
    description: Field.textarea({ label: 'Description', maxLength: 2000 })
  },

  enable: { searchable: true, trackHistory: true, feeds: false, files: false },
});
