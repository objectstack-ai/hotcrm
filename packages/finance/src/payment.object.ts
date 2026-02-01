export default {
  name: 'payment',
  label: 'Payment',
  icon: 'money-bill-wave',
  description: 'Manage payments, invoices, and collections.',
  fields: {
    payment_number: { type: 'auto_number', label: 'Payment Number', readonly: true },
    name: { type: 'text', label: 'Payment Name', required: true, searchable: true },
    type: {
      type: 'select',
      label: 'Type',
      options: ['Down Payment', 'Milestone Payment', 'Delivery Payment', 'Acceptance Payment', 'Final Payment', 'Recurring Payment', 'Maintenance Fee', 'Other'],
      required: true
    },
    status: {
      type: 'select',
      label: 'Status',
      options: ['Planned', 'Invoiced', 'Received', 'Overdue', 'Written Off', 'Cancelled'],
      defaultValue: 'Planned'
    },
    account: { type: 'lookup', reference_to: 'account', label: 'Account', required: true },
    opportunity: { type: 'lookup', reference_to: 'opportunity', label: 'Related Opportunity' },
    contract: { type: 'lookup', reference_to: 'contract', label: 'Related Contract', required: true },
    quote: { type: 'lookup', reference_to: 'quote', label: 'Related Quote' },
    
    planned_amount: { type: 'currency', label: 'Planned Amount', required: true },
    received_amount: { type: 'currency', label: 'Received Amount' },
    planned_date: { type: 'date', label: 'Planned Date', required: true },
    actual_date: { type: 'date', label: 'Actual Date' },
    
    payment_method: { 
        type: 'select', 
        options: ['Bank Transfer', 'Check', 'Cash', 'Credit Card', 'Alipay', 'WeChat Pay', 'Other'],
        label: 'Payment Method'
    },
    invoice_number: { type: 'text', label: 'Invoice Number' }
  }
}
