import { ObjectSchema, Field } from '@objectstack/spec/data';

export const InvoiceLine = ObjectSchema.create({
  name: 'invoice_line',
  label: 'Invoice Line',
  pluralLabel: 'Invoice Lines',
  icon: 'list',
  description: 'Line items for an invoice',

  fields: {
    invoice: /* TODO: Unknown type 'master_detail' */ null,
    product: Field.lookup('product', { label: 'Product' }),
    description: Field.text({ label: 'Description' }),
    quantity: Field.number({
      label: 'Quantity',
      required: true,
      scale: 2
    }),
    unit_price: Field.currency({ label: 'Unit Price' }),
    amount: Field.currency({ label: 'Amount' })
  },
});