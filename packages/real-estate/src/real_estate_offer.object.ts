import { ObjectSchema, Field } from '@objectstack/spec/data';

export const RealEstateOffer = ObjectSchema.create({
  name: 'real_estate_offer',
  label: 'Real Estate Offer',
  icon: 'hand-coins',
  fields: {
    listing_id: Field.masterDetail('listing', { label: 'Listing', required: true }),
    buyer_id: Field.lookup('contact', { label: 'Buyer' }),
    offer_amount: Field.currency({ label: 'Offer Amount', required: true }),
    contingencies: Field.textarea({ label: 'Contingencies' }),
    expiration_date: Field.date({ label: 'Expiration Date' }),
    status: Field.select({
      label: 'Status',
      options: [
        { label: 'Submitted', value: 'submitted' },
        { label: 'Accepted', value: 'accepted' },
        { label: 'Rejected', value: 'rejected' },
        { label: 'Counter', value: 'counter' },
        { label: 'Expired', value: 'expired' },
        { label: 'Withdrawn', value: 'withdrawn' }
      ],
      defaultValue: 'submitted'
    }),
    counter_offer_amount: Field.currency({ label: 'Counter Offer Amount' }),
    earnest_money: Field.currency({ label: 'Earnest Money' }),
    closing_date: Field.date({ label: 'Closing Date' })
  }
});
