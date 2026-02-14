import type { FormView } from '@objectstack/spec/ui';
import { FormViewSchema } from '@objectstack/spec/ui';

/**
 * Account Form Definition
 * Layout for creating and editing Account records.
 * Leverages FormView features: collapsible sections, helpText, placeholder.
 */
export const AccountForm = {
  type: 'simple' as const,
  data: {
    provider: 'object' as const,
    object: 'account'
  },
  sections: [
    {
      label: 'Account Information',
      columns: 2,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'name', required: true, placeholder: 'Enter account name' },
        { field: 'account_number', readonly: true, helpText: 'Auto-generated when the account is created' },
        { field: 'type' },
        { field: 'industry' },
        { field: 'phone', placeholder: '+1 (555) 000-0000' },
        { field: 'website', placeholder: 'https://' },
        { field: 'annual_revenue' },
        { field: 'number_of_employees' },
        { field: 'parent_id', label: 'Parent Account' },
        { field: 'ownership' }
      ]
    },
    {
      label: 'Billing Address',
      columns: 2,
      collapsible: true,
      collapsed: false,
      fields: [
        { field: 'billing_street', colSpan: 2 },
        { field: 'billing_city' },
        { field: 'billing_state', dependsOn: 'billing_country' },
        { field: 'billing_postal_code' },
        { field: 'billing_country' }
      ]
    },
    {
      label: 'Shipping Address',
      columns: 2,
      collapsible: true,
      collapsed: true,
      fields: [
        { field: 'shipping_street', colSpan: 2 },
        { field: 'shipping_city' },
        { field: 'shipping_state', dependsOn: 'shipping_country' },
        { field: 'shipping_postal_code' },
        { field: 'shipping_country' }
      ]
    },
    {
      label: 'Additional Details',
      columns: 2,
      collapsible: true,
      collapsed: false,
      fields: [
        { field: 'rating' },
        { field: 'sla_tier', helpText: 'Service level agreement tier for this account' },
        { field: 'description', colSpan: 2, widget: 'richtext' }
      ]
    }
  ]
} satisfies FormView;

FormViewSchema.parse(AccountForm);

export default AccountForm;
