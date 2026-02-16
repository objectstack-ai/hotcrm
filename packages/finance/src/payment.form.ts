import type { FormView } from '@objectstack/spec/ui';
import { FormViewSchema } from '@objectstack/spec/ui';

/**
 * Payment Form Definition
 * Tabbed layout for creating and editing Payment records.
 */
export const PaymentForm = {
  type: 'tabbed' as const,
  data: {
    provider: 'object' as const,
    object: 'payment'
  },
  sections: [
    {
      label: 'Payment Details',
      columns: 2,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'payment_number', readonly: true, helpText: 'Auto-generated' },
        { field: 'account_id', label: 'Account', required: true },
        { field: 'payment_date', required: true },
        { field: 'payment_amount', required: true },
        { field: 'currency' },
        { field: 'payment_method', required: true },
        { field: 'reference_number', placeholder: 'Check #, wire ref, or transaction ID' },
        { field: 'status' }
      ]
    },
    {
      label: 'Allocation',
      columns: 1,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'invoice_id', label: 'Invoice', required: true },
        { field: 'allocated_amount', required: true, helpText: 'Amount applied to this invoice' },
        { field: 'unapplied_amount', readonly: true, helpText: 'Remaining unapplied balance' },
        { field: 'notes', widget: 'richtext' }
      ]
    },
    {
      label: 'Bank Information',
      columns: 2,
      collapsible: true,
      collapsed: true,
      fields: [
        { field: 'bank_name' },
        { field: 'bank_account_number' },
        { field: 'routing_number' },
        { field: 'swift_code' }
      ]
    }
  ]
} satisfies FormView;

FormViewSchema.parse(PaymentForm);

export default PaymentForm;
