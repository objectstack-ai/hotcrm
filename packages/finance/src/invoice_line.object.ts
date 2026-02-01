import type { ServiceObject } from '@objectstack/spec/data';

const InvoiceLine: ServiceObject = {
  name: 'invoice_line',
  label: 'Invoice Line',
  label_plural: 'Invoice Lines',
  icon: 'list',
  description: 'Line items for an invoice',
  fields: {
    invoice: {
      type: 'master_detail',
      label: 'Invoice',
      reference_to: 'invoice',
      required: true
    },
    // Assuming product object is in 'products' package, but referenced by name is fine
    product: {
      type: 'lookup',
      label: 'Product',
      reference_to: 'product'
    },
    description: {
      type: 'text',
      label: 'Description',
      is_wide: true
    },
    quantity: {
      type: 'number',
      label: 'Quantity',
      scale: 2,
      required: true
    },
    unit_price: {
      type: 'currency',
      label: 'Unit Price',
      scale: 2
    },
    amount: {
      type: 'currency',
      label: 'Amount',
      scale: 2
    }
  }
};

export default InvoiceLine;
