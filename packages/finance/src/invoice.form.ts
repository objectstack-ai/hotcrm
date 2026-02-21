import type { FormView } from '@objectstack/spec/ui';
import { FormViewSchema } from '@objectstack/spec/ui';

/**
 * Invoice Form Definition
 * Tabbed layout for creating and editing Invoice records.
 */
export const InvoiceForm = {
  type: 'tabbed' as const,
  data: {
    provider: 'object' as const,
    object: 'invoice'
  },
  sections: [
    {
      label: 'Invoice Details',
      columns: '2' as any,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'invoice_number', readonly: true, helpText: 'Auto-generated' },
        { field: 'account_id', label: 'Account', required: true },
        { field: 'contact_id', label: 'Contact' },
        { field: 'invoice_date', required: true },
        { field: 'due_date', required: true },
        { field: 'status' },
        { field: 'currency' }
      ]
    },
    {
      label: 'Line Items',
      columns: '1' as any,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'description', widget: 'richtext' },
        { field: 'subtotal', readonly: true },
        { field: 'tax_amount', readonly: true },
        { field: 'total_amount', readonly: true, helpText: 'Calculated from line items' }
      ]
    },
    {
      label: 'Payment Terms',
      columns: '2' as any,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'payment_terms' },
        { field: 'payment_method' },
        { field: 'billing_street' },
        { field: 'billing_city' },
        { field: 'billing_state' },
        { field: 'billing_postal_code' },
        { field: 'billing_country' }
      ]
    }
  ]
} satisfies FormView;

FormViewSchema.parse(InvoiceForm);

export default InvoiceForm;
