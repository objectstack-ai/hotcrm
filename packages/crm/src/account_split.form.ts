import type { FormView } from '@objectstack/spec/ui';
import { FormViewSchema } from '@objectstack/spec/ui';

/**
 * Account Split Form Definition
 * Split layout for editing Account records with side-by-side panels.
 */
export const AccountSplitForm = {
  type: 'split' as const,
  data: {
    provider: 'object' as const,
    object: 'account'
  },
  sections: [
    {
      label: 'Account Information',
      columns: 1,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'name', required: true },
        { field: 'type' },
        { field: 'industry' },
        { field: 'phone' },
        { field: 'website' },
        { field: 'annual_revenue' },
        { field: 'ownership' }
      ]
    },
    {
      label: 'Billing & Shipping',
      columns: 1,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'billing_street' },
        { field: 'billing_city' },
        { field: 'billing_state' },
        { field: 'billing_postal_code' },
        { field: 'billing_country' },
        { field: 'shipping_street' },
        { field: 'shipping_city' },
        { field: 'shipping_state' },
        { field: 'shipping_postal_code' },
        { field: 'shipping_country' }
      ]
    }
  ]
} satisfies FormView;

FormViewSchema.parse(AccountSplitForm);

export default AccountSplitForm;
