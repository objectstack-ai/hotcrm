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
      defaultValue: 'cny',
      required: true
    }),
    start_date: Field.date({ label: 'Start Date' }),
    end_date: Field.date({ label: 'End Date' }),
    description: Field.textarea({ label: 'Description' }),
    supported_currencies: Field.text({ label: 'Supported Currencies', maxLength: 500, description: 'Comma-separated currency codes (e.g., USD,EUR,GBP)' }),
    default_currency: Field.text({ label: 'Default Currency', maxLength: 3, defaultValue: 'usd' }),
    exchange_rate_type: Field.select({
      label: 'Exchange Rate Type',
      options: [
        { label: 'Fixed', value: 'fixed' },
        { label: 'Daily', value: 'daily' },
        { label: 'Custom', value: 'custom' }
      ]
    })
  },
  
  enable: {
    searchable: true,
    trackHistory: true,
    apiEnabled: true,
  },
});
