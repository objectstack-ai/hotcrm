import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Property = ObjectSchema.create({
  name: 'property',
  label: 'Property',
  fields: {
    name: Field.text({ label: 'Property Name', required: true, maxLength: 255 }),
    address: Field.textarea({ label: 'Address' }),
    property_type: Field.select({
      label: 'Property Type',
      options: [
        { label: 'Residential', value: 'residential' },
        { label: 'Commercial', value: 'commercial' },
        { label: 'Land', value: 'land' },
        { label: 'Industrial', value: 'industrial' }
      ]
    }),
    bedrooms: Field.number({ label: 'Bedrooms', min: 0 }),
    bathrooms: Field.number({ label: 'Bathrooms', min: 0 }),
    sqft: Field.number({ label: 'Square Footage', min: 0 }),
    lot_size: Field.number({ label: 'Lot Size (acres)' }),
    year_built: Field.number({ label: 'Year Built' }),
    features: Field.textarea({ label: 'Features (JSON)' }),
    mls_number: Field.text({ label: 'MLS Number', unique: true }),
    status: Field.select({
      label: 'Status',
      options: [
        { label: 'Available', value: 'available' },
        { label: 'Pending', value: 'pending' },
        { label: 'Sold', value: 'sold' },
        { label: 'Off Market', value: 'off_market' }
      ],
      defaultValue: 'available'
    }),
    listed_price: Field.currency({ label: 'Listed Price' }),
    owner_id: Field.lookup('contact', { label: 'Owner' })
  }
});
