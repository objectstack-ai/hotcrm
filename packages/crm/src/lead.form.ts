import type { FormView } from '@objectstack/spec/ui';
import { FormViewSchema } from '@objectstack/spec/ui';

/**
 * Lead Form Definition
 * Layout for creating and editing Lead records
 */
export const LeadForm = {
  type: 'simple' as const,
  data: {
    provider: 'object' as const,
    object: 'lead'
  },
  sections: [
    {
      label: 'Lead Information',
      columns: '2' as const,
      fields: [
        { field: 'first_name', required: true },
        { field: 'last_name', required: true },
        { field: 'company', required: true },
        { field: 'title' },
        { field: 'email', required: true },
        { field: 'phone' },
        { field: 'mobile_phone' },
        { field: 'website' },
        { field: 'industry' },
        { field: 'lead_source' },
        { field: 'description', colSpan: 2 }
      ]
    },
    {
      label: 'Address',
      columns: '2' as const,
      fields: [
        { field: 'street', colSpan: 2 },
        { field: 'city' },
        { field: 'state' },
        { field: 'postal_code' },
        { field: 'country' }
      ]
    }
  ]
} satisfies FormView;

FormViewSchema.parse(LeadForm);

export default LeadForm;
