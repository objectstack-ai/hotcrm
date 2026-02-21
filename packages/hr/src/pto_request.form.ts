import type { FormView } from '@objectstack/spec/ui';
import { FormViewSchema } from '@objectstack/spec/ui';

/**
 * PTO Request Form Definition
 * Layout for creating and editing PTO (Paid Time Off) request records.
 * Leverages FormView features: collapsible sections, widget, placeholder, helpText.
 */
export const PTORequestForm = {
  type: 'simple' as const,
  data: {
    provider: 'object' as const,
    object: 'pto_request'
  },
  sections: [
    {
      label: 'Request Details',
      columns: '2' as any,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'employee_id', required: true },
        { field: 'leave_type', required: true },
        { field: 'start_date', required: true },
        { field: 'end_date', required: true },
        { field: 'total_days', readonly: true }
      ]
    },
    {
      label: 'Reason',
      columns: '1' as any,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'reason', widget: 'richtext', placeholder: 'Describe the reason for your leave request' }
      ]
    },
    {
      label: 'Approval',
      columns: '2' as any,
      collapsible: true,
      collapsed: false,
      fields: [
        { field: 'approver_id' },
        { field: 'status', readonly: true },
        { field: 'approved_date', readonly: true }
      ]
    }
  ]
} satisfies FormView;

FormViewSchema.parse(PTORequestForm);

export default PTORequestForm;
