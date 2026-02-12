import type { Page } from '@objectstack/spec/ui';
import { PageSchema } from '@objectstack/spec/ui';

const InvoicePage = {
  name: 'invoice_page',
  object: 'invoice',
  type: 'record' as const,
  label: 'Invoice Layout',

  regions: [
    {
      name: 'main',
      components: [
        {
          type: 'record:details' as const,
          label: 'General',
          properties: {
            fields: ['invoice_number', 'account', 'contract', 'status', 'due_date', 'total_amount', 'payment_terms'],
            columns: 2
          }
        }
      ]
    },
    {
      name: 'related_lists',
      components: [
        {
          type: 'record:related_list' as const,
          label: 'Line Items',
          properties: {
            object: 'invoice_line',
            columns: ['product', 'description', 'quantity', 'unit_price', 'amount']
          }
        }
      ]
    }
  ]
} satisfies Page;

PageSchema.parse(InvoicePage);

export default InvoicePage;
