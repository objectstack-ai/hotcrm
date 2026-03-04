import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Neighborhood = ObjectSchema.create({
  name: 'neighborhood',
  label: 'Neighborhood',
  icon: 'map-pin',
  fields: {
    name: Field.text({ label: 'Neighborhood Name', required: true, maxLength: 255 }),
    city: Field.text({ label: 'City', required: true }),
    state: Field.text({ label: 'State', required: true }),
    median_price: Field.currency({ label: 'Median Price' }),
    school_rating: Field.number({ label: 'School Rating', min: 0, max: 10 }),
    walk_score: Field.number({ label: 'Walk Score', min: 0, max: 100 }),
    amenities: Field.textarea({ label: 'Amenities (JSON)' })
  }
});
