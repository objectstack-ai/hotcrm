import type { Page } from '@objectstack/spec/ui';
import { PageSchema } from '@objectstack/spec/ui';

/**
 * Listing Record Page Layout
 * Listing detail with MLS info, pricing, marketing, and offers.
 */
export const ListingPage = {
  name: 'listing_detail',
  object: 'listing',
  type: 'record' as const,
  kind: 'full' as const,
  label: 'Listing Detail',
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
            fields: ['property_id', 'status', 'list_price', 'days_on_market', 'listing_agent']
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
            tabs: ['listing_details', 'pricing', 'marketing', 'offers']
          }
        }
      ]
    },
    {
      name: 'listing_details',
      components: [
        {
          type: 'record:details' as const,
          label: 'Listing Information',
          properties: {
            fields: [
              'property_id', 'listing_type', 'status', 'listing_agent',
              'list_date', 'days_on_market', 'description'
            ],
            columns: 2
          }
        }
      ]
    },
    {
      name: 'pricing',
      components: [
        {
          type: 'record:details' as const,
          label: 'Price Details',
          properties: {
            fields: [
              'list_price', 'sold_price', 'sold_date'
            ],
            columns: 2
          }
        }
      ]
    },
    {
      name: 'marketing',
      components: [
        {
          type: 'record:details' as const,
          label: 'Marketing',
          properties: {
            fields: ['description', 'listing_type'],
            columns: 1
          }
        },
        {
          type: 'record:related_list' as const,
          label: 'Open Houses',
          properties: {
            object: 'open_house',
            columns: ['event_date', 'time_start', 'time_end', 'attendee_count', 'leads_generated'],
            sort: [{ field: 'event_date', direction: 'desc' }],
            actions: ['new', 'edit']
          }
        }
      ]
    },
    {
      name: 'offers',
      components: [
        {
          type: 'record:related_list' as const,
          label: 'Offers',
          properties: {
            object: 'real_estate_offer',
            columns: ['buyer_id', 'offer_amount', 'status', 'expiration_date', 'earnest_money'],
            sort: [{ field: 'offer_amount', direction: 'desc' }],
            actions: ['new', 'edit']
          }
        }
      ]
    }
  ]
} satisfies Page;

PageSchema.parse(ListingPage);

export default ListingPage;
