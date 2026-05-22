import type { FormView } from '@objectstack/spec/ui';
import { FormViewSchema } from '@objectstack/spec/ui';

/**
 * Offer Submission Form Definition
 * Form layout for creating and editing Real Estate Offer records.
 */
export const RealEstateOfferForm = {
  type: 'simple' as const,
  data: {
    provider: 'object' as const,
    object: 'real_estate_offer'
  },
  sections: [
    {
      label: 'Offer Details',
      columns: '2' as any,
      collapsible: false,
      collapsed: false,
      fields: [
        { field: 'listing_id', required: true, label: 'Listing' },
        { field: 'buyer_id', required: true, label: 'Buyer' },
        { field: 'offer_amount', required: true, helpText: 'Initial offer amount' },
        { field: 'earnest_money', placeholder: 'Earnest money deposit' },
        { field: 'expiration_date', required: true },
        { field: 'closing_date' },
        { field: 'status', required: true }
      ]
    },
    {
      label: 'Counter Offer',
      columns: '2' as any,
      collapsible: true,
      collapsed: true,
      fields: [
        { field: 'counter_offer_amount', visibleOn: { dialect: 'cel', source: `status = 'counter'` } },
        { field: 'contingencies', colSpan: 2, widget: 'richtext', placeholder: 'Inspection, financing, appraisal contingencies...' }
      ]
    }
  ]
} satisfies FormView;

FormViewSchema.parse(RealEstateOfferForm);

export default RealEstateOfferForm;
