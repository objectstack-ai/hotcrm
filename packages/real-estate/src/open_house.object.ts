import { ObjectSchema, Field } from '@objectstack/spec/data';

export const OpenHouse = ObjectSchema.create({
  name: 'open_house',
  label: 'Open House',
  icon: 'door-open',
  fields: {
    listing_id: Field.masterDetail('listing', { label: 'Listing', required: true }),
    event_date: Field.date({ label: 'Event Date', required: true }),
    time_start: Field.text({ label: 'Start Time' }),
    time_end: Field.text({ label: 'End Time' }),
    attendee_count: Field.number({ label: 'Attendee Count', min: 0, defaultValue: 0 }),
    leads_generated: Field.number({ label: 'Leads Generated', min: 0, defaultValue: 0 }),
    notes: Field.textarea({ label: 'Notes' })
  }
});
