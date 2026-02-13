import type { Page } from '@objectstack/spec/ui';
import { PageSchema } from '@objectstack/spec/ui';

/**
 * Lead Detail Page Layout
 */
export const LeadPage = {
  name: 'lead_detail',
  object: 'lead',
  type: 'record' as const,
  label: 'Lead Detail Page',
  template: 'record_detail',
  isDefault: true,
  assignedProfiles: ['sales_rep', 'sales_manager', 'admin'],

  regions: [
    {
      name: 'header',
      components: [
        {
          type: 'record:highlights' as const,
          properties: {
            fields: ['first_name', 'last_name', 'company', 'status', 'lead_score']
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
            tabs: ['lead_info', 'address_info', 'scoring_info']
          }
        }
      ]
    },
    {
      name: 'lead_info',
      components: [
        {
          type: 'record:details' as const,
          label: 'Lead Information',
          properties: {
            fields: [
              'first_name', 'last_name', 'company', 'title',
              'email', 'phone', 'mobile_phone', 'website',
              'industry', 'number_of_employees', 'annual_revenue', 'lead_source',
              'owner_id', 'description'
            ],
            columns: 2
          }
        }
      ]
    },
    {
      name: 'address_info',
      components: [
        {
          type: 'record:details' as const,
          label: 'Address Information',
          properties: {
            fields: [
              'street', 'city', 'state', 'postal_code', 'country'
            ],
            columns: 2
          }
        }
      ]
    },
    {
      name: 'scoring_info',
      components: [
        {
          type: 'record:details' as const,
          label: 'Scoring Information',
          properties: {
            fields: [
              'status', 'rating', 'lead_score', 'data_completeness',
              'is_in_public_pool', 'pool_entry_date', 'claimed_date'
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
          label: 'Activities',
          properties: {
            object: 'activity',
            columns: ['subject', 'type', 'status', 'due_date', 'owner_id'],
            sort: [{ field: 'due_date', direction: 'asc' }],
            actions: ['new', 'edit', 'delete']
          }
        }
      ]
    }
  ]
} satisfies Page;

PageSchema.parse(LeadPage);

export default LeadPage;
