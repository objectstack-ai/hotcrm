import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Pricebook = ObjectSchema.create({
  name: 'pricebook',
  label: 'Pricebook',
  pluralLabel: 'Pricebooks',
  icon: 'tag',
  description: 'Manage pricing strategies by region or channel.',
  
  fields: {
    name: Field.text({ label: 'Pricebook Name', required: true }),
    is_active: Field.boolean({ label: 'Active', defaultValue: true }),
    is_standard: Field.boolean({ label: 'Is Standard Pricebook', defaultValue: false }),
    currency: Field.select({ 
      label: 'Currency',
      options: [
        { label: 'CNY', value: 'cny' },
        { label: 'USD', value: 'usd' },
        { label: 'EUR', value: 'eur' },
        { label: 'GBP', value: 'gbp' },
        { label: 'JPY', value: 'jpy' },
        { label: 'HKD', value: 'hkd' }
      ],
      defaultValue: 'CNY',
      required: true
    }),
    start_date: Field.date({ label: 'Start Date' }),
    end_date: Field.date({ label: 'End Date' }),
    description: Field.textarea({ label: 'Description' })
  },
  
  enable: {
    searchable: true,
    trackHistory: true,
    apiEnabled: true,
  },
});
