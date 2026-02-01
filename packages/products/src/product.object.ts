export default {
  name: 'product',
  label: 'Product',
  icon: 'box',
  description: 'Product catalog and inventory tracking.',
  fields: {
    name: { type: 'text', label: 'Product Name', required: true, searchable: true },
    product_code: { type: 'text', label: 'Product Code', unique: true, searchable: true },
    description: { type: 'textarea', label: 'Description' },
    family: {
      type: 'select',
      label: 'Product Family',
      options: ['Software', 'Hardware', 'Professional Services', 'Consulting', 'Training', 'Support', 'Subscription', 'Other']
    },
    is_active: { type: 'boolean', label: 'Active', defaultValue: true },
    list_price: { type: 'currency', label: 'List Price' },
    cost_price: { type: 'currency', label: 'Cost Price' },
    quantity_unit: { 
        type: 'select', 
        label: 'Unit',
        options: ['Unit', 'Set', 'Hour', 'Day', 'Month', 'Year', 'License'] 
    }
  }
}
