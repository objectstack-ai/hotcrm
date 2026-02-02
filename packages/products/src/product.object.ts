import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Product = ObjectSchema.create({
  name: 'product',
  label: 'Product',
  pluralLabel: 'Products',
  icon: 'box',
  description: 'Product catalog and inventory tracking.',
  
  fields: {
    name: Field.text({ label: 'Product Name', required: true, searchable: true }),
    product_code: Field.text({ label: 'Product Code', unique: true, searchable: true }),
    description: Field.textarea({ label: 'Description' }),
    family: Field.select({
      label: 'Product Family',
      options: [
        { label: 'Software', value: 'Software' },
        { label: 'Hardware', value: 'Hardware' },
        { label: 'Professional Services', value: 'Professional Services' },
        { label: 'Consulting', value: 'Consulting' },
        { label: 'Training', value: 'Training' },
        { label: 'Support', value: 'Support' },
        { label: 'Subscription', value: 'Subscription' },
        { label: 'Other', value: 'Other' }
      ]
    }),
    is_active: Field.checkbox({ label: 'Active', defaultValue: true }),
    list_price: Field.currency({ label: 'List Price' }),
    cost_price: Field.currency({ label: 'Cost Price' }),
    quantity_unit: Field.select({ 
      label: 'Unit',
      options: [
        { label: 'Unit', value: 'Unit' },
        { label: 'Set', value: 'Set' },
        { label: 'Hour', value: 'Hour' },
        { label: 'Day', value: 'Day' },
        { label: 'Month', value: 'Month' },
        { label: 'Year', value: 'Year' },
        { label: 'License', value: 'License' }
      ]
    })
  },
  
  enable: {
    searchEnabled: true,
    trackHistory: true,
    apiEnabled: true,
  },
});
