const Invoice = {
  name: 'invoice',
  label: 'Invoice',
  labelPlural: 'Invoices',
  icon: 'invoice',
  description: 'Billing Statement for products or services',
  fields: {
    invoice_number: {
      type: 'autonumber',
      label: 'Invoice Number', 
      format: 'INV-{YYYY}-{000000}'
    },
    account: {
      type: 'lookup',
      label: 'Account',
      reference: 'account',
      required: true
    },
    contract: {
      type: 'lookup',
      label: 'Contract',
      reference: 'contract'
    },
    status: {
      type: 'select',
      label: 'Status',
      defaultValue: 'Draft',
      options: [
        { label: 'Draft', value: 'Draft' },
        { label: 'Posted', value: 'Posted' },
        { label: 'Paid', value: 'Paid' },
        { label: 'Void', value: 'Void' }
      ]
    },
    total_amount: {
      type: 'currency',
      label: 'Total Amount',
      scale: 2
    },
    due_date: {
      type: 'date',
      label: 'Due Date'
    },
    payment_terms: {
      type: 'select',
      label: 'Payment Terms',
      options: [
        { label: 'Due on Receipt', value: 'Due on Receipt' },
        { label: 'Net 15', value: 'Net 15' },
        { label: 'Net 30', value: 'Net 30' },
        { label: 'Net 60', value: 'Net 60' }
      ]
    }
  }
};

export default Invoice;
