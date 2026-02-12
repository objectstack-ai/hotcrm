import type { FormView } from '@objectstack/spec/ui';
import { FormViewSchema } from '@objectstack/spec/ui';

/**
 * Contact Form Definition
 * Layout for creating and editing Contact records
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
      columns: '2' as const,
      fields: [
        { field: 'first_name', required: true },
        { field: 'last_name', required: true },
        { field: 'salutation' },
        { field: 'account_id', label: 'Account' },
        { field: 'title' },
        { field: 'department' },
        { field: 'email', required: true },
        { field: 'phone' }
      ]
    },
    {
      label: 'Communication Preferences',
      columns: '2' as const,
      fields: [
        { field: 'mobile_phone' },
        { field: 'fax' },
        { field: 'preferred_contact' },
        { field: 'last_contact_date' }
      ]
    },
    {
      label: 'Role Details',
      columns: '2' as const,
      fields: [
        { field: 'level' },
        { field: 'is_decision_maker' },
        { field: 'influence_level' },
        { field: 'relationship_strength' },
        { field: 'notes', colSpan: 2 }
      ]
    }
  ]
} satisfies FormView;

FormViewSchema.parse(ContactForm);

export default ContactForm;
