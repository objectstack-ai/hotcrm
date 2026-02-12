import type { FormView } from '@objectstack/spec/ui';
import { FormViewSchema } from '@objectstack/spec/ui';

/**
 * Account Form Definition
 * Layout for creating and editing Account records
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
      columns: '2' as const,
      fields: [
        { field: 'name', required: true },
        { field: 'account_number' },
        { field: 'type' },
        { field: 'industry' },
        { field: 'phone' },
        { field: 'website' },
        { field: 'annual_revenue' },
        { field: 'number_of_employees' },
        { field: 'parent_id', label: 'Parent Account' },
        { field: 'ownership' }
      ]
    },
    {
      label: 'Billing Address',
      columns: '2' as const,
      fields: [
        { field: 'billing_street', colSpan: 2 },
        { field: 'billing_city' },
        { field: 'billing_state' },
        { field: 'billing_postal_code' },
        { field: 'billing_country' }
      ]
    },
    {
      label: 'Shipping Address',
      columns: '2' as const,
      fields: [
        { field: 'shipping_street', colSpan: 2 },
        { field: 'shipping_city' },
        { field: 'shipping_state' },
        { field: 'shipping_postal_code' },
        { field: 'shipping_country' }
      ]
    },
    {
      label: 'Additional Details',
      columns: '2' as const,
      fields: [
        { field: 'rating' },
        { field: 'sla_tier' },
        { field: 'description', colSpan: 2 }
      ]
    }
  ]
} satisfies FormView;

FormViewSchema.parse(AccountForm);

export default AccountForm;
