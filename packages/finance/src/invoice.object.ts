import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Invoice = ObjectSchema.create({
  name: 'invoice',
  label: 'Invoice',
  pluralLabel: 'Invoices',
  icon: 'invoice',
  description: 'Billing Statement for products or services',

  fields: {
    invoice_number: Field.autonumber({
      label: 'Invoice Number',
      format: 'INV-{YYYY}-{000000}'
    }),
    account: Field.lookup('account', {
      label: 'Account',
      required: true
    }),
    contract: Field.lookup('contract', { label: 'Contract' }),
    status: Field.select({
      label: 'Status',
      defaultValue: 'draft',
      options: [
        {
          "label": "Draft",
          "value": "draft"
        },
        {
          "label": "Posted",
          "value": "posted"
        },
        {
          "label": "Paid",
          "value": "paid"
        },
        {
          "label": "Void",
          "value": "void"
        }
      ]
    }),
    total_amount: Field.currency({ label: 'Total Amount' }),
    due_date: Field.date({ label: 'Due Date' }),
    payment_terms: Field.select({
      label: 'Payment Terms',
      options: [
        {
          "label": "Due on Receipt",
          "value": "due_on_receipt"
        },
        {
          "label": "Net 15",
          "value": "net_15"
        },
        {
          "label": "Net 30",
          "value": "net_30"
        },
        {
          "label": "Net 60",
          "value": "net_60"
        }
      ]
    }),
    line_item_count: Field.summary({
      label: 'Line Item Count',
      summary_object: 'invoice_line',
      summary_field: 'id',
      summary_type: 'count'
    }),
    calculated_subtotal: Field.summary({
      label: 'Calculated Subtotal',
      summary_object: 'invoice_line',
      summary_field: 'amount',
      summary_type: 'sum'
    })
  },
});