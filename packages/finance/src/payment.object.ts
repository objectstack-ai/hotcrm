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
        { label: 'Down Payment', value: 'down_payment' },
        { label: 'Milestone Payment', value: 'milestone_payment' },
        { label: 'Delivery Payment', value: 'delivery_payment' },
        { label: 'Acceptance Payment', value: 'acceptance_payment' },
        { label: 'Final Payment', value: 'final_payment' },
        { label: 'Recurring Payment', value: 'recurring_payment' },
        { label: 'Maintenance Fee', value: 'maintenance_fee' },
        { label: 'Other', value: 'other' }
      ],
      required: true
    }),
    status: Field.select({
      label: 'Status',
      options: [
        { label: 'Planned', value: 'planned' },
        { label: 'Invoiced', value: 'invoiced' },
        { label: 'Received', value: 'received' },
        { label: 'Overdue', value: 'overdue' },
        { label: 'Written Off', value: 'written_off' },
        { label: 'Cancelled', value: 'cancelled' }
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
        { label: 'Bank Transfer', value: 'bank_transfer' },
        { label: 'Check', value: 'check' },
        { label: 'Cash', value: 'cash' },
        { label: 'Credit Card', value: 'credit_card' },
        { label: 'Alipay', value: 'alipay' },
        { label: 'WeChat Pay', value: 'wechat_pay' },
        { label: 'Other', value: 'other' }
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
