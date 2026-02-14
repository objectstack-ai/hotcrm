import type { Page } from '@objectstack/spec/ui';
import { PageSchema } from '@objectstack/spec/ui';

/**
 * CRM Home Page Layout
 * Landing page for CRM users with pipeline summary, activities, AI insights, and top deals.
 */
export const CrmHomePage = {
  name: 'crm_home',
  type: 'home' as const,
  label: 'CRM Home Page',
  template: 'default',
  isDefault: false,
  assignedProfiles: ['sales_rep', 'sales_manager', 'account_executive', 'admin'],

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
      name: 'summary',
      components: [
        {
          type: 'page:card' as const,
          label: 'Pipeline Summary',
          properties: {}
        },
        {
          type: 'page:card' as const,
          label: "Today's Activities",
          properties: {}
        }
      ]
    },
    {
      name: 'insights',
      components: [
        {
          type: 'ai:suggestion' as const,
          label: 'Sales Insights',
          properties: {
            context: 'sales_pipeline'
          }
        }
      ]
    },
    {
      name: 'top_deals',
      components: [
        {
          type: 'record:related_list' as const,
          label: 'Top Deals',
          properties: {
            object: 'opportunity',
            columns: ['name', 'amount', 'stage', 'close_date', 'probability']
          }
        }
      ]
    }
  ]
} satisfies Page;

PageSchema.parse(CrmHomePage);

export default CrmHomePage;
