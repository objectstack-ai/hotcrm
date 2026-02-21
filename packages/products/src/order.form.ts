import type { FormView } from '@objectstack/spec/ui';
import { FormViewSchema } from '@objectstack/spec/ui';

/**
 * Order Form Definition
 * Layout for creating and editing Order records.
 * Sections: Order Information, Line Items, Shipping.
 */
export const OrderForm = {
  type: 'simple' as const,
  data: {
    provider: 'object' as const,
    object: 'order'
  },
  sections: [
    {
      label: 'Order Information',
      columns: 2,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'order_number', required: true, placeholder: 'Auto-generated order number' },
        { field: 'status', required: true },
        { field: 'account_id', label: 'Account', required: true },
        { field: 'contact_id', label: 'Contact' }
      ]
    },
    {
      label: 'Line Items',
      columns: 2,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'product_id', label: 'Product', required: true },
        { field: 'quantity', required: true, helpText: 'Number of units' },
        { field: 'unit_price', required: true },
        { field: 'discount', helpText: 'Discount percentage applied to this line' }
      ]
    },
    {
      label: 'Shipping',
      columns: 2,
      collapsible: true,
      collapsed: false,
      fields: [
        { field: 'shipping_address', placeholder: 'Enter shipping address' },
        { field: 'shipping_method', helpText: 'Select preferred shipping method' },
        { field: 'tracking_number', readonly: true, helpText: 'Populated after shipment' }
      ]
    }
  ]
} satisfies FormView;

FormViewSchema.parse(OrderForm);

export default OrderForm;
