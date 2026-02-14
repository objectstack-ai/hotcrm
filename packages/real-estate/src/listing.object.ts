import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Listing = ObjectSchema.create({
  name: 'listing',
  label: 'Listing',
  fields: {
    property_id: Field.masterDetail('property', { label: 'Property', required: true }),
    list_price: Field.currency({ label: 'List Price', required: true }),
    sold_price: Field.currency({ label: 'Sold Price' }),
    list_date: Field.date({ label: 'List Date', required: true }),
    sold_date: Field.date({ label: 'Sold Date' }),
    days_on_market: Field.number({ label: 'Days on Market' }),
    listing_agent: Field.lookup('contact', { label: 'Listing Agent' }),
    listing_type: Field.select({
      label: 'Listing Type',
      options: [
        { label: 'Exclusive', value: 'exclusive' },
        { label: 'Open', value: 'open' },
        { label: 'Pocket', value: 'pocket' }
      ]
    }),
    status: Field.select({
      label: 'Status',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Pending', value: 'pending' },
        { label: 'Sold', value: 'sold' },
        { label: 'Withdrawn', value: 'withdrawn' },
        { label: 'Expired', value: 'expired' }
      ],
      defaultValue: 'active'
    }),
    description: Field.textarea({ label: 'Description' })
  }
});
