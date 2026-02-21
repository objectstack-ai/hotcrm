import type { FormView } from '@objectstack/spec/ui';
import { FormViewSchema } from '@objectstack/spec/ui';

/**
 * Bundle Configuration Form Definition
 * Layout for creating and editing product bundle configurations.
 * Sections: Bundle Details, Components, Pricing.
 */
export const BundleConfigForm = {
  type: 'simple' as const,
  data: {
    provider: 'object' as const,
    object: 'bundle_config'
  },
  sections: [
    {
      label: 'Bundle Details',
      columns: '2' as const,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'bundle_name', required: true, placeholder: 'Enter bundle name' },
        { field: 'description', widget: 'richtext', placeholder: 'Describe the bundle' },
        { field: 'status', required: true }
      ]
    },
    {
      label: 'Components',
      columns: '2' as const,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'product_id', label: 'Product', required: true },
        { field: 'quantity', required: true, helpText: 'Number of units in the bundle' },
        { field: 'is_required', helpText: 'Whether this component is mandatory' },
        { field: 'sort_order', helpText: 'Display order within the bundle' }
      ]
    },
    {
      label: 'Pricing',
      columns: '2' as const,
      collapsible: true,
      collapsed: false,
      fields: [
        { field: 'list_price', required: true, helpText: 'Base list price for the bundle' },
        { field: 'discount_type', helpText: 'Percentage or fixed amount' },
        { field: 'discount_value', helpText: 'Discount value applied to the bundle' }
      ]
    }
  ]
} satisfies FormView;

FormViewSchema.parse(BundleConfigForm);

export default BundleConfigForm;
