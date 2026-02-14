import type { FormView } from '@objectstack/spec/ui';
import { FormViewSchema } from '@objectstack/spec/ui';

/**
 * Lead Form Definition
 * Layout for creating and editing Lead records.
 * Leverages FormView features: collapsible sections, visibleOn, dependsOn, placeholder.
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
      columns: '2' as any,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'first_name', required: true, placeholder: 'First name' },
        { field: 'last_name', required: true, placeholder: 'Last name' },
        { field: 'company', required: true, placeholder: 'Company or organization' },
        { field: 'title', placeholder: 'Job title' },
        { field: 'email', required: true, placeholder: 'email@example.com' },
        { field: 'phone', placeholder: '+1 (555) 000-0000' },
        { field: 'mobile_phone' },
        { field: 'website', placeholder: 'https://', visibleOn: "company != ''" },
        { field: 'industry', dependsOn: 'company' },
        { field: 'lead_source' },
        { field: 'description', colSpan: 2, widget: 'richtext' }
      ]
    },
    {
      label: 'Address',
      columns: '2' as any,
      collapsible: true,
      collapsed: true,
      fields: [
        { field: 'street', colSpan: 2 },
        { field: 'city' },
        { field: 'state', dependsOn: 'country' },
        { field: 'postal_code' },
        { field: 'country' }
      ]
    }
  ]
} satisfies FormView;

FormViewSchema.parse(LeadForm);

export default LeadForm;
