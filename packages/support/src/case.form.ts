import type { FormView } from '@objectstack/spec/ui';
import { FormViewSchema } from '@objectstack/spec/ui';

/**
 * Case Form Definition
 * Layout for creating and editing Case records.
 * Leverages FormView features: collapsible sections, widget, placeholder, helpText.
 */
export const CaseForm = {
  type: 'simple' as const,
  data: {
    provider: 'object' as const,
    object: 'case'
  },
  sections: [
    {
      label: 'Case Information',
      columns: '2' as any,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'subject', required: true, placeholder: 'Brief summary of the issue' },
        { field: 'status', required: true },
        { field: 'priority', required: true, helpText: 'Determines SLA response time' },
        { field: 'severity' },
        { field: 'type' },
        { field: 'origin' },
        { field: 'account_id', label: 'Account' },
        { field: 'contact_id', label: 'Contact' }
      ]
    },
    {
      label: 'Description',
      columns: '1' as any,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'description', widget: 'richtext', placeholder: 'Describe the issue in detail' }
      ]
    },
    {
      label: 'Assignment',
      columns: '2' as any,
      collapsible: true,
      collapsed: false,
      fields: [
        { field: 'owner_id', label: 'Owner' },
        { field: 'sla_level', readonly: true, helpText: 'Auto-determined from account SLA tier' }
      ]
    }
  ]
} satisfies FormView;

FormViewSchema.parse(CaseForm);

export default CaseForm;
