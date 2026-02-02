import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Pricebook = ObjectSchema.create({
  name: 'pricebook',
  label: 'Pricebook',
  pluralLabel: 'Pricebooks',
  icon: 'tag',
  description: 'Manage pricing strategies by region or channel.',
  
  fields: {
    name: Field.text({ label: 'Pricebook Name', required: true }),
    is_active: Field.checkbox({ label: 'Active', defaultValue: true }),
    is_standard: Field.checkbox({ label: 'Is Standard Pricebook', defaultValue: false }),
    currency: Field.select({ 
      label: 'Currency',
      options: [
        { label: 'CNY', value: 'CNY' },
        { label: 'USD', value: 'USD' },
        { label: 'EUR', value: 'EUR' },
        { label: 'GBP', value: 'GBP' },
        { label: 'JPY', value: 'JPY' },
        { label: 'HKD', value: 'HKD' }
      ],
      defaultValue: 'CNY',
      required: true
    }),
    start_date: Field.date({ label: 'Start Date' }),
    end_date: Field.date({ label: 'End Date' }),
    description: Field.textarea({ label: 'Description' })
  },
  
  enable: {
    searchEnabled: true,
    trackHistory: true,
    apiEnabled: true,
  },
});
