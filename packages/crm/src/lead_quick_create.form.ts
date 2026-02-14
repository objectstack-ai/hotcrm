import type { FormView } from '@objectstack/spec/ui';
import { FormViewSchema } from '@objectstack/spec/ui';

/**
 * Lead Quick Create Form Definition
 * Modal layout for rapidly creating Lead records with essential fields only.
 */
export const LeadQuickCreateForm = {
  type: 'modal' as const,
  data: {
    provider: 'object' as const,
    object: 'lead'
  },
  sections: [
    {
      label: 'Lead Information',
      columns: 2,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'first_name', required: true },
        { field: 'last_name', required: true },
        { field: 'company' },
        { field: 'email', required: true, placeholder: 'name@company.com' },
        { field: 'phone', placeholder: '+1 (555) 000-0000' },
        { field: 'lead_source' }
      ]
    }
  ]
} satisfies FormView;

FormViewSchema.parse(LeadQuickCreateForm);

export default LeadQuickCreateForm;
