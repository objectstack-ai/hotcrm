import { ObjectSchema, Field } from '@objectstack/spec/data';

export const CreditNote = ObjectSchema.create({
  name: 'credit_note',
  label: 'Credit Note',
  pluralLabel: 'Credit Notes',
  icon: 'file-invoice',
  description: 'Credit notes and refunds linked to invoices',

  fields: {
    credit_note_number: Field.autonumber({
      label: 'Credit Note Number',
      prefix: 'CN-',
      description: 'Auto-generated credit note number'
    }),
    invoice_id: Field.lookup('invoice', {
      label: 'Original Invoice',
      required: true,
      description: 'Invoice being credited'
    }),
    account_id: Field.lookup('account', {
      label: 'Account',
      required: true,
      description: 'Customer account'
    }),
    status: Field.select({
      label: 'Status',
      required: true,
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Issued', value: 'issued' },
        { label: 'Applied', value: 'applied' },
        { label: 'Void', value: 'void' }
      ],
      defaultValue: 'draft'
    }),
    credit_date: Field.date({
      label: 'Credit Date',
      required: true,
      description: 'Date the credit note was issued'
    }),
    amount: Field.currency({
      label: 'Credit Amount',
      required: true,
      description: 'Total credit amount'
    }),
    tax_amount: Field.currency({
      label: 'Tax Amount',
      description: 'Tax portion of the credit'
    }),
    total_amount: Field.currency({
      label: 'Total Amount',
      readonly: true,
      description: 'Credit amount including tax'
    }),
    reason: Field.select({
      label: 'Reason',
      required: true,
      options: [
        { label: 'Billing Error', value: 'billing_error' },
        { label: 'Product Return', value: 'product_return' },
        { label: 'Service Issue', value: 'service_issue' },
        { label: 'Price Adjustment', value: 'price_adjustment' },
        { label: 'Duplicate Payment', value: 'duplicate_payment' },
        { label: 'Contract Cancellation', value: 'contract_cancellation' },
        { label: 'Other', value: 'other' }
      ]
    }),
    notes: Field.textarea({
      label: 'Notes',
      maxLength: 4000,
      description: 'Additional details about the credit'
    }),
    applied_to_invoice_id: Field.lookup('invoice', {
      label: 'Applied To Invoice',
      description: 'Invoice the credit was applied against'
    }),
    remaining_balance: Field.currency({
      label: 'Remaining Balance',
      readonly: true,
      description: 'Unapplied credit balance'
    }),
    approved_by_id: Field.lookup('users', {
      label: 'Approved By',
      description: 'User who approved the credit note'
    }),
    approved_date: Field.datetime({
      label: 'Approved Date',
      readonly: true
    })
  },

  enable: {
    searchable: true,
    trackHistory: true,
    feeds: true,
    files: true
  },
});
