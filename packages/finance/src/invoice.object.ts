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
      defaultValue: 'Draft',
      options: [
        {
          "label": "Draft",
          "value": "Draft"
        },
        {
          "label": "Posted",
          "value": "Posted"
        },
        {
          "label": "Paid",
          "value": "Paid"
        },
        {
          "label": "Void",
          "value": "Void"
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
          "value": "Due on Receipt"
        },
        {
          "label": "Net 15",
          "value": "Net 15"
        },
        {
          "label": "Net 30",
          "value": "Net 30"
        },
        {
          "label": "Net 60",
          "value": "Net 60"
        }
      ]
    })
  },
});