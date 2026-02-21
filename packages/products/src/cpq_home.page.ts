import type { Page } from '@objectstack/spec/ui';
import { PageSchema } from '@objectstack/spec/ui';

/**
 * CPQ Home Page Layout
 * Landing page for CPQ teams with quotes pipeline, recent orders, and AI configuration assistant.
 */
export const CPQHomePage = {
  name: 'cpq_home',
  type: 'home' as const,
  label: 'CPQ Home Page',
  template: 'default',
  isDefault: false,
  assignedProfiles: ['sales_rep', 'sales_manager', 'cpq_admin', 'admin'],

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
      name: 'quotes_pipeline',
      components: [
        {
          type: 'record:related_list' as const,
          label: 'Quotes Pipeline',
          properties: {
            object: 'quote',
            columns: ['quote_number', 'account_name', 'stage', 'total_amount', 'valid_until'],
            filters: [['status', '!=', 'Closed']],
            sort: [{ field: 'total_amount', direction: 'desc' }]
          }
        }
      ]
    },
    {
      name: 'recent_orders',
      components: [
        {
          type: 'record:related_list' as const,
          label: 'Recent Orders',
          properties: {
            object: 'order',
            columns: ['order_number', 'account_name', 'status', 'total_amount', 'created_date'],
            sort: [{ field: 'created_date', direction: 'desc' }]
          }
        }
      ]
    },
    {
      name: 'ai_assistant',
      components: [
        {
          type: 'ai:suggestion' as const,
          label: 'CPQ Configuration Assistant',
          properties: {
            context: 'cpq_configuration'
          }
        }
      ]
    }
  ]
} satisfies Page;

PageSchema.parse(CPQHomePage);

export default CPQHomePage;
