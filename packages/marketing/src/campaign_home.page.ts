import type { Page } from '@objectstack/spec/ui';
import { PageSchema } from '@objectstack/spec/ui';

/**
 * Campaign Home Page Layout
 * Landing page for marketing users with campaign metrics, active campaigns, and AI insights.
 */
export const CampaignHomePage = {
  name: 'campaign_home',
  type: 'home' as const,
  kind: 'full' as const,
  label: 'Campaign Home Page',
  template: 'default',
  isDefault: false,
  assignedProfiles: ['marketing_specialist', 'marketing_manager', 'admin'],

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
      name: 'metrics',
      components: [
        {
          type: 'page:card' as const,
          label: 'Active Campaigns',
          properties: {}
        },
        {
          type: 'page:card' as const,
          label: 'Total Leads Generated',
          properties: {}
        },
        {
          type: 'page:card' as const,
          label: 'Marketing ROI',
          properties: {}
        }
      ]
    },
    {
      name: 'active_campaigns',
      components: [
        {
          type: 'record:related_list' as const,
          label: 'Active Campaigns',
          properties: {
            object: 'campaign',
            columns: ['name', 'type', 'status', 'start_date', 'end_date', 'budgeted_cost'],
            filters: [['is_active', '=', true]]
          }
        }
      ]
    },
    {
      name: 'insights',
      components: [
        {
          type: 'ai:suggestion' as const,
          label: 'Marketing Insights',
          properties: {
            context: 'campaign_optimization'
          }
        }
      ]
    }
  ]
} satisfies Page;

PageSchema.parse(CampaignHomePage);

export default CampaignHomePage;
