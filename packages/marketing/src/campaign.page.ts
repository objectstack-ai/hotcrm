import type { Page } from '@objectstack/spec/ui';
import { PageSchema } from '@objectstack/spec/ui';

const CampaignPage = {
  name: 'campaign_page',
  object: 'campaign',
  type: 'record' as const,
  label: 'Campaign Layout',
  template: 'record_detail',
  isDefault: true,
  assignedProfiles: ['marketing_specialist', 'marketing_manager', 'admin'],

  regions: [
    {
      name: 'main',
      components: [
        {
          type: 'record:details' as const,
          label: 'Details',
          properties: {
            fields: ['name', 'type', 'status', 'start_date', 'end_date', 'description', 'is_active'],
            columns: 2
          }
        },
        {
          type: 'record:details' as const,
          label: 'Financials',
          properties: {
            fields: ['budgeted_cost', 'actual_cost', 'expected_revenue', 'actual_revenue'],
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
          label: 'Campaign Members',
          properties: {
            object: 'campaign_member',
            columns: ['lead', 'contact', 'status', 'first_responded_date']
          }
        }
      ]
    }
  ]
} satisfies Page;

PageSchema.parse(CampaignPage);

export default CampaignPage;
