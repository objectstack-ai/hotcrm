export default {
  name: 'pricebook',
  label: 'Pricebook',
  icon: 'tag',
  description: 'Manage pricing strategies by region or channel.',
  fields: {
    name: { type: 'text', label: 'Pricebook Name', required: true },
    is_active: { type: 'boolean', label: 'Active', defaultValue: true },
    is_standard: { type: 'boolean', label: 'Is Standard Pricebook', defaultValue: false },
    currency: { 
        type: 'select', 
        label: 'Currency',
        options: ['CNY', 'USD', 'EUR', 'GBP', 'JPY', 'HKD'],
        defaultValue: 'CNY',
        required: true
    },
    start_date: { type: 'date', label: 'Start Date' },
    end_date: { type: 'date', label: 'End Date' },
    description: { type: 'textarea', label: 'Description' }
  }
}
