import type { Page } from '@objectstack/spec/ui';
import { PageSchema } from '@objectstack/spec/ui';

/**
 * Order Detail Page Layout
 * Record detail page for viewing and managing individual orders.
 */
export const OrderDetailPage = {
  name: 'order_detail',
  type: 'record' as const,
  kind: 'full' as const,
  label: 'Order Detail Page',
  template: 'default',
  isDefault: false,
  assignedProfiles: ['sales_rep', 'sales_manager', 'fulfillment_agent', 'admin'],

  regions: [
    {
      name: 'header',
      components: [
        {
          type: 'page:header' as const,
          properties: {}
        }
      ]
    },
    {
      name: 'details',
      components: [
        {
          type: 'record:detail' as const,
          label: 'Order Details',
          properties: {}
        }
      ]
    },
    {
      name: 'line_items',
      components: [
        {
          type: 'record:related_list' as const,
          label: 'Line Items',
          properties: {
            object: 'order_line_item',
            columns: ['product_name', 'quantity', 'unit_price', 'discount', 'total_price'],
            sort: [{ field: 'sort_order', direction: 'asc' }]
          }
        }
      ]
    },
    {
      name: 'shipping',
      components: [
        {
          type: 'page:card' as const,
          label: 'Shipping Info',
          properties: {}
        }
      ]
    },
    {
      name: 'history',
      components: [
        {
          type: 'record:related_list' as const,
          label: 'Activity History',
          properties: {
            object: 'activity',
            columns: ['subject', 'type', 'created_date', 'created_by'],
            sort: [{ field: 'created_date', direction: 'desc' }]
          }
        }
      ]
    }
  ]
} satisfies Page;

PageSchema.parse(OrderDetailPage);

export default OrderDetailPage;
