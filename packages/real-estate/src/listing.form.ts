import type { FormView } from '@objectstack/spec/ui';
import { FormViewSchema } from '@objectstack/spec/ui';

/**
 * Listing Form Definition
 * Tabbed layout for creating and editing Listing records.
 */
export const ListingForm = {
  type: 'tabbed' as const,
  data: {
    provider: 'object' as const,
    object: 'listing'
  },
  sections: [
    {
      label: 'Property Details',
      columns: '2' as any,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'property_id', required: true, label: 'Property' },
        { field: 'listing_type', required: true },
        { field: 'status', required: true },
        { field: 'listing_agent', label: 'Listing Agent' },
        { field: 'list_date', required: true },
        { field: 'days_on_market', readonly: true, helpText: 'Auto-calculated from list date' },
        { field: 'description', colSpan: 2, widget: 'richtext' }
      ]
    },
    {
      label: 'Pricing',
      columns: '2' as any,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'list_price', required: true, helpText: 'Current asking price' },
        { field: 'sold_price', visibleOn: { dialect: 'cel', source: `status = 'sold'` } },
        { field: 'sold_date', visibleOn: { dialect: 'cel', source: `status = 'sold'` } }
      ]
    },
    {
      label: 'Photos',
      columns: '1' as any,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'description', placeholder: 'Add photo URLs or upload attachments' }
      ]
    },
    {
      label: 'Agent Info',
      columns: '2' as any,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'listing_agent', label: 'Primary Agent' },
        { field: 'listing_type', helpText: 'Exclusive, Open, or Pocket listing' }
      ]
    }
  ]
} satisfies FormView;

FormViewSchema.parse(ListingForm);

export default ListingForm;
