import type { Page } from '@objectstack/spec/ui';
import { PageSchema } from '@objectstack/spec/ui';

/**
 * Quote Detail Page Layout
 */
export const QuotePage = {
  name: 'quote_detail',
  object: 'quote',
  type: 'record' as const,
  kind: 'full' as const,
  label: 'Quote Detail Page',
  template: 'record_detail',
  isDefault: true,
  assignedProfiles: ['sales_rep', 'product_manager', 'admin'],

  regions: [
    {
      name: 'header',
      components: [
        {
          type: 'record:highlights' as const,
          properties: {
            fields: ['quote_number', 'name', 'status', 'total_price', 'approval_status']
          }
        }
      ]
    },
    {
      name: 'tabs',
      components: [
        {
          type: 'page:tabs' as const,
          properties: {
            tabs: ['quote_info', 'pricing_info', 'terms_info']
          }
        }
      ]
    },
    {
      name: 'quote_info',
      components: [
        {
          type: 'record:details' as const,
          label: 'Quote Information',
          properties: {
            fields: [
              'quote_number', 'name', 'status', 'opportunity_id',
              'account_id', 'contact_id', 'pricebook_id', 'quote_date',
              'expiration_date', 'version_number', 'is_primary_quote', 'description'
            ],
            columns: 2
          }
        }
      ]
    },
    {
      name: 'pricing_info',
      components: [
        {
          type: 'record:details' as const,
          label: 'Pricing Information',
          properties: {
            fields: [
              'subtotal', 'discount_percent', 'discount_amount', 'tax_percent',
              'tax_amount', 'shipping_handling', 'total_price', 'currency_code'
            ],
            columns: 2
          }
        }
      ]
    },
    {
      name: 'terms_info',
      components: [
        {
          type: 'record:details' as const,
          label: 'Terms Information',
          properties: {
            fields: [
              'payment_terms', 'delivery_terms', 'approval_status', 'internal_notes'
            ],
            columns: 2
          }
        }
      ]
    },
    {
      name: 'related_lists',
      components: [
        {
          type: 'record:related_list' as const,
          label: 'Quote Line Items',
          properties: {
            object: 'quote_line_item',
            columns: ['product', 'quantity', 'unit_price', 'discount', 'total_price'],
            actions: ['new', 'edit', 'delete']
          }
        }
      ]
    }
  ]
} satisfies Page;

PageSchema.parse(QuotePage);

export default QuotePage;
