import type { Page } from '@objectstack/spec/ui';
import { PageSchema } from '@objectstack/spec/ui';

/**
 * Showing Record Page Layout
 * Showing detail with scheduling information and buyer feedback.
 */
export const ShowingPage = {
  name: 'showing_detail',
  object: 'showing',
  type: 'record' as const,
  kind: 'full' as const,
  label: 'Showing Detail',
  template: 'record_detail',
  isDefault: true,
  assignedProfiles: ['listing_agent', 'broker', 'admin'],

  regions: [
    {
      name: 'header',
      components: [
        {
          type: 'record:highlights' as const,
          properties: {
            fields: ['listing_id', 'scheduled_date', 'agent_id', 'follow_up_status', 'rating']
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
            tabs: ['scheduling', 'feedback']
          }
        }
      ]
    },
    {
      name: 'scheduling',
      components: [
        {
          type: 'record:details' as const,
          label: 'Scheduling Details',
          properties: {
            fields: [
              'listing_id', 'agent_id', 'buyer_contact_id',
              'scheduled_date', 'follow_up_status'
            ],
            columns: 2
          }
        }
      ]
    },
    {
      name: 'feedback',
      components: [
        {
          type: 'record:details' as const,
          label: 'Buyer Feedback',
          properties: {
            fields: ['rating', 'feedback'],
            columns: 1
          }
        }
      ]
    }
  ]
} satisfies Page;

PageSchema.parse(ShowingPage);

export default ShowingPage;
