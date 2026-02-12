import type { Page } from '@objectstack/spec/ui';
import { PageSchema } from '@objectstack/spec/ui';

/**
 * Opportunity Detail Page Layout
 */
export const OpportunityPage = {
  name: 'opportunity_detail',
  object: 'opportunity',
  type: 'record' as const,
  label: 'Opportunity Detail Page',

  regions: [
    {
      name: 'header',
      components: [
        {
          type: 'record:highlights' as const,
          properties: {
            fields: ['name', 'stage', 'amount', 'close_date', 'probability']
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
            tabs: ['opportunity_info', 'additional_info']
          }
        }
      ]
    },
    {
      name: 'opportunity_info',
      components: [
        {
          type: 'record:details' as const,
          label: 'Opportunity Information',
          properties: {
            fields: [
              'name', 'account_id', 'contact_id', 'amount',
              'close_date', 'stage', 'probability', 'forecast_category',
              'type', 'lead_source', 'expected_revenue', 'days_open',
              'owner_id', 'next_step'
            ],
            columns: 2
          }
        }
      ]
    },
    {
      name: 'additional_info',
      components: [
        {
          type: 'record:details' as const,
          label: 'Additional Information',
          properties: {
            fields: [
              'type', 'lead_source', 'owner_id'
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
        },
        {
          type: 'record:related_list' as const,
          label: 'Contacts',
          properties: {
            object: 'contact',
            columns: ['name', 'title', 'email', 'phone', 'is_decision_maker'],
            actions: ['new', 'edit', 'delete']
          }
        },
        {
          type: 'record:related_list' as const,
          label: 'Quotes',
          properties: {
            object: 'quote',
            columns: ['quote_number', 'name', 'status', 'total_price', 'expiration_date'],
            actions: ['new', 'edit']
          }
        }
      ]
    }
  ]
} satisfies Page;

PageSchema.parse(OpportunityPage);

export default OpportunityPage;
