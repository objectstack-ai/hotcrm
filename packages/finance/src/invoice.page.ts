const InvoicePage = {
  name: 'invoice_page',
  object: 'invoice',
  type: 'record',
  label: 'Invoice Layout',
  layout: {
    type: 'tabs',
    sections: [
      {
        label: 'General',
        columns: 2,
        fields: ['invoice_number', 'account', 'contract', 'status', 'due_date', 'total_amount', 'payment_terms']
      },
      {
        label: 'Line Items',
        type: 'related_list',
        object: 'invoice_line',
        columns: ['product', 'description', 'quantity', 'unit_price', 'amount']
      }
    ]
  }
};

export default InvoicePage;
