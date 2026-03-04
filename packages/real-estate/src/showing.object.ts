import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Showing = ObjectSchema.create({
  name: 'showing',
  label: 'Showing',
  icon: 'eye',
  fields: {
    listing_id: Field.masterDetail('listing', { label: 'Listing', required: true }),
    agent_id: Field.lookup('contact', { label: 'Agent' }),
    buyer_contact_id: Field.lookup('contact', { label: 'Buyer Contact' }),
    scheduled_date: Field.datetime({ label: 'Scheduled Date', required: true }),
    feedback: Field.textarea({ label: 'Feedback' }),
    rating: Field.number({ label: 'Rating', min: 1, max: 5 }),
    follow_up_status: Field.select({
      label: 'Follow-Up Status',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Completed', value: 'completed' },
        { label: 'Not Interested', value: 'not_interested' }
      ],
      defaultValue: 'pending'
    })
  }
});
