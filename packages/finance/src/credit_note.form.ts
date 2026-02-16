import type { FormView } from '@objectstack/spec/ui';
import { FormViewSchema } from '@objectstack/spec/ui';

/**
 * Credit Note Form Definition
 * Tabbed layout for creating and editing Credit Note records.
 */
export const CreditNoteForm = {
  type: 'tabbed' as const,
  data: {
    provider: 'object' as const,
    object: 'credit_note'
  },
  sections: [
    {
      label: 'Credit Note Details',
      columns: 2,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'credit_note_number', readonly: true, helpText: 'Auto-generated' },
        { field: 'account_id', label: 'Account', required: true },
        { field: 'invoice_id', label: 'Original Invoice', required: true },
        { field: 'credit_date', required: true },
        { field: 'reason', required: true },
        { field: 'status' },
        { field: 'currency' },
        { field: 'total_amount', readonly: true, helpText: 'Calculated from line items' }
      ]
    },
    {
      label: 'Line Items',
      columns: 1,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'description', widget: 'richtext' },
        { field: 'subtotal', readonly: true },
        { field: 'tax_amount', readonly: true },
        { field: 'credit_amount', readonly: true }
      ]
    },
    {
      label: 'Approval',
      columns: 2,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'approved_by', readonly: true },
        { field: 'approval_date', readonly: true },
        { field: 'approval_status' },
        { field: 'approval_notes', widget: 'richtext' }
      ]
    }
  ]
} satisfies FormView;

FormViewSchema.parse(CreditNoteForm);

export default CreditNoteForm;
