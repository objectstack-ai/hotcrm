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
        { label: 'Software', value: 'software' },
        { label: 'Hardware', value: 'hardware' },
        { label: 'Professional Services', value: 'professional_services' },
        { label: 'Consulting', value: 'consulting' },
        { label: 'Training', value: 'training' },
        { label: 'Support', value: 'support' },
        { label: 'Subscription', value: 'subscription' },
        { label: 'Other', value: 'other' }
      ]
    }),
    is_active: Field.boolean({ label: 'Active', defaultValue: true }),
    list_price: Field.currency({ label: 'List Price' }),
    cost_price: Field.currency({ label: 'Cost Price' }),
    quantity_unit: Field.select({ 
      label: 'Unit',
      options: [
        { label: 'Unit', value: 'unit' },
        { label: 'Set', value: 'set' },
        { label: 'Hour', value: 'hour' },
        { label: 'Day', value: 'day' },
        { label: 'Month', value: 'month' },
        { label: 'Year', value: 'year' },
        { label: 'License', value: 'license' }
      ]
    })
  },
  
  enable: {
    searchable: true,
    trackHistory: true,
    apiEnabled: true,
  },
});
