import type { FormView } from '@objectstack/spec/ui';
import { FormViewSchema } from '@objectstack/spec/ui';

/**
 * Contact Form Definition
 * Layout for creating and editing Contact records.
 * Leverages FormView features: collapsible sections, readonly, hidden, helpText.
 */
export const ContactForm = {
  type: 'simple' as const,
  data: {
    provider: 'object' as const,
    object: 'contact'
  },
  sections: [
    {
      label: 'Contact Information',
      columns: 2,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'first_name', required: true, placeholder: 'First name' },
        { field: 'last_name', required: true, placeholder: 'Last name' },
        { field: 'salutation' },
        { field: 'account_id', label: 'Account' },
        { field: 'title', placeholder: 'Job title' },
        { field: 'department' },
        { field: 'email', required: true, placeholder: 'email@example.com' },
        { field: 'phone', placeholder: '+1 (555) 000-0000' }
      ]
    },
    {
      label: 'Communication Preferences',
      columns: 2,
      collapsible: true,
      collapsed: false,
      fields: [
        { field: 'mobile_phone' },
        { field: 'fax' },
        { field: 'preferred_contact', helpText: 'How this contact prefers to be reached' },
        { field: 'last_contact_date', readonly: true }
      ]
    },
    {
      label: 'Role Details',
      columns: 2,
      collapsible: true,
      collapsed: false,
      fields: [
        { field: 'level' },
        { field: 'is_decision_maker', helpText: 'Whether this contact has purchasing authority' },
        { field: 'influence_level' },
        { field: 'relationship_strength' },
        { field: 'notes', colSpan: 2, widget: 'richtext' }
      ]
    }
  ]
} satisfies FormView;

FormViewSchema.parse(ContactForm);

export default ContactForm;
