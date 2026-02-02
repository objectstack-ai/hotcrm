import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Payment = ObjectSchema.create({
  name: 'payment',
  label: 'Payment',
  pluralLabel: 'Payments',
  icon: 'money-bill-wave',
  description: 'Manage payments, invoices, and collections.',
  
  fields: {
    payment_number: Field.autonumber({ label: 'Payment Number', readonly: true }),
    name: Field.text({ label: 'Payment Name', required: true, searchable: true }),
    type: Field.select({
      label: 'Type',
      options: [
        { label: 'Down Payment', value: 'Down Payment' },
        { label: 'Milestone Payment', value: 'Milestone Payment' },
        { label: 'Delivery Payment', value: 'Delivery Payment' },
        { label: 'Acceptance Payment', value: 'Acceptance Payment' },
        { label: 'Final Payment', value: 'Final Payment' },
        { label: 'Recurring Payment', value: 'Recurring Payment' },
        { label: 'Maintenance Fee', value: 'Maintenance Fee' },
        { label: 'Other', value: 'Other' }
      ],
      required: true
    }),
    status: Field.select({
      label: 'Status',
      options: [
        { label: 'Planned', value: 'Planned' },
        { label: 'Invoiced', value: 'Invoiced' },
        { label: 'Received', value: 'Received' },
        { label: 'Overdue', value: 'Overdue' },
        { label: 'Written Off', value: 'Written Off' },
        { label: 'Cancelled', value: 'Cancelled' }
      ],
      defaultValue: 'Planned'
    }),
    account: Field.lookup('account', { label: 'Account', required: true }),
    opportunity: Field.lookup('opportunity', { label: 'Related Opportunity' }),
    contract: Field.lookup('contract', { label: 'Related Contract', required: true }),
    quote: Field.lookup('quote', { label: 'Related Quote' }),
    
    planned_amount: Field.currency({ label: 'Planned Amount', required: true }),
    received_amount: Field.currency({ label: 'Received Amount' }),
    planned_date: Field.date({ label: 'Planned Date', required: true }),
    actual_date: Field.date({ label: 'Actual Date' }),
    
    payment_method: Field.select({ 
      options: [
        { label: 'Bank Transfer', value: 'Bank Transfer' },
        { label: 'Check', value: 'Check' },
        { label: 'Cash', value: 'Cash' },
        { label: 'Credit Card', value: 'Credit Card' },
        { label: 'Alipay', value: 'Alipay' },
        { label: 'WeChat Pay', value: 'WeChat Pay' },
        { label: 'Other', value: 'Other' }
      ],
      label: 'Payment Method'
    }),
    invoice_number: Field.text({ label: 'Invoice Number' })
  },
  
  enable: {
    searchable: true,
    trackHistory: true,
    apiEnabled: true,
  },
});
